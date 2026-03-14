import { NextRequest, NextResponse } from 'next/server'
import { geminiService } from '@/lib/gemini-service'

export async function POST(request: NextRequest) {
  try {
    const { query, mode, conversation_id, user_id, provider } = await request.json()
    const auth = request.headers.get('authorization') || ''

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'Thiếu tham số query' }, { status: 400 })
    }

    const providerSel = (typeof provider === 'string' ? provider.trim().toLowerCase() : '') || (process.env.LLM_PROVIDER || '').trim().toLowerCase()
    if (providerSel === 'gemini') {
      if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })
      const tier = String(mode || '').toLowerCase() === 'pro' ? 'pro' : 'flash'
      const startGemini = Date.now()
      const out = await geminiService.generateFromConfig({
        category: 'lookup',
        tier: tier as any,
        question: String(query),
        persona: '',
        messages: []
      })
      const durationGemini = Date.now() - startGemini
      const content = String(out?.text || '').trim()
      return NextResponse.json({
        success: true,
        response: content,
        metadata: { mode: 'gpu', provider: 'gemini', duration_ms: durationGemini, model: out?.model || process.env.GEMINI_MODEL || 'gemini' }
      })
    }

    const cpuBase = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || '').trim().replace(/\/$/, '')
    const fastApiUrl = (process.env.INTERNAL_HEALTH_LOOKUP_URL || (cpuBase ? `${cpuBase}/v1/health-lookup` : '') || 'http://127.0.0.1:8000/v1/health-lookup').trim()
    const resp = await fetch(fastApiUrl, {
      method: 'POST',
      headers: auth ? { 'Content-Type': 'application/json', 'Authorization': auth } : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, mode, conversation_id, user_id })
    })

    const data = await resp.json()
    if (!resp.ok) {
      console.error('Health lookup server error:', data)
      return NextResponse.json({ error: 'Lỗi máy chủ tra cứu y khoa' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e: any) {
    console.error('Error in /api/health-lookup:', e?.message || e)
    return NextResponse.json({ error: 'Lỗi xử lý yêu cầu tra cứu y khoa' }, { status: 500 })
  }
}
