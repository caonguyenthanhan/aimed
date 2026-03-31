"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, t as translate, localeNames, getSuggestedQuestions as getSuggestions } from '@/lib/i18n'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  getSuggestedQuestions: () => string[]
  localeNames: Record<Locale, string>
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('vi')

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('locale') as Locale
    if (saved && ['vi', 'en', 'fr', 'zh', 'ru', 'hi'].includes(saved)) {
      setLocaleState(saved)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  const t = (key: string) => translate(key, locale)
  const getSuggestedQuestions = () => getSuggestions(locale)

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, getSuggestedQuestions, localeNames }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
