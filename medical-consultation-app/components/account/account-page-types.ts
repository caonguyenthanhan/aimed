"use client"

export type AccountProfile = {
  full_name: string
  nickname?: string
  bio?: string
  email?: string
  email_verified?: boolean
  phone?: string
  joined_at?: string
  avatar_url?: string
  social_links?: { google?: boolean; facebook?: boolean }
}

export function mask_phone(phone?: string) {
  if (!phone) return ""
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 4) return phone
  const head = digits.slice(0, 3)
  const tail = digits.slice(-3)
  return `${head}***${tail}`
}

export function initial_from_name(name: string) {
  const trimmed = String(name || "").trim()
  if (!trimmed) return ""
  const parts = trimmed.split(/\s+/).filter(Boolean)
  return parts[parts.length - 1]?.[0]?.toUpperCase() || trimmed[0]?.toUpperCase() || ""
}

export function get_join_info(joinedAt?: string) {
  if (!joinedAt) return "Thành viên từ tháng 12/2025"
  try {
    const parsed = new Date(joinedAt)
    const month = parsed.toLocaleString("vi-VN", { month: "long" })
    return `Thành viên từ ${month}/${parsed.getFullYear()}`
  } catch {
    return `Thành viên từ ${joinedAt}`
  }
}
