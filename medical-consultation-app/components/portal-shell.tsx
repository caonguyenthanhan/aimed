"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PortalShellProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

export default function PortalShell({
  eyebrow,
  title,
  description,
  actions,
  aside,
  children,
  className,
  contentClassName,
}: PortalShellProps) {
  return (
    <div className={cn("mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-6 pt-6 sm:px-6 lg:px-8", className)}>
      <div className="app-surface rounded-[1.5rem] bg-card/90 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            {eyebrow ? (
              <div className="inline-flex rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {eyebrow}
              </div>
            ) : null}
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
              {description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      </div>

      <div className={cn("grid gap-6", aside ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "", contentClassName)}>
        <div className="min-w-0">{children}</div>
        {aside ? <aside className="min-w-0">{aside}</aside> : null}
      </div>
    </div>
  )
}
