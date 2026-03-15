import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { geminiService } from '@/lib/gemini-service'

export async function POST(request: NextRequest) {
  try {
    const bodyIn = await request.json()
    const auth = request.headers.get('authorization') || ''

    const userMessage: string = String(bodyIn?.message || bodyIn?.prompt || bodyIn?.question || '').trim()
    const conversationHistory: any[] = Array.isArray(bodyIn?.conversationHistory) ? bodyIn.conversationHistory : (Array.isArray(bodyIn?.messages) ? bodyIn.messages : [])
    const conversation_id: string | null = typeof bodyIn?.conversation_id === 'string' ? bodyIn.conversation_id : null
    const user_id: string | null = typeof bodyIn?.user_id === 'string' ? bodyIn.user_id : null
    const selectedModel = (typeof bodyIn?.model === 'string' ? String(bodyIn.model).toLowerCase() : 'flash')
    const modeHeader = selectedModel === 'pro' ? 'pro' : 'flash'
    const temperatureIn = Number(bodyIn?.temperature)
    const maxTokensIn = Number(bodyIn?.max_tokens ?? bodyIn?.maxTokens)
    const temperature = Number.isFinite(temperatureIn) ? Math.max(0.2, Math.min(1.2, temperatureIn)) : 0.85
    const max_tokens = Number.isFinite(maxTokensIn) ? Math.max(256, Math.min(1536, Math.trunc(maxTokensIn))) : 1100
    const provider = (typeof bodyIn?.provider === 'string' ? String(bodyIn.provider).trim().toLowerCase() : '') || (process.env.LLM_PROVIDER || '').trim().toLowerCase()
    const useGemini = provider === 'gemini' || selectedModel === 'gemini'

    if (!userMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (useGemini) {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })
      }
      const startGemini = Date.now()
      const out = await geminiService.generateFromConfig({
        category: 'friend',
        tier: modeHeader,
        question: userMessage,
        persona: '',
        messages: conversationHistory,
        generationConfig: { temperature, maxOutputTokens: max_tokens }
      })
      const durationGemini = Date.now() - startGemini
      const content = String(out?.text || '').trim()
      if (!content) {
        return NextResponse.json({ error: 'No content in response' }, { status: 502 })
      }
      return NextResponse.json({
        response: content,
        metadata: {
          timestamp: new Date().toISOString(),
          mode: 'gpu',
          fallback: false,
          provider: 'gemini',
          duration_ms: durationGemini,
          model: out?.model || process.env.GEMINI_MODEL || 'gemini'
        },
        conversation_id: conversation_id || null
      })
    }

    const dataDir = path.join(process.cwd(), 'data')
    const cpuBase = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || '').trim().replace(/\/$/, '')
    const cpuFallback = (process.env.INTERNAL_FRIEND_CHAT_URL || (cpuBase ? `${cpuBase}/v1/friend-chat/completions` : '') || 'http://127.0.0.1:8000/v1/friend-chat/completions').trim()

    const envGpuBase = (process.env.GPU_SERVER_URL || process.env.DEFAULT_GPU_URL || '').trim().replace(/\/$/, '')
    let targetUrl = `${String(envGpuBase || defaultGpuUrl).replace(/\/$/, '')}/v1/friend-chat/completions`
    let originalTarget: 'cpu' | 'gpu' = 'gpu'
    try {
      try {
        const modeRaw = fs.readFileSync(path.join(dataDir, 'runtime-mode.json'), 'utf-8')
        const mode = JSON.parse(modeRaw)
        if (mode?.target === 'cpu' || mode?.target === 'gpu') {
          originalTarget = mode.target
        }
        if (mode?.gpu_url) {
          targetUrl = `${String(mode.gpu_url).replace(/\/$/, '')}/v1/friend-chat/completions`
        }
      } catch {}
      if (originalTarget === 'cpu') {
        targetUrl = cpuFallback
      } else {
        try {
          const regRaw = fs.readFileSync(path.join(dataDir, 'server-registry.json'), 'utf-8')
          const reg = JSON.parse(regRaw)
          const servers = Array.isArray(reg?.servers) ? reg.servers : []
          const active = servers.filter((s: any) => s.status === 'active')
          const latest = (active.length ? active : servers).sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
          if (latest?.url) {
            targetUrl = `${String(latest.url).replace(/\/$/, '')}/v1/friend-chat/completions`
          }
        } catch {}
      }
    } catch {}

    const friendSystem = "Bạn là một người bạn thân, nói chuyện đời thường bằng tiếng Việt. Giọng điệu dịu dàng, ấm áp, thân thiện và sâu lắng. Nguyên tắc: ưu tiên lắng nghe và đồng cảm trước; không giảng đạo lý; không khuyên dạy ngay trừ khi người dùng hỏi rõ; phản hồi giống người thật; trả lời 2–5 đoạn ngắn có nhịp; hỏi lại tối đa 1 câu nhẹ để hiểu thêm cảm xúc."
    const payload = {
      model: selectedModel,
      mode: modeHeader,
      temperature,
      max_tokens,
      messages: [
        { role: 'system', content: friendSystem },
        ...conversationHistory.map((m: any) => ({
          role: m.role || (m.isUser ? 'user' : 'assistant'),
          content: m.content || ''
        })),
        { role: 'user', content: userMessage }
      ],
      conversation_id,
      user_id
    }

    const start = Date.now()
    let resp = await fetch(targetUrl, {
      method: 'POST',
      headers: auth ? { 'Content-Type': 'application/json', 'Authorization': auth, 'ngrok-skip-browser-warning': 'true', 'X-Mode': modeHeader } : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true', 'X-Mode': modeHeader },
      body: JSON.stringify(payload)
    })
    let modeUsed: 'cpu' | 'gpu' = (targetUrl.includes('127.0.0.1') || targetUrl.includes('localhost')) ? 'cpu' : 'gpu'

    if (!resp.ok) {
      try {
        if (modeUsed === 'gpu') {
          const retry = await fetch(cpuFallback, {
            method: 'POST',
            headers: auth ? { 'Content-Type': 'application/json', 'Authorization': auth, 'ngrok-skip-browser-warning': 'true' } : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify(payload)
          })
          if (retry.ok) {
            resp = retry
            modeUsed = 'cpu'
            try {
              const now = new Date().toISOString()
              fs.appendFileSync(path.join(dataDir, 'runtime-events.jsonl'), JSON.stringify({ type: 'fallback', from: 'gpu', to: 'cpu', ts: now }) + '\n')
              const modePath = path.join(dataDir, 'runtime-mode.json')
              const payloadMode: any = { target: 'cpu', updated_at: now }
              fs.writeFileSync(modePath, JSON.stringify(payloadMode, null, 2))
              fs.appendFileSync(path.join(dataDir, 'runtime-events.jsonl'), JSON.stringify({ type: 'mode_change', target: 'cpu', ts: now }) + '\n')
            } catch {}
          }
        }
      } catch {}
    }

    if (!resp.ok) {
      const text = await resp.text()
      return NextResponse.json({ error: 'LLM server error', details: text }, { status: 502 })
    }

    let data: any
    try {
      const responseText = await resp.text()
      if (!responseText || responseText.trim() === '') throw new Error('Empty response from server')
      data = JSON.parse(responseText)
    } catch (e: any) {
      return NextResponse.json({ error: 'Invalid JSON response from server', details: e?.message || 'parse_error' }, { status: 502 })
    }

    const duration = Date.now() - start
    try {
      fs.appendFileSync(path.join(dataDir, 'runtime-metrics.jsonl'), JSON.stringify({ mode: modeUsed, duration_ms: duration, ok: !!data, ts: new Date().toISOString(), endpoint: 'friend-chat' }) + '\n')
    } catch {}
    try {
      if (modeUsed === 'gpu') {
        const base = targetUrl.replace(/\/v1\/friend-chat\/completions$/, '')
        const gm = await fetch(`${base}/gpu/metrics`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
        if (gm.ok) {
          const v = await gm.json()
          fs.appendFileSync(path.join(dataDir, 'runtime-events.jsonl'), JSON.stringify({ type: 'gpu_metrics', ts: new Date().toISOString(), data: v }) + '\n')
        }
      }
    } catch {}

    const content = data?.choices?.[0]?.message?.content || data?.response || ''
    const newConversationId = typeof data?.conversation_id === 'string' ? data.conversation_id : (conversation_id || null)
    if (!content) {
      return NextResponse.json({ error: 'No content in response', details: JSON.stringify(data) }, { status: 502 })
    }

    return NextResponse.json({
      response: content,
      metadata: {
        timestamp: new Date().toISOString(),
        mode: modeUsed,
        fallback: originalTarget === 'gpu' && modeUsed === 'cpu',
        provider: 'server'
      },
      conversation_id: newConversationId
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error?.message || 'unknown' }, { status: 500 })
  }
}

const defaultGpuUrl = process.env.DEFAULT_GPU_URL || 'https://elissa-villous-scourgingly.ngrok-free.dev'
