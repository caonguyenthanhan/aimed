"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Bot } from "lucide-react"
import type { EmbeddableFeatureId } from "@/lib/agent-actions"
import type { MusicRecommendation } from "@/lib/agent-actions"

// Lazy load components to reduce bundle size
const ChatNavigationPrompt = dynamic(
  () => import("@/components/chat-navigation-prompt").then((m) => ({ default: m.ChatNavigationPrompt })),
  { ssr: false }
)
const ChatEmbedContainer = dynamic(
  () => import("@/components/chat-embed-container").then((m) => ({ default: m.ChatEmbedContainer })),
  { ssr: false }
)
const ChatMusicPlayer = dynamic(
  () => import("@/components/music/chat-music-player").then((m) => ({ default: m.ChatMusicPlayer })),
  { ssr: false }
)
const ChatMusicRecommendations = dynamic(
  () => import("@/components/music/chat-music-recommendations").then((m) => ({ default: m.ChatMusicRecommendations })),
  { ssr: false }
)

export interface SpecialMessageData {
  id: string
  kind: "ask_navigation" | "embed" | "play_music" | "recommend_music" | "nav_link"
  data: Record<string, unknown>
  timestamp: Date
}

interface ChatSpecialMessageProps {
  message: SpecialMessageData
  onClose?: (id: string) => void
}

export function ChatSpecialMessage({ message, onClose }: ChatSpecialMessageProps) {
  const router = useRouter()
  const [showEmbed, setShowEmbed] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<EmbeddableFeatureId | null>(null)

  const handleNavigationSelect = (choice: "embed" | "navigate") => {
    if (choice === "embed") {
      setSelectedFeature(message.data.feature as EmbeddableFeatureId)
      setShowEmbed(true)
    } else {
      // Navigate to full page
      const feature = message.data.feature as string
      router.push(`/${feature}`)
    }
  }

  const handleEmbedClose = () => {
    setShowEmbed(false)
    setSelectedFeature(null)
    onClose?.(message.id)
  }

  // Wrapper với bot avatar
  const MessageWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start space-x-2 justify-start">
      <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
        <Bot className="h-3 w-3 text-white" />
      </div>
      <div className="max-w-[85%]">
        {children}
      </div>
    </div>
  )

  switch (message.kind) {
    case "ask_navigation":
      if (showEmbed && selectedFeature) {
        return (
          <MessageWrapper>
            <ChatEmbedContainer
              feature={selectedFeature}
              context={message.data.context as Record<string, unknown>}
              onClose={handleEmbedClose}
            />
          </MessageWrapper>
        )
      }
      return (
        <MessageWrapper>
          <ChatNavigationPrompt
            feature={message.data.feature as EmbeddableFeatureId}
            reason={message.data.reason as string}
            context={message.data.context as Record<string, unknown>}
            onSelect={handleNavigationSelect}
          />
        </MessageWrapper>
      )

    case "embed":
      return (
        <MessageWrapper>
          <ChatEmbedContainer
            feature={message.data.feature as EmbeddableFeatureId}
            context={message.data.context as Record<string, unknown>}
            onClose={() => onClose?.(message.id)}
          />
        </MessageWrapper>
      )

    case "play_music":
      return (
        <MessageWrapper>
          <ChatMusicPlayer
            videoId={message.data.videoId as string}
            title={message.data.title as string}
            artist={message.data.artist as string}
            autoplay={message.data.autoplay as boolean}
            onClose={() => onClose?.(message.id)}
          />
        </MessageWrapper>
      )

    case "recommend_music":
      return (
        <MessageWrapper>
          <ChatMusicRecommendations
            recommendations={message.data.recommendations as MusicRecommendation[]}
            mood={message.data.mood as string}
            message={message.data.message as string}
          />
        </MessageWrapper>
      )

    case "nav_link":
      // This is handled by existing link rendering
      return null

    default:
      return null
  }
}

// Helper to parse special messages from API response
export function parseSpecialMessages(
  apiMessages: Array<{ content?: string; kind?: string; data?: unknown; delay_ms?: number }>
): { textMessages: string[]; specialMessages: SpecialMessageData[] } {
  const textMessages: string[] = []
  const specialMessages: SpecialMessageData[] = []

  for (const msg of apiMessages) {
    if (!msg.kind || msg.kind === "text") {
      if (msg.content) {
        textMessages.push(msg.content)
      }
    } else if (msg.kind === "ask_navigation" || msg.kind === "embed" || msg.kind === "play_music" || msg.kind === "recommend_music") {
      specialMessages.push({
        id: `special-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind: msg.kind as SpecialMessageData["kind"],
        data: (msg.data || {}) as Record<string, unknown>,
        timestamp: new Date(),
      })
    }
  }

  return { textMessages, specialMessages }
}
