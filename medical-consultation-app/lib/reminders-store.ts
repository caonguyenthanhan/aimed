export type ReminderItem = {
  id: string
  enabled: boolean
  time: string
  message: string
  last_fired_day?: string
}

const KEY = "mcs_reminders_v1"
const LEGACY_KEY = "mcs_ba_reminder_v1"

function todayKey() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function loadReminders(): ReminderItem[] {
  try {
    const migrated = tryMigrateLegacy()
    if (migrated) return migrated
  } catch {}
  try {
    const arr = safeJsonParse<any[]>(localStorage.getItem(KEY))
    if (!Array.isArray(arr)) return []
    return arr
      .map((x) => ({
        id: String(x?.id || ""),
        enabled: !!x?.enabled,
        time: String(x?.time || ""),
        message: String(x?.message || ""),
        last_fired_day: typeof x?.last_fired_day === "string" ? x.last_fired_day : undefined,
      }))
      .filter((x) => x.id && x.time && x.message)
  } catch {
    return []
  }
}

export function saveReminders(items: ReminderItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {}
}

export function upsertReminder(item: ReminderItem) {
  const all = loadReminders()
  const i = all.findIndex((x) => x.id === item.id)
  const next = i >= 0 ? all.map((x) => (x.id === item.id ? item : x)) : [item, ...all]
  saveReminders(next.slice(0, 50))
}

export function deleteReminder(id: string) {
  const next = loadReminders().filter((x) => x.id !== id)
  saveReminders(next)
}

export function markFired(id: string) {
  const day = todayKey()
  const all = loadReminders()
  const next = all.map((x) => (x.id === id ? { ...x, last_fired_day: day } : x))
  saveReminders(next)
}

export function shouldFireToday(item: ReminderItem, now: Date) {
  const day = todayKey()
  if (!item.enabled) return false
  if (item.last_fired_day === day) return false
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(item.time || "").trim())
  if (!m) return false
  const hh = Math.max(0, Math.min(23, Number(m[1])))
  const mm = Math.max(0, Math.min(59, Number(m[2])))
  const target = new Date(now)
  target.setHours(hh, mm, 0, 0)
  const diff = now.getTime() - target.getTime()
  return diff >= 0 && diff <= 5 * 60 * 1000
}

function tryMigrateLegacy(): ReminderItem[] | null {
  const raw = localStorage.getItem(KEY)
  if (raw) return null
  const legacy = safeJsonParse<any>(localStorage.getItem(LEGACY_KEY))
  if (!legacy || typeof legacy !== "object") return null
  const enabled = !!legacy?.enabled
  const time = String(legacy?.time || "").trim() || "20:30"
  const message = String(legacy?.message || "").trim()
  if (!message) return null
  const last_fired_day = typeof legacy?.last_fired_day === "string" ? legacy.last_fired_day : undefined
  const migrated: ReminderItem[] = [{ id: "legacy_daily", enabled, time, message, last_fired_day }]
  saveReminders(migrated)
  return migrated
}

