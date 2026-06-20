"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionCardProps {
  title?: string
  description?: string
  badge?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function SectionCard({
  title,
  description,
  badge,
  action,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <section className={cn("app-surface rounded-[1rem] bg-card/90", className)}>
      {(title || description || badge || action) && (
        <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {title ? <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2> : null}
              {badge}
            </div>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      <div className={cn("px-5 py-4", contentClassName)}>{children}</div>
    </section>
  )
}
