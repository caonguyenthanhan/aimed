import { NextRequest, NextResponse } from 'next/server'
import { contentRecommendationService } from '@/lib/content-recommendation-service'

/**
 * POST /api/content-recommendations/feedback - Record user feedback on content
 * Ghi lại phản hồi người dùng về nội dung
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recommendationId, feedback } = body

    if (!recommendationId || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields: recommendationId, feedback' },
        { status: 400 }
      )
    }

    if (!['helpful', 'not_helpful', 'saved'].includes(feedback)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      )
    }

    await contentRecommendationService.recordFeedback(recommendationId, feedback)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording feedback:', error)
    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 }
    )
  }
}
