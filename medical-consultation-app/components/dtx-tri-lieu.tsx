"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { readLocal, writeLocal } from "@/lib/local-store"
import { getUserState, upsertUserState } from "@/lib/user-state-client"
import { getCarePlan, getLastScreening, getScreeningHistory } from "@/lib/screening-store"
import { upsertReminder } from "@/lib/reminders-store"
import { appendTherapyEvent, createPlanFromCarePlan, getTherapyPlan, isTaskDone, listTherapyEvents, saveTherapyPlan, setTaskDone, type TherapyPlan } from "@/lib/therapy-store"
import { getDeviceId } from "@/lib/device-id"
import { getDailyCard, redrawToday, type TherapeuticCard } from "@/lib/therapeutic-cards"

type MoodEntry = {
  id: string
  ts: number
  mood: 1 | 2 | 3 | 4 | 5
  tags: string[]
  note: string
}

type JournalEntry = {
  id: string
  ts: number
  title: string
  content: string
}

const MOOD_KEY = "mcs_mood_entries_v1"
const JOURNAL_KEY = "mcs_journal_entries_v1"
const WHEEL_KEY = "mcs_wheel_of_life_v1"
const REMOTE_NS = "dtx"

const nowTs = () => Date.now()

const moodLabel = (m: number) => {
  if (m <= 1) return "Rất tệ"
  if (m === 2) return "Tệ"
  if (m === 3) return "Bình thường"
  if (m === 4) return "Tốt"
  return "Rất tốt"
}

const moodEmoji = (m: number) => {
  if (m <= 1) return "😞"
  if (m === 2) return "😕"
  if (m === 3) return "😐"
  if (m === 4) return "🙂"
  return "😄"
}

export function DtxTriLieu() {
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [moodNote, setMoodNote] = useState("")
  const [moodTags, setMoodTags] = useState<string[]>([])
  const [moodItems, setMoodItems] = useState<MoodEntry[]>([])

  const [journalTitle, setJournalTitle] = useState("")
  const [journalContent, setJournalContent] = useState("")
  const [journalItems, setJournalItems] = useState<JournalEntry[]>([])
  const [therapyPlan, setTherapyPlanState] = useState<TherapyPlan | null>(null)
  const [, setEventsTick] = useState(0)
  const [dailyCard, setDailyCard] = useState<{ day: string; card: TherapeuticCard | null }>(() => ({ day: "", card: null }))
  const [wheel, setWheel] = useState<Record<string, number>>({})

  const tagCandidates = useMemo(
    () => ["Ngủ kém", "Áp lực", "Lo âu", "Buồn", "Cô đơn", "Vận động", "Ăn uống", "Gia đình", "Công việc", "Học tập"],
    [],
  )

  useEffect(() => {
    const m = readLocal<MoodEntry[]>(MOOD_KEY, [])
    const j = readLocal<JournalEntry[]>(JOURNAL_KEY, [])
    setMoodItems(Array.isArray(m) ? m : [])
    setJournalItems(Array.isArray(j) ? j : [])
    try {
      const w = readLocal<Record<string, number>>(WHEEL_KEY, {})
      setWheel(w && typeof w === "object" ? (w as any) : {})
    } catch {
      setWheel({})
    }
    try {
      setTherapyPlanState(getTherapyPlan())
    } catch {
      setTherapyPlanState(null)
    }
    try {
      const seed = getDeviceId() || "device"
      const dc = getDailyCard(seed)
      setDailyCard({ day: dc.day, card: dc.card || null })
    } catch {
      setDailyCard({ day: "", card: null })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const items = await getUserState(REMOTE_NS)
      if (cancelled) return
      const moodRemote = items.find((x: any) => x?.key === "mood_entries")?.value
      const journalRemote = items.find((x: any) => x?.key === "journal_entries")?.value
      const wheelRemote = items.find((x: any) => x?.key === "wheel_of_life")?.value
      if (Array.isArray(moodRemote)) {
        setMoodItems(moodRemote as any)
        try { writeLocal(MOOD_KEY, moodRemote) } catch {}
      }
      if (Array.isArray(journalRemote)) {
        setJournalItems(journalRemote as any)
        try { writeLocal(JOURNAL_KEY, journalRemote) } catch {}
      }
      if (wheelRemote && typeof wheelRemote === "object") {
        setWheel(wheelRemote as any)
        try { writeLocal(WHEEL_KEY, wheelRemote) } catch {}
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    try { writeLocal(WHEEL_KEY, wheel) } catch {}
    void upsertUserState(REMOTE_NS, "wheel_of_life", wheel)
  }, [wheel])

  const wheelDims = useMemo(
    () => [
      { key: "su_nghiep", label: "Sự nghiệp" },
      { key: "tai_chinh", label: "Tài chính" },
      { key: "suc_khoe", label: "Sức khỏe" },
      { key: "tinh_cam", label: "Tình cảm" },
      { key: "gia_dinh", label: "Gia đình" },
      { key: "ban_be", label: "Bạn bè" },
      { key: "phat_trien", label: "Phát triển" },
      { key: "giai_tri", label: "Giải trí" },
    ],
    [],
  )

  const getWheelValue = (k: string) => {
    const v = Number((wheel as any)?.[k])
    if (!Number.isFinite(v)) return 5
    return Math.max(0, Math.min(10, Math.round(v)))
  }

  const setWheelValue = (k: string, v: number) => {
    setWheel((prev) => ({ ...(prev || {}), [k]: Math.max(0, Math.min(10, Math.round(v))) }))
  }

  const wheelPoints = useMemo(() => {
    const size = 320
    const cx = size / 2
    const cy = size / 2
    const r = 120
    const axes = wheelDims.length
    const pts: Array<{ x: number; y: number }> = []
    for (let i = 0; i < axes; i++) {
      const a = (-Math.PI / 2) + (2 * Math.PI * i) / axes
      const v = getWheelValue(wheelDims[i].key) / 10
      const x = cx + Math.cos(a) * r * v
      const y = cy + Math.sin(a) * r * v
      pts.push({ x, y })
    }
    return { size, cx, cy, r, pts }
  }, [wheel, wheelDims])

  const insight = useMemo(() => {
    const hist = (() => {
      try {
        return getScreeningHistory()
      } catch {
        return []
      }
    })()
    const phq = hist.filter((h) => String(h.assessment_id || "").toLowerCase().includes("phq") || String(h.title || "").toUpperCase().includes("PHQ"))
    const gad = hist.filter((h) => String(h.assessment_id || "").toLowerCase().includes("gad") || String(h.title || "").toUpperCase().includes("GAD"))
    const weekStart = (ts: number) => {
      const d = new Date(ts)
      const day = d.getDay()
      const diff = (day + 6) % 7
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - diff)
      return d.getTime()
    }
    const groupWeekly = (arr: any[]) => {
      const map = new Map<number, any>()
      for (const x of arr) {
        const wk = weekStart(Number(x.ts || 0))
        const prev = map.get(wk)
        if (!prev || Number(x.ts || 0) > Number(prev.ts || 0)) map.set(wk, x)
      }
      const weeks = Array.from(map.keys()).sort((a, b) => a - b)
      const last12 = weeks.slice(-12)
      return last12.map((w) => ({ week: w, score: Number(map.get(w)?.score || 0), ts: Number(map.get(w)?.ts || 0) }))
    }
    return { phq: groupWeekly(phq), gad: groupWeekly(gad) }
  }, [])

  const toggleTag = (t: string) => {
    setMoodTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].slice(0, 6)))
  }

  const saveMood = () => {
    const entry: MoodEntry = {
      id: `m-${nowTs()}`,
      ts: nowTs(),
      mood,
      tags: moodTags,
      note: moodNote.trim(),
    }
    const next = [entry, ...moodItems].slice(0, 120)
    setMoodItems(next)
    writeLocal(MOOD_KEY, next)
    void upsertUserState(REMOTE_NS, "mood_entries", next)
    appendTherapyEvent("mood_saved", { ts: entry.ts, mood: entry.mood, tags: entry.tags, note: entry.note })
    setEventsTick((x) => x + 1)
    setMoodNote("")
    setMoodTags([])
  }

  const deleteMood = (id: string) => {
    const next = moodItems.filter((x) => x.id !== id)
    setMoodItems(next)
    writeLocal(MOOD_KEY, next)
    void upsertUserState(REMOTE_NS, "mood_entries", next)
  }

  const saveJournal = () => {
    const content = journalContent.trim()
    if (!content) return
    const title = (journalTitle || content.split(/\n+/)[0] || "Ghi chú").trim().slice(0, 60)
    const entry: JournalEntry = { id: `j-${nowTs()}`, ts: nowTs(), title, content }
    const next = [entry, ...journalItems].slice(0, 200)
    setJournalItems(next)
    writeLocal(JOURNAL_KEY, next)
    void upsertUserState(REMOTE_NS, "journal_entries", next)
    appendTherapyEvent("journal_saved", { ts: entry.ts, title: entry.title })
    setEventsTick((x) => x + 1)
    setJournalTitle("")
    setJournalContent("")
  }

  const deleteJournal = (id: string) => {
    const next = journalItems.filter((x) => x.id !== id)
    setJournalItems(next)
    writeLocal(JOURNAL_KEY, next)
    void upsertUserState(REMOTE_NS, "journal_entries", next)
  }

  const mood7 = useMemo(() => moodItems.slice(0, 7), [moodItems])
  const carePlan = useMemo(() => {
    try {
      return getCarePlan()
    } catch {
      return null
    }
  }, [])
  const lastScreening = useMemo(() => {
    try {
      return getLastScreening()
    } catch {
      return null
    }
  }, [])

  const eventLabel = (t: string) => {
    if (t === "screening") return "Sàng lọc"
    if (t === "plan_created") return "Tạo kế hoạch"
    if (t === "task_done") return "Hoàn thành hoạt động"
    if (t === "mood_saved") return "Lưu tâm trạng"
    if (t === "journal_saved") return "Lưu nhật ký"
    if (t === "reminder_fired") return "Nhắc nhở"
    return t
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="rounded-2xl border bg-white/80 backdrop-blur-xl shadow-sm p-4">
        <div className="text-lg font-semibold">Trị liệu kỹ thuật số</div>
        <div className="text-sm text-muted-foreground">
          Theo dõi tâm trạng và ghi chép để tăng nhận thức và tuân thủ thói quen.
        </div>
      </div>

      {carePlan || lastScreening ? (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gợi ý theo sàng lọc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastScreening ? (
              <div className="rounded-xl border p-3 text-sm">
                <div className="font-medium">{lastScreening.title}</div>
                <div className="text-muted-foreground">
                  {new Date(lastScreening.ts).toLocaleString("vi-VN")} • {lastScreening.level || "—"} • {lastScreening.score}
                </div>
              </div>
            ) : null}
            {carePlan ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">{carePlan.focus}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {carePlan.suggestedTherapy.slice(0, 4).map((x) => (
                    <div key={x.title} className="rounded-xl border p-3">
                      <div className="text-sm font-medium">{x.title}</div>
                      <div className="text-xs text-muted-foreground">{x.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      try {
                        for (const r of carePlan.suggestedReminders) {
                          upsertReminder({ id: r.id, enabled: r.enabled, time: r.time, message: r.message, last_fired_day: "" })
                        }
                      } catch {}
                      try {
                        window.location.href = "/nhac-nho"
                      } catch {}
                    }}
                  >
                    Thiết lập nhắc nhở
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => { try { window.location.href = "/tam-su" } catch {} }}>
                    Tâm sự với AI
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => { try { window.location.href = "/tin-tuc-y-khoa" } catch {} }}>
                    Xem bài gợi ý
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="plan">
        <TabsList className="w-full justify-between">
          <TabsTrigger value="plan" className="flex-1">Kế hoạch</TabsTrigger>
          <TabsTrigger value="cards" className="flex-1">Thẻ</TabsTrigger>
          <TabsTrigger value="wheel" className="flex-1">Bánh xe</TabsTrigger>
          <TabsTrigger value="insight" className="flex-1">Hành trình</TabsTrigger>
          <TabsTrigger value="mood" className="flex-1">Tâm trạng</TabsTrigger>
          <TabsTrigger value="journal" className="flex-1">Nhật ký</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Kế hoạch điều trị cá nhân</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {therapyPlan ? (
                <div className="rounded-xl border p-3 text-sm">
                  <div className="font-medium">{therapyPlan.focus}</div>
                  <div className="text-muted-foreground">
                    {therapyPlan.screening?.title ? `${therapyPlan.screening.title} • ` : ""}
                    {therapyPlan.screening?.level ? `${therapyPlan.screening.level} • ` : ""}
                    {Number.isFinite(therapyPlan.screening?.score) ? `${therapyPlan.screening.score} • ` : ""}
                    {therapyPlan.created_at ? new Date(therapyPlan.created_at).toLocaleString("vi-VN") : ""}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Chưa có kế hoạch. Tạo nhanh từ kết quả sàng lọc để bắt đầu theo dõi.
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  className="rounded-xl"
                  onClick={() => {
                    if (!carePlan) return
                    const plan = createPlanFromCarePlan(carePlan)
                    saveTherapyPlan(plan)
                    setTherapyPlanState(plan)
                    appendTherapyEvent("plan_created", { plan_id: plan.id, screening_ts: plan.screening?.ts })
                    setEventsTick((x) => x + 1)
                    try {
                      for (const r of carePlan.suggestedReminders) {
                        upsertReminder({ id: r.id, enabled: r.enabled, time: r.time, message: r.message, last_fired_day: "" })
                      }
                    } catch {}
                  }}
                  disabled={!carePlan}
                >
                  Tạo kế hoạch từ sàng lọc
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => { try { window.location.href = "/nhac-nho" } catch {} }}>
                  Mở nhắc nhở
                </Button>
              </div>
            </CardContent>
          </Card>

          {therapyPlan ? (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Hoạt động hôm nay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {therapyPlan.tasks.map((t) => {
                  const done = isTaskDone(t.id)
                  return (
                    <div key={t.id} className="rounded-xl border p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground">{t.desc}</div>
                        {t.href ? (
                          <button
                            type="button"
                            className="text-xs mt-2 underline text-slate-700"
                            onClick={() => { try { window.location.href = t.href || "/tri-lieu" } catch {} }}
                          >
                            Mở
                          </button>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTaskDone(t.id, !done)
                          appendTherapyEvent("task_done", { task_id: t.id, done: !done })
                          setEventsTick((x) => x + 1)
                        }}
                        className={`h-9 px-4 rounded-xl text-sm border shrink-0 active:scale-[0.99] ${
                          done ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-800 border-slate-200"
                        }`}
                      >
                        {done ? "Đã làm" : "Làm"}
                      </button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lịch sử điều trị</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(() => {
                const events = listTherapyEvents(20)
                if (!events.length) return <div className="text-sm text-muted-foreground">Chưa có lịch sử.</div>
                return (
                  <div className="space-y-2">
                    {events.map((e) => (
                      <div key={e.id} className="rounded-xl border p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{eventLabel(e.type)}</div>
                          <div className="text-xs text-muted-foreground">{new Date(e.ts).toLocaleString("vi-VN")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Thẻ trị liệu mỗi ngày</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dailyCard.card ? (
                <div className="rounded-2xl border p-4">
                  <div className="text-xs text-muted-foreground">{dailyCard.day}</div>
                  <div className="text-lg font-semibold mt-1">{dailyCard.card.title}</div>
                  <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{dailyCard.card.body}</div>
                  <div className="mt-3 text-xs text-muted-foreground">#{dailyCard.card.tag}</div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Chưa có thẻ.</div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    try {
                      const seed = getDeviceId() || "device"
                      const dc = redrawToday(seed)
                      setDailyCard({ day: dc.day, card: dc.card || null })
                    } catch {}
                  }}
                >
                  Rút lại hôm nay
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wheel" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bánh xe Cuộc đời</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border p-4 overflow-auto">
                <svg width={wheelPoints.size} height={wheelPoints.size} viewBox={`0 0 ${wheelPoints.size} ${wheelPoints.size}`}>
                  {[0.2, 0.4, 0.6, 0.8, 1].map((k) => (
                    <circle
                      key={k}
                      cx={wheelPoints.cx}
                      cy={wheelPoints.cy}
                      r={wheelPoints.r * k}
                      fill="none"
                      stroke="rgba(100,116,139,0.25)"
                      strokeWidth="1"
                    />
                  ))}
                  {wheelDims.map((d, i) => {
                    const a = (-Math.PI / 2) + (2 * Math.PI * i) / wheelDims.length
                    const x = wheelPoints.cx + Math.cos(a) * wheelPoints.r
                    const y = wheelPoints.cy + Math.sin(a) * wheelPoints.r
                    return (
                      <line
                        key={d.key}
                        x1={wheelPoints.cx}
                        y1={wheelPoints.cy}
                        x2={x}
                        y2={y}
                        stroke="rgba(100,116,139,0.25)"
                        strokeWidth="1"
                      />
                    )
                  })}
                  <polygon
                    points={wheelPoints.pts.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="rgba(59,130,246,0.25)"
                    stroke="rgba(37,99,235,0.9)"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {wheelDims.map((d, idx) => (
                  <div key={d.key} className="rounded-xl border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">{d.label}</div>
                      <div className="text-sm font-semibold">{getWheelValue(d.key)}/10</div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={getWheelValue(d.key)}
                      onChange={(e) => setWheelValue(d.key, Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insight" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Hành trình Tâm trí</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(!insight.phq.length && !insight.gad.length) ? (
                <div className="text-sm text-muted-foreground">Chưa đủ dữ liệu PHQ-9/GAD-7 để vẽ biểu đồ.</div>
              ) : (
                <div className="rounded-2xl border p-4 overflow-auto">
                  <svg width={640} height={260} viewBox="0 0 640 260">
                    <rect x="0" y="0" width="640" height="260" fill="white" />
                    {[0, 0.25, 0.5, 0.75, 1].map((k) => (
                      <line key={k} x1={40} y1={20 + 200 * k} x2={620} y2={20 + 200 * k} stroke="rgba(100,116,139,0.2)" />
                    ))}
                    {(() => {
                      const points = (arr: any[], maxY: number) => {
                        const n = arr.length
                        if (!n) return ""
                        const xs = (i: number) => 40 + (580 * (n === 1 ? 0 : i / (n - 1)))
                        const ys = (v: number) => 220 - (200 * (Math.max(0, Math.min(maxY, v)) / maxY))
                        return arr.map((p: any, i: number) => `${xs(i)},${ys(Number(p.score || 0))}`).join(" ")
                      }
                      const phqPts = points(insight.phq, 27)
                      const gadPts = points(insight.gad, 21)
                      return (
                        <>
                          {phqPts ? <polyline points={phqPts} fill="none" stroke="rgba(37,99,235,0.9)" strokeWidth="2" /> : null}
                          {gadPts ? <polyline points={gadPts} fill="none" stroke="rgba(16,185,129,0.9)" strokeWidth="2" /> : null}
                        </>
                      )
                    })()}
                    <text x="40" y="245" fontSize="12" fill="rgba(100,116,139,0.9)">Tuần →</text>
                    <text x="610" y="25" fontSize="12" fill="rgba(100,116,139,0.9)" textAnchor="end">Điểm</text>
                  </svg>
                </div>
              )}
              <div className="flex flex-wrap gap-2 text-sm">
                {insight.phq.length ? <div className="rounded-full border px-3 py-1">PHQ-9: {insight.phq[insight.phq.length - 1].score}</div> : null}
                {insight.gad.length ? <div className="rounded-full border px-3 py-1">GAD-7: {insight.gad[insight.gad.length - 1].score}</div> : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mood" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mood tracker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Hôm nay bạn cảm thấy thế nào?</div>
                <div className="text-sm">
                  <span className="mr-2">{moodEmoji(mood)}</span>
                  <span className="font-medium">{moodLabel(mood)}</span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={mood}
                onChange={(e) => setMood(Number(e.target.value) as any)}
                className="w-full"
              />

              <div className="flex flex-wrap gap-2">
                {tagCandidates.map((t) => {
                  const active = moodTags.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition active:scale-[0.99] ${
                        active ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Ghi chú (tùy chọn)</div>
                <textarea
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  rows={3}
                  className="w-full border rounded-xl px-3 py-2 text-sm resize-none"
                  placeholder="Điều gì đang diễn ra?"
                />
              </div>

              <div className="flex gap-2">
                <Button className="w-full rounded-xl" onClick={saveMood}>Lưu</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">7 lần gần nhất</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mood7.length ? (
                <div className="space-y-2">
                  {mood7.map((m) => (
                    <div key={m.id} className="rounded-xl border p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium flex items-center gap-2">
                          <span>{moodEmoji(m.mood)}</span>
                          <span>{moodLabel(m.mood)}</span>
                          <span className="text-xs text-muted-foreground">{new Date(m.ts).toLocaleString("vi-VN")}</span>
                        </div>
                        {m.tags?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {m.tags.map((t) => (
                              <span key={`${m.id}-${t}`} className="text-[11px] px-2 py-0.5 rounded-full border bg-white">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {m.note ? <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{m.note}</div> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteMood(m.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border text-red-600 border-red-200 bg-red-50 active:scale-[0.99]"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Chưa có dữ liệu.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Journaling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={journalTitle}
                onChange={(e) => setJournalTitle(e.target.value)}
                placeholder="Tiêu đề (tùy chọn)"
              />
              <textarea
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                rows={7}
                className="w-full border rounded-xl px-3 py-2 text-sm resize-none"
                placeholder="Viết ra điều bạn đang nghĩ..."
              />
              <Button className="w-full rounded-xl" onClick={saveJournal} disabled={!journalContent.trim()}>
                Lưu ghi chú
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gần đây</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {journalItems.length ? (
                <div className="space-y-2">
                  {journalItems.slice(0, 12).map((j) => (
                    <div key={j.id} className="rounded-xl border p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{j.title || "Ghi chú"}</div>
                        <div className="text-xs text-muted-foreground">{new Date(j.ts).toLocaleString("vi-VN")}</div>
                        <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap line-clamp-6">{j.content}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteJournal(j.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border text-red-600 border-red-200 bg-red-50 active:scale-[0.99]"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Chưa có ghi chú.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
