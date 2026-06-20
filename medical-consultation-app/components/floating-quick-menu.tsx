'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Activity, DatabaseZap, MessageSquare, Mic, Plus, ServerCog, Settings, ShieldCheck, Smile, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type UserRole = "patient" | "doctor" | "admin"

const HIDDEN_PATHS = new Set([
  "/account",
  "/ke-hoach",
  "/tu-van",
  "/tam-su",
  "/tri-lieu",
  "/speech-chat",
  "/nhac-nho",
  "/sang-loc",
])

export default function FloatingQuickMenu() {
  const pathname = usePathname()
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

  const items = useMemo(() => {
    if (userRole === "doctor") {
      return [
        { href: "/doctor", label: "Bảng điều khiển", icon: ShieldCheck },
        { href: "/doctor/patients", label: "Bệnh nhân", icon: Users },
        { href: "/doctor/appointments", label: "Lịch hẹn", icon: Activity },
        { href: "/doctor/reports", label: "Báo cáo", icon: MessageSquare },
      ]
    }
    if (userRole === "admin") {
      return [
        { href: "/quan-ly", label: "Tổng quan", icon: ShieldCheck },
        { href: "/quan-ly/user", label: "Người dùng", icon: Users },
        { href: "/quan-ly/data", label: "Dữ liệu", icon: DatabaseZap },
        { href: "/admin/server", label: "Runtime", icon: ServerCog },
        { href: "/quan-ly/config", label: "Cấu hình", icon: Settings },
      ]
    }
    return [
      { href: "/tu-van", label: "Tư vấn", icon: MessageSquare },
      { href: "/sang-loc", label: "Sàng lọc", icon: Activity },
      { href: "/tam-su", label: "Tâm sự", icon: Smile },
      { href: "/speech-chat", label: "Stream", icon: Mic },
    ]
  }, [userRole])

  if (!pathname) return null
  if (HIDDEN_PATHS.has(pathname)) return null

  return (
    <div className="hidden sm:block fixed bottom-8 right-8 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            className="h-14 w-14 rounded-full border border-white/30 bg-gradient-to-br from-primary via-accent to-teal-accent text-white shadow-[0_22px_50px_-24px_rgba(20,71,230,0.95)] transition-all hover:-translate-y-1 hover:scale-105 hover:from-primary hover:to-primary active:scale-95"
            aria-label="Mở menu nhanh"
          >
            <Plus className="size-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          className="glass-panel dark:glass-panel-dark min-w-56 rounded-2xl border border-border/70 p-2"
        >
          {items.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 transition",
                  "hover:bg-secondary/85",
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <item.icon className="size-5" />
                </span>
                <span className="font-medium text-foreground">{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
