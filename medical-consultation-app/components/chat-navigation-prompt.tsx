"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ExternalLink, 
  Maximize2, 
  ClipboardCheck, 
  HeartPulse, 
  Search, 
  UserRound, 
  CalendarCheck, 
  BarChart3,
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EMBEDDABLE_FEATURES, type EmbeddableFeatureId } from "@/lib/agent-actions"

interface ChatNavigationPromptProps {
  feature: EmbeddableFeatureId
  reason: string
  context?: Record<string, unknown>
  onSelect: (choice: "embed" | "navigate") => void
  className?: string
}

const FEATURE_ICONS: Record<EmbeddableFeatureId, typeof ClipboardCheck> = {
  "sang-loc": ClipboardCheck,
  "tri-lieu": HeartPulse,
  "tra-cuu": Search,
  "bac-si": UserRound,
  "ke-hoach": CalendarCheck,
  "thong-ke": BarChart3,
}

export function ChatNavigationPrompt({ 
  feature, 
  reason, 
  context,
  onSelect,
  className 
}: ChatNavigationPromptProps) {
  const router = useRouter()
  const [isSelecting, setIsSelecting] = useState(false)

  const featureInfo = EMBEDDABLE_FEATURES[feature]
  const Icon = FEATURE_ICONS[feature] || MessageSquare

  const handleEmbed = () => {
    setIsSelecting(true)
    onSelect("embed")
  }

  const handleNavigate = () => {
    setIsSelecting(true)
    onSelect("navigate")
    router.push(featureInfo?.path || `/${feature}`)
  }

  if (isSelecting) {
    return null // Component will be replaced by the embed or user will be navigated
  }

  return (
    <Card className={cn(
      "w-full max-w-md border-primary/20 bg-gradient-to-br from-background to-primary/5",
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{featureInfo?.name || feature}</CardTitle>
            <CardDescription className="text-xs">
              {featureInfo?.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Reason from AI */}
        <p className="text-sm text-muted-foreground">
          {reason}
        </p>

        {/* Choice buttons */}
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleEmbed}
            variant="default"
            className="w-full justify-start gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            <span className="flex-1 text-left">Mở ngay tại đây</span>
            <span className="text-xs opacity-70">Tiện lợi</span>
          </Button>
          
          <Button 
            onClick={handleNavigate}
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="flex-1 text-left">Mở trang đầy đủ</span>
            <span className="text-xs opacity-70">Chi tiết hơn</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
