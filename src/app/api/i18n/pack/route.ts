import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import commonTranslations from "@/lib/intl/data/commonTranslations.json";

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

function packKey(lang: string, ver: string) {
  return `pack:${lang}:${ver}`;
}

// Rate limiting with Redis
async function checkRateLimit(clientId: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return true; // Allow if no Redis

    const key = `rl_pack:${clientId}`;
    const current = await client.incr(key);

    if (current === 1) {
      await client.expire(key, 60); // 1 minute window
    }

    return current <= 30; // Max 30 pack requests per minute per client
  } catch (error) {
    console.error("Rate limit check error:", error);
    return true; // Allow on error
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang") || "";
    const ver = searchParams.get("ver") || "";

    // Security: Validate input
    if (!lang || !ver) {
      return NextResponse.json(
        { error: "Missing lang or ver parameter" },
        { status: 400 }
      );
    }

    // Security: Validate language code
    const allowedLangs = ["ko", "en", "ja", "zh", "es", "fr", "de"];
    if (!allowedLangs.includes(lang)) {
      return NextResponse.json(
        { error: "Unsupported language" },
        { status: 400 }
      );
    }

    // Security: Validate version format (YYYYMM)
    if (!/^20\d{4}$/.test(ver)) {
      return NextResponse.json(
        { error: "Invalid version format. Expected YYYYMM." },
        { status: 400 }
      );
    }

    const client = getRedisClient();
    if (!client) {
      // Return common translations when Redis is not available
      const commonDict =
        (commonTranslations as Record<string, Record<string, string>>)[lang] ||
        {};
      console.log(
        "📦 Redis unavailable, using common translations only:",
        Object.keys(commonDict).length,
        "keys"
      );
      return NextResponse.json(commonDict, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=31536000",
        },
      });
    }

    const cacheKey = packKey(lang, ver);
    console.log("🔍 Language pack GET - Key:", cacheKey);
    const cached = await client.get(cacheKey);

    // Start with commonTranslations as base
    const commonDict =
      (commonTranslations as Record<string, Record<string, string>>)[lang] ||
      {};
    let finalPack = { ...commonDict };

    if (cached) {
      let cachedPack: Record<string, string> = {};
      if (typeof cached === "string") {
        cachedPack = JSON.parse(cached);
      } else {
        cachedPack = cached as Record<string, string>;
      }

      // Merge cached pack with common translations (cached pack takes precedence)
      finalPack = { ...commonDict, ...cachedPack };
      console.log(
        "✅ Language pack found:",
        Object.keys(cachedPack).length,
        "cached +",
        Object.keys(commonDict).length,
        "common =",
        Object.keys(finalPack).length,
        "total"
      );
    } else {
      console.log(
        "📦 Using common translations only:",
        Object.keys(commonDict).length,
        "keys"
      );
    }

    const packData = JSON.stringify(finalPack);

    // Return language pack (empty object if not found)
    return new Response(packData, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        // CDN cache optimization + background revalidation
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=31536000",
      },
    });
  } catch (error) {
    console.error("Language pack GET error:", error);
    return NextResponse.json(
      {},
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=31536000",
        },
      }
    );
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

    const { lang, ver, dict } = (await request.json()) as {
      lang: string;
      ver: string;
      dict: Record<string, string>;
    };

    // Security: Validate input
    if (!lang || !ver || !dict || typeof dict !== "object") {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    // Security: Validate language code
    const allowedLangs = ["ko", "en", "ja", "zh", "es", "fr", "de"];
    if (!allowedLangs.includes(lang)) {
      return NextResponse.json(
        { error: "Unsupported language" },
        { status: 400 }
      );
    }

    // Security: Validate version format
    if (!/^20\d{4}$/.test(ver)) {
      return NextResponse.json(
        { error: "Invalid version format" },
        { status: 400 }
      );
    }

    // Validate dictionary keys and values
    for (const [key, value] of Object.entries(dict)) {
      if (typeof key !== "string" || typeof value !== "string") {
        return NextResponse.json(
          { error: "Dictionary must contain only string keys and values" },
          { status: 400 }
        );
      }
      if (key.length > 64 || value.length > 1000) {
        return NextResponse.json(
          { error: "Dictionary key/value too long" },
          { status: 400 }
        );
      }
    }

    const client = getRedisClient();
    if (!client) {
      return new Response(null, {
        status: 204,
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=31536000",
        },
      });
    }

    // Merge with existing pack
    const cacheKey = packKey(lang, ver);
    console.log(
      "🔄 Language pack POST - Key:",
      cacheKey,
      "Delta size:",
      Object.keys(dict).length
    );

    const existing = await client.get(cacheKey);
    let existingPack: Record<string, string> = {};

    if (existing) {
      if (typeof existing === "string") {
        existingPack = JSON.parse(existing);
      } else {
        existingPack = existing as Record<string, string>;
      }
    }

    // Merge delta into existing pack
    const mergedPack = { ...existingPack, ...dict };
    const payload = JSON.stringify(mergedPack);

    console.log(
      "📦 Merged pack size:",
      payload.length,
      "bytes (was:",
      JSON.stringify(existingPack).length,
      ")"
    );

    // Size guard - split into shards if too large
    if (payload.length > 800_000) {
      console.warn(
        "⚠️ Language pack too large:",
        payload.length,
        "bytes. TODO: Implement sharding."
      );
      // TODO: Implement sharding for large packs
    }

    // Store merged pack
    await client.set(cacheKey, payload, { ex: 60 * 60 * 24 * 32 }); // 32 days TTL (month + buffer)

    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=31536000",
      },
    });
  } catch (error) {
    console.error("Language pack POST error:", error);
    return NextResponse.json({ error: "Service error" }, { status: 500 });
  }
}
