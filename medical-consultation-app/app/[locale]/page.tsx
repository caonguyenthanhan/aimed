/**
 * Locale-aware home page — renders the same landing page with i18n context.
 * Route: /vi, /en, /fr, /zh, /ru, /hi
 */
import LandingPage from "@/components/landing-page"

export default function LocaleHomePage({
  params,
}: {
  params: { locale: string }
}) {
  // LandingPage component handles its own translations internally via language context
  return <LandingPage />
}
