/**
 * Locale-aware layout for internationalized pages.
 * This layout should NOT duplicate html/body tags from root layout.
 * Only provides locale context.
 */
import type { Metadata } from "next"
import "@/app/globals.css"

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
  // Just return children - root layout already has html/body/providers
  return <>{children}</>
}
