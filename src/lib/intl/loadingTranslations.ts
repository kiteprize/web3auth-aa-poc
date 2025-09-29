import { LanguageCode } from "@/config/languages";
import { getDefaultLanguage, getCurrentLanguageFromCookie } from "./languageUtils";

export const LOADING_TRANSLATIONS: Record<LanguageCode, string> = {
  ko: "번역 로딩 중...",
  en: "Loading translation...",
  ja: "翻訳読み込み중...",
  zh: "正在加载翻译...",
  es: "Cargando traducción...",
  fr: "Chargement de la traduction...",
  de: "Übersetzung wird geladen...",
} as const;

export function getCurrentLoadingText(): string {
  if (typeof window === "undefined") {
    return LOADING_TRANSLATIONS[getDefaultLanguage()];
  }

  const currentLang = getCurrentLanguageFromCookie();
  return LOADING_TRANSLATIONS[currentLang];
}

export function getLoadingText(lang: string): string {
  return (
    LOADING_TRANSLATIONS[lang as LanguageCode] ||
    LOADING_TRANSLATIONS[getDefaultLanguage()]
  );
}
