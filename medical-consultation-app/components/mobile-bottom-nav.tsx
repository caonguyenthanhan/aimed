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
        <div className="glass-panel dark:glass-panel-dark rounded-2xl h-16 flex items-center justify-around">
          {primary.map(({ href, label, Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 w-20 py-2 rounded-lg transition active:scale-[0.98] ${
                  active ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center transition ${
                  active 
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}>
                  <Icon size={20} />
                </div>
                <div className="text-[10px] font-semibold">{label}</div>
              </Link>
            )
          })}

          <Drawer open={open} onOpenChange={setOpen} direction="bottom">
            <DrawerTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-center justify-center gap-1 w-20 py-2 rounded-lg transition active:scale-[0.98] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300"
                aria-label="Mở menu"
              >
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">
                  <Menu size={20} />
                </div>
                <div className="text-[10px] font-semibold">Menu</div>
              </button>
            </DrawerTrigger>
            <DrawerContent className="px-3 pb-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <DrawerHeader>
                <DrawerTitle className="text-base">Các chức năng khác</DrawerTitle>
              </DrawerHeader>
              <div className="px-1 grid grid-cols-2 gap-2">
                {more.map(({ href, label, Icon }) => {
                  const active = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-medium transition active:scale-[0.98] ${
                        active 
                          ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" 
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-50 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                        active 
                          ? "bg-blue-600 dark:bg-blue-600 text-white" 
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                      }`}>
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

