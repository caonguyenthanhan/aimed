import { NextRequest, NextResponse } from 'next/server'
import { youtubeService } from '@/lib/youtube-service'

/**
 * GET /api/youtube/video - Get video details
 * Lấy chi tiết video YouTube
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json(
        { error: 'Missing videoId parameter' },
        { status: 400 }
      )
    }

    // Validate video ID format
    if (!youtubeService.validateVideoId(videoId)) {
      return NextResponse.json(
        { error: 'Invalid video ID format' },
        { status: 400 }
      )
    }

    const video = await youtubeService.getVideoDetails(videoId)

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error getting video details:', error)
    return NextResponse.json(
      { error: 'Failed to get video details' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/youtube/video - Validate and extract video ID
 * Xác thực và trích xuất video ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { error: 'Missing url in request body' },
        { status: 400 }
      )
    }

    const videoId = youtubeService.extractVideoId(url)

    if (!videoId) {
      return NextResponse.json(
        { error: 'Could not extract valid video ID from URL' },
        { status: 400 }
      )
    }

    // Get video details
    const video = await youtubeService.getVideoDetails(videoId)

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found or API not configured' },
        { status: 404 }
      )
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error processing video URL:', error)
    return NextResponse.json(
      { error: 'Failed to process video URL' },
      { status: 500 }
    )
  }
}
