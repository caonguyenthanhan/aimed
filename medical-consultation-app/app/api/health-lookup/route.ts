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

    if (providerSel === 'foza') {
      const fozaToken = String(process.env.FOZA_TOKEN || '').trim()
      const fozaModelName = String(process.env.LLM_MODEL_NAME || 'hoang/gpt-5.5').trim()
      const baseUrl = String(process.env.FOZA_BASE_URL || 'https://api.foza.ai/v1').trim().replace(/\/$/, '')
      
      if (!fozaToken) {
        return NextResponse.json({ error: 'Missing FOZA_TOKEN' }, { status: 500 })
      }
      
      const startFoza = Date.now()
      try {
        const lookupPrompt = `Bạn là một cơ sở dữ liệu y khoa thông minh, chuyên cung cấp thông tin chính xác về bệnh lý, thuốc men, triệu chứng bằng tiếng Việt.
        
NHIỆM VỤ:
- Cung cấp thông tin y khoa chính xác và đầy đủ
- Giải thích các thuật ngữ y khoa phức tạp
- Liệt kê các thông tin liên quan (triệu chứng, nguyên nhân, điều trị)
- Phân loại mức độ nghiêm trọng nếu có

ĐỊNH DẠNG TRẢ LỜI:
📋 **Thông tin chính:**
- Định nghĩa/Mô tả
- Nguyên nhân chính
- Triệu chứng thường gặp

🔍 **Chi tiết:**
- Cách chẩn đoán
- Phương pháp điều trị
- Biến chứng có thể xảy ra

⚠️ **Lưu ý quan trọng:**
- Khi nào cần đến bác sĩ
- Các dấu hiệu cảnh báo

Truy vấn: ${query}

Hãy cung cấp thông tin chi tiết và chính xác bằng tiếng Việt:`

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${fozaToken}`
          },
          body: JSON.stringify({
            model: fozaModelName,
            messages: [
              { role: 'user', content: lookupPrompt }
            ],
            temperature: 0.3
          })
        })
        
        if (!response.ok) {
          throw new Error(`Foza API returned ${response.status}: ${await response.text()}`)
        }
        
        const data = await response.json()
        const content = String(data?.choices?.[0]?.message?.content || '').trim()
        if (!content) {
          return NextResponse.json({ error: 'No content in Foza response' }, { status: 502 })
        }
        
        const durationFoza = Date.now() - startFoza
        return NextResponse.json({
          success: true,
          response: content,
          metadata: {
            mode: 'gpu',
            provider: 'foza',
            duration_ms: durationFoza,
            model: fozaModelName
          }
        })
      } catch (error: any) {
        console.error("[health-lookup] Foza API error:", error)
        if (process.env.GEMINI_API_KEY) {
          try {
            const startGemini = Date.now()
            const out = await geminiService.generateResponse(query, 'health lookup')
            const durationGemini = Date.now() - startGemini
            const content = String(out || '').trim()
            if (content) {
              return NextResponse.json({
                success: true,
                response: content,
                metadata: {
                  mode: 'gpu',
                  provider: 'gemini',
                  duration_ms: durationGemini,
                  model: process.env.GEMINI_MODEL || 'gemini'
                }
              })
            }
          } catch {}
        }
        return NextResponse.json({ error: 'Foza API failed and no fallback available', details: error?.message }, { status: 502 })
      }
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
