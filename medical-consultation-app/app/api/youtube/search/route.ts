import { NextRequest, NextResponse } from 'next/server'
import { youtubeService } from '@/lib/youtube-service'

/**
 * GET /api/youtube/search - Search YouTube videos
 * Tìm kiếm video YouTube
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query')
    const maxResults = parseInt(searchParams.get('maxResults') || '5', 10)
    const mood = searchParams.get('mood')

    if (!query && !mood) {
      return NextResponse.json(
        { error: 'Missing query or mood parameter' },
        { status: 400 }
      )
    }

    let results

    if (mood) {
      // Search for wellness videos by mood
      results = await youtubeService.searchWellnessVideos(mood, maxResults)
    } else {
      // General search
      results = await youtubeService.searchVideos(query || '', maxResults)
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error searching YouTube:', error)
    return NextResponse.json(
      { error: 'Failed to search YouTube videos' },
      { status: 500 }
    )
  }
}
