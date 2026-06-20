"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Activity, Bell, BookOpenText, BrainCircuit, DatabaseZap, Home, Menu, MessageSquare, Mic, Newspaper, Search, ServerCog, Settings, ShieldCheck, Smile, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"

type Item = { href: string; label: string; Icon: any }
type UserRole = "patient" | "doctor" | "admin"

export function MobileBottomNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>("patient")

  useEffect(() => {
    try {
      const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null
      if (role === "doctor" || role === "admin" || role === "patient") {
        setUserRole(role)
      } else {
        setUserRole("patient")
      }
    } catch {
      setUserRole("patient")
    }
  }, [pathname])

  const primary = useMemo<Item[]>(() => {
    if (userRole === "doctor") {
      return [
        { href: "/doctor", label: "Bảng điều khiển", Icon: Home },
        { href: "/doctor/patients", label: "Bệnh nhân", Icon: Users },
        { href: "/doctor/appointments", label: "Lịch hẹn", Icon: Bell },
      ]
    }
    if (userRole === "admin") {
      return [
        { href: "/quan-ly", label: "Tổng quan", Icon: ShieldCheck },
        { href: "/quan-ly/user", label: "Người dùng", Icon: Users },
        { href: "/admin/server", label: "Runtime", Icon: ServerCog },
      ]
    }
    return [
      { href: "/tu-van", label: "Tư vấn", Icon: MessageSquare },
      { href: "/tam-su", label: "Tâm sự", Icon: Smile },
      { href: "/speech-chat", label: "Stream", Icon: Mic },
    ]
  }, [userRole])

  const more = useMemo<Item[]>(() => {
    if (userRole === "doctor") {
      return [
        { href: "/doctor/reports", label: "Báo cáo", Icon: BookOpenText },
        { href: "/doctor/forum", label: "Chia sẻ", Icon: MessageSquare },
        { href: "/doctor/profile", label: "Hồ sơ", Icon: Settings },
        { href: "/tra-cuu", label: "Tra cứu", Icon: Search },
      ]
    }
    if (userRole === "admin") {
      return [
        { href: "/quan-ly/data", label: "Dữ liệu", Icon: DatabaseZap },
        { href: "/quan-ly/config", label: "Cấu hình", Icon: Settings },
        { href: "/admin/server", label: "Runtime", Icon: ServerCog },
        { href: "/", label: "Trang chủ", Icon: Home },
      ]
    }
    return [
      { href: "/", label: "Trang chủ", Icon: Home },
      { href: "/agent-hub", label: "Agent", Icon: BrainCircuit },
      { href: "/tra-cuu", label: "Tra cứu", Icon: Search },
      { href: "/sang-loc", label: "Sàng lọc", Icon: Activity },
      { href: "/tin-tuc-y-khoa", label: "Tin tức", Icon: Newspaper },
      { href: "/tri-lieu", label: "Trị liệu", Icon: BookOpenText },
      { href: "/nhac-nho", label: "Nhắc nhở", Icon: Bell },
    ]
  }, [userRole])

  if (!pathname) return null
  if (pathname === "/" || pathname === "/ke-hoach") return null

  return (
    <div className="sm:hidden fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-4xl px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <div className="glass-panel dark:glass-panel-dark flex h-[var(--mobile-nav-height)] items-center justify-around rounded-[1.35rem] border border-border/70 px-1.5">
          {primary.map(({ href, label, Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex w-20 flex-col items-center justify-center gap-1 rounded-xl py-2 transition active:scale-[0.98]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border transition",
                    active
                      ? "border-primary/10 bg-primary/10 text-primary shadow-[0_14px_28px_-22px_rgba(20,71,230,0.9)]"
                      : "border-transparent bg-secondary/80 text-muted-foreground",
                  )}
                >
                  <Icon size={20} />
                </div>
                <div className="text-[10px] font-semibold tracking-tight">{label}</div>
              </Link>
            )
          })}

          <Drawer open={open} onOpenChange={setOpen} direction="bottom">
            <DrawerTrigger asChild>
              <button
                type="button"
                className="flex w-20 flex-col items-center justify-center gap-1 rounded-xl py-2 text-muted-foreground transition active:scale-[0.98]"
                aria-label="Mở menu"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent bg-secondary/80">
                  <Menu size={20} />
                </div>
                <div className="text-[10px] font-semibold tracking-tight">Menu</div>
              </button>
            </DrawerTrigger>
            <DrawerContent className="rounded-t-[1.75rem] border-t border-border/70 bg-background px-3 pb-6">
              <DrawerHeader>
                <DrawerTitle className="text-base font-semibold">Các chức năng khác</DrawerTitle>
              </DrawerHeader>
              <div className="px-1 grid grid-cols-2 gap-2">
                {more.map(({ href, label, Icon }) => {
                  const active = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition active:scale-[0.98]",
                        active
                          ? "border-primary/15 bg-primary/5 text-primary"
                          : "border-border/70 bg-card text-foreground",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl",
                          active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                        )}
                      >
                        <Icon size={18} />
                      </div>
                      <span>{label}</span>
                    </Link>
                  )
                })}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </div>
  )
}
