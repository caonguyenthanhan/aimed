"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { requestNotificationPermission, showNotification } from "@/lib/notifications"
import { getUserState, upsertUserState } from "@/lib/user-state-client"
import { deleteReminder, loadReminders, markFired, saveReminders, shouldFireToday, upsertReminder, type ReminderItem } from "@/lib/reminders-store"
import { getCarePlan } from "@/lib/screening-store"
import { useToast } from "@/hooks/use-toast"
import { appendTherapyEvent } from "@/lib/therapy-store"

const REMOTE_NS = "dtx"

export function DtxReminders() {
  const { toast } = useToast()
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [items, setItems] = useState<ReminderItem[]>([])

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermission(Notification.permission)
      }
    } catch {}
    setItems(loadReminders())
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const items = await getUserState(REMOTE_NS)
      if (cancelled) return
      const remote = items.find((x: any) => x?.key === "reminders_v1")?.value
      if (Array.isArray(remote) && remote.length) {
        try {
          setItems(remote as any)
          saveReminders(remote as any)
        } catch {}
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    saveReminders(items)
    void upsertUserState(REMOTE_NS, "reminders_v1", items)
  }, [items])

  useEffect(() => {
    const tick = async () => {
      const now = new Date()
      const due = items.filter((x) => shouldFireToday(x, now))
      if (!due.length) return
      for (const it of due) {
        const ok = await showNotification("Nhắc nhở", {
          body: it.message,
          tag: `mcs_reminder_${it.id}`,
        })
        if (!ok) {
          toast({ title: "Nhắc nhở", description: it.message })
        }
        markFired(it.id)
        appendTherapyEvent("reminder_fired", { reminder_id: it.id, time: it.time })
        setItems(loadReminders())
      }
    }
    const id = window.setInterval(() => void tick(), 20_000)
    const onVis = () => void tick()
    try {
      document.addEventListener("visibilitychange", onVis)
    } catch {}
    void tick()
    return () => window.clearInterval(id)
  }, [items, toast])

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
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                const id = `r-${Date.now().toString(16)}`
                const next: ReminderItem = { id, enabled: true, time: "20:30", message: "Nhắc nhở mới", last_fired_day: "" }
                upsertReminder(next)
                setItems(loadReminders())
              }}
            >
              Thêm nhắc
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                const plan = getCarePlan()
                if (!plan?.suggestedReminders?.length) return
                for (const r of plan.suggestedReminders) {
                  upsertReminder({ id: r.id, enabled: r.enabled, time: r.time, message: r.message, last_fired_day: "" })
                }
                setItems(loadReminders())
              }}
            >
              Thêm gợi ý từ sàng lọc
            </Button>
          </div>

          <div className="space-y-3">
            {items.length ? (
              items.map((it) => (
                <div key={it.id} className="rounded-xl border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">Bật</div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...it, enabled: !it.enabled }
                        upsertReminder(next)
                        setItems(loadReminders())
                      }}
                      className={`h-9 px-4 rounded-xl text-sm border active:scale-[0.99] ${
                        it.enabled ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-800 border-slate-200"
                      }`}
                    >
                      {it.enabled ? "Đang bật" : "Đang tắt"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Giờ nhắc</div>
                      <Input
                        type="time"
                        value={it.time}
                        onChange={(e) => {
                          upsertReminder({ ...it, time: e.target.value })
                          setItems(loadReminders())
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Điều kiện</div>
                      <div className="text-sm text-muted-foreground">Nhắc ổn định nhất khi app đang mở (PWA sẽ tốt hơn).</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-medium">Nội dung nhắc</div>
                    <textarea
                      value={it.message}
                      onChange={(e) => {
                        upsertReminder({ ...it, message: e.target.value })
                        setItems(loadReminders())
                      }}
                      rows={3}
                      className="w-full border rounded-xl px-3 py-2 text-sm resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      disabled={!canEnable}
                      onClick={async () => {
                        const ok = await showNotification("Nhắc nhở", { body: it.message })
                        if (!ok) toast({ title: "Nhắc nhở", description: it.message })
                        upsertReminder({ ...it, last_fired_day: "" })
                        setItems(loadReminders())
                      }}
                    >
                      Gửi thử
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        deleteReminder(it.id)
                        setItems(loadReminders())
                      }}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Chưa có nhắc nhở.</div>
            )}
          </div>

          <Button
            className="w-full rounded-xl"
            disabled={!canEnable}
            onClick={async () => {
              const ok = await showNotification("Nhắc nhở", { body: "Bạn sẽ nhận nhắc nhở theo các thiết lập bên trên." })
              if (!ok) toast({ title: "Nhắc nhở", description: "Bạn sẽ nhận nhắc nhở theo các thiết lập bên trên." })
            }}
          >
            Kiểm tra nhắc nhở
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
