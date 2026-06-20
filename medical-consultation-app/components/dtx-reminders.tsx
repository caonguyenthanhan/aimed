"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { requestNotificationPermission, showNotification } from "@/lib/notifications"
import { getUserState, upsertUserState } from "@/lib/user-state-client"
import { deleteReminder, loadReminders, markFired, saveReminders, shouldFireToday, upsertReminder, type ReminderItem } from "@/lib/reminders-store"
import { getCarePlan } from "@/lib/screening-store"
import { useToast } from "@/hooks/use-toast"
import { appendTherapyEvent } from "@/lib/therapy-store"
import { Bell, BellOff, Info, Send, Settings, ShieldAlert, Sparkles } from "lucide-react"

const REMOTE_NS = "dtx"

// Helper to convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function DtxReminders() {
  const { toast } = useToast()
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [items, setItems] = useState<ReminderItem[]>([])

  // Web Push Subscription states
  const [isPushSubscribed, setIsPushSubscribed] = useState(false)
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null)
  const [isSubscribing, setIsSubscribing] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermission(Notification.permission)
      }
    } catch {}
    setItems(loadReminders())
  }, [])

  // Check existing push subscription on mount
  useEffect(() => {
    const checkSubscription = async () => {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.getSubscription()
          setPushSubscription(sub)
          setIsPushSubscribed(!!sub)
        } catch (e) {
          console.error("Error checking push subscription:", e)
        }
      }
    }
    void checkSubscription()
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

  // Local-first background reminder polling
  useEffect(() => {
    const tick = async () => {
      const now = new Date()
      const due = items.filter((x) => shouldFireToday(x, now))
      if (!due.length) return
      for (const it of due) {
        const ok = await showNotification("Nhắc nhở từ AIMed", {
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

  // Function to register for Web Push
  const subscribeToPush = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      toast({
        title: "Lỗi trình duyệt",
        description: "Trình duyệt không hỗ trợ Service Worker hoặc Push Notifications",
        variant: "destructive",
      })
      return
    }

    setIsSubscribing(true)
    try {
      const p = await requestNotificationPermission()
      setPermission(p)
      if (p !== "granted") {
        toast({
          title: "Quyền bị từ chối",
          description: "Vui lòng cho phép nhận thông báo trong cài đặt trình duyệt để tiếp tục.",
          variant: "destructive",
        })
        setIsSubscribing(false)
        return
      }

      const reg = await navigator.serviceWorker.ready
      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "BF0pLxhW7m4JTvlANfIAt51cjgxreWngkeeE8fAfuoL6ojLiGX1GMf9s7dysF4J6aJJ3SymKrRirqlLlEzay4Yw"

      const convertedKey = urlBase64ToUint8Array(vapidPublicKey)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      })

      // Send to Next.js API endpoint to save
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      })

      const data = await res.json()
      if (data.success) {
        setPushSubscription(sub)
        setIsPushSubscribed(true)
        toast({
          title: "Đăng ký thành công",
          description: "Thiết bị của bạn đã được kết nối với hệ thống thông báo đẩy (Web Push) của AIMed.",
        })
      } else {
        throw new Error(data.reason || "Lỗi server")
      }
    } catch (err) {
      console.error("Failed to subscribe to push:", err)
      toast({
        title: "Đăng ký thất bại",
        description: "Không thể thiết lập đẩy: " + String(err),
        variant: "destructive",
      })
    } finally {
      setIsSubscribing(false)
    }
  }

  // Function to unsubscribe from Web Push
  const unsubscribeFromPush = async () => {
    if (!pushSubscription) return
    try {
      await pushSubscription.unsubscribe()
      setPushSubscription(null)
      setIsPushSubscribed(false)
      toast({
        title: "Hủy đăng ký thành công",
        description: "Đã hủy đăng ký nhận thông báo đẩy từ trình duyệt này.",
      })
    } catch (err) {
      toast({
        title: "Lỗi hủy đăng ký",
        description: String(err),
        variant: "destructive",
      })
    }
  }

  // Trigger test notification through backend Web Push cycle
  const testWebPush = async () => {
    if (!pushSubscription) {
      toast({
        title: "Chưa đăng ký",
        description: "Bạn cần bật tính năng nhận tin nhắn đẩy (Web Push) trước khi gửi thử.",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: pushSubscription,
          title: "Nhắc nhở từ AIMed (Web Push)",
          body: "Hệ thống thông báo đẩy từ Server hoạt động hoàn hảo!",
          url: "/tri-lieu",
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast({
          title: "Đã kích hoạt gửi thử",
          description: "Thông báo đẩy đang được truyền qua máy chủ đến thiết bị của bạn...",
        })
      } else {
        throw new Error(data.reason || "Lỗi từ server")
      }
    } catch (err) {
      toast({
        title: "Gửi thử thất bại",
        description: String(err),
        variant: "destructive",
      })
    }
  }

  const canEnable = useMemo(() => permission === "granted", [permission])

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* Header Info */}
      <div className="rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur-xl dark:bg-card/60 flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
          <Bell className="h-6 w-6 animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nhắc nhở bài tập hành vi (JITAI)</div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Hệ thống hỗ trợ nhắc nhở đúng lúc theo giờ bạn chọn để thực hành các hoạt động kích hoạt hành vi (Behavioral Activation), giúp cải thiện tâm trạng một cách tự nhiên.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Permission and local status */}
        <Card className="app-surface border-0 bg-card/90 shadow-none md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-500" />
              Thiết lập Quyền
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border p-3 text-xs space-y-1.5 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Quyền hệ thống:</span>
                <span className={`font-semibold capitalize ${canEnable ? "text-emerald-600" : "text-amber-600"}`}>
                  {permission === "default" ? "Chưa cấp" : permission}
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-1.5 mt-1.5">
                <span className="text-muted-foreground">Service Worker:</span>
                <span className="font-semibold text-emerald-600">Đã đăng ký</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="rounded-xl text-xs py-1.5 h-auto w-full"
                onClick={async () => {
                  const p = await requestNotificationPermission()
                  setPermission(p)
                }}
              >
                Yêu cầu quyền thông báo
              </Button>
              <Button
                variant="outline"
                className="rounded-xl text-xs py-1.5 h-auto w-full"
                disabled={permission !== "granted"}
                onClick={async () => {
                  await showNotification("Thông báo từ AIMed", {
                    body: "Đây là thông báo kiểm tra hiển thị cục bộ (Local).",
                  })
                }}
              >
                Gửi thông báo cục bộ
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Web Push Registration Card */}
        <Card className="app-surface border-0 bg-card/90 shadow-none md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Đăng ký Web Push (Nhắc nhở khi đóng app)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Thông báo đẩy (Web Push) cho phép máy chủ gửi nhắc nhở đến thiết bị của bạn ngay cả khi bạn không mở trình duyệt hoặc ứng dụng AIMed.
            </p>

            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isPushSubscribed ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                  {isPushSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold">Nhắc nhở chạy ngầm (Web Push)</div>
                  <div className="text-[10px] text-muted-foreground">
                    {isPushSubscribed ? "Đã đăng ký nhận tin từ máy chủ" : "Chưa đăng ký nhận tin từ máy chủ"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isPushSubscribed ? (
                  <Button
                    variant="outline"
                    className="rounded-lg text-xs h-8 text-rose-600 border-rose-200 bg-rose-50/50 hover:bg-rose-50"
                    onClick={unsubscribeFromPush}
                  >
                    Hủy đăng ký
                  </Button>
                ) : (
                  <Button
                    className="rounded-lg text-xs h-8 bg-primary text-primary-foreground hover:opacity-90"
                    onClick={subscribeToPush}
                    disabled={isSubscribing}
                  >
                    {isSubscribing ? "Đang kết nối..." : "Bật Web Push"}
                  </Button>
                )}
              </div>
            </div>

            {isPushSubscribed && (
              <div className="flex justify-between items-center gap-2 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="flex gap-2 items-start">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                    Thiết bị đã kết nối thành công. Nhấn nút kiểm thử để nhận tin nhắn đẩy mô phỏng từ Server.
                  </span>
                </div>
                <Button
                  onClick={testWebPush}
                  size="sm"
                  className="rounded-lg text-xs h-8 shrink-0 bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
                >
                  <Send className="h-3 w-3" /> Kiểm thử Web Push
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Settings Card */}
      <Card className="app-surface border-0 bg-card/90 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-indigo-500" />
            Quản lý Lịch Nhắc nhở
          </CardTitle>
          <CardDescription>Cài đặt mốc thời gian gửi thông báo bài tập hành vi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="outline"
              className="rounded-xl text-xs py-2 h-auto"
              onClick={() => {
                const id = `r-${Date.now().toString(16)}`
                const next: ReminderItem = { id, enabled: true, time: "20:30", message: "Hãy dành 5 phút thực hành thở sâu để giảm lo âu.", last_fired_day: "" }
                upsertReminder(next)
                setItems(loadReminders())
              }}
            >
              Thêm nhắc nhở mới
            </Button>
            <Button
              variant="outline"
              className="rounded-xl text-xs py-2 h-auto"
              onClick={() => {
                const plan = getCarePlan()
                if (!plan?.suggestedReminders?.length) {
                  toast({
                    title: "Chưa có gợi ý",
                    description: "Bạn cần hoàn thành sàng lọc tâm lý trước để nhận gợi ý bài tập phù hợp.",
                  })
                  return
                }
                for (const r of plan.suggestedReminders) {
                  upsertReminder({ id: r.id, enabled: r.enabled, time: r.time, message: r.message, last_fired_day: "" })
                }
                setItems(loadReminders())
                toast({
                  title: "Đã thêm gợi ý",
                  description: `Đã tự động thêm các nhắc nhở bài tập hành vi phù hợp với kế hoạch điều trị.`,
                })
              }}
            >
              Thêm gợi ý từ kết quả Sàng lọc
            </Button>
          </div>

          <div className="space-y-3.5 mt-2">
            {items.length ? (
              items.map((it) => (
                <div key={it.id} className="space-y-3.5 rounded-xl border bg-slate-50/30 dark:bg-slate-900/10 p-4">
                  <div className="flex items-center justify-between gap-3 border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">Trạng thái nhắc:</span>
                      <span className={`text-xs font-bold ${it.enabled ? "text-primary" : "text-muted-foreground"}`}>
                        {it.enabled ? "Đang bật" : "Đã tắt"}
                      </span>
                    </div>
                    <Switch
                      checked={it.enabled}
                      onCheckedChange={(checked) => {
                        const next = { ...it, enabled: checked }
                        upsertReminder(next)
                        setItems(loadReminders())
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Giờ nhắc</div>
                      <Input
                        type="time"
                        value={it.time}
                        className="rounded-xl text-sm"
                        onChange={(e) => {
                          upsertReminder({ ...it, time: e.target.value })
                          setItems(loadReminders())
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Phương thức kích hoạt</div>
                      <div className="text-xs p-3 rounded-lg border bg-white dark:bg-slate-950 flex items-start gap-2">
                        <ShieldAlert className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">
                          {isPushSubscribed && it.enabled
                            ? "Tự động gửi qua Web Push server kể cả khi tắt máy."
                            : "Nhắc cục bộ khi tab ứng dụng đang hoạt động."}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nội dung thông điệp</div>
                    <Textarea
                      value={it.message}
                      onChange={(e) => {
                        upsertReminder({ ...it, message: e.target.value })
                        setItems(loadReminders())
                      }}
                      rows={2}
                      className="resize-none rounded-xl text-sm"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 border-t mt-2">
                    <Button
                      variant="outline"
                      className="rounded-xl text-xs py-1.5 h-auto"
                      disabled={!canEnable}
                      onClick={async () => {
                        const ok = await showNotification("Nhắc nhở thử", { body: it.message })
                        if (!ok) toast({ title: "Nhắc nhở", description: it.message })
                        upsertReminder({ ...it, last_fired_day: "" })
                        setItems(loadReminders())
                      }}
                    >
                      Bắn thử ngay
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl text-xs py-1.5 h-auto text-rose-600 border-rose-100 hover:bg-rose-50"
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
              <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-xl">
                Chưa cấu hình mốc nhắc nhở nào. Hãy thêm mốc đầu tiên của bạn!
              </div>
            )}
          </div>

          <Button
            className="w-full rounded-xl mt-4"
            disabled={!canEnable}
            onClick={async () => {
              const ok = await showNotification("Hệ thống nhắc nhở AIMed", {
                body: "Toàn bộ nhắc nhở của bạn đã sẵn sàng hoạt động ổn định.",
              })
              if (!ok) toast({ title: "Nhắc nhở", description: "Hệ thống nhắc nhở đã sẵn sàng hoạt động." })
            }}
          >
            Kiểm tra trạng thái toàn hệ thống
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
