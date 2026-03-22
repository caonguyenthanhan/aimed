// Content Recommendation Service for Tam-Su (Emotional Support)
// Gợi ý nội dung (video YouTube, nhạc, podcast) để hỗ trợ cảm xúc

import { getNeonPool } from './neon-db'

export type ContentType = 'youtube_video' | 'music_track' | 'podcast' | 'audiobook' | 'meditation'

export interface ContentRecommendation {
  id: string
  conversation_id: string
  content_type: ContentType
  external_id: string // YouTube ID, Spotify ID, etc.
  title: string
  description: string
  url: string
  thumbnail_url?: string
  duration_seconds?: number
  reason: string
  mood_tags: string[] // ['calming', 'energizing', 'motivational', etc.]
  recommended_at: Date
  user_feedback?: 'helpful' | 'not_helpful' | 'saved'
}

export interface ExternalContentMetadata {
  external_id: string
  content_type: ContentType
  title: string
  description: string
  url: string
  thumbnail_url?: string
  duration_seconds?: number
  source: 'youtube' | 'spotify' | 'apple_music' | 'podcast_api' | 'audiobook_api'
}

/**
 * Content Recommendation Service handles emotional support content
 * Currently focused on YouTube videos, will expand to music and podcasts
 * Quản lý gợi ý nội dung cho sự hỗ trợ cảm xúc
 */
export class ContentRecommendationService {
  private pool = getNeonPool()

  /**
   * Recommend content for emotional support
   * Gợi ý nội dung để hỗ trợ cảm xúc
   */
  async recommendContent(
    conversationId: string,
    contentType: ContentType,
    externalId: string,
    metadata: ExternalContentMetadata,
    reason: string,
    moodTags: string[] = []
  ): Promise<ContentRecommendation> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO content_recommendations 
         (conversation_id, content_type, external_id, title, description, url, 
          thumbnail_url, duration_seconds, reason, mood_tags, recommended_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         RETURNING *`,
        [
          conversationId,
          contentType,
          externalId,
          metadata.title,
          metadata.description,
          metadata.url,
          metadata.thumbnail_url || null,
          metadata.duration_seconds || null,
          reason,
          JSON.stringify(moodTags)
        ]
      )
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Recommend YouTube video
   * Gợi ý video YouTube
   */
  async recommendYouTubeVideo(
    conversationId: string,
    youtubeId: string,
    title: string,
    description: string,
    thumbnailUrl: string,
    durationSeconds: number,
    reason: string,
    moodTags: string[] = []
  ): Promise<ContentRecommendation> {
    return this.recommendContent(
      conversationId,
      'youtube_video',
      youtubeId,
      {
        external_id: youtubeId,
        content_type: 'youtube_video',
        title,
        description,
        url: `https://www.youtube.com/watch?v=${youtubeId}`,
        thumbnail_url: thumbnailUrl,
        duration_seconds: durationSeconds,
        source: 'youtube'
      },
      reason,
      moodTags
    )
  }

  /**
   * Recommend music track (placeholder for future API integration)
   * Gợi ý bài nhạc
   */
  async recommendMusicTrack(
    conversationId: string,
    spotifyId: string,
    title: string,
    artist: string,
    description: string,
    thumbnailUrl: string,
    durationSeconds: number,
    reason: string,
    moodTags: string[] = []
  ): Promise<ContentRecommendation> {
    return this.recommendContent(
      conversationId,
      'music_track',
      spotifyId,
      {
        external_id: spotifyId,
        content_type: 'music_track',
        title: `${title} - ${artist}`,
        description,
        url: `https://open.spotify.com/track/${spotifyId}`,
        thumbnail_url: thumbnailUrl,
        duration_seconds: durationSeconds,
        source: 'spotify'
      },
      reason,
      moodTags
    )
  }

  /**
   * Recommend podcast episode (placeholder for future API integration)
   * Gợi ý tập podcast
   */
  async recommendPodcast(
    conversationId: string,
    podcastId: string,
    title: string,
    description: string,
    thumbnailUrl: string,
    durationSeconds: number,
    reason: string,
    moodTags: string[] = []
  ): Promise<ContentRecommendation> {
    return this.recommendContent(
      conversationId,
      'podcast',
      podcastId,
      {
        external_id: podcastId,
        content_type: 'podcast',
        title,
        description,
        url: `https://podcasts.example.com/${podcastId}`,
        thumbnail_url: thumbnailUrl,
        duration_seconds: durationSeconds,
        source: 'podcast_api'
      },
      reason,
      moodTags
    )
  }

  /**
   * Get recommendations for a conversation
   * Lấy các gợi ý cho một cuộc hội thoại
   */
  async getRecommendationsForConversation(
    conversationId: string,
    contentType?: ContentType
  ): Promise<ContentRecommendation[]> {
    const client = await this.pool.connect()
    try {
      let query = `SELECT * FROM content_recommendations WHERE conversation_id = $1`
      const params: any[] = [conversationId]

      if (contentType) {
        query += ` AND content_type = $2`
        params.push(contentType)
      }

      query += ` ORDER BY recommended_at DESC`

      const result = await client.query(query, params)
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Record user feedback on recommendation
   * Ghi lại phản hồi người dùng về gợi ý
   */
  async recordFeedback(
    recommendationId: string,
    feedback: 'helpful' | 'not_helpful' | 'saved'
  ): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query(
        `UPDATE content_recommendations 
         SET user_feedback = $1
         WHERE id = $2`,
        [feedback, recommendationId]
      )
    } finally {
      client.release()
    }
  }

  /**
   * Get popular content by mood
   * Lấy nội dung phổ biến theo tâm trạng
   */
  async getPopularContentByMood(mood: string, contentType?: ContentType): Promise<ContentRecommendation[]> {
    const client = await this.pool.connect()
    try {
      let query = `SELECT * FROM content_recommendations 
                   WHERE mood_tags @> $1::jsonb`
      const params: any[] = [JSON.stringify([mood])]

      if (contentType) {
        query += ` AND content_type = $2`
        params.push(contentType)
      }

      query += ` AND user_feedback IS NOT NULL
                 ORDER BY recommended_at DESC
                 LIMIT 20`

      const result = await client.query(query, params)
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Get user's saved content
   * Lấy nội dung đã lưu của người dùng
   */
  async getUserSavedContent(userId: string): Promise<ContentRecommendation[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT cr.* FROM content_recommendations cr
         JOIN chat_messages cm ON cr.conversation_id = cm.conversation_id
         WHERE cm.user_id = $1 AND cr.user_feedback = 'saved'
         ORDER BY cr.recommended_at DESC`,
        [userId]
      )
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Get content usage statistics
   * Lấy thống kê sử dụng nội dung
   */
  async getContentUsageStats(): Promise<Record<string, number>> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT content_type, COUNT(*) as usage_count
         FROM content_recommendations
         WHERE user_feedback IS NOT NULL
         GROUP BY content_type`
      )

      const stats: Record<string, number> = {}
      result.rows.forEach(row => {
        stats[row.content_type] = parseInt(row.usage_count, 10)
      })
      return stats
    } finally {
      client.release()
    }
  }

  /**
   * Search YouTube videos (stub - requires YouTube API key)
   * Tìm kiếm video YouTube
   */
  async searchYouTubeVideos(query: string, maxResults: number = 5): Promise<ExternalContentMetadata[]> {
    // This is a stub that will be implemented when YouTube API is configured
    console.log('[v0] YouTube search stub called with query:', query)
    
    // Return empty array for now
    return []
  }

  /**
   * Search music tracks (stub - requires Spotify/Apple Music API)
   * Tìm kiếm bài nhạc
   */
  async searchMusicTracks(query: string, maxResults: number = 5): Promise<ExternalContentMetadata[]> {
    // This is a stub that will be implemented when music API is configured
    console.log('[v0] Music search stub called with query:', query)
    
    // Return empty array for now
    return []
  }

  /**
   * Search podcasts (stub - requires Podcast API)
   * Tìm kiếm podcast
   */
  async searchPodcasts(query: string, maxResults: number = 5): Promise<ExternalContentMetadata[]> {
    // This is a stub that will be implemented when podcast API is configured
    console.log('[v0] Podcast search stub called with query:', query)
    
    // Return empty array for now
    return []
  }
}

export const contentRecommendationService = new ContentRecommendationService()
