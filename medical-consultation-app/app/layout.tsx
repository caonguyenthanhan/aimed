import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Suspense } from "react"
import Script from "next/script"
import SiteHeader from "@/components/site-header"
import FloatingQuickMenu from "@/components/floating-quick-menu"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Toaster } from "@/components/ui/toaster"
import { LanguageProvider } from "@/contexts/language-context"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })

export const metadata: Metadata = {
  title: "Tư vấn Y tế AI - Ứng dụng Chăm sóc Sức khỏe",
  description: "Ứng dụng tư vấn y tế thông minh với AI, tra cứu thông tin sức khỏe và sàng lọc tâm lý",
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
}

export const viewport: Viewport = {
  themeColor: "#2563eb",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning className={`font-sans ${inter.variable} ${GeistMono.variable} pt-16 sm:pt-18 md:pt-20 pb-24 sm:pb-20 md:pb-0 min-h-screen flex flex-col`}>
        <Script id="sw-register" strategy="afterInteractive">
          {`(function(){
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                try { navigator.serviceWorker.register('/sw.js'); } catch {}
              });
            }
          })();`}
        </Script>
        <Script id="sanitize-dom" strategy="beforeInteractive">
          {`(function(){try{
            var sanitize=function(node){try{if(node&&node.getAttribute&&node.hasAttribute('bis_skin_checked')){node.removeAttribute('bis_skin_checked')}}catch{}};
            var all=document.querySelectorAll('[bis_skin_checked]');for(var i=0;i<all.length;i++){sanitize(all[i])}
            var mo=new MutationObserver(function(muts){for(var j=0;j<muts.length;j++){var m=muts[j];var t=m.target;sanitize(t);if(m.addedNodes&&m.addedNodes.length){for(var k=0;k<m.addedNodes.length;k++){var n=m.addedNodes[k];sanitize(n);if(n.querySelectorAll){var qs=n.querySelectorAll('[bis_skin_checked]');for(var x=0;x<qs.length;x++){sanitize(qs[x])}}}}}});
            mo.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['bis_skin_checked'],childList:true});
          }catch(e){}})();`}
        </Script>
        <LanguageProvider>
          <SiteHeader />
          <div className="flex-1 flex">
            <div className="fixed inset-0 -z-10 h-full w-full bg-slate-50 dark:bg-slate-950">
              <div className="absolute -top-[15%] -left-[10%] w-[45%] h-[45%] rounded-full bg-blue-200/20 dark:bg-blue-500/10 blur-[120px] animate-blob" />
              <div className="absolute top-[10%] -right-[15%] w-[50%] h-[50%] rounded-full bg-teal-200/15 dark:bg-teal-400/8 blur-[120px] animate-blob animation-delay-2000" />
              <div className="absolute -bottom-[10%] left-[25%] w-[40%] h-[40%] rounded-full bg-blue-100/15 dark:bg-blue-500/5 blur-[120px] animate-blob animation-delay-4000" />
            </div>
            <div className="flex-1 flex flex-col">
              <Suspense fallback={null}>{children}</Suspense>
            </div>
          </div>
          <MobileBottomNav />
          <FloatingQuickMenu />
          <div suppressHydrationWarning><Toaster /></div>
        </LanguageProvider>
      </body>
    </html>
  )
}
