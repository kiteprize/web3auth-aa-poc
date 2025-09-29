import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import commonTranslations from "@/lib/intl/data/commonTranslations.json";
import { getEnabledLanguageCodes, getDefaultLanguage } from "@/lib/intl/languageUtils";

export const runtime = "edge";

// Upstash Redis client - lazily initialized
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  try {
    if (
      !redis &&
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      redis = Redis.fromEnv();
    }
    return redis;
  } catch (error) {
    console.error("Redis initialization error:", error);
    return null;
  }
}

interface TranslationItem {
  key: string;
  text: string;
}

interface TranslationRequest {
  lang: string;
  items: TranslationItem[];
}

// Helper function to get current month version
function getCurrentMonthVersion(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${year}${month}`;
}

// Common translations imported from separate file (server-side only)

// MyMemory API translation function
async function translateText(
  text: string,
  targetLang: string
): Promise<string> {
  try {
    // Check common translations first
    const commonDict = (
      commonTranslations as Record<string, Record<string, string>>
    )[targetLang];
    const trimmedText = text.trim();

    if (commonDict && commonDict[trimmedText]) {
      return commonDict[trimmedText];
    }

    // MyMemory API endpoint
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=ko|${targetLang}&de=support@translateai.com`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Next.js Auto Translator",
      },
    });

    if (!response.ok) {
      throw new Error(`MyMemory API error: ${response.status}`);
    }

    const data = await response.json();

    // Check if translation was successful
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }

    // Fallback to original text if translation failed
    return text;
  } catch (error) {
    console.error("MyMemory translation error:", error);
    // Return original text on error
    return text;
  }
}

// Check current month language pack for existing translations
async function getFromLanguagePack(
  lang: string,
  key: string
): Promise<string | null> {
  try {
    const client = getRedisClient();
    if (!client) return null;

    const currentVer = getCurrentMonthVersion();
    const packKey = `pack:${lang}:${currentVer}`;

    const pack = await client.get(packKey);
    if (pack) {
      const packData = typeof pack === "string" ? JSON.parse(pack) : pack;
      if (packData[key]) {
        return packData[key];
      }
    }

    return null;
  } catch (error) {
    console.error("Language pack get error:", error);
    return null;
  }
}

// Add translations to current month pack
async function addToLanguagePack(
  lang: string,
  translations: Record<string, string>
): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;

    const currentVer = getCurrentMonthVersion();
    const packKey = `pack:${lang}:${currentVer}`;

    // Get existing pack
    let existingPack: Record<string, string> = {};
    const existing = await client.get(packKey);

    if (existing) {
      if (typeof existing === "string") {
        existingPack = JSON.parse(existing);
      } else {
        existingPack = existing as Record<string, string>;
      }
    }

    // Merge new translations
    const mergedPack = { ...existingPack, ...translations };
    const payload = JSON.stringify(mergedPack);

    // Save merged pack
    await client.set(packKey, payload, { ex: 60 * 60 * 24 * 32 }); // 32 days TTL

    console.log(
      "📦 Added to language pack:",
      currentVer,
      Object.keys(translations).length,
      "translations"
    );
  } catch (error) {
    console.error("Language pack add error:", error);
  }
}

// Rate limiting with Redis
async function checkRateLimit(clientId: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return true; // Allow if no Redis

    const key = `rl_translate:${clientId}`;
    const current = await client.incr(key);

    if (current === 1) {
      await client.expire(key, 60); // 1 minute window
    }

    return current <= 50; // Max 50 translation requests per minute per client
  } catch (error) {
    console.error("Rate limit check error:", error);
    return true; // Allow on error
  }
}

export async function POST(request: NextRequest) {
  try {
    // Security: Rate limiting by IP
    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const isAllowed = await checkRateLimit(clientIp);
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body: TranslationRequest = await request.json();
    const { lang, items } = body;

    // Security: Validate input
    if (!lang || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    // Security: Limit number of items per request
    if (items.length > 50) {
      return NextResponse.json(
        { error: "Too many items. Maximum 50 items per request." },
        { status: 400 }
      );
    }

    // Security: Validate language code
    const allowedLangs = getEnabledLanguageCodes();
    if (!allowedLangs.includes(lang as any)) {
      return NextResponse.json(
        { error: "Unsupported language" },
        { status: 400 }
      );
    }

    // Security: Validate and sanitize items
    const sanitizedItems = items
      .filter(
        (item) =>
          item.key &&
          item.text &&
          typeof item.key === "string" &&
          typeof item.text === "string"
      )
      .filter((item) => item.text.length <= 1000) // Max 1000 chars per text
      .filter((item) => !/[<>{}]/.test(item.text)) // Block potential XSS
      .slice(0, 50); // Extra safety limit

    if (sanitizedItems.length === 0) {
      return NextResponse.json(
        { error: "No valid items to translate" },
        { status: 400 }
      );
    }

    // Skip translation for default language (base language)
    if (lang === getDefaultLanguage()) {
      const result: { [key: string]: string } = {};
      sanitizedItems.forEach((item) => {
        result[item.key] = item.text;
      });
      return NextResponse.json(result);
    }

    // Check what's already in language pack
    const alreadyTranslated: Record<string, string> = {};
    const itemsToTranslate: TranslationItem[] = [];

    for (const item of sanitizedItems) {
      const existing = await getFromLanguagePack(lang, item.key);
      if (existing) {
        alreadyTranslated[item.key] = existing;
      } else {
        itemsToTranslate.push(item);
      }
    }

    console.log(
      "🔍 Translation request - Already have:",
      Object.keys(alreadyTranslated).length,
      "Need to translate:",
      itemsToTranslate.length
    );

    // Translate missing items with MyMemory
    const newTranslations: Record<string, string> = {};

    if (itemsToTranslate.length > 0) {
      // Process items with rate limiting (MyMemory API)
      const batchSize = 5; // Process 5 items at a time to avoid rate limits
      const delay = 100; // 100ms delay between batches

      for (let i = 0; i < itemsToTranslate.length; i += batchSize) {
        const batch = itemsToTranslate.slice(i, i + batchSize);

        const translationPromises = batch.map(async (item) => {
          const translated = await translateText(item.text, lang);
          return { key: item.key, text: translated };
        });

        const results = await Promise.all(translationPromises);

        // Collect new translations
        for (const result of results) {
          newTranslations[result.key] = result.text;
        }

        // Add delay between batches if not the last batch
        if (i + batchSize < itemsToTranslate.length) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      // Add new translations to language pack
      if (Object.keys(newTranslations).length > 0) {
        await addToLanguagePack(lang, newTranslations);
      }
    }

    // Combine existing and new translations
    const finalResult = { ...alreadyTranslated, ...newTranslations };

    return NextResponse.json(finalResult, {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=31536000",
      },
    });
  } catch (error) {
    console.error("Translation API error:", error);
    return NextResponse.json(
      { error: "Translation service error" },
      { status: 500 }
    );
  }
}
