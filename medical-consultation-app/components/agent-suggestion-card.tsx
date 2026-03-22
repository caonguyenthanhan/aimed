"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Zap } from "lucide-react"
import type { Agent } from "@/lib/agent-registry"

interface AgentSuggestionCardProps {
  agent: Agent
  reason: string
  suggestionId: string
  onEmbedClick?: () => void
  onLinkClick?: () => void
  onDismiss?: () => void
}

/**
 * Agent Suggestion Card - displays agent recommendation with dual-link strategy
 * Người dùng có thể chọn nhúng agent vào chat hoặc mở trong tab mới
 */
export function AgentSuggestionCard({
  agent,
  reason,
  suggestionId,
  onEmbedClick,
  onLinkClick,
  onDismiss
}: AgentSuggestionCardProps) {
  const [selected, setSelected] = useState<'embed' | 'link' | null>(null)

  const handleEmbed = () => {
    setSelected('embed')
    onEmbedClick?.()
  }

  const handleLink = () => {
    setSelected('link')
    if (onLinkClick) {
      onLinkClick()
    } else {
      window.open(agent.route, '_blank')
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {agent.name}
            </CardTitle>
            <CardDescription className="mt-1">{agent.description}</CardDescription>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Dismiss suggestion"
            >
              ✕
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold">Lý do:</span> {reason}
        </p>

        <div className="flex flex-col gap-2">
          {agent.embeddable && (
            <Button
              onClick={handleEmbed}
              variant={selected === 'embed' ? 'default' : 'outline'}
              className="w-full justify-start"
              size="sm"
            >
              <Zap className="w-4 h-4 mr-2" />
              Hiển thị ngay trong chat
            </Button>
          )}

          <Button
            onClick={handleLink}
            variant={selected === 'link' ? 'default' : 'outline'}
            className="w-full justify-start"
            size="sm"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Mở trong tab mới
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
