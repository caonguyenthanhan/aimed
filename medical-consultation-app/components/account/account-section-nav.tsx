"use client"

const navItems = [
  { href: "#profile", label: "Thông tin chung" },
  { href: "#accounts", label: "Quản lý tài khoản" },
  { href: "#security", label: "Bảo mật" },
  { href: "#settings", label: "Cài đặt" },
  { href: "#special", label: "Thông tin đặc thù" },
]

export function AccountSectionNav() {
  return (
    <div className="space-y-2">
      {navItems.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="block rounded-xl border border-border/70 bg-card/85 px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-background/80"
        >
          {item.label}
        </a>
      ))}
    </div>
  )
}
