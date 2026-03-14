import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const backend = (process.env.INTERNAL_HEALTH_DB_URL || process.env.CPU_SERVER_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000').trim()
    const resp = await fetch(`${backend.replace(/\/$/, '')}/v1/benh${q ? `?q=${encodeURIComponent(q)}` : ''}`)
    const data = await resp.json()
    if (!resp.ok) {
      return NextResponse.json({ error: 'backend_error' }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 })
  }
}
