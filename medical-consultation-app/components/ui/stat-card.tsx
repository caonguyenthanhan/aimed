"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: ReactNode
  helper?: ReactNode
  icon?: ReactNode
  trend?: ReactNode
  tone?: "primary" | "neutral" | "teal"
  className?: string
}

const toneStyles = {
  primary: "bg-primary/10 text-primary",
  neutral: "bg-secondary text-foreground",
  teal: "bg-teal-accent/10 text-teal-accent",
} as const

export function StatCard({
  label,
  value,
  helper,
  icon,
  trend,
  tone = "primary",
  className,
}: StatCardProps) {
  return (
    <article className={cn("app-surface hover-lift rounded-[1rem] bg-card/95 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{value}</div>
        </div>
        {icon ? (
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", toneStyles[tone])}>{icon}</div>
        ) : null}
      </div>
      {(helper || trend) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="text-muted-foreground">{helper}</div>
          {trend ? <div className="font-medium text-foreground">{trend}</div> : null}
        </div>
      )}
    </article>
  )
}
