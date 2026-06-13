/**
 * Locale-aware layout for internationalized pages.
 * Wraps all [locale] routes with the same providers as the root layout.
 */
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Suspense } from "react"
import SiteHeader from "@/components/site-header"
import FloatingQuickMenu from "@/components/floating-quick-menu"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Toaster } from "@/components/ui/toaster"
import { LanguageProvider } from "@/contexts/language-context"
import "@/app/globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })

export async function generateStaticParams() {
  return [
    { locale: "vi" },
    { locale: "en" },
    { locale: "fr" },
    { locale: "zh" },
    { locale: "ru" },
    { locale: "hi" },
  ]
}

export const metadata: Metadata = {
  title: "AIMed - AI Medical Consultation",
  description: "AI-powered medical consultation and health guidance",
  manifest: "/manifest.webmanifest",
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning className={`font-sans ${inter.variable} ${GeistMono.variable} pt-16 sm:pt-18 md:pt-20 h-screen flex flex-col antialiased overflow-hidden`}>
        <LanguageProvider>
          <SiteHeader />
          <div className="flex-1 flex min-h-0">
            <div className="fixed inset-0 -z-10 h-full w-full bg-slate-50 dark:bg-slate-950">
              <div className="absolute -top-[15%] -left-[10%] w-[45%] h-[45%] rounded-full bg-blue-200/20 dark:bg-blue-500/10 blur-[120px] animate-blob" />
              <div className="absolute top-[10%] -right-[15%] w-[50%] h-[50%] rounded-full bg-teal-200/15 dark:bg-teal-400/8 blur-[120px] animate-blob animation-delay-2000" />
              <div className="absolute -bottom-[10%] left-[25%] w-[40%] h-[40%] rounded-full bg-blue-100/15 dark:bg-blue-500/5 blur-[120px] animate-blob animation-delay-4000" />
            </div>
            <div className="flex-1 flex flex-col min-h-0 w-full">
              <Suspense fallback={null}>{children}</Suspense>
            </div>
          </div>
          <FloatingQuickMenu />
          <MobileBottomNav />
          <div suppressHydrationWarning><Toaster /></div>
        </LanguageProvider>
      </body>
    </html>
  )
}
