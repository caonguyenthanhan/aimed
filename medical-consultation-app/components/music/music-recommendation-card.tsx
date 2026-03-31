"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, ExternalLink, Music2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MusicRecommendation } from "@/lib/agent-actions"

interface MusicRecommendationCardProps {
  recommendation: MusicRecommendation
  onPlay?: (videoId: string) => void
  onOpenYouTube?: (videoId: string) => void
  isPlaying?: boolean
  compact?: boolean
  className?: string
}

const MOOD_COLORS: Record<string, string> = {
  calm: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  uplifting: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  meditation: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  sleep: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  focus: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
}

const MOOD_LABELS: Record<string, string> = {
  calm: "Thư giãn",
  uplifting: "Tích cực",
  meditation: "Thiền định",
  sleep: "Ngủ ngon",
  focus: "Tập trung",
}

export function MusicRecommendationCard({
  recommendation,
  onPlay,
  onOpenYouTube,
  isPlaying = false,
  compact = false,
  className,
}: MusicRecommendationCardProps) {
  const [imageError, setImageError] = useState(false)

  const handlePlay = () => {
    onPlay?.(recommendation.videoId)
  }

  const handleOpenYouTube = () => {
    if (onOpenYouTube) {
      onOpenYouTube(recommendation.videoId)
    } else {
      window.open(`https://www.youtube.com/watch?v=${recommendation.videoId}`, "_blank")
    }
  }

  const thumbnailUrl = recommendation.thumbnail || 
    `https://img.youtube.com/vi/${recommendation.videoId}/mqdefault.jpg`

  if (compact) {
    return (
      <button
        onClick={handlePlay}
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg border transition-all w-full text-left",
          isPlaying 
            ? "border-primary bg-primary/5 ring-1 ring-primary" 
            : "hover:border-primary/50 hover:bg-muted/50",
          className
        )}
      >
        {/* Thumbnail */}
        <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-muted">
          {!imageError ? (
            <img
              src={thumbnailUrl}
              alt={recommendation.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          {isPlaying && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{recommendation.title}</p>
          {recommendation.artist && (
            <p className="text-xs text-muted-foreground truncate">{recommendation.artist}</p>
          )}
        </div>

        {/* Play icon */}
        <Play className={cn(
          "h-4 w-4 flex-shrink-0",
          isPlaying ? "text-primary" : "text-muted-foreground"
        )} />
      </button>
    )
  }

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isPlaying && "ring-2 ring-primary",
      className
    )}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        {!imageError ? (
          <img
            src={thumbnailUrl}
            alt={recommendation.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        
        {/* Play overlay */}
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
        >
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="h-6 w-6 text-slate-900 ml-0.5" />
          </div>
        </button>

        {/* Duration badge */}
        {recommendation.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {recommendation.duration}
          </div>
        )}

        {/* Mood badge */}
        {recommendation.mood && (
          <div className={cn(
            "absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium",
            MOOD_COLORS[recommendation.mood] || "bg-muted text-muted-foreground"
          )}>
            {MOOD_LABELS[recommendation.mood] || recommendation.mood}
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <h4 className="font-medium text-sm line-clamp-2">{recommendation.title}</h4>
        {recommendation.artist && (
          <p className="text-xs text-muted-foreground mt-0.5">{recommendation.artist}</p>
        )}

        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={handlePlay}
            className="flex-1 gap-1.5"
            variant={isPlaying ? "secondary" : "default"}
          >
            <Play className="h-3.5 w-3.5" />
            {isPlaying ? "Đang phát" : "Phát"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenYouTube}
            className="gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            YouTube
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
