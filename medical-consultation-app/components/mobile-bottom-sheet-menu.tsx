"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import { Activity, Bell, BookOpenText, Home, Menu, MessageSquare, Search, Smile } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"

type Item = { href: string; label: string; Icon: any }

export function MobileBottomSheetMenu() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const items = useMemo<Item[]>(
    () => [
      { href: "/", label: "Trang chủ", Icon: Home },
      { href: "/tu-van", label: "Tư vấn", Icon: MessageSquare },
      { href: "/tam-su", label: "Tâm sự", Icon: Smile },
      { href: "/tra-cuu", label: "Tra cứu", Icon: Search },
      { href: "/sang-loc", label: "Sàng lọc", Icon: Activity },
      { href: "/tri-lieu", label: "Trị liệu", Icon: BookOpenText },
      { href: "/nhac-nho", label: "Nhắc nhở", Icon: Bell },
    ],
    [],
  )

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="bottom">
      <DrawerTrigger asChild>
        <button
          type="button"
          className="sm:hidden inline-flex items-center justify-center h-10 w-10 rounded-full border border-white/40 bg-white/70 backdrop-blur-xl text-slate-700 active:scale-95 transition"
          aria-label="Mở меню"
        >
          <Menu size={18} />
        </button>
      </DrawerTrigger>
      <DrawerContent className="px-2 pb-4">
        <DrawerHeader>
          <DrawerTitle className="text-sm">Menu</DrawerTitle>
        </DrawerHeader>
        <div className="px-2 pb-2 grid grid-cols-2 gap-2">
          {items.map(({ href, label, Icon }) => {
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
  )
}

