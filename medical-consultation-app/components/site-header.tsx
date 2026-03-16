'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrainCircuit, Home, MessageSquare, Search, Activity, LogIn, Newspaper, Smile, BookOpenText, Bell } from 'lucide-react'
import dynamic from 'next/dynamic'
const ComputeToggle = dynamic(() => import('./compute-toggle'), { ssr: false })

export default function SiteHeader() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [userLabel, setUserLabel] = useState<string>("Tài khoản")
  
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    try {
      const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
      setAuthed(!!t)
      const n1 = typeof window !== 'undefined' ? localStorage.getItem('userFullName') : null
      const n2 = typeof window !== 'undefined' ? localStorage.getItem('username') : null
      const base = (n1 && n1.trim()) ? n1.trim() : (n2 && n2.trim()) ? n2.trim() : ""
      if (base) {
        const parts = base.split(/\s+/).filter(Boolean)
        const lbl = parts.length >= 2 ? parts.slice(-2).join(" ") : parts.join(" ")
        setUserLabel(lbl || "Tài khoản")
      } else {
        setUserLabel("Tài khoản")
      }
      if (t && !base) {
        try {
          fetch('/api/backend/v1/user', { headers: { 'Authorization': `Bearer ${t}` } })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              const nm = String(d?.full_name || d?.username || "").trim()
              if (nm) {
                const parts = nm.split(/\s+/).filter(Boolean)
                const lbl = parts.length >= 2 ? parts.slice(-2).join(" ") : parts.join(" ")
                setUserLabel(lbl || "Tài khoản")
                try {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('userFullName', nm)
                  }
                } catch {}
              }
            }).catch(() => {})
        } catch {}
      }
    } catch {}
  }, [mounted, pathname])
  if (!mounted || pathname === '/') return null

  const items = [
    { href: '/', label: 'Trang chủ', icon: Home },
    { href: '/tu-van', label: 'Tư vấn', icon: MessageSquare },
    { href: '/tam-su', label: 'Tâm sự', icon: Smile },
    { href: '/tra-cuu', label: 'Tra cứu', icon: Search },
    { href: '/sang-loc', label: 'Sàng lọc', icon: Activity },
    { href: '/tri-lieu', label: 'Trị liệu', icon: BookOpenText },
    { href: '/nhac-nho', label: 'Nhắc nhở', icon: Bell },
    { href: '/tin-tuc-y-khoa', label: 'Tin tức', icon: Newspaper },
  ]

  return (
    <div className="fixed top-3 left-0 right-0 z-50 flex justify-center px-3 sm:px-4">
      {/* Floating Glass Container */}
      <div data-site-header className="w-full max-w-4xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl rounded-full px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between transition-all duration-300 hover:shadow-2xl hover:bg-white/90">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2 pl-1 sm:pl-2 group">
          <div className="bg-blue-500/10 p-1.5 rounded-full group-hover:bg-blue-500/20 transition-colors">
            <BrainCircuit className="text-blue-600" size={20} />
          </div>
          <span className="font-bold text-gray-800 tracking-tight hidden sm:block">
            MedConsult<span className="text-blue-500">AI</span>
          </span>
        </Link>

        {/* Navigation Section */}
        <nav className="hidden sm:flex items-center gap-1">
          {items.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`
                  relative px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2
                  ${isActive 
                    ? 'bg-blue-100 text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }
                `}
              >
                {/* Ẩn icon trên desktop, hiện trên mobile nếu muốn, ở đây tôi hiện text trên desktop */}
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Action Section */}
        <div className="flex items-center gap-2 pr-1">
          <div className="h-4 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
          <ComputeToggle />
          <div className="h-4 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
          {!authed ? (
            <Link href="/login" className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-500">
              <LogIn size={16} />
              <span className="hidden sm:inline">Đăng nhập</span>
            </Link>
          ) : (
            <Link href="/account" className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-800 text-white text-sm hover:bg-slate-700">
              <span className="hidden sm:inline">{userLabel}</span>
            </Link>
          )}
        </div>

      </div>
    </div>
  )
}
