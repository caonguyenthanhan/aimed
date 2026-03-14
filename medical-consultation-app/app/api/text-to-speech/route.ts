import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = typeof body?.text === 'string' ? body.text : ''
    const sanitized = String(text).replace(/\*\*/g, '')
    const payload = { ...body, text: sanitized }
    
    const backendUrl = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || 'http://localhost:8000').trim().replace(/\/$/, '')
    
    const response = await fetch(`${backendUrl}/v1/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    // Modify the download_url to use the backend URL
    if (data.download_url) {
      data.audio_url = `${backendUrl}${data.download_url}`
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Text-to-speech API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    )
  }
}
