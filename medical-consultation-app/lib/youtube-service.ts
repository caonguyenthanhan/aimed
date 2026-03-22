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

/**
 * YouTube Service - Handles video search and recommendations
 * Wrapper for YouTube API with stub implementation
 * Phục vụ YouTube API để tìm kiếm và gợi ý video
 */
export class YouTubeService {
  private apiKey?: string
  private baseUrl = 'https://www.googleapis.com/youtube/v3'

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
    if (!this.apiKey) {
      console.log('[YouTubeService] YouTube API not configured, returning stubs')
      return this.generateStubResults(query, maxResults)
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        part: 'snippet,contentDetails',
        q: query,
        maxResults: Math.min(maxResults, 50).toString(),
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

      const data = await response.json()

      // Get video details for duration info
      const videoIds = data.items.map((item: any) => item.id.videoId).join(',')
      const detailsResponse = await fetch(
        `${this.baseUrl}/videos?key=${this.apiKey}&part=contentDetails,statistics&id=${videoIds}`
      )

      const detailsData = await detailsResponse.json()
      const detailsMap = new Map(
        detailsData.items.map((item: any) => [item.id, item])
      )

      return data.items.map((item: any) => {
        const details = detailsMap.get(item.id.videoId)
        return {
          videoId: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
          duration: this.parseDuration(details?.contentDetails?.duration),
          viewCount: parseInt(details?.statistics?.viewCount || '0', 10)
        }
      })
    } catch (error) {
      console.error('[YouTubeService] Search failed:', error)
      return this.generateStubResults(query, maxResults)
    }
  }

  /**
   * Get video details by ID
   * Lấy chi tiết video theo ID
   */
  async getVideoDetails(videoId: string): Promise<YouTubeVideoMetadata | null> {
    if (!this.apiKey) {
      console.log('[YouTubeService] YouTube API not configured')
      return null
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        part: 'snippet,contentDetails,statistics',
        id: videoId
      })

      const response = await fetch(`${this.baseUrl}/videos?${params}`, {
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.items.length === 0) {
        return null
      }

      const item = data.items[0]

      return {
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        duration: this.parseDuration(item.contentDetails.duration),
        viewCount: parseInt(item.statistics.viewCount || '0', 10)
      }
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

    const queries = wellnessQueries[mood] || [mood]
    const allResults: YouTubeVideoMetadata[] = []

    for (const query of queries) {
      try {
        const results = await this.searchVideos(query, maxResults)
        allResults.push(...results)
      } catch (error) {
        console.error(`[YouTubeService] Search failed for "${query}":`, error)
      }
    }

    // Remove duplicates and return top results
    const uniqueResults = Array.from(
      new Map(allResults.map(v => [v.videoId, v])).values()
    ).slice(0, maxResults)

    return uniqueResults.length > 0 ? uniqueResults : this.generateStubResults(mood, maxResults)
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
