"use client"

import type { LucideIcon } from "lucide-react"
import { Activity, ArrowRight, BrainCircuit, CheckCircle2, ClipboardList, HeartPulse, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export type ScreeningMeta = {
  subtitle: string
  duration: string
  icon: LucideIcon
}

const SCREENING_META: Record<string, ScreeningMeta> = {
  phq9: { subtitle: "Depression Screening", duration: "~5 phút", icon: HeartPulse },
  gad7: { subtitle: "Anxiety Assessment", duration: "~3 phút", icon: BrainCircuit },
  pcl5: { subtitle: "PTSD Screening", duration: "~8 phút", icon: ShieldCheck },
  mdq: { subtitle: "Mood Disorder", duration: "~4 phút", icon: Activity },
  scoff: { subtitle: "Eating Disorder", duration: "~2 phút", icon: ClipboardList },
  asrs: { subtitle: "ADHD Checklist", duration: "~10 phút", icon: CheckCircle2 },
}

export function getScreeningMeta(id: string, title: string, questionCount: number): ScreeningMeta {
  return SCREENING_META[id] || {
    subtitle: title,
    duration: `~${Math.max(2, Math.ceil(questionCount / 3))} phút`,
    icon: ClipboardList,
  }
}

interface ScreeningSelectionCardProps {
  title: string
  description: string
  questionCount: number
  subtitle: string
  duration: string
  icon: LucideIcon
  onClick: () => void
}

export function ScreeningSelectionCard({
  title,
  description,
  questionCount,
  subtitle,
  duration,
  icon: Icon,
  onClick,
}: ScreeningSelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="app-surface hover-lift group flex h-full flex-col rounded-[1.6rem] bg-card/90 p-6 text-left"
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{subtitle}</p>
      <p className="mt-4 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-6 flex items-center gap-5 text-sm text-muted-foreground">
        <span>{questionCount} câu hỏi</span>
        <span>{duration}</span>
      </div>
      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        Bắt đầu
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  )
}

interface ScreeningOptionCardProps {
  label: string
  selected: boolean
  onClick: () => void
}

export function ScreeningOptionCard({ label, selected, onClick }: ScreeningOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-[1.4rem] border px-5 py-5 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-[0_18px_36px_-28px_rgba(20,71,230,0.55)]"
          : "border-border bg-card hover:border-primary/30 hover:bg-primary/5",
      )}
    >
      <span className={cn("text-base font-medium", selected ? "text-primary" : "text-foreground")}>{label}</span>
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
        )}
      >
        <span className={cn("h-2.5 w-2.5 rounded-full", selected ? "bg-primary-foreground" : "bg-transparent")} />
      </span>
    </button>
  )
}
