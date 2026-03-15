"use client"

import { useEffect, useState } from "react"

export function RoleGuard({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const run = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
      if (!token) {
        window.location.href = "/login"
        return
      }
      try {
        const r = await fetch("/api/backend/v1/user", { headers: { Authorization: `Bearer ${token}` } })
        if (!r.ok) {
          window.location.href = "/login"
          return
        }
        const u = await r.json()
        const role = String(u?.role || "").toUpperCase()
        const allow = new Set((roles || []).map((x) => String(x || "").toUpperCase()).filter(Boolean))
        if (allow.size && !allow.has(role)) {
          window.location.href = "/"
          return
        }
        setOk(true)
      } catch {
        window.location.href = "/login"
      }
    }
    run()
  }, [roles])

  if (!ok) return null
  return <>{children}</>
}
