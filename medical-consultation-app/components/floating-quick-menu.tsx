'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, MessageSquare, Mic, Plus, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const DEFAULT_ITEMS = [
  { href: "/tu-van", label: "Tư vấn", icon: MessageSquare },
  { href: "/sang-loc", label: "Sàng lọc", icon: Activity },
  { href: "/tam-su", label: "Tâm sự", icon: Smile },
  { href: "/speech-chat", label: "Stream", icon: Mic },
]

export default function FloatingQuickMenu() {
  const pathname = usePathname()

  if (!pathname) return null
  if (pathname === "/ke-hoach") return null

  return (
    <div className="hidden sm:block fixed bottom-8 right-8 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white transition-all hover:scale-110 active:scale-95"
            aria-label="Mở menu nhanh"
          >
            <Plus className="size-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="min-w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          {DEFAULT_ITEMS.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} className="flex items-center gap-3 px-4 py-2.5 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <item.icon className="size-5 text-blue-600 dark:text-blue-400" />
                <span className="text-slate-900 dark:text-slate-50 font-medium">{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
