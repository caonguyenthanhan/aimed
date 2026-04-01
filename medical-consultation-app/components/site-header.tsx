'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrainCircuit, Home, MessageSquare, Search, Activity, LogIn, Newspaper, Smile, BookOpenText, Bell, Menu, X, Stethoscope, Users, FileText, BarChart3, Calendar } from 'lucide-react'
import dynamic from 'next/dynamic'
import AccountMenu from './account-menu'
import LanguageSwitcher from './language-switcher'
const ComputeToggle = dynamic(() => import('./compute-toggle'), { ssr: false })

export default function SiteHeader() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [userLabel, setUserLabel] = useState<string>("Tài khoản")
  const [userRole, setUserRole] = useState<string>("patient")
  const [toolsOpen, setToolsOpen] = useState(false)
  
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setToolsOpen(false) }, [pathname])
  useEffect(() => {
    try {
      const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
      setAuthed(!!t)
      const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null
      setUserRole(role || "patient")
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

  // Role-based navigation
  const patientItems = [
    { href: '/', label: 'Trang chủ', icon: Home },
    { href: '/tu-van', label: 'Tư vấn', icon: MessageSquare },
    { href: '/tam-su', label: 'Tâm sự', icon: Smile },
    { href: '/gioi-thieu', label: 'Hướng dẫn', icon: BookOpenText },
  ]

  const doctorItems = [
    { href: '/doctor', label: 'Bảng điều khiển', icon: Home },
    { href: '/doctor/patients', label: 'Bệnh nhân', icon: Users },
    { href: '/doctor/reports', label: 'Báo cáo', icon: FileText },
    { href: '/doctor/appointments', label: 'Lịch hẹn', icon: Calendar },
    { href: '/doctor/forum', label: 'Chia sẻ', icon: Users },
  ]

  const toolItemsBase = [
    { href: '/tra-cuu', label: 'Tra cứu', icon: Search },
    { href: '/sang-loc', label: 'Sàng lọc', icon: Activity },
    { href: '/tri-lieu', label: 'Trị liệu', icon: BookOpenText },
    { href: '/nhac-nho', label: 'Nhắc nhở', icon: Bell },
    { href: '/tin-tuc-y-khoa', label: 'Tin tức', icon: Newspaper },
  ]
  const toolItems =
    userRole === "doctor"
      ? [
          { href: "/tu-van", label: "Tư vấn", icon: MessageSquare },
          { href: "/tam-su", label: "Tâm sự", icon: Smile },
          ...toolItemsBase,
        ]
      : toolItemsBase

  const mainItems = userRole === 'doctor' ? doctorItems : patientItems
  const navItems = mainItems

  return (
    <div className="fixed top-3 left-0 right-0 z-50 flex justify-center px-3">
      {/* Compact Glass Header */}
      <div data-site-header className="relative w-full max-w-4xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-full px-4 h-12 flex items-center justify-between shadow-lg shadow-black/5 dark:shadow-black/20 border border-white/20 dark:border-slate-700/50 transition-all duration-300">
        
        {/* Logo Section - Compact */}
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <div className="bg-gradient-to-br from-primary to-accent p-1.5 rounded-lg">
            <BrainCircuit className="text-white" size={18} />
          </div>
          <span className="font-bold text-foreground tracking-tight text-sm hidden sm:block">
            <span className="text-primary">AI</span>Med
          </span>
        </Link>

        {/* Navigation Section - Desktop - Compact pills */}
        <nav className="hidden md:flex items-center gap-1 bg-secondary/50 rounded-full p-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`
                  relative px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }
                `}
              >
                {item.label}
              </Link>
            )
          })}
          
          {/* Tools Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${toolsOpen ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
            >
              Cong cu
              <svg className={`w-3 h-3 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {toolsOpen && (
              <div className="absolute top-full mt-2 right-0 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                {toolItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition"
                  >
                    <item.icon size={14} className="text-muted-foreground" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Action Section - Compact */}
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />
          <ComputeToggle />
          {!authed ? (
            <Link href="/login" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap shadow-sm">
              <LogIn size={14} />
              <span className="hidden sm:inline">Đăng nhập</span>
            </Link>
          ) : (
            <AccountMenu
              userLabel={userLabel}
              userRole={userRole as 'doctor' | 'patient'}
              userFullName={typeof window !== 'undefined' ? localStorage.getItem('userFullName') || undefined : undefined}
              userEmail={typeof window !== 'undefined' ? localStorage.getItem('userEmail') || undefined : undefined}
            />
          )}
        </div>

      </div>
    </div>
  )
}
