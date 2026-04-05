"use client"

import { useEffect, use } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { Locale } from '@/lib/i18n'

const validLocales: Locale[] = ['vi', 'en', 'fr', 'zh', 'ru', 'hi']

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const { setLocale } = useLanguage()
  
  useEffect(() => {
    if (validLocales.includes(locale as Locale)) {
      setLocale(locale as Locale)
    }
  }, [locale, setLocale])

  return <>{children}</>
}
