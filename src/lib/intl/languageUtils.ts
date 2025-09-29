import {
  SUPPORTED_LANGUAGES,
  ENABLED_LANGUAGES,
  DEFAULT_LANGUAGE,
  Language,
  LanguageCode,
} from "@/config/languages";

export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

export function isValidLanguageCode(code: string): code is LanguageCode {
  return ENABLED_LANGUAGES.some((lang) => lang.code === code);
}

export function getEnabledLanguageCodes(): LanguageCode[] {
  return ENABLED_LANGUAGES.map((lang) => lang.code as LanguageCode);
}

export function getEnabledLanguages(): Language[] {
  return ENABLED_LANGUAGES;
}

export function getDefaultLanguage(): LanguageCode {
  return DEFAULT_LANGUAGE as LanguageCode;
}

export function getLanguageInfo(code: string) {
  const language = getLanguageByCode(code);
  if (!language) {
    return getLanguageByCode(DEFAULT_LANGUAGE)!;
  }
  return language;
}

// Cookie helper functions
export function getCurrentLanguageFromCookie(): LanguageCode {
  if (typeof window === "undefined") return getDefaultLanguage();

  const match = document.cookie.match(/(?:^|;)\s*lang=([^;]+)/);
  const langFromCookie = match
    ? decodeURIComponent(match[1])
    : getDefaultLanguage();

  return isValidLanguageCode(langFromCookie)
    ? langFromCookie
    : getDefaultLanguage();
}

// Validation helper for Accept-Language header
export function getLocaleFromAcceptLanguage(
  acceptLanguage: string
): LanguageCode {
  if (!acceptLanguage) return getDefaultLanguage();

  const languages = acceptLanguage
    .split(",")
    .map((lang) => lang.trim().split(";")[0])
    .map((lang) => lang.toLowerCase());

  for (const lang of languages) {
    if (isValidLanguageCode(lang)) {
      return lang;
    }
    const primaryLang = (lang as string).split("-")[0];
    if (isValidLanguageCode(primaryLang)) {
      return primaryLang;
    }
  }

  return getDefaultLanguage();
}
