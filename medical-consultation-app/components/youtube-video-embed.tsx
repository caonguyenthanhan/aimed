"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, ThumbsUp, ThumbsDown, BookmarkPlus } from "lucide-react"

interface YouTubeVideoEmbedProps {
  videoId: string
  title: string
  description: string
  thumbnailUrl?: string
  duration?: number
  reason?: string
  recommendationId?: string
  onClose?: () => void
  onFeedback?: (type: 'helpful' | 'not_helpful' | 'saved') => void
}

/**
 * YouTube Video Embed Component - displays YouTube videos directly in chat
 * Hiển thị video YouTube trực tiếp trong cuộc trò chuyện
 */
export function YouTubeVideoEmbed({
  videoId,
  title,
  description,
  thumbnailUrl,
  duration,
  reason,
  recommendationId,
  onClose,
  onFeedback
}: YouTubeVideoEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | 'saved' | null>(null)

  const handleFeedback = (type: 'helpful' | 'not_helpful' | 'saved') => {
    setFeedback(type)
    onFeedback?.(type)
  }

  return (
    <Card className="border-blue-200 bg-white dark:bg-gray-900 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{title}</CardTitle>
            {reason && (
              <CardDescription className="mt-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Lý do gợi ý:</span> {reason}
              </CardDescription>
            )}
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video Player */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          {!isPlaying ? (
            <button
              onClick={() => setIsPlaying(true)}
              className="w-full relative group cursor-pointer"
            >
              <img
                src={thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                alt={title}
                className="w-full aspect-video object-cover group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-red-600 rounded-full p-4 group-hover:bg-red-700 transition-colors">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              {duration && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {formatDuration(duration)}
                </div>
              )}
            </button>
          ) : (
            <div className="w-full aspect-video bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title={title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {description}
          </div>
        )}

        {/* Feedback Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant={feedback === 'helpful' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFeedback('helpful')}
            className="flex-1 gap-2"
          >
            <ThumbsUp className="w-4 h-4" />
            <span className="text-xs">Hữu ích</span>
          </Button>
          <Button
            variant={feedback === 'not_helpful' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFeedback('not_helpful')}
            className="flex-1 gap-2"
          >
            <ThumbsDown className="w-4 h-4" />
            <span className="text-xs">Không hữu ích</span>
          </Button>
          <Button
            variant={feedback === 'saved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFeedback('saved')}
            className="flex-1 gap-2"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span className="text-xs">Lưu</span>
          </Button>
        </div>

        {/* Watch Full Video Link */}
        <div className="pt-2 border-t">
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Xem video đầy đủ trên YouTube →
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Helper function to format duration in seconds to MM:SS
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
