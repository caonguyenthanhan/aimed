"use client"

import { Suspense, lazy, ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { ChatMusicPlayer } from "@/components/music/chat-music-player"
import type { EmbeddableFeatureId } from "@/lib/agent-actions"

// Lazy load embeds
const EmbedSangLoc = lazy(() => import("@/components/embeds/embed-sang-loc").then(m => ({ default: m.EmbedSangLoc })))
const EmbedTriLieu = lazy(() => import("@/components/embeds/embed-tri-lieu").then(m => ({ default: m.EmbedTriLieu })))
const EmbedBacSi = lazy(() => import("@/components/embeds/embed-bac-si").then(m => ({ default: m.EmbedBacSi })))

interface InlineEmbedProps {
  type: EmbeddableFeatureId | "music"
  context?: Record<string, unknown>
  onComplete?: (result: unknown) => void
  onClose?: () => void
  compact?: boolean
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-3 px-4">
    <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
    <span className="text-xs text-muted-foreground">Đang tải...</span>
  </div>
)

export function InlineEmbed({
  type,
  context,
  onComplete,
  onClose,
  compact = false,
}: InlineEmbedProps) {
  const renderContent = (): ReactNode => {
    switch (type) {
      case "sang-loc":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <EmbedSangLoc
              context={context}
              onComplete={onComplete}
            />
          </Suspense>
        )
      case "tri-lieu":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <EmbedTriLieu
              context={context}
              onComplete={onComplete}
            />
          </Suspense>
        )
      case "bac-si":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <EmbedBacSi
              context={context}
              onComplete={onComplete}
            />
          </Suspense>
        )
      case "music":
        const musicContext = context as { videoId?: string; title?: string; artist?: string } | undefined
        return (
          <ChatMusicPlayer
            videoId={musicContext?.videoId || ""}
            title={musicContext?.title || "Nhạc"}
            artist={musicContext?.artist}
            onClose={onClose}
          />
        )
      default:
        return <div className="text-xs text-muted-foreground p-2">Không hỗ trợ: {type}</div>
    }
  }

  return (
    <div
      className={`rounded-lg border border-border/50 bg-muted/30 overflow-hidden ${
        compact ? "max-w-sm" : "w-full"
      }`}
    >
      {renderContent()}
    </div>
  )
}
