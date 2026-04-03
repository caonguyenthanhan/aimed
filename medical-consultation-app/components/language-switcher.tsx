"use client"

import { useLanguage } from '@/contexts/language-context'
import { Locale } from '@/lib/i18n'
import { Globe } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const localeFlags: Record<Locale, string> = {
  vi: '🇻🇳',
  en: '🇺🇸',
  fr: '🇫🇷',
  zh: '🇨🇳',
  ru: '🇷🇺',
  hi: '🇮🇳',
}

const validLocales: Locale[] = ['vi', 'en', 'fr', 'zh', 'ru', 'hi']

export default function LanguageSwitcher() {
  const { locale, setLocale, localeNames } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale)
    setOpen(false)
    
    // Check if current path has a locale prefix
    const pathParts = pathname.split('/')
    const firstPart = pathParts[1]
    
    if (validLocales.includes(firstPart as Locale)) {
      // Replace existing locale in path
      pathParts[1] = newLocale
      router.push(pathParts.join('/'))
    } else {
      // Navigate to locale version of current page
      router.push(`/${newLocale}${pathname}`)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-8 w-8 rounded-lg bg-secondary hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors"
        title="Ngon ngu / Language"
      >
        <Globe className="h-4 w-4" />
      </button>
      
      {open && (
        <div className="absolute top-full mt-2 right-0 w-40 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {validLocales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={`flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium transition-colors ${
                locale === loc 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              <span className="text-base">{localeFlags[loc]}</span>
              <span>{localeNames[loc]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
