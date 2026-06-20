'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Activity, Bell, BookOpenText, BrainCircuit, Calendar, ChevronDown, FileText, Home, LogIn, MessageSquare, Newspaper, Search, Smile, Stethoscope, Users } from 'lucide-react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import AccountMenu from './account-menu'
import LanguageSwitcher from './language-switcher'
import ThemeToggle from './theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
const ComputeToggle = dynamic(() => import('./compute-toggle'), { ssr: false })

type NavItem = {
  href: string
  label: string
}

type ToolItem = NavItem & {
  icon: React.ComponentType<{ size?: number; className?: string }>
}

function NavPill({ href, label, active }: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center rounded-full px-3 py-2 text-xs font-semibold transition-all duration-200',
        active
          ? 'bg-card text-foreground shadow-[0_10px_24px_-18px_rgba(20,71,230,0.95)] ring-1 ring-primary/10'
          : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
      )}
    >
      {label}
    </Link>
  )
}

export default function SiteHeader() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [userLabel, setUserLabel] = useState<string>("Tài khoản")
  const [userRole, setUserRole] = useState<string>("patient")
  
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

  const patientItems = useMemo<NavItem[]>(
    () => [
      { href: '/', label: 'Trang chủ' },
      { href: '/tu-van', label: 'Tư vấn' },
      { href: '/tam-su', label: 'Tâm sự' },
      { href: '/agent-hub', label: 'Agent' },
      { href: '/gioi-thieu', label: 'Hướng dẫn' },
    ],
    [],
  )

  const doctorItems = useMemo<NavItem[]>(
    () => [
      { href: '/doctor', label: 'Bảng điều khiển' },
      { href: '/doctor/patients', label: 'Bệnh nhân' },
      { href: '/doctor/reports', label: 'Báo cáo' },
      { href: '/doctor/appointments', label: 'Lịch hẹn' },
      { href: '/doctor/forum', label: 'Chia sẻ' },
    ],
    [],
  )

  const adminItems = useMemo<NavItem[]>(
    () => [
      { href: '/quan-ly', label: 'Tổng quan' },
      { href: '/quan-ly/user', label: 'Người dùng' },
      { href: '/quan-ly/data', label: 'Dữ liệu' },
      { href: '/quan-ly/config', label: 'Cấu hình' },
      { href: '/admin/server', label: 'Runtime' },
    ],
    [],
  )

  const toolItemsBase = useMemo<ToolItem[]>(
    () => [
    { href: '/tra-cuu', label: 'Tra cứu', icon: Search },
    { href: '/sang-loc', label: 'Sàng lọc', icon: Activity },
    { href: '/tri-lieu', label: 'Trị liệu', icon: BookOpenText },
    { href: '/nhac-nho', label: 'Nhắc nhở', icon: Bell },
    { href: '/tin-tuc-y-khoa', label: 'Tin tức', icon: Newspaper },
    ],
    [],
  )
  const toolItems =
    userRole === "doctor"
      ? [
          { href: "/tu-van", label: "Tư vấn", icon: MessageSquare },
          { href: "/tam-su", label: "Tâm sự", icon: Smile },
          ...toolItemsBase,
        ]
      : toolItemsBase

  const mainItems =
    userRole === 'doctor'
      ? doctorItems
      : userRole === 'admin'
        ? adminItems
        : patientItems
  const roleLabel =
    userRole === 'doctor'
      ? 'Doctor Portal'
      : userRole === 'admin'
        ? 'Admin Console'
        : 'Patient App'
  const appHref = userRole === 'doctor' ? '/doctor' : userRole === 'admin' ? '/quan-ly' : '/'

  if (!mounted || pathname === '/') return null

  return (
    <div className="fixed inset-x-0 top-2 z-50 flex justify-center px-2 sm:top-3 sm:px-3">
      <div
        data-site-header
        className="glass-panel dark:glass-panel-dark relative flex h-14 w-full max-w-6xl items-center justify-between gap-2 rounded-[1.1rem] border border-border/60 px-3 sm:h-[var(--header-height)] sm:rounded-full sm:px-4"
      >
        <Link href={appHref} className="flex min-w-0 items-center gap-2">
          <div className="rounded-xl bg-gradient-to-br from-primary via-accent to-teal-accent p-2 text-white shadow-[0_12px_24px_-16px_rgba(20,71,230,0.9)]">
            <BrainCircuit className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <div className="truncate text-sm font-bold tracking-tight text-foreground">
              <span className="text-primary">AI</span>Med
            </div>
            <div className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {roleLabel}
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full bg-secondary/70 p-1 md:flex">
          {mainItems.map((item) => (
            <NavPill key={item.href} href={item.href} label={item.label} active={pathname === item.href} />
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-background/80 hover:text-foreground">
                Công cụ
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass-panel dark:glass-panel-dark min-w-56 rounded-2xl border border-border/70 p-2"
            >
              {toolItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary/80"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
                      <item.icon size={16} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="hidden rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:inline-flex">
            {roleLabel}
          </div>
          <LanguageSwitcher />
          <ThemeToggle />
          <ComputeToggle />
          {!authed ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-[0_12px_24px_-16px_rgba(20,71,230,0.95)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 whitespace-nowrap"
            >
              <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Đăng nhập</span>
            </Link>
          ) : (
            <AccountMenu
              userLabel={userLabel}
              userRole={userRole as 'doctor' | 'patient' | 'admin'}
              userFullName={typeof window !== 'undefined' ? localStorage.getItem('userFullName') || undefined : undefined}
              userEmail={typeof window !== 'undefined' ? localStorage.getItem('userEmail') || undefined : undefined}
            />
          )}
        </div>
      </div>
    </div>
  )
}
