"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Music, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { MusicRecommendationCard } from "./music-recommendation-card"
import { ChatMusicPlayer } from "./chat-music-player"
import type { MusicRecommendation } from "@/lib/agent-actions"

interface ChatMusicRecommendationsProps {
  recommendations: MusicRecommendation[]
  mood?: string
  message?: string
  onPlayVideo?: (videoId: string) => void
  className?: string
}

const MOOD_MESSAGES: Record<string, string> = {
  calm: "Nhạc nhẹ nhàng giúp bạn thư giãn",
  uplifting: "Giai điệu tích cực nâng cao tinh thần",
  meditation: "Âm thanh thiền định cho tâm trí tĩnh lặng",
  sleep: "Nhạc ru ngủ cho giấc ngủ ngon",
  focus: "Nhạc giúp tập trung và làm việc hiệu quả",
}

export function ChatMusicRecommendations({
  recommendations,
  mood,
  message,
  onPlayVideo,
  className,
}: ChatMusicRecommendationsProps) {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [showPlayer, setShowPlayer] = useState(false)

  const displayMessage = message || (mood ? MOOD_MESSAGES[mood] : "Gợi ý nhạc cho bạn")
  
  // Get the currently playing recommendation
  const playingRecommendation = recommendations.find(r => r.videoId === playingVideoId)

  const handlePlay = (videoId: string) => {
    setPlayingVideoId(videoId)
    setShowPlayer(true)
    onPlayVideo?.(videoId)
  }

  const handleClosePlayer = () => {
    setShowPlayer(false)
    setPlayingVideoId(null)
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Music Player (shows when a track is playing) */}
      {showPlayer && playingRecommendation && (
        <ChatMusicPlayer
          videoId={playingRecommendation.videoId}
          title={playingRecommendation.title}
          artist={playingRecommendation.artist}
          autoplay={true}
          onClose={handleClosePlayer}
        />
      )}

      {/* Recommendations List */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-primary/10">
                <Music className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">Gợi ý nhạc</CardTitle>
                <CardDescription className="text-xs">{displayMessage}</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            {/* Compact list view for multiple recommendations */}
            {recommendations.length > 2 ? (
              <div className="space-y-2">
                {recommendations.map((rec) => (
                  <MusicRecommendationCard
                    key={rec.videoId}
                    recommendation={rec}
                    onPlay={handlePlay}
                    isPlaying={playingVideoId === rec.videoId}
                    compact={true}
                  />
                ))}
              </div>
            ) : (
              // Card view for 1-2 recommendations
              <div className="grid gap-3">
                {recommendations.map((rec) => (
                  <MusicRecommendationCard
                    key={rec.videoId}
                    recommendation={rec}
                    onPlay={handlePlay}
                    isPlaying={playingVideoId === rec.videoId}
                    compact={false}
                  />
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
