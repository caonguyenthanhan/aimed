import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { geminiService } from '@/lib/gemini-service'
import { buildBlockResponse, shouldBlock } from '@/lib/safety'
import { persistChatTurn } from '@/lib/chat-persistence'
import crypto from 'crypto'
import { assessSos, buildSosResponse } from '@/lib/sos-mode'

// Healing music recommendations based on mood
const HEALING_MUSIC: Record<string, Array<{ videoId: string; title: string; artist: string; mood: string }>> = {
  sad: [
    { videoId: "4N3N1MlvVc4", title: "Weightless", artist: "Marconi Union", mood: "calm" },
    { videoId: "lFcSrYw-ARY", title: "Gymnopédie No.1", artist: "Erik Satie", mood: "calm" },
    { videoId: "UfcAVejslrU", title: "River Flows In You", artist: "Yiruma", mood: "calm" },
  ],
  anxious: [
    { videoId: "77ZozI0rw7w", title: "Meditation Music - Relax Mind Body", artist: "Relaxing Music", mood: "meditation" },
    { videoId: "1ZYbU82GVz4", title: "Deep Sleep Music", artist: "Soothing Relaxation", mood: "sleep" },
    { videoId: "lTRiuFIWV54", title: "528Hz Healing Frequency", artist: "Meditative Mind", mood: "meditation" },
  ],
  stressed: [
    { videoId: "hlWiI4xVXKY", title: "Relaxing Piano Music", artist: "Relaxdaily", mood: "calm" },
    { videoId: "DWcJFNfaw9c", title: "Beautiful Relaxing Music", artist: "Soothing Relaxation", mood: "calm" },
    { videoId: "aXItOY0sLRY", title: "Peaceful Piano & Soft Rain", artist: "Peder B. Helland", mood: "calm" },
  ],
  lonely: [
    { videoId: "Bo9G3E1qLrw", title: "Comfort Music", artist: "Acoustic Covers", mood: "uplifting" },
    { videoId: "CvFH_6DNRCY", title: "A Thousand Years", artist: "Piano Cover", mood: "calm" },
    { videoId: "RgKAFK5djSk", title: "See You Again", artist: "Piano Cover", mood: "uplifting" },
  ],
  default: [
    { videoId: "4N3N1MlvVc4", title: "Weightless", artist: "Marconi Union", mood: "calm" },
    { videoId: "hlWiI4xVXKY", title: "Relaxing Piano Music", artist: "Relaxdaily", mood: "calm" },
    { videoId: "77ZozI0rw7w", title: "Meditation Music", artist: "Relaxing Music", mood: "meditation" },
  ]
}

// Detect mood from message and conversation
function detectMood(message: string, history: any[]): string {
  const text = message.toLowerCase()
  const allText = [...history.map(h => h.content?.toLowerCase() || ''), text].join(' ')
  
  if (/buồn|khóc|mất mát|chia tay|cô đơn|đau|thất vọng|tuyệt vọng/.test(allText)) return 'sad'
  if (/lo lắng|lo âu|sợ|hoang mang|bất an|căng thẳng|áp lực/.test(allText)) return 'anxious'
  if (/stress|mệt|kiệt sức|quá tải|không ngủ được/.test(allText)) return 'stressed'
  if (/cô đơn|một mình|không ai|thiếu vắng|nhớ/.test(allText)) return 'lonely'
  
  return 'default'
}

// Detect if user needs professional screening/support based on keywords
function detectSuggestionNeeded(message: string, history: any[]): { feature: string; reason: string } | null {
  const text = message.toLowerCase()
  const allText = [...history.map(h => h.content?.toLowerCase() || ''), text].join(' ')
  
  // Check for anxiety/panic symptoms - suggest GAD-7 screening
  if (/lo lắng|lo âu|sợ|hoang mang|bất an|căng thẳng|áp lực|tim đập mạnh|thở không ra hơi|shock|hoảng sợ/.test(allText)) {
    return {
      feature: 'sang-loc',
      reason: 'Để hiểu rõ hơn về tình trạng lo âu của bạn, bạn có muốn thử bài đánh giá GAD-7 không?'
    }
  }
  
  // Check for depression symptoms - suggest PHQ-9 screening
  if (/buồn|khóc|mất mát|chia tay|cô đơn|đau|thất vọng|tuyệt vọng|mất ngủ|không có hy vọng|vô nghĩa|tự tử/.test(allText)) {
    return {
      feature: 'sang-loc',
      reason: 'Hãy thử bài đánh giá PHQ-9 để đánh giá tâm trạng của bạn'
    }
  }
  
  // Check for stress - suggest therapy exercises
  if (/stress|mệt|kiệt sức|quá tải|không ngủ được|áp lực công việc|quá nhiều việc/.test(allText)) {
    return {
      feature: 'tri-lieu',
      reason: 'Các bài tập thư giãn và thiền định có thể giúp bạn giảm stress. Bạn có muốn thử không?'
    }
  }
  
  // Check for sleep issues - suggest therapy or music
  if (/ngủ|mất ngủ|không ngủ được|thức đêm|hôm kia không ngủ/.test(allText)) {
    return {
      feature: 'tri-lieu',
      reason: 'Tôi có một số bài tập thư giãn và nhạc giúp ngủ tốt. Bạn có muốn thử?'
    }
  }
  
  return null
}


  const text = message.toLowerCase()
  // Direct requests
  if (/nhạc|music|nghe|bài hát|thư giãn|relax|thiền|meditation/.test(text)) return true
  // After emotional sharing (every 3-5 messages)
  if (history.length >= 4 && history.length % 3 === 0) {
    const mood = detectMood(message, history)
    if (mood !== 'default') return true
  }
  return false
}

export async function POST(request: NextRequest) {
  try {
    const bodyIn = await request.json()
    const auth = request.headers.get('authorization') || ''

    const userMessage: string = String(bodyIn?.message || bodyIn?.prompt || bodyIn?.question || '').trim()
    const conversationHistory: any[] = Array.isArray(bodyIn?.conversationHistory) ? bodyIn.conversationHistory : (Array.isArray(bodyIn?.messages) ? bodyIn.messages.filter(m => m?.role === 'assistant').slice(-10) : [])
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

    const sos = assessSos(String(userMessage), conversationHistory)
    if (sos.triggered) {
      const sid = (typeof conversation_id === 'string' && conversation_id.trim()) ? conversation_id.trim() : crypto.randomUUID()
      const content = buildSosResponse(sos.hotlines)
      try {
        await persistChatTurn({
          sessionId: sid,
          kind: 'friend',
          userText: userMessage,
          assistantText: content
        })
      } catch {}
      return NextResponse.json({
        response: content,
        metadata: {
          timestamp: new Date().toISOString(),
          mode: 'sos',
          sos: true,
          hotlines: sos.hotlines,
          reasons: sos.reasons,
        },
        conversation_id: sid
      })
    }

    const safetyHits = shouldBlock(String(userMessage), conversationHistory)
    if (safetyHits.length) {
      const sid = (typeof conversation_id === 'string' && conversation_id.trim()) ? conversation_id.trim() : crypto.randomUUID()
      try {
        await persistChatTurn({
          sessionId: sid,
          kind: 'friend',
          userText: userMessage,
          assistantText: buildBlockResponse(safetyHits)
        })
      } catch {}
      return NextResponse.json({
        response: buildBlockResponse(safetyHits),
        metadata: {
          timestamp: new Date().toISOString(),
          mode: 'safety',
          blocked: true,
          blocked_categories: Array.from(new Set(safetyHits.map(h => h.category))).sort(),
        },
        conversation_id: sid
      })
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
              const sid = (typeof conversation_id === 'string' && conversation_id.trim()) ? conversation_id.trim() : crypto.randomUUID()
              try {
                await persistChatTurn({
                  sessionId: sid,
                  kind: 'friend',
                  userText: userMessage,
                  assistantText: content
                })
              } catch {}
              
              // Check for suggestions in Gemini response
              const suggestionNeeded = detectSuggestionNeeded(userMessage, conversationHistory)
              const mood = detectMood(userMessage, conversationHistory)
              const includeMusic = shouldRecommendMusic(userMessage, conversationHistory)
              const musicRecommendations = includeMusic ? (HEALING_MUSIC[mood] || HEALING_MUSIC.default) : undefined
              
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
                conversation_id: sid,
                suggestion: suggestionNeeded ? {
                  feature: suggestionNeeded.feature,
                  reason: suggestionNeeded.reason
                } : undefined,
                music: musicRecommendations ? {
                  mood,
                  recommendations: musicRecommendations,
                  message: mood !== 'default' 
                    ? `Mình gợi ý một vài bản nhạc để giúp bạn cảm thấy tốt hơn nhé:`
                    : `Đây là một số nhạc thư giãn cho bạn:`
                } : undefined
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
          if (process.env.GEMINI_API_KEY) {
            try {
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
              if (content) {
                const sid = (typeof conversation_id === 'string' && conversation_id.trim()) ? conversation_id.trim() : crypto.randomUUID()
                try {
                  await persistChatTurn({
                    sessionId: sid,
                    kind: 'friend',
                    userText: userMessage,
                    assistantText: content
                  })
                } catch {}
                return NextResponse.json({
                  response: content,
                  metadata: {
                    timestamp: new Date().toISOString(),
                    mode: 'gpu',
                    fallback: true,
                    provider: 'gemini',
                    duration_ms: durationGemini,
                    model: out?.model || process.env.GEMINI_MODEL || 'gemini'
                  },
                  conversation_id: sid
                })
              }
            } catch {}
          }
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
      if (modeUsed === 'gpu' && process.env.GEMINI_API_KEY) {
        try {
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
          if (content) {
            const sid = (typeof conversation_id === 'string' && conversation_id.trim()) ? conversation_id.trim() : crypto.randomUUID()
            try {
              await persistChatTurn({
                sessionId: sid,
                kind: 'friend',
                userText: userMessage,
                assistantText: content
              })
            } catch {}
            return NextResponse.json({
              response: content,
              metadata: {
                timestamp: new Date().toISOString(),
                mode: 'gpu',
                fallback: true,
                provider: 'gemini',
                duration_ms: durationGemini,
                model: out?.model || process.env.GEMINI_MODEL || 'gemini'
              },
              conversation_id: sid
            })
          }
        } catch {}
      }
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
    const newConversationId = (typeof data?.conversation_id === 'string' && String(data.conversation_id).trim())
      ? String(data.conversation_id).trim()
      : ((typeof conversation_id === 'string' && conversation_id.trim()) ? conversation_id.trim() : crypto.randomUUID())
    if (!content) {
      return NextResponse.json({ error: 'No content in response', details: JSON.stringify(data) }, { status: 502 })
    }
    try {
      await persistChatTurn({
        sessionId: newConversationId,
        kind: 'friend',
        userText: userMessage,
        assistantText: String(content)
      })
    } catch {}

    // Check if should recommend music
    const includeMusic = shouldRecommendMusic(userMessage, conversationHistory)
    const mood = detectMood(userMessage, conversationHistory)
    const musicRecommendations = includeMusic ? (HEALING_MUSIC[mood] || HEALING_MUSIC.default) : undefined
    
    // Check if should suggest professional support/tools
    const suggestionNeeded = detectSuggestionNeeded(userMessage, conversationHistory)

    return NextResponse.json({
      response: content,
      metadata: {
        timestamp: new Date().toISOString(),
        mode: modeUsed,
        fallback: originalTarget === 'gpu' && modeUsed === 'cpu',
        provider: 'server'
      },
      conversation_id: newConversationId,
      // Suggestion for professional screening/support
      suggestion: suggestionNeeded ? {
        feature: suggestionNeeded.feature,
        reason: suggestionNeeded.reason
      } : undefined,
      // Music recommendations for Tam Su
      music: musicRecommendations ? {
        mood,
        recommendations: musicRecommendations,
        message: mood !== 'default' 
          ? `Mình gợi ý một vài bản nhạc để giúp bạn cảm thấy tốt hơn nhé:`
          : `Đây là một số nhạc thư giãn cho bạn:`
      } : undefined
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error?.message || 'unknown' }, { status: 500 })
  }
}

const defaultGpuUrl = process.env.DEFAULT_GPU_URL || 'https://elissa-villous-scourgingly.ngrok-free.dev'
