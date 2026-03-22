import { useState, useCallback } from 'react'
import type { YouTubeVideoMetadata } from '@/lib/youtube-service'

interface UseYouTubeOptions {
  onVideoFound?: (video: YouTubeVideoMetadata) => void
  onError?: (error: string) => void
}

/**
 * Hook for YouTube video management
 * Quản lý video YouTube để nhúng vào chat
 */
export function useYouTube(options?: UseYouTubeOptions) {
  const [videos, setVideos] = useState<YouTubeVideoMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search videos by query
  const searchVideos = useCallback(async (
    query: string,
    maxResults: number = 5
  ) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        query,
        maxResults: maxResults.toString()
      })

      const response = await fetch(`/api/youtube/search?${params}`)

      if (!response.ok) {
        throw new Error('Failed to search videos')
      }

      const data = await response.json()
      setVideos(data)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      options?.onError?.(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [options])

  // Search wellness videos by mood
  const searchByMood = useCallback(async (
    mood: string,
    maxResults: number = 5
  ) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        mood,
        maxResults: maxResults.toString()
      })

      const response = await fetch(`/api/youtube/search?${params}`)

      if (!response.ok) {
        throw new Error('Failed to search videos')
      }

      const data = await response.json()
      setVideos(data)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      options?.onError?.(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [options])

  // Get video details
  const getVideoDetails = useCallback(async (videoId: string) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ videoId })
      const response = await fetch(`/api/youtube/video?${params}`)

      if (!response.ok) {
        throw new Error('Failed to get video details')
      }

      const video = await response.json()
      options?.onVideoFound?.(video)
      return video
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      options?.onError?.(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [options])

  // Get video from URL
  const getVideoFromUrl = useCallback(async (url: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/youtube/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      if (!response.ok) {
        throw new Error('Failed to get video from URL')
      }

      const video = await response.json()
      options?.onVideoFound?.(video)
      return video
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      options?.onError?.(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [options])

  // Clear videos
  const clearVideos = useCallback(() => {
    setVideos([])
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    videos,
    loading,
    error,
    searchVideos,
    searchByMood,
    getVideoDetails,
    getVideoFromUrl,
    clearVideos,
    clearError
  }
}
