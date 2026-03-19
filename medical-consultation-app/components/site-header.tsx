'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrainCircuit, Home, MessageSquare, Search, Activity, LogIn, Newspaper, Smile, BookOpenText, Bell, Menu, X, Stethoscope, Users, FileText, BarChart3 } from 'lucide-react'
import dynamic from 'next/dynamic'
const ComputeToggle = dynamic(() => import('./compute-toggle'), { ssr: false })

export default function SiteHeader() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [userLabel, setUserLabel] = useState<string>("Tài khoản")
  const [userRole, setUserRole] = useState<string>("patient")
  const [toolsOpen, setToolsOpen] = useState(false)
  
  useEffect(() => { setMounted(true) }, [])
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
  ]

  const doctorItems = [
    { href: '/doctor', label: 'Bảng điều khiển', icon: Home },
    { href: '/doctor/patients', label: 'Bệnh nhân', icon: Users },
    { href: '/doctor/reports', label: 'Báo cáo', icon: FileText },
  ]

  const toolItems = [
    { href: '/tra-cuu', label: 'Tra cứu', icon: Search },
    { href: '/sang-loc', label: 'Sàng lọc', icon: Activity },
    { href: '/tri-lieu', label: 'Trị liệu', icon: BookOpenText },
    { href: '/nhac-nho', label: 'Nhắc nhở', icon: Bell },
    { href: '/tin-tuc-y-khoa', label: 'Tin tức', icon: Newspaper },
  ]

  const mainItems = userRole === 'doctor' ? doctorItems : patientItems
  
  // Add introduction link to main items if not authenticated
  const navItems = !authed ? [
    { href: '/gioi-thieu', label: 'Giới Thiệu', icon: Users },
    ...mainItems
  ] : mainItems

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-3 sm:px-4">
      {/* Modern Glass Header */}
      <div data-site-header className="relative w-full max-w-5xl glass-panel rounded-2xl px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between transition-all duration-300 hover:shadow-md dark:glass-panel-dark">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <div className="bg-blue-600/10 dark:bg-blue-500/20 p-2 rounded-lg group-hover:bg-blue-600/15 dark:group-hover:bg-blue-500/25 transition-colors duration-200">
            <BrainCircuit className="text-blue-600 dark:text-blue-400" size={22} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 dark:text-slate-50 tracking-tight text-sm sm:text-base">
              <span className="text-blue-600 dark:text-blue-400">AI</span>Med
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Health Companion</span>
          </div>
        </Link>

        {/* Navigation Section - Desktop */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`
                  relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
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
              className="relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
            >
              Công cụ ▼
            </button>
            {toolsOpen && (
              <div className="absolute top-full mt-2 left-0 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
                {toolItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition"
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Action Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
          <ComputeToggle />
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
          {!authed ? (
            <Link href="/login" className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors duration-200 whitespace-nowrap">
              <LogIn size={16} />
              <span className="hidden sm:inline">Đăng nhập</span>
            </Link>
          ) : (
            <Link href="/account" className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-50 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors duration-200 whitespace-nowrap">
              <span className="hidden sm:inline">{userLabel}</span>
              <span className="sm:hidden">👤</span>
            </Link>
          )}
        </div>

      </div>
    </div>
  )
}
