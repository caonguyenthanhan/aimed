"use client"

import { useEffect } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { Locale } from '@/lib/i18n'

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const { setLocale } = useLanguage()
  
  useEffect(() => {
    const validLocales: Locale[] = ['vi', 'en', 'fr', 'zh', 'ru', 'hi']
    if (validLocales.includes(params.locale as Locale)) {
      setLocale(params.locale as Locale)
    }
  }, [params.locale, setLocale])

  return <>{children}</>
}
