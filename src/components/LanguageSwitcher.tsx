'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, Globe } from 'lucide-react'
import { getEnabledLanguages, getCurrentLanguageFromCookie, getLanguageInfo } from '@/lib/intl/languageUtils'

export default function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState(() => getCurrentLanguageFromCookie())
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentLang(getCurrentLanguageFromCookie())
    }
  }, [])

  const handleLanguageChange = (langCode: string) => {
    if (typeof window !== 'undefined' && window.__intl__) {
      window.__intl__.lang = langCode
      setCurrentLang(langCode)
      setShowDropdown(false)

      // Show overlay and reload page to trigger translation
      window.__intl__.show()
      window.location.reload()
    }
  }

  const currentLanguage = getLanguageInfo(currentLang)
  const enabledLanguages = getEnabledLanguages()

  return (
    <div className="relative" data-no-translate>
      <Button
        variant="ghost"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 h-auto"
        data-no-translate
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline text-sm">
          {currentLanguage.flag} {currentLanguage.nativeName}
        </span>
        <span className="sm:hidden text-sm">
          {currentLanguage.flag}
        </span>
        <ChevronDown className="w-3 h-3" />
      </Button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
          <div className="py-2">
            {enabledLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center gap-3 transition-colors ${
                  lang.code === currentLang
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300'
                }`}
                data-no-translate
              >
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.nativeName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
}