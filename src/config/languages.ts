export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  enabled: boolean;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', enabled: true },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', enabled: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', enabled: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', enabled: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', enabled: true },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', enabled: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', enabled: true }
];

export const DEFAULT_LANGUAGE = 'ko';
export const ENABLED_LANGUAGES = SUPPORTED_LANGUAGES.filter(lang => lang.enabled);
export const LANGUAGE_CODES = ENABLED_LANGUAGES.map(lang => lang.code);

// Type for language codes - provides compile-time safety
export type LanguageCode = typeof LANGUAGE_CODES[number];