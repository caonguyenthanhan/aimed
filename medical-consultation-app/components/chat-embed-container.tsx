"use client"

import { Suspense, lazy, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { EmbeddableFeatureId } from "@/lib/agent-actions"

// Lazy load embed components
const EmbedSangLoc = lazy(() => import("@/components/embeds/embed-sang-loc").then(m => ({ default: m.EmbedSangLoc })))
const EmbedTriLieu = lazy(() => import("@/components/embeds/embed-tri-lieu").then(m => ({ default: m.EmbedTriLieu })))
const EmbedTraCuu = lazy(() => import("@/components/embeds/embed-tra-cuu").then(m => ({ default: m.EmbedTraCuu })))
const EmbedBacSi = lazy(() => import("@/components/embeds/embed-bac-si").then(m => ({ default: m.EmbedBacSi })))
const EmbedKeHoach = lazy(() => import("@/components/embeds/embed-ke-hoach").then(m => ({ default: m.EmbedKeHoach })))
const EmbedThongKe = lazy(() => import("@/components/embeds/embed-thong-ke").then(m => ({ default: m.EmbedThongKe })))

interface ChatEmbedContainerProps {
  feature: EmbeddableFeatureId
  context?: Record<string, unknown>
  onClose?: () => void
  onComplete?: (result: unknown) => void
  className?: string
}

const FEATURE_PATHS: Record<EmbeddableFeatureId, string> = {
  "sang-loc": "/sang-loc",
  "tri-lieu": "/tri-lieu",
  "tra-cuu": "/tra-cuu",
  "bac-si": "/bac-si",
  "ke-hoach": "/ke-hoach",
  "thong-ke": "/thong-ke",
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
)

export function ChatEmbedContainer({ 
  feature, 
  context, 
  onClose, 
  onComplete,
  className 
}: ChatEmbedContainerProps) {
  const router = useRouter()
  const [isMinimized, setIsMinimized] = useState(false)

  const handleNavigate = () => {
    const path = FEATURE_PATHS[feature]
    if (path) {
      router.push(path)
    }
  }

  const handleComplete = (result: unknown) => {
    onComplete?.(result)
  }

  const renderEmbed = () => {
    const props = {
      context: context as Record<string, unknown>,
      onComplete: handleComplete,
      onNavigate: handleNavigate,
    }

    switch (feature) {
      case "sang-loc":
        return <EmbedSangLoc {...props} />
      case "tri-lieu":
        return <EmbedTriLieu {...props} />
      case "tra-cuu":
        return <EmbedTraCuu {...props} />
      case "bac-si":
        return <EmbedBacSi {...props} />
      case "ke-hoach":
        return <EmbedKeHoach {...props} />
      case "thong-ke":
        return <EmbedThongKe {...props} />
      default:
        return (
          <div className="p-4 text-sm text-muted-foreground">
            Không tìm thấy tính năng: {feature}
          </div>
        )
    }
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg border bg-muted/50 hover:bg-muted transition-colors",
          className
        )}
      >
        <Maximize2 className="h-4 w-4" />
        <span className="text-sm">Mở lại {feature}</span>
      </button>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {/* Control buttons */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={handleNavigate}
          title="Mở trang đầy đủ"
        >
          <Maximize2 className="h-3 w-3" />
        </Button>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={onClose}
            title="Đóng"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <Suspense fallback={<LoadingFallback />}>
        {renderEmbed()}
      </Suspense>
    </div>
  )
}
