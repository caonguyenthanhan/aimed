"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import { Activity, Bell, BookOpenText, Home, Menu, MessageSquare, Mic, Newspaper, Search, Smile } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"

type Item = { href: string; label: string; Icon: any }

export function MobileBottomNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const primary = useMemo<Item[]>(
    () => [
      { href: "/tu-van", label: "Tư vấn", Icon: MessageSquare },
      { href: "/tam-su", label: "Tâm sự", Icon: Smile },
      { href: "/speech-chat", label: "Stream", Icon: Mic },
    ],
    [],
  )

  const more = useMemo<Item[]>(
    () => [
      { href: "/", label: "Trang chủ", Icon: Home },
      { href: "/tra-cuu", label: "Tra cứu", Icon: Search },
      { href: "/sang-loc", label: "Sàng lọc", Icon: Activity },
      { href: "/tin-tuc-y-khoa", label: "Tin tức", Icon: Newspaper },
      { href: "/tri-lieu", label: "Trị liệu", Icon: BookOpenText },
      { href: "/nhac-nho", label: "Nhắc nhở", Icon: Bell },
    ],
    [],
  )

  if (!pathname) return null
  if (pathname === "/" || pathname === "/ke-hoach") return null

  return (
    <div className="sm:hidden fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-4xl px-3 pb-[env(safe-area-inset-bottom)]">
        <div className="h-16 rounded-2xl border border-white/40 bg-white/80 backdrop-blur-xl shadow-lg flex items-center justify-around">
          {primary.map(({ href, label, Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 w-20 py-2 rounded-xl active:scale-[0.99] transition ${
                  active ? "text-blue-700" : "text-slate-700"
                }`}
              >
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${active ? "bg-blue-600 text-white" : "bg-slate-100"}`}>
                  <Icon size={18} />
                </div>
                <div className="text-[11px] font-medium">{label}</div>
              </Link>
            )
          })}

          <Drawer open={open} onOpenChange={setOpen} direction="bottom">
            <DrawerTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-center justify-center gap-1 w-20 py-2 rounded-xl active:scale-[0.99] transition text-slate-700"
                aria-label="Mở menu"
              >
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100">
                  <Menu size={18} />
                </div>
                <div className="text-[11px] font-medium">Menu</div>
              </button>
            </DrawerTrigger>
            <DrawerContent className="px-2 pb-4">
              <DrawerHeader>
                <DrawerTitle className="text-sm">Menu</DrawerTitle>
              </DrawerHeader>
              <div className="px-2 pb-2 grid grid-cols-2 gap-2">
                {more.map(({ href, label, Icon }) => {
                  const active = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition active:scale-[0.99] ${
                        active ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                        <Icon size={18} />
                      </div>
                      <div className="font-medium">{label}</div>
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

