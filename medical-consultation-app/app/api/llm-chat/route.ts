import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { GeminiService, geminiService } from '@/lib/gemini-service'
import { buildBlockResponse, shouldBlock } from '@/lib/safety'
import { persistChatTurn } from '@/lib/chat-persistence'
import crypto from 'crypto'
import { assessSos, buildSosResponse } from '@/lib/sos-mode'
import { planChunkedMessages, verifyContentIntegrity } from '@/lib/chat-delivery'
import { buildSystemState, hasInternalDemoPass, isInternalDemoPass, normalizeRuntimeProvider, normalizeRuntimeTarget } from '@/lib/runtime-sync'

const toHeaderRecord = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) return {}
  if (headers instanceof Headers) {
    const out: Record<string, string> = {}
    headers.forEach((v, k) => (out[k] = v))
    return out
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers)
  return { ...(headers as Record<string, string>) }
}

const json = (data: any, init?: ResponseInit) =>
  NextResponse.json(data, {
    ...(init || {}),
    headers: {
      ...toHeaderRecord(init?.headers),
      'Content-Type': 'application/json; charset=utf-8',
    },
  })

const withSystemState = (metadata: Record<string, any>) => {
  const provider = normalizeRuntimeProvider(metadata?.provider)
  const mode = normalizeRuntimeTarget(metadata?.mode, provider === 'gemini' || provider === 'foza' ? 'gpu' : 'cpu')
  return {
    ...metadata,
    system_state: buildSystemState({
      provider,
      mode,
      graph_connected: false,
      graph_injected: false,
      graph_reason: null,
      db_ok: null,
      fallback: typeof metadata?.fallback === 'string' ? metadata.fallback : null,
      error: typeof metadata?.error === 'string' ? metadata.error : null,
      demo_mode: Boolean(metadata?.demo_mode || metadata?.access === 'pass'),
      internal_pass_matched: Boolean(metadata?.demo_mode || metadata?.access === 'pass'),
    }),
  }
}

// Determine context based on the conversation or user input
function determineContext(userMessage: string, conversationHistory?: any[]): string {
  const message = userMessage.toLowerCase()
  
  // Keywords for different contexts
  if (message.includes('tâm lý') || message.includes('stress') || message.includes('lo âu') || 
      message.includes('trầm cảm') || message.includes('tâm trạng') || message.includes('cảm xúc')) {
    return 'psychological support'
  }
  
  if (message.includes('tra cứu') || message.includes('thông tin') || message.includes('bệnh') ||
      message.includes('thuốc') || message.includes('triệu chứng') || message.includes('chẩn đoán')) {
    return 'health lookup'
  }
  
  // Default to health consultation
  return 'health consultation'
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, context, question, message, conversationHistory, model, max_tokens, temperature, conversation_id, user_id, persona, systemPrompt: systemPromptOverride, role, provider, access_pass, delivery_mode } = await request.json()
    const auth = request.headers.get('authorization') || ''
    const referer = request.headers.get('referer') || ''
    const deliveryMode = delivery_mode === 'live' ? 'live' : 'chunked'
    const planResponseMessages = (content: string): Array<{ content: string; kind: string; delay_ms: number }> => {
      try {
        const contentStr = String(content || '').trim()
        if (!contentStr) {
          return [{ content: ' ', kind: 'text', delay_ms: 0 }]
        }
        
        let result: Array<{ content: string; kind: string; delay_ms: number }> = [{ content: contentStr, kind: 'text', delay_ms: 0 }]
        
        if (deliveryMode === 'chunked') {
          try {
            const planned = planChunkedMessages(contentStr, { maxMessages: 8, maxCharsPerMessage: 300 })
            if (Array.isArray(planned) && planned.length > 0) {
              // Verify content integrity before returning
              const integrityOk = verifyContentIntegrity(contentStr, planned)
              if (!integrityOk) {
                console.warn('[LLM] Content integrity check failed, reverting to single message')
              } else {
                result = planned.map((item) => ({
                  content: String(item.content || ''),
                  kind: String(item.kind || 'text'),
                  delay_ms: typeof item.delay_ms === 'number' ? item.delay_ms : 0,
                }))
              }
            }
          } catch (e) {
            console.error('[LLM] Error planning chunked messages:', e)
          }
        }
        
        return result
      } catch (e) {
        console.error('[LLM] Error in planResponseMessages:', e)
        return [{ content: String(content || '').trim() || ' ', kind: 'text', delay_ms: 0 }]
      }
    }
    
    const userMessage = message || question || prompt
    if (!userMessage) {
      return json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const sos = assessSos(String(userMessage), Array.isArray(conversationHistory) ? conversationHistory : [])
    if (sos.triggered) {
      const sid = (typeof conversation_id === 'string' && conversation_id.trim()) ? conversation_id.trim() : crypto.randomUUID()
      const content = buildSosResponse(sos.hotlines)
      try {
        await persistChatTurn({
          sessionId: sid,
          kind: String(context) === 'speech_stream' ? 'speech_stream' : 'consultation',
          userText: String(userMessage),
          assistantText: content
        })
      } catch {}
      return json({
        response: content,
        messages: planResponseMessages(content),
        delivery: { mode: deliveryMode },
        metadata: withSystemState({
          timestamp: new Date().toISOString(),
          mode: 'sos',
          provider: 'server',
          sos: true,
          hotlines: sos.hotlines,
          reasons: sos.reasons,
        }),
        conversation_id: sid,
      })
    }

    const safetyHits = shouldBlock(String(userMessage), Array.isArray(conversationHistory) ? conversationHistory : [])
    if (safetyHits.length) {
      const sid = (typeof conversation_id === 'string' && conversation_id.trim()) ? conversation_id.trim() : crypto.randomUUID()
      try {
        await persistChatTurn({
          sessionId: sid,
          kind: String(context) === 'speech_stream' ? 'speech_stream' : 'consultation',
          userText: String(userMessage),
          assistantText: buildBlockResponse(safetyHits)
        })
      } catch {}
      return json({
        response: buildBlockResponse(safetyHits),
        messages: planResponseMessages(buildBlockResponse(safetyHits)),
        delivery: { mode: deliveryMode },
        metadata: withSystemState({
          timestamp: new Date().toISOString(),
          mode: 'safety',
          provider: 'server',
          blocked: true,
          blocked_categories: Array.from(new Set(safetyHits.map(h => h.category))).sort(),
        }),
        conversation_id: sid,
      })
    }
    
    // Determine context based on user message
    const determinedContext = context || determineContext(userMessage, conversationHistory)
    
    const cpuBase = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || '').trim().replace(/\/$/, '')
    const localCpuFallback = 'http://127.0.0.1:8000/v1/chat/completions'
    const cpuFallback = (process.env.INTERNAL_LLM_URL || (cpuBase ? `${cpuBase}/v1/chat/completions` : '') || localCpuFallback).trim()

    const envGpuBase = (process.env.GPU_SERVER_URL || process.env.DEFAULT_GPU_URL || '').trim().replace(/\/$/, '')
    let fastApiUrl = `${String(envGpuBase || defaultGpuUrl).replace(/\/$/, '')}/v1/chat/completions`
    let originalTarget: 'cpu' | 'gpu' = 'gpu'
    try {
      const dataDir = path.join(process.cwd(), 'data')
      // Prefer runtime-mode gpu_url if set
      try {
        const modeRaw = fs.readFileSync(path.join(dataDir, 'runtime-mode.json'), 'utf-8')
        const mode = JSON.parse(modeRaw)
        if (mode?.target === 'cpu' || mode?.target === 'gpu') {
          originalTarget = mode.target
        }
        if (mode?.gpu_url) {
          fastApiUrl = `${String(mode.gpu_url).replace(/\/$/, '')}/v1/chat/completions`
        }
      } catch {}
      if (originalTarget === 'cpu') {
        fastApiUrl = localCpuFallback
      } else {
        // Otherwise pick latest from server registry
        try {
          const regRaw = fs.readFileSync(path.join(dataDir, 'server-registry.json'), 'utf-8')
          const reg = JSON.parse(regRaw)
          const servers = Array.isArray(reg?.servers) ? reg.servers : []
          const active = servers.filter((s: any) => s.status === 'active')
          const latest = (active.length ? active : servers).sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
          if (latest?.url) {
            fastApiUrl = `${String(latest.url).replace(/\/$/, '')}/v1/chat/completions`
          }
        } catch {}
      }
    } catch {}
    const personaText = typeof systemPromptOverride === 'string' && systemPromptOverride.trim()
      ? systemPromptOverride.trim()
      : (() => {
          const BASE_SYSTEM_PROMPT = `Bạn là Trợ lý Y tế AI (Medical Consultant AI). Nhiệm vụ của bạn là cung cấp thông tin y tế hữu ích, chính xác và an toàn bằng Tiếng Việt.

NGUYÊN TẮC QUAN TRỌNG:
1. AN TOÀN LÀ TRÊN HẾT: Luôn khuyến cáo người dùng đi khám bác sĩ hoặc đến cơ sở y tế nếu có dấu hiệu nghiêm trọng. Không đưa ra chẩn đoán khẳng định hoặc kê đơn thuốc thay thế bác sĩ.
2. KHÁCH QUAN & KHOA HỌC: Dựa trên kiến thức y khoa đã được kiểm chứng.
3. NGÔN NGỮ: Sử dụng Tiếng Việt chuẩn mực, dễ hiểu, giọng điệu ân cần, chuyên nghiệp.
4. TỪ CHỐI TRẢ LỜI: Nếu câu hỏi không liên quan đến y tế/sức khỏe hoặc vi phạm đạo đức, hãy lịch sự từ chối hoặc lái về chủ đề y tế.`

          const p = (typeof persona === 'string' && persona.trim()) ? persona.trim() : (typeof role === 'string' && role.trim() ? role.trim() : '')
          
          let specificInstruction = ""
          if (determinedContext === 'psychological support') {
             specificInstruction = "CONTEXT: Hỗ trợ tâm lý. Hãy lắng nghe, thấu cảm, không phán xét. Gợi ý các phương pháp giảm căng thẳng lành mạnh."
          } else if (determinedContext === 'health lookup') {
             specificInstruction = "CONTEXT: Tra cứu thông tin y tế. Cung cấp thông tin ngắn gọn, súc tích, chính xác."
          } else {
             specificInstruction = `CONTEXT: ${determinedContext}`
          }

          if (p) return `${BASE_SYSTEM_PROMPT}\n\nVAI TRÒ CỤ THỂ: ${p}.\n${specificInstruction}`
          return `${BASE_SYSTEM_PROMPT}\n${specificInstruction}`
        })()
    const systemPrompt = personaText
    const rawModel = (typeof model === 'string' ? model.trim() : '')
    const uiModel = (rawModel && ['flash', 'pro', 'gemini'].includes(rawModel.toLowerCase())) ? rawModel.toLowerCase() : 'flash'
    const modeHeader = uiModel === 'pro' ? 'pro' : 'flash'
    const defaultGpuModel = (process.env.GPU_OPENAI_MODEL || process.env.GPU_LLM_MODEL || process.env.DEFAULT_GPU_MODEL || '').trim()
    const gpuModel = (rawModel && !['flash', 'pro', 'gemini'].includes(rawModel.toLowerCase())) ? rawModel : (defaultGpuModel || rawModel || 'gpt-4o-mini')

    const configuredProvider = (typeof provider === 'string' ? provider.trim().toLowerCase() : '') || (process.env.LLM_PROVIDER || '').trim().toLowerCase()
    const useGemini = configuredProvider === 'gemini' || uiModel === 'gemini'
    const useFoza = configuredProvider === 'foza'
    if (useGemini) {
      const parseRetryAfterSec = (s: string) => {
        const raw = String(s || '')
        const m1 = raw.match(/"retryDelay"\s*:\s*"(\d+)s"/)
        if (m1?.[1]) return Number(m1[1])
        const m2 = raw.match(/Please retry in\s+([0-9.]+)s/i)
        if (m2?.[1]) return Math.ceil(Number(m2[1]))
        return null
      }
      const passOk = hasInternalDemoPass() ? isInternalDemoPass(access_pass) : false
      const accessSecret = String(access_pass || '').trim()
      const systemKey = String(process.env.GEMINI_API_KEY || '').trim()
      const keyToUse = passOk ? systemKey : (accessSecret || systemKey)
      if (!keyToUse) {
        return json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 })
      }

      const startGemini = Date.now()
      const personaForGemini = (typeof persona === 'string' && persona.trim()) ? persona.trim() : (typeof role === 'string' && role.trim() ? role.trim() : '')
      const category = String(determinedContext) === 'speech_stream' ? 'speech_stream' : 'consultation'
      const svc = keyToUse === String(process.env.GEMINI_API_KEY || '').trim() ? geminiService : new GeminiService(keyToUse)
      let out: any = null
      try {
        out = await svc.generateFromConfig({
          category: category as any,
          tier: modeHeader,
          question: String(userMessage),
          persona: personaForGemini,
          messages: Array.isArray(conversationHistory) ? conversationHistory : []
        })
      } catch (e: any) {
        const em = String(e?.message || e || '')
        const retryAfter = parseRetryAfterSec(em)
        const is429 = em.includes(' 429 ') || em.includes('RESOURCE_EXHAUSTED') || em.includes('"code": 429')
        if (is429) {
          const sid = (typeof conversation_id === 'string' && conversation_id.trim()) ? conversation_id.trim() : crypto.randomUUID()
          const msg = retryAfter
            ? `Hiện Gemini đang giới hạn lượt dùng. Bạn thử lại sau khoảng ${retryAfter}s, hoặc nhập API key/pass để tiếp tục.`
            : 'Hiện Gemini đang giới hạn lượt dùng. Bạn thử lại sau, hoặc nhập API key/pass để tiếp tục.'
          return json({
            response: msg,
            messages: planResponseMessages(msg),
            delivery: { mode: deliveryMode },
            context: determinedContext,
            model_info: { model_name: process.env.GEMINI_MODEL || 'gemini', provider: 'Gemini' },
            metadata: withSystemState({
              context: determinedContext,
              timestamp: new Date().toISOString(),
              mode: 'gpu',
              tier: modeHeader,
              provider: 'gemini',
              access: passOk ? 'pass' : (accessSecret ? 'user_key' : 'system_key'),
              demo_mode: passOk,
              rate_limited: true,
              retry_after_sec: retryAfter ?? undefined,
              duration_ms: Date.now() - startGemini
            }),
            conversation_id: sid
          })
        }
        throw e
      }
      const durationGemini = Date.now() - startGemini
      const content = String(out?.text || '').trim()
      if (!content) {
        return json({ error: 'No content in response' }, { status: 502 })
      }
      const sid = (typeof conversation_id === 'string' && conversation_id.trim()) ? conversation_id.trim() : crypto.randomUUID()
      try {
        await persistChatTurn({
          sessionId: sid,
          kind: category === 'speech_stream' ? 'speech_stream' : 'consultation',
          userText: String(userMessage),
          assistantText: content
        })
      } catch {}

      return json({
        response: content,
        messages: planResponseMessages(content),
        delivery: { mode: deliveryMode },
        context: determinedContext,
        model_info: {
          model_name: out?.model || process.env.GEMINI_MODEL || 'gemini',
          provider: 'Gemini'
        },
        metadata: withSystemState({
          context: determinedContext,
          prompt_length: String(userMessage).length,
          response_length: content.length,
          timestamp: new Date().toISOString(),
          mode: 'gpu',
          tier: modeHeader,
          fallback: false,
          provider: 'gemini',
          access: passOk ? 'pass' : (accessSecret ? 'user_key' : 'system_key'),
          demo_mode: passOk,
          duration_ms: durationGemini
        }),
        conversation_id: sid
      })
    }

    if (useFoza) {
      const baseUrl = String(process.env.FOZA_BASE_URL || '').trim().replace(/\/$/, '') || 'https://api.foza.ai/v1'
      const token = String(process.env.FOZA_TOKEN || '').trim()
      const modelName = String(process.env.LLM_MODEL_NAME || '').trim() || (rawModel && !['flash', 'pro', 'gemini'].includes(rawModel.toLowerCase()) ? rawModel : '')
      if (!token) {
        return json({ error: 'Missing FOZA_TOKEN' }, { status: 500 })
      }
      if (!modelName) {
        return json({ error: 'Missing LLM_MODEL_NAME for FOZA' }, { status: 500 })
      }

      const fozaMessages = [
        { role: 'system', content: systemPrompt },
        ...(Array.isArray(conversationHistory) ? conversationHistory : []).map((m: any) => ({
          role: m.role || 'user',
          content: m.content || ''
        })),
        { role: 'user', content: userMessage }
      ]

      const resolvedMaxTokens = (typeof max_tokens === 'number' && Number.isFinite(max_tokens) && max_tokens > 0) ? Math.floor(max_tokens) : 400
      const resolvedTemp = (typeof temperature === 'number' && Number.isFinite(temperature)) ? temperature : 0.3

      const startFoza = Date.now()
      try {
        const url = `${baseUrl}/chat/completions`
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: fozaMessages,
            max_tokens: resolvedMaxTokens,
            temperature: resolvedTemp
          })
        })
        const text = await resp.text().catch(() => '')
        if (!resp.ok) {
          throw new Error(`Foza API error: ${resp.status} ${resp.statusText} ${text}`)
        }
        const data = JSON.parse(text || '{}')
        const content = String(data?.choices?.[0]?.message?.content || '').trim()
        if (!content) {
          throw new Error('No content in FOZA response')
        }
        const sid = (typeof conversation_id === 'string' && conversation_id.trim()) ? conversation_id.trim() : crypto.randomUUID()
        try {
          await persistChatTurn({
            sessionId: sid,
            kind: String(determinedContext) === 'speech_stream' ? 'speech_stream' : 'consultation',
            userText: String(userMessage),
            assistantText: content
          })
        } catch {}
        return json({
          response: content,
          messages: planResponseMessages(content),
          delivery: { mode: deliveryMode },
          context: determinedContext,
          model_info: { model_name: modelName, provider: 'Foza' },
          metadata: withSystemState({
            context: determinedContext,
            prompt_length: String(userMessage).length,
            response_length: content.length,
            timestamp: new Date().toISOString(),
            mode: 'cloud',
            tier: modeHeader,
            fallback: false,
            provider: 'foza',
            duration_ms: Date.now() - startFoza
          }),
          conversation_id: sid
        })
      } catch (e: any) {
        const msg = String(e?.message || e || '')
        if (process.env.GEMINI_API_KEY) {
          try {
            const startGemini = Date.now()
            const personaForGemini = (typeof persona === 'string' && persona.trim()) ? persona.trim() : (typeof role === 'string' && role.trim() ? role.trim() : '')
            const category = String(determinedContext) === 'speech_stream' ? 'speech_stream' : 'consultation'
            const out = await geminiService.generateFromConfig({
              category: category as any,
              tier: modeHeader,
              question: String(userMessage),
              persona: personaForGemini,
              messages: Array.isArray(conversationHistory) ? conversationHistory : []
            })
            const durationGemini = Date.now() - startGemini
            const content = String(out?.text || '').trim()
            if (content) {
              const sid = (typeof conversation_id === 'string' && conversation_id.trim()) ? conversation_id.trim() : crypto.randomUUID()
              try {
                await persistChatTurn({
                  sessionId: sid,
                  kind: category === 'speech_stream' ? 'speech_stream' : 'consultation',
                  userText: String(userMessage),
                  assistantText: content
                })
              } catch {}
              return json({
                response: content,
                messages: planResponseMessages(content),
                delivery: { mode: deliveryMode },
                context: determinedContext,
                model_info: { model_name: out?.model || process.env.GEMINI_MODEL || 'gemini', provider: 'Gemini' },
                metadata: withSystemState({
                  context: determinedContext,
                  prompt_length: String(userMessage).length,
                  response_length: content.length,
                  timestamp: new Date().toISOString(),
                  mode: 'cloud',
                  tier: modeHeader,
                  fallback: true,
                  provider: 'gemini',
                  error: msg.slice(0, 280),
                  duration_ms: durationGemini
                }),
                conversation_id: sid
              })
            }
          } catch {}
        }
      }
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(conversationHistory) ? conversationHistory : []).map((m: any) => ({
        role: m.role || 'user',
        content: m.content || ''
      })),
      { role: 'user', content: userMessage }
    ]
    const resolvedMaxTokens = (typeof max_tokens === 'number' && Number.isFinite(max_tokens) && max_tokens > 0) ? Math.floor(max_tokens) : 400
    const resolvedTemp = (typeof temperature === 'number' && Number.isFinite(temperature)) ? temperature : 0.3
    const gpuBody = {
      model: gpuModel,
      messages,
      max_tokens: resolvedMaxTokens,
      temperature: resolvedTemp
    }
    const cpuBody = {
      model: uiModel,
      mode: modeHeader,
      messages,
      max_tokens: resolvedMaxTokens,
      temperature: resolvedTemp,
      conversation_id: typeof conversation_id === 'string' ? conversation_id : null,
      user_id: typeof user_id === 'string' ? user_id : null
    }

    const start = Date.now()
    const targetIsCpu = originalTarget === 'cpu' || fastApiUrl.includes('127.0.0.1') || fastApiUrl.includes('localhost')
    let resp: Response | null = null
    let modeUsed = fastApiUrl.includes('127.0.0.1') || fastApiUrl.includes('localhost') ? 'cpu' : 'gpu'
    let fetchErrMessage = ""

    const upstreamTimeoutMs = (() => {
      const n = Number.parseInt(String(process.env.LLM_CHAT_UPSTREAM_TIMEOUT_MS || '').trim(), 10)
      return Number.isFinite(n) && n > 0 ? n : 5000
    })()
    const upstreamController = new AbortController()
    const upstreamTimer = setTimeout(() => upstreamController.abort(), upstreamTimeoutMs)
    try {
      resp = await fetch(fastApiUrl, {
        method: 'POST',
        headers: auth ? { 'Content-Type': 'application/json', 'Authorization': auth, 'ngrok-skip-browser-warning': '1', 'X-Mode': modeHeader } : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1', 'X-Mode': modeHeader },
        body: JSON.stringify(targetIsCpu ? cpuBody : gpuBody),
        signal: upstreamController.signal,
      })
    } catch (e: any) {
      fetchErrMessage = String(e?.message || e || "")
      console.warn('[llm-chat] Upstream fetch failed, trying fallback:', fetchErrMessage)
    } finally {
      clearTimeout(upstreamTimer)
    }


    if (!resp || !resp.ok) {
      try {
        if (modeUsed === 'gpu') {
          if (process.env.GEMINI_API_KEY) {
            try {
              const startGemini = Date.now()
              const personaForGemini = (typeof persona === 'string' && persona.trim()) ? persona.trim() : (typeof role === 'string' && role.trim() ? role.trim() : '')
              const category = String(determinedContext) === 'speech_stream' ? 'speech_stream' : 'consultation'
              const out = await geminiService.generateFromConfig({
                category: category as any,
                tier: modeHeader,
                question: String(userMessage),
                persona: personaForGemini,
                messages: Array.isArray(conversationHistory) ? conversationHistory : []
              })
              const durationGemini = Date.now() - startGemini
              const content = String(out?.text || '').trim()
              if (content) {
                return json({
                  response: content,
                  messages: planResponseMessages(content),
                  delivery: { mode: deliveryMode },
                  context: determinedContext,
                  model_info: {
                    model_name: out?.model || process.env.GEMINI_MODEL || 'gemini',
                    provider: 'Gemini'
                  },
                  metadata: withSystemState({
                    context: determinedContext,
                    prompt_length: String(userMessage).length,
                    response_length: content.length,
                    timestamp: new Date().toISOString(),
                    mode: 'gpu',
                    tier: modeHeader,
                    fallback: true,
                    provider: 'gemini',
                    duration_ms: durationGemini
                  }),
                  conversation_id: conversation_id || null
                })
              }
            } catch (geminiErr) {
              console.error('[llm-chat] Gemini fallback failed:', geminiErr)
            }
          }
          const fallbackUrl = cpuFallback
          const retry = await fetch(fallbackUrl, {
            method: 'POST',
            headers: auth ? { 'Content-Type': 'application/json', 'Authorization': auth, 'ngrok-skip-browser-warning': '1' } : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
            body: JSON.stringify(cpuBody)
          })
          if (retry.ok) {
            resp = retry
            modeUsed = 'cpu'
            try {
              fs.appendFileSync(path.join(process.cwd(), 'data', 'runtime-events.jsonl'), JSON.stringify({ type: 'fallback', from: 'gpu', to: 'cpu', ts: new Date().toISOString() }) + '\n')
              const now = new Date().toISOString()
              const dataDir = path.join(process.cwd(), 'data')
              const modePath = path.join(dataDir, 'runtime-mode.json')
              const payload: any = { target: 'cpu', updated_at: now }
              fs.writeFileSync(modePath, JSON.stringify(payload, null, 2))
              fs.appendFileSync(path.join(dataDir, 'runtime-events.jsonl'), JSON.stringify({ type: 'mode_change', target: 'cpu', ts: now }) + '\n')
            } catch {}
          }
        }
      } catch (fallbackErr) {
        console.error('[llm-chat] Fallback logic failed:', fallbackErr)
      }
    }

    if (!resp || !resp.ok) {
      const text = resp ? await resp.text() : (fetchErrMessage || 'Unreachable upstream server')
      console.error('LLM server error:', text)
      return json(
        { error: 'LLM server error', details: text, debug: { target: originalTarget, fastApiUrl, cpuFallback } },
        { status: 502 }
      )
    }

    let data
    try {
      const responseText = await resp.text()
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from server')
      }
      
      data = JSON.parse(responseText)
    } catch (parseError) {
      if (modeUsed === 'gpu' && process.env.GEMINI_API_KEY) {
        try {
          const startGemini = Date.now()
          const personaForGemini = (typeof persona === 'string' && persona.trim()) ? persona.trim() : (typeof role === 'string' && role.trim() ? role.trim() : '')
          const category = String(determinedContext) === 'speech_stream' ? 'speech_stream' : 'consultation'
          const out = await geminiService.generateFromConfig({
            category: category as any,
            tier: modeHeader,
            question: String(userMessage),
            persona: personaForGemini,
            messages: Array.isArray(conversationHistory) ? conversationHistory : []
          })
          const durationGemini = Date.now() - startGemini
          const content = String(out?.text || '').trim()
          if (content) {
            const sid = (typeof conversation_id === 'string' && conversation_id.trim()) ? conversation_id.trim() : crypto.randomUUID()
            try {
              await persistChatTurn({
                sessionId: sid,
                kind: category === 'speech_stream' ? 'speech_stream' : 'consultation',
                userText: String(userMessage),
                assistantText: content
              })
            } catch {}
            return json({
              response: content,
              messages: planResponseMessages(content),
              delivery: { mode: deliveryMode },
              context: determinedContext,
              model_info: {
                model_name: out?.model || process.env.GEMINI_MODEL || 'gemini',
                provider: 'Gemini'
              },
              metadata: withSystemState({
                context: determinedContext,
                prompt_length: String(userMessage).length,
                response_length: content.length,
                timestamp: new Date().toISOString(),
                mode: 'gpu',
                tier: modeHeader,
                fallback: true,
                provider: 'gemini',
                duration_ms: durationGemini
              }),
              conversation_id: sid
            })
          }
        } catch {}
      }
      return json(
        { error: 'Invalid JSON response from server', details: parseError instanceof Error ? parseError.message : 'Unknown parsing error' },
        { status: 502 }
      )
    }

    const duration = Date.now() - start
    try {
      fs.appendFileSync(path.join(process.cwd(), 'data', 'runtime-metrics.jsonl'), JSON.stringify({ mode: modeUsed, duration_ms: duration, ok: !!data, ts: new Date().toISOString(), endpoint: 'llm-chat' }) + '\n')
    } catch {}
    try {
      if (modeUsed === 'gpu') {
        const base = fastApiUrl.replace(/\/v1\/chat\/completions$/, '')
        const gm = await fetch(`${base}/gpu/metrics`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
        if (gm.ok) {
          const v = await gm.json()
          fs.appendFileSync(path.join(process.cwd(), 'data', 'runtime-events.jsonl'), JSON.stringify({ type: 'gpu_metrics', ts: new Date().toISOString(), data: v }) + '\n')
        }
      }
      // Log frontend call for debugging origin
      try {
        const baseUrl = fastApiUrl.replace(/\/v1\/chat\/completions$/, '')
        fs.appendFileSync(path.join(process.cwd(), 'data', 'runtime-events.jsonl'), JSON.stringify({ type: 'frontend_call', endpoint: 'llm-chat', referer, target_base: baseUrl, ts: new Date().toISOString() }) + '\n')
      } catch {}
    } catch {}
    const content = data?.choices?.[0]?.message?.content || data?.response || ''
    const newConversationId = (typeof data?.conversation_id === 'string' && String(data.conversation_id).trim())
      ? String(data.conversation_id).trim()
      : ((typeof conversation_id === 'string' && String(conversation_id).trim()) ? String(conversation_id).trim() : crypto.randomUUID())

    if (!content) {
      console.error('[LLM] No content in response:', JSON.stringify(data).substring(0, 500))
      return json(
        { error: 'No content in response', details: JSON.stringify(data).substring(0, 500) },
        { status: 502 }
      )
    }
    
    console.log(`[LLM] Response content prepared: ${content.length} chars, mode: ${modeUsed}, delivery: ${deliveryMode}`)
    try {
      await persistChatTurn({
        sessionId: newConversationId,
        kind: String(determinedContext) === 'speech_stream' ? 'speech_stream' : 'consultation',
        userText: String(userMessage),
        assistantText: String(content)
      })
    } catch {}

    return json({
      response: content,
      messages: planResponseMessages(content),
      delivery: { mode: deliveryMode },
      context: determinedContext,
      model_info: {
        model_name: 'local-llama-compatible',
        provider: 'Internal FastAPI'
      },
      metadata: withSystemState({
        context: determinedContext,
        prompt_length: userMessage.length,
        response_length: content.length,
        timestamp: new Date().toISOString(),
        mode: modeUsed,
        tier: modeHeader,
        fallback: originalTarget === 'gpu' && modeUsed === 'cpu',
        model_init: !!(data && (data as any).model_init),
        rag: (data && (data as any).rag) ? (data as any).rag : undefined,
        provider: 'server'
      }),
      conversation_id: newConversationId
    })
    
  } catch (error) {
    console.error('Error in internal chat API:', error)
    return json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
const defaultGpuUrl = process.env.DEFAULT_GPU_URL || 'https://elissa-villous-scourgingly.ngrok-free.dev'
