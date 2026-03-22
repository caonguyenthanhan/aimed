"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Music, Headphones, BookOpen, Play } from "lucide-react"
import type { ContentType } from "@/lib/content-recommendation-service"

interface ContentRecommendationCardProps {
  contentType: ContentType
  title: string
  description: string
  url: string
  thumbnailUrl?: string
  reason: string
  moodTags: string[]
  durationSeconds?: number
  onPlay?: () => void
  onSave?: () => void
}

/**
 * Content Recommendation Card - displays music, podcasts, and other emotional support content
 * Hiển thị gợi ý nội dung hỗ trợ cảm xúc
 */
export function ContentRecommendationCard({
  contentType,
  title,
  description,
  url,
  thumbnailUrl,
  reason,
  moodTags,
  durationSeconds,
  onPlay,
  onSave
}: ContentRecommendationCardProps) {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(!saved)
    onSave?.()
  }

  const getIcon = () => {
    switch (contentType) {
      case 'music_track':
        return <Music className="w-5 h-5" />
      case 'podcast':
        return <Headphones className="w-5 h-5" />
      case 'audiobook':
        return <BookOpen className="w-5 h-5" />
      default:
        return <Play className="w-5 h-5" />
    }
  }

  const getTypeName = () => {
    const typeMap: Record<ContentType, string> = {
      youtube_video: 'Video YouTube',
      music_track: 'Bài nhạc',
      podcast: 'Podcast',
      audiobook: 'Sách nói',
      meditation: 'Thiền định'
    }
    return typeMap[contentType] || contentType
  }

  const getTypeColor = () => {
    switch (contentType) {
      case 'music_track':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      case 'podcast':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'audiobook':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'meditation':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  return (
    <Card className="border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getIcon()}
                  <CardTitle className="text-base truncate">{title}</CardTitle>
                </div>
                <Badge className={`${getTypeColor()} text-xs`}>
                  {getTypeName()}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {description}
        </p>

        {/* Reason */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Lý do gợi ý:</span> {reason}
          </p>
        </div>

        {/* Mood Tags */}
        {moodTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {moodTags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Duration */}
        {durationSeconds && (
          <p className="text-xs text-gray-500">
            ⏱️ {formatDuration(durationSeconds)}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            onClick={onPlay}
            variant="default"
            size="sm"
            className="flex-1 gap-2"
            asChild
          >
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Play className="w-4 h-4" />
              Phát
            </a>
          </Button>
          <Button
            onClick={handleSave}
            variant={saved ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
          >
            {saved ? 'Đã lưu' : 'Lưu'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Helper function to format duration in seconds to MM:SS
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes < 60) {
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
