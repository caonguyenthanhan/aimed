import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import Script from "next/script"
import SiteHeader from "@/components/site-header"
import FloatingQuickMenu from "@/components/floating-quick-menu"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Toaster } from "@/components/ui/toaster"
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
      <body suppressHydrationWarning className={`font-sans ${inter.variable} ${GeistMono.variable} pt-16 pb-20 sm:pb-0 min-h-screen overflow-x-hidden`}>
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
        <SiteHeader />
        <div className="fixed inset-0 -z-10 h-full w-full bg-slate-50 overflow-hidden">
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-purple-200/40 blur-[100px] animate-blob" />
          <div className="absolute top-[0%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-200/40 blur-[100px] animate-blob animation-delay-2000" />
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-pink-200/30 blur-[100px] animate-blob animation-delay-4000" />
        </div>
        <Suspense fallback={null}>{children}</Suspense>
        <MobileBottomNav />
        <FloatingQuickMenu />
        <div suppressHydrationWarning><Toaster /></div>
        <Analytics />
      </body>
    </html>
  )
}
