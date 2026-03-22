import { NextRequest, NextResponse } from 'next/server'
import { contentRecommendationService } from '@/lib/content-recommendation-service'

/**
 * GET /api/content-recommendations - Get recommendations for a conversation
 * Lấy gợi ý nội dung cho cuộc hội thoại
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const conversationId = searchParams.get('conversationId')
    const contentType = searchParams.get('contentType')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversationId parameter' },
        { status: 400 }
      )
    }

    const recommendations = await contentRecommendationService.getRecommendationsForConversation(
      conversationId,
      contentType as any
    )

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error('Error fetching content recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/content-recommendations - Recommend content
 * Gợi ý nội dung
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      conversationId,
      contentType,
      externalId,
      title,
      description,
      url,
      thumbnailUrl,
      durationSeconds,
      reason,
      moodTags
    } = body

    if (!conversationId || !contentType || !externalId || !title || !url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const metadata = {
      external_id: externalId,
      content_type: contentType,
      title,
      description,
      url,
      thumbnail_url: thumbnailUrl,
      duration_seconds: durationSeconds,
      source: extractSource(contentType)
    }

    const recommendation = await contentRecommendationService.recommendContent(
      conversationId,
      contentType,
      externalId,
      metadata,
      reason,
      moodTags || []
    )

    return NextResponse.json(recommendation, { status: 201 })
  } catch (error) {
    console.error('Error creating recommendation:', error)
    return NextResponse.json(
      { error: 'Failed to create recommendation' },
      { status: 500 }
    )
  }
}

/**
 * Helper: Extract source from content type
 */
function extractSource(contentType: string): 'youtube' | 'spotify' | 'apple_music' | 'podcast_api' | 'audiobook_api' {
  switch (contentType) {
    case 'youtube_video':
      return 'youtube'
    case 'music_track':
      return 'spotify'
    case 'podcast':
      return 'podcast_api'
    case 'audiobook':
      return 'audiobook_api'
    case 'meditation':
      return 'podcast_api'
    default:
      return 'podcast_api'
  }
}
