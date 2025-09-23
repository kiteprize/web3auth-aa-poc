export interface CountryCode {
  code: string
  dialCode: string
  name: string
  flag: string
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'KR', dialCode: '+82', name: '대한민국', flag: '🇰🇷' },
  { code: 'US', dialCode: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', dialCode: '+81', name: '日本', flag: '🇯🇵' },
  { code: 'CN', dialCode: '+86', name: '中国', flag: '🇨🇳' },
  { code: 'IN', dialCode: '+91', name: 'India', flag: '🇮🇳' },
  { code: 'DE', dialCode: '+49', name: 'Deutschland', flag: '🇩🇪' },
  { code: 'FR', dialCode: '+33', name: 'France', flag: '🇫🇷' },
  { code: 'AU', dialCode: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', dialCode: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: 'SG', dialCode: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: 'HK', dialCode: '+852', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'TW', dialCode: '+886', name: '台灣', flag: '🇹🇼' },
  { code: 'TH', dialCode: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', dialCode: '+84', name: 'Việt Nam', flag: '🇻🇳' },
  { code: 'ID', dialCode: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'MY', dialCode: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'PH', dialCode: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: 'BR', dialCode: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: 'MX', dialCode: '+52', name: 'México', flag: '🇲🇽' },
]

export const DEFAULT_COUNTRY = COUNTRY_CODES[0] // 대한민국

export function getCountryByCode(code: string): CountryCode | undefined {
  return COUNTRY_CODES.find(country => country.code === code)
}

export function getCountryByDialCode(dialCode: string): CountryCode | undefined {
  return COUNTRY_CODES.find(country => country.dialCode === dialCode)
}