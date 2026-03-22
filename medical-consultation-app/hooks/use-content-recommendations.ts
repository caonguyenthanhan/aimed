import { useState, useCallback } from 'react'
import type { ContentType } from '@/lib/content-recommendation-service'

interface ContentRecommendation {
  id: string
  contentType: ContentType
  title: string
  description: string
  url: string
  thumbnailUrl?: string
  reason: string
  moodTags: string[]
  durationSeconds?: number
}

/**
 * Hook for managing content recommendations for emotional support
 * Quản lý gợi ý nội dung hỗ trợ cảm xúc
 */
export function useContentRecommendations() {
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get recommendations for a conversation
  const getRecommendations = useCallback(async (
    conversationId: string,
    contentType?: ContentType
  ) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ conversationId })
      if (contentType) params.append('contentType', contentType)

      const response = await fetch(`/api/content-recommendations?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }

      const data = await response.json()
      setRecommendations(data)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('[useContentRecommendations] Failed to get recommendations:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Recommend YouTube video
  const recommendYouTubeVideo = useCallback(async (
    conversationId: string,
    videoId: string,
    title: string,
    description: string,
    thumbnailUrl: string,
    durationSeconds: number,
    reason: string,
    moodTags: string[] = []
  ) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/content-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          contentType: 'youtube_video',
          externalId: videoId,
          title,
          description,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnailUrl,
          durationSeconds,
          reason,
          moodTags
        })
      })

      if (!response.ok) {
        throw new Error('Failed to recommend video')
      }

      const recommendation = await response.json()
      setRecommendations(prev => [...prev, recommendation])
      return recommendation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('[useContentRecommendations] Failed to recommend video:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Recommend music track
  const recommendMusicTrack = useCallback(async (
    conversationId: string,
    spotifyId: string,
    title: string,
    artist: string,
    description: string,
    thumbnailUrl: string,
    durationSeconds: number,
    reason: string,
    moodTags: string[] = []
  ) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/content-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          contentType: 'music_track',
          externalId: spotifyId,
          title: `${title} - ${artist}`,
          description,
          url: `https://open.spotify.com/track/${spotifyId}`,
          thumbnailUrl,
          durationSeconds,
          reason,
          moodTags
        })
      })

      if (!response.ok) {
        throw new Error('Failed to recommend music')
      }

      const recommendation = await response.json()
      setRecommendations(prev => [...prev, recommendation])
      return recommendation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('[useContentRecommendations] Failed to recommend music:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Record feedback on recommendation
  const recordFeedback = useCallback(async (
    recommendationId: string,
    feedback: 'helpful' | 'not_helpful' | 'saved'
  ) => {
    try {
      const response = await fetch('/api/content-recommendations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendationId,
          feedback
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record feedback')
      }

      return await response.json()
    } catch (err) {
      console.error('[useContentRecommendations] Failed to record feedback:', err)
      throw err
    }
  }, [])

  // Clear recommendations
  const clearRecommendations = useCallback(() => {
    setRecommendations([])
  }, [])

  return {
    recommendations,
    loading,
    error,
    getRecommendations,
    recommendYouTubeVideo,
    recommendMusicTrack,
    recordFeedback,
    clearRecommendations
  }
}
