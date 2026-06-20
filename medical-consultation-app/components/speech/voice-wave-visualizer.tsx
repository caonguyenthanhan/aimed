"use client"

import { cn } from "@/lib/utils"

const ACTIVE_BARS = [48, 76, 112, 148, 196, 144, 224, 156, 104, 68, 44]
const IDLE_BARS = [10, 14, 18, 24, 30, 24, 18, 16, 12, 10, 8]

interface VoiceWaveVisualizerProps {
  active: boolean
  className?: string
}

export function VoiceWaveVisualizer({ active, className }: VoiceWaveVisualizerProps) {
  const bars = active ? ACTIVE_BARS : IDLE_BARS

  return (
    <div className={cn("flex h-64 w-full max-w-md items-center justify-center gap-1.5", className)}>
      {bars.map((height, index) => (
        <div
          key={`${height}-${index}`}
          className={cn(
            "w-1.5 rounded-full bg-primary transition-all duration-300",
            active ? "animate-pulse shadow-[0_10px_24px_-18px_rgba(20,71,230,0.9)]" : "bg-primary/30",
          )}
          style={{
            height,
            animationDelay: `${index * 80}ms`,
            animationDuration: active ? "1.4s" : "0s",
          }}
        />
      ))}
    </div>
  )
}
