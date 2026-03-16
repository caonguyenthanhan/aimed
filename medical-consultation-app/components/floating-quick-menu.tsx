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
    <div className="hidden sm:block fixed bottom-6 right-6 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-500"
            aria-label="Mở menu nhanh"
          >
            <Plus className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="min-w-44">
          {DEFAULT_ITEMS.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} className="flex items-center gap-2">
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
