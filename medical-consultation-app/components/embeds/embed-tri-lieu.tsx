"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { HeartPulse, ExternalLink, Play, Pause, RotateCcw, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmbedTriLieuProps {
  context?: {
    exerciseType?: "breathing" | "grounding" | "muscle_relaxation"
    reason?: string
  }
  onComplete?: () => void
  onNavigate?: () => void
}

type BreathingPhase = "inhale" | "hold" | "exhale" | "rest"

const BREATHING_PATTERN = {
  inhale: { duration: 4, label: "Hít vào", color: "bg-blue-500" },
  hold: { duration: 4, label: "Giữ", color: "bg-purple-500" },
  exhale: { duration: 6, label: "Thở ra", color: "bg-green-500" },
  rest: { duration: 2, label: "Nghỉ", color: "bg-slate-400" },
}

const PHASES: BreathingPhase[] = ["inhale", "hold", "exhale", "rest"]

export function EmbedTriLieu({ context, onComplete, onNavigate }: EmbedTriLieuProps) {
  const router = useRouter()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase>("inhale")
  const [timeLeft, setTimeLeft] = useState(BREATHING_PATTERN.inhale.duration)
  const [cycleCount, setCycleCount] = useState(0)
  const [totalCycles] = useState(3)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Move to next phase
          const currentIndex = PHASES.indexOf(currentPhase)
          const nextIndex = (currentIndex + 1) % PHASES.length
          const nextPhase = PHASES[nextIndex]
          
          if (nextPhase === "inhale") {
            // Completed one cycle
            setCycleCount((c) => {
              const newCount = c + 1
              if (newCount >= totalCycles) {
                setIsPlaying(false)
                onComplete?.()
              }
              return newCount
            })
          }
          
          setCurrentPhase(nextPhase)
          return BREATHING_PATTERN[nextPhase].duration
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, currentPhase, totalCycles, onComplete])

  const reset = () => {
    setIsPlaying(false)
    setCurrentPhase("inhale")
    setTimeLeft(BREATHING_PATTERN.inhale.duration)
    setCycleCount(0)
  }

  const goToFullPage = () => {
    if (onNavigate) {
      onNavigate()
    } else {
      router.push("/tri-lieu")
    }
  }

  const phase = BREATHING_PATTERN[currentPhase]
  const progress = cycleCount >= totalCycles ? 100 : (cycleCount / totalCycles) * 100

  return (
    <Card className="w-full max-w-sm border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Bài tập thở 4-4-6</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            {cycleCount}/{totalCycles} vòng
          </span>
        </div>
        <CardDescription className="text-xs">
          Thư giãn và giảm căng thẳng với kỹ thuật thở sâu
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center py-4">
        {/* Breathing circle animation */}
        <div className="relative flex items-center justify-center">
          <div
            className={cn(
              "rounded-full transition-all duration-1000 flex items-center justify-center",
              phase.color,
              isPlaying
                ? currentPhase === "inhale"
                  ? "w-28 h-28 scale-110"
                  : currentPhase === "exhale"
                  ? "w-20 h-20 scale-90"
                  : "w-24 h-24"
                : "w-24 h-24 bg-slate-300 dark:bg-slate-600"
            )}
          >
            <div className="text-center text-white">
              <div className="text-2xl font-bold">{timeLeft}</div>
              <div className="text-xs uppercase tracking-wide">{phase.label}</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={reset}
            disabled={!isPlaying && cycleCount === 0}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            size="lg"
            onClick={() => setIsPlaying(!isPlaying)}
            className="gap-2 px-6"
            disabled={cycleCount >= totalCycles}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" /> Tạm dừng
              </>
            ) : cycleCount >= totalCycles ? (
              <>
                <Volume2 className="h-4 w-4" /> Hoàn thành!
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> {cycleCount > 0 ? "Tiếp tục" : "Bắt đầu"}
              </>
            )}
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-1 mt-3">
          {Array.from({ length: totalCycles }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                i < cycleCount ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
              )}
            />
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goToFullPage}
          className="w-full text-xs text-muted-foreground"
        >
          Xem thêm bài tập trị liệu <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  )
}
