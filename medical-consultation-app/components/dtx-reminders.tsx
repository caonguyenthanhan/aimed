"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { readLocal, writeLocal } from "@/lib/local-store"
import { requestNotificationPermission, showNotification } from "@/lib/notifications"

type ReminderSettings = {
  enabled: boolean
  time: string
  message: string
  last_fired_day?: string
}

const KEY = "mcs_ba_reminder_v1"

const todayKey = () => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

const parseTimeToMs = (time: string) => {
  const t = String(time || "").trim()
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!m) return null
  const hh = Math.max(0, Math.min(23, Number(m[1])))
  const mm = Math.max(0, Math.min(59, Number(m[2])))
  return { hh, mm }
}

export function DtxReminders() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: false,
    time: "20:30",
    message: "Đến giờ làm 1 việc nhỏ cho bản thân: đi bộ 10 phút, dọn bàn, hoặc nhắn tin cho người thân.",
  })

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermission(Notification.permission)
      }
    } catch {}
    const s = readLocal<ReminderSettings>(KEY, settings)
    setSettings({ ...settings, ...(s || {}) })
  }, [])

  useEffect(() => {
    writeLocal(KEY, settings)
  }, [settings])

  useEffect(() => {
    if (!settings.enabled) return
    const parts = parseTimeToMs(settings.time)
    if (!parts) return
    const tick = async () => {
      const now = new Date()
      const day = todayKey()
      const last = settings.last_fired_day || ""
      if (last === day) return
      if (now.getHours() !== parts.hh) return
      if (now.getMinutes() !== parts.mm) return
      const ok = await showNotification("Nhắc nhở hoạt động", {
        body: settings.message,
        tag: "mcs_ba_daily",
      })
      if (ok) {
        setSettings((prev) => ({ ...prev, last_fired_day: day }))
      }
    }
    const id = window.setInterval(() => void tick(), 20_000)
    return () => window.clearInterval(id)
  }, [settings.enabled, settings.time, settings.message, settings.last_fired_day])

  const canEnable = useMemo(() => permission === "granted", [permission])

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="rounded-2xl border bg-white/80 backdrop-blur-xl shadow-sm p-4">
        <div className="text-lg font-semibold">Nhắc nhở bài tập hành vi</div>
        <div className="text-sm text-muted-foreground">
          JITAI đơn giản: nhắc đúng lúc theo giờ bạn chọn, ưu tiên “việc nhỏ” dễ làm.
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Thông báo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            Trạng thái quyền: <span className="font-medium">{permission}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={async () => {
                const p = await requestNotificationPermission()
                setPermission(p)
              }}
            >
              Bật quyền thông báo
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={permission !== "granted"}
              onClick={async () => {
                await showNotification("Thông báo thử", { body: "Bạn sẽ nhận nhắc nhở ở đây." })
              }}
            >
              Gửi thử
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Thiết lập nhắc nhở</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">Bật nhắc nhở hằng ngày</div>
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
              className={`h-9 px-4 rounded-xl text-sm border active:scale-[0.99] ${
                settings.enabled ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-800 border-slate-200"
              }`}
            >
              {settings.enabled ? "Đang bật" : "Đang tắt"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Giờ nhắc</div>
              <Input
                type="time"
                value={settings.time}
                onChange={(e) => setSettings((s) => ({ ...s, time: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Điều kiện</div>
              <div className="text-sm text-muted-foreground">
                Nhắc khi bạn đang mở ứng dụng (PWA sẽ ổn định hơn).
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Nội dung nhắc</div>
            <textarea
              value={settings.message}
              onChange={(e) => setSettings((s) => ({ ...s, message: e.target.value }))}
              rows={4}
              className="w-full border rounded-xl px-3 py-2 text-sm resize-none"
            />
          </div>

          <Button
            className="w-full rounded-xl"
            disabled={!canEnable}
            onClick={async () => {
              const ok = await showNotification("Nhắc nhở hoạt động", { body: settings.message })
              if (ok) setSettings((s) => ({ ...s, last_fired_day: "" }))
            }}
          >
            Kiểm tra nhắc nhở
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

