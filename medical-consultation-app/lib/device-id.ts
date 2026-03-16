export function getDeviceId(): string {
  try {
    if (typeof window === "undefined") return ""
    const key = "mcs_device_id_v1"
    const existing = localStorage.getItem(key)
    if (existing && existing.trim()) return existing.trim()
    const id = (globalThis.crypto && "randomUUID" in globalThis.crypto)
      ? (globalThis.crypto as any).randomUUID()
      : `d-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`
    localStorage.setItem(key, id)
    return id
  } catch {
    return ""
  }
}

