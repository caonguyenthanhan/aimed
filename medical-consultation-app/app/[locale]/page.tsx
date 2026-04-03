"use client"

import { useLanguage } from '@/contexts/language-context'
import { Locale } from '@/lib/i18n'
import Link from 'next/link'
import { Globe, MessageCircle, Heart, BookOpen, Wrench, ArrowRight } from 'lucide-react'

const localeFlags: Record<Locale, string> = {
  vi: '🇻🇳',
  en: '🇺🇸',
  fr: '🇫🇷',
  zh: '🇨🇳',
  ru: '🇷🇺',
  hi: '🇮🇳',
}

export default function LocalePage({ params }: { params: { locale: string } }) {
  const { locale, t, localeNames } = useLanguage()
  const currentLocale = params.locale as Locale

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto">
      <div className="max-w-2xl w-full space-y-8">
        {/* Language indicator */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-primary/10 rounded-full">
            <span className="text-4xl">{localeFlags[currentLocale] || localeFlags['vi']}</span>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Current Language</p>
              <p className="text-lg font-semibold text-primary">{localeNames[currentLocale] || localeNames['vi']}</p>
            </div>
          </div>
        </div>

        {/* Welcome message */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {t('welcome.greeting').split('.')[0]}.
          </h1>
          <p className="text-muted-foreground">
            {t('disclaimer.text')}
          </p>
        </div>

        {/* Navigation cards */}
        <div className="grid grid-cols-2 gap-4">
          <Link 
            href={`/${currentLocale}/tu-van`}
            className="group p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all"
          >
            <MessageCircle className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold text-foreground">{t('nav.consult')}</h3>
            <p className="text-xs text-muted-foreground mt-1">AI Medical Assistant</p>
          </Link>

          <Link 
            href={`/${currentLocale}/tam-su`}
            className="group p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all"
          >
            <Heart className="h-8 w-8 text-pink-500 mb-2" />
            <h3 className="font-semibold text-foreground">{t('nav.confide')}</h3>
            <p className="text-xs text-muted-foreground mt-1">Mental Health Support</p>
          </Link>

          <Link 
            href={`/${currentLocale}/huong-dan`}
            className="group p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all"
          >
            <BookOpen className="h-8 w-8 text-green-500 mb-2" />
            <h3 className="font-semibold text-foreground">{t('nav.guide')}</h3>
            <p className="text-xs text-muted-foreground mt-1">Health Guides</p>
          </Link>

          <Link 
            href={`/${currentLocale}/cong-cu`}
            className="group p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all"
          >
            <Wrench className="h-8 w-8 text-orange-500 mb-2" />
            <h3 className="font-semibold text-foreground">{t('nav.tools')}</h3>
            <p className="text-xs text-muted-foreground mt-1">Health Tools</p>
          </Link>
        </div>

        {/* Language switcher */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>Switch Language:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(localeNames) as Locale[]).map((loc) => (
              <Link
                key={loc}
                href={`/${loc}`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentLocale === loc
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-primary/10'
                }`}
              >
                <span>{localeFlags[loc]}</span>
                <span>{localeNames[loc]}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA to main chat */}
        <div className="pt-4">
          <Link
            href="/tu-van"
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <span>{t('nav.consult')}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  )
}
