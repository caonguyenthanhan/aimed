// YouTube Integration Service
// Tích hợp YouTube API để tìm kiếm và gợi ý video

export interface YouTubeVideoMetadata {
  videoId: string
  title: string
  description: string
  channelTitle: string
  publishedAt: string
  thumbnailUrl: string
  duration?: number
  viewCount?: number
}

interface YouTubeSearchItem {
  id?: {
    videoId?: string
  }
  snippet?: {
    title?: string
    description?: string
    channelTitle?: string
    publishedAt?: string
    thumbnails?: {
      high?: { url?: string }
      default?: { url?: string }
    }
  }
}

interface YouTubeDetailsItem {
  id?: string
  contentDetails?: {
    duration?: string
  }
  statistics?: {
    viewCount?: string
  }
  snippet?: {
    title?: string
    description?: string
    channelTitle?: string
    publishedAt?: string
    thumbnails?: {
      high?: { url?: string }
      default?: { url?: string }
    }
  }
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[]
}

interface YouTubeDetailsResponse {
  items?: YouTubeDetailsItem[]
}

/**
 * YouTube Service - Handles video search and recommendations
 * Wrapper for YouTube API with stub implementation
 * Phục vụ YouTube API để tìm kiếm và gợi ý video
 */
export class YouTubeService {
  private apiKey?: string
  private baseUrl = 'https://www.googleapis.com/youtube/v3'
  private static cache: Map<string, { expiresAt: number; value: any }> | null = null
  private static getCache() {
    const g = globalThis as any
    if (!g.__MCS_YOUTUBE_CACHE__) {
      g.__MCS_YOUTUBE_CACHE__ = new Map<string, { expiresAt: number; value: any }>()
    }
    return g.__MCS_YOUTUBE_CACHE__ as Map<string, { expiresAt: number; value: any }>
  }
  private static getCached<T>(key: string): T | null {
    const cache = YouTubeService.getCache()
    const hit = cache.get(key)
    if (!hit) return null
    if (Date.now() > hit.expiresAt) {
      cache.delete(key)
      return null
    }
    return hit.value as T
  }
  private static setCached<T>(key: string, value: T, ttlMs: number) {
    const cache = YouTubeService.getCache()
    cache.set(key, { expiresAt: Date.now() + Math.max(0, ttlMs), value })
  }

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY
  }

  /**
   * Search YouTube videos by query
   * Tìm kiếm video YouTube theo từ khóa
   */
  async searchVideos(
    query: string,
    maxResults: number = 5,
    moodFilters?: string[]
  ): Promise<YouTubeVideoMetadata[]> {
    const q = String(query || '').trim()
    const n = Math.min(Math.max(1, maxResults || 5), 50)
    const cacheKey = `search:${q.toLowerCase()}|n=${n}|lang=vi|region=VN`
    const cached = YouTubeService.getCached<YouTubeVideoMetadata[]>(cacheKey)
    if (cached) return cached
    if (!this.apiKey) {
      console.log('[YouTubeService] YouTube API not configured, returning stubs')
      const out = this.generateStubResults(q, n)
      YouTubeService.setCached(cacheKey, out, 60_000)
      return out
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        part: 'snippet,contentDetails',
        q,
        maxResults: n.toString(),
        type: 'video',
        order: 'relevance',
        videoCategoryId: '22', // People & Blogs
        relevanceLanguage: 'vi',
        regionCode: 'VN'
      })

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.statusText}`)
      }

      const data = (await response.json()) as YouTubeSearchResponse

      // Get video details for duration info
      const items = Array.isArray(data.items) ? data.items : []
      const videoIds = items
        .map((item) => String(item.id?.videoId || "").trim())
        .filter(Boolean)
        .join(',')
      if (!videoIds) {
        const out = this.generateStubResults(q, n)
        YouTubeService.setCached(cacheKey, out, 60_000)
        return out
      }
      const detailsResponse = await fetch(
        `${this.baseUrl}/videos?key=${this.apiKey}&part=contentDetails,statistics&id=${videoIds}`
      )

      const detailsData = (await detailsResponse.json()) as YouTubeDetailsResponse
      const detailItems = Array.isArray(detailsData.items) ? detailsData.items : []
      const detailsMap = new Map<string, YouTubeDetailsItem>(
        detailItems
          .map((item) => [String(item.id || "").trim(), item] as const)
          .filter(([id]) => Boolean(id))
      )

      const out = items.map((item) => {
        const videoId = String(item.id?.videoId || "").trim()
        const snippet = item.snippet
        const details = detailsMap.get(videoId)
        return {
          videoId,
          title: String(snippet?.title || ''),
          description: String(snippet?.description || ''),
          channelTitle: String(snippet?.channelTitle || ''),
          publishedAt: String(snippet?.publishedAt || ''),
          thumbnailUrl: String(snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url || ''),
          duration: this.parseDuration(String(details?.contentDetails?.duration || '')),
          viewCount: parseInt(details?.statistics?.viewCount || '0', 10)
        }
      }).filter((item) => item.videoId)
      YouTubeService.setCached(cacheKey, out, 5 * 60_000)
      return out
    } catch (error) {
      console.error('[YouTubeService] Search failed:', error)
      const out = this.generateStubResults(q, n)
      YouTubeService.setCached(cacheKey, out, 60_000)
      return out
    }
  }

  /**
   * Get video details by ID
   * Lấy chi tiết video theo ID
   */
  async getVideoDetails(videoId: string): Promise<YouTubeVideoMetadata | null> {
    const id = String(videoId || '').trim()
    const cacheKey = `video:${id}`
    const cached = YouTubeService.getCached<YouTubeVideoMetadata | null>(cacheKey)
    if (cached) return cached
    if (!this.apiKey) {
      console.log('[YouTubeService] YouTube API not configured')
      return null
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        part: 'snippet,contentDetails,statistics',
        id
      })

      const response = await fetch(`${this.baseUrl}/videos?${params}`, {
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.statusText}`)
      }

      const data = (await response.json()) as YouTubeDetailsResponse

      const items = Array.isArray(data.items) ? data.items : []
      if (items.length === 0) {
        YouTubeService.setCached(cacheKey, null, 60_000)
        return null
      }

      const item = items[0]
      const snippet = item?.snippet

      const out = {
        videoId: String(item?.id || ''),
        title: String(snippet?.title || ''),
        description: String(snippet?.description || ''),
        channelTitle: String(snippet?.channelTitle || ''),
        publishedAt: String(snippet?.publishedAt || ''),
        thumbnailUrl: String(snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url || ''),
        duration: this.parseDuration(String(item?.contentDetails?.duration || '')),
        viewCount: parseInt(String(item?.statistics?.viewCount || '0'), 10)
      }
      YouTubeService.setCached(cacheKey, out, 30 * 60_000)
      return out
    } catch (error) {
      console.error('[YouTubeService] Failed to get video details:', error)
      return null
    }
  }

  /**
   * Search for emotional support/wellness videos
   * Tìm kiếm video hỗ trợ cảm xúc/wellness
   */
  async searchWellnessVideos(
    mood: string,
    maxResults: number = 5
  ): Promise<YouTubeVideoMetadata[]> {
    const m = String(mood || '').trim().toLowerCase()
    const n = Math.min(Math.max(1, maxResults || 5), 20)
    const cacheKey = `wellness:${m}|n=${n}`
    const cached = YouTubeService.getCached<YouTubeVideoMetadata[]>(cacheKey)
    if (cached) return cached
    const wellnessQueries: Record<string, string[]> = {
      'relaxation': ['thiền định', 'meditation for relaxation', 'công phu thả lỏng'],
      'meditation': ['thiền định', 'guided meditation', 'sự tĩnh tâm'],
      'calming': ['nhạc thư giãn', 'calming music', 'âm thanh thư giãn'],
      'stress-relief': ['giải tỏa căng thẳng', 'stress relief', 'yoga thư giãn'],
      'motivation': ['động lực', 'motivational', 'khích lệ'],
      'sleep': ['ngủ ngon', 'sleep meditation', 'nhạc ngủ'],
      'anxiety': ['lo lắng', 'anxiety relief', 'hỗ trợ sức khỏe tâm thần'],
      'breathing': ['hơi thở', 'breathing exercises', 'kỹ thuật hơi thở']
    }

    const queries = wellnessQueries[m] || [m]
    const allResults: YouTubeVideoMetadata[] = []

    for (const query of queries) {
      try {
        const results = await this.searchVideos(query, n)
        allResults.push(...results)
      } catch (error) {
        console.error(`[YouTubeService] Search failed for "${query}":`, error)
      }
    }

    // Remove duplicates and return top results
    const uniqueResults = Array.from(
      new Map(allResults.map(v => [v.videoId, v])).values()
    ).slice(0, n)

    const out = uniqueResults.length > 0 ? uniqueResults : this.generateStubResults(m, n)
    YouTubeService.setCached(cacheKey, out, 5 * 60_000)
    return out
  }

  /**
   * Validate YouTube URL/ID
   * Xác thực URL/ID YouTube
   */
  static validateVideoId(videoId: string): boolean {
    // YouTube video IDs are 11 characters long and alphanumeric
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId)
  }

  /**
   * Extract video ID from URL
   * Trích xuất video ID từ URL
   */
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return null
  }

  /**
   * Parse ISO 8601 duration to seconds
   * Phân tích thời lượng ISO 8601 thành giây
   */
  private parseDuration(duration: string): number {
    if (!duration) return 0

    const pattern = /P(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?/
    const matches = duration.match(pattern)

    if (!matches) return 0

    const hours = parseInt(matches[6] || '0', 10)
    const minutes = parseInt(matches[7] || '0', 10)
    const seconds = parseInt(matches[8] || '0', 10)

    return hours * 3600 + minutes * 60 + seconds
  }

  /**
   * Generate stub results for demo/fallback
   * Tạo kết quả giả để demo
   */
  private generateStubResults(query: string, count: number): YouTubeVideoMetadata[] {
    const stubs: YouTubeVideoMetadata[] = [
      {
        videoId: 'dQw4w9WgXcQ',
        title: `${query} - Giảm Căng Thẳng & Thư Giãn`,
        description: 'Video thiền định giúp bạn thả lỏng và giảm căng thẳng trong 10 phút',
        channelTitle: 'Wellness Channel',
        publishedAt: new Date().toISOString(),
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        duration: 600,
        viewCount: 1000000
      },
      {
        videoId: 'jNQXAC9IVRw',
        title: `${query} - Hướng Dẫn Thực Hành`,
        description: 'Khóa học bắt đầu về các kỹ thuật thư giãn và hỗ trợ sức khỏe tinh thần',
        channelTitle: 'Health Education',
        publishedAt: new Date().toISOString(),
        thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
        duration: 900,
        viewCount: 500000
      }
    ]

    return stubs.slice(0, count)
  }
}

export const youtubeService = new YouTubeService()
