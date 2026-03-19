import { readLocal, writeLocal } from "@/lib/local-store"
import { upsertUserState } from "@/lib/user-state-client"
import type { CarePlan, ScreeningResult } from "@/lib/screening-store"

export type TherapyTask = {
  id: string
  title: string
  desc: string
  href?: string
}

export type TherapyPlan = {
  id: string
  created_at: number
  focus: string
  severity: "low" | "medium" | "high"
  screening: Pick<ScreeningResult, "assessment_id" | "title" | "score" | "level" | "ts">
  tasks: TherapyTask[]
}

export type TherapyProgress = Record<string, { done_task_ids: string[]; updated_at: number }>

export type TherapyEvent = {
  id: string
  ts: number
  type: "screening" | "plan_created" | "task_done" | "mood_saved" | "journal_saved" | "reminder_fired"
  payload?: any
}

const NS = "dtx"
const PLAN_KEY = "mcs_therapy_plan_v1"
const PROGRESS_KEY = "mcs_therapy_progress_v1"
const EVENTS_KEY = "mcs_therapy_events_v1"

const todayKey = () => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`

export function getTherapyPlan(): TherapyPlan | null {
  const p = readLocal<TherapyPlan | null>(PLAN_KEY, null)
  if (!p) return null
  if (!p.id || !p.created_at) return null
  if (!Array.isArray(p.tasks)) return null
  return p
}

export function saveTherapyPlan(plan: TherapyPlan) {
  writeLocal(PLAN_KEY, plan)
  void upsertUserState(NS, "therapy_plan", plan)
}

export function createPlanFromCarePlan(plan: CarePlan): TherapyPlan {
  const tasks = (Array.isArray(plan.suggestedTherapy) ? plan.suggestedTherapy : [])
    .slice(0, 8)
    .map((t, idx) => ({
      id: `t${idx + 1}_${t.title.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || idx}`,
      title: t.title,
      desc: t.desc,
      href: t.href,
    }))
  return {
    id: newId("tp"),
    created_at: Date.now(),
    focus: plan.focus,
    severity: plan.severity,
    screening: plan.screening,
    tasks: tasks.length
      ? tasks
      : [
          { id: "t1_checkin", title: "Check-in tâm trạng", desc: "Ghi nhanh tâm trạng và 1-2 tag.", href: "/tri-lieu" },
          { id: "t2_journal", title: "Nhật ký 3 dòng", desc: "Viết ngắn để giảm quá tải và rõ điều cần làm.", href: "/tri-lieu" },
          { id: "t3_tamsu", title: "Tâm sự với AI", desc: "Nói về điều khó nhất lúc này để được gợi ý.", href: "/tam-su" },
        ],
  }
}

export function getTherapyProgress(): TherapyProgress {
  const p = readLocal<TherapyProgress>(PROGRESS_KEY, {})
  return p && typeof p === "object" ? p : {}
}

export function setTaskDone(taskId: string, done: boolean, day?: string) {
  const d = day || todayKey()
  const progress = getTherapyProgress()
  const entry = progress[d] || { done_task_ids: [], updated_at: 0 }
  const set = new Set<string>(Array.isArray(entry.done_task_ids) ? entry.done_task_ids : [])
  if (done) set.add(taskId)
  else set.delete(taskId)
  const next: TherapyProgress = {
    ...progress,
    [d]: { done_task_ids: Array.from(set), updated_at: Date.now() },
  }
  writeLocal(PROGRESS_KEY, next)
  void upsertUserState(NS, "therapy_progress", next)
}

export function isTaskDone(taskId: string, day?: string) {
  const d = day || todayKey()
  const progress = getTherapyProgress()
  const ids = progress?.[d]?.done_task_ids || []
  return Array.isArray(ids) ? ids.includes(taskId) : false
}

export function appendTherapyEvent(type: TherapyEvent["type"], payload?: any) {
  const prev = readLocal<TherapyEvent[]>(EVENTS_KEY, [])
  const next = [
    { id: newId("ev"), ts: Date.now(), type, payload },
    ...(Array.isArray(prev) ? prev : []),
  ].slice(0, 500)
  writeLocal(EVENTS_KEY, next)
  void upsertUserState(NS, "therapy_events_v1", next)
}

export function listTherapyEvents(limit = 30) {
  const prev = readLocal<TherapyEvent[]>(EVENTS_KEY, [])
  return (Array.isArray(prev) ? prev : []).slice(0, Math.max(1, Math.min(200, limit)))
}
