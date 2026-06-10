/**
 * Locale-aware layout for internationalized pages.
 * Wraps all [locale] routes with the same providers as the root layout.
 */
import type { Metadata } from "next"
import { Inter } from "next/font/google"
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
      <body className={`${inter.variable} font-sans antialiased`}>
        <LanguageProvider>
          <SiteHeader />
          <Suspense fallback={null}>
            <FloatingQuickMenu />
          </Suspense>
          {children}
          <MobileBottomNav />
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  )
}
