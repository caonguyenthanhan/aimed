import { NextRequest, NextResponse } from 'next/server'
import { geminiService } from '@/lib/gemini-service'
import { buildBlockResponse, shouldBlock } from '@/lib/safety'
import { assessSos, buildSosResponse } from '@/lib/sos-mode'
import { pageInsightStore, PageInsight } from '@/lib/page-insight-store'
import crypto from 'crypto'

interface PageInsightRequest {
  page_context: string
  user_question?: string
  page_data?: Record<string, any>
  conversation_history?: Array<{ role?: string; content?: string }>
}

// Map page context to friendly name
const PAGE_NAMES: Record<string, string> = {
  emotional_support: 'Tâm sự',
  health_knowledge: 'Tra cứu',
  mental_health_screening: 'Sàng lọc',
  therapy_planning: 'Điều trị',
}

const PAGE_ROUTES: Record<string, string> = {
  emotional_support: '/tam-su',
  health_knowledge: '/tra-cuu',
  mental_health_screening: '/sang-loc',
  therapy_planning: '/tri-lieu',
}

const PAGE_DESCRIPTIONS: Record<string, string> = {
  emotional_support:
    'người dùng chia sẻ cảm xúc và tâm trạng của họ',
  health_knowledge:
    'người dùng tìm kiếm thông tin về sức khỏe, bệnh tật, và các vấn đề y tế',
  mental_health_screening:
    'người dùng thực hiện đánh giá tâm lý để hiểu rõ hơn về trạng thái tâm thần',
  therapy_planning:
    'người dùng lập kế hoạch điều trị và theo dõi tiến độ phục hồi',
}

export async function POST(request: NextRequest) {
  try {
    const body: PageInsightRequest = await request.json()
    const pageContext = String(body?.page_context || '').trim()
    const userQuestion = String(body?.user_question || '').trim()
    const conversationHistory = Array.isArray(body?.conversation_history)
      ? body.conversation_history
      : []

    if (!pageContext) {
      return NextResponse.json(
        { error: 'page_context is required' },
        { status: 400 }
      )
    }

    // Check if already cached and not dismissed
    const cachedInsight = pageInsightStore.get(pageContext, userQuestion)
    if (cachedInsight && !cachedInsight.isDismissed) {
      return NextResponse.json({
        success: true,
        cached: true,
        insight: cachedInsight,
      })
    }

    // Safety checks on user question
    if (userQuestion) {
      const sos = assessSos(userQuestion, conversationHistory)
      if (sos.triggered) {
        const sosInsight: PageInsight = {
          show_insight: true,
          main_response: buildSosResponse(sos.hotlines),
          suggested_page: null,
          suggestion_reason: null,
          insight_type: 'advice',
          timestamp: Date.now(),
        }
        pageInsightStore.set(pageContext, sosInsight, userQuestion)
        return NextResponse.json({
          success: true,
          insight: sosInsight,
          metadata: { sos: true, hotlines: sos.hotlines },
        })
      }

      const safetyHits = shouldBlock(userQuestion, conversationHistory)
      if (safetyHits.length) {
        const safetyInsight: PageInsight = {
          show_insight: true,
          main_response: buildBlockResponse(safetyHits),
          suggested_page: null,
          suggestion_reason: null,
          insight_type: 'advice',
          timestamp: Date.now(),
        }
        pageInsightStore.set(pageContext, safetyInsight, userQuestion)
        return NextResponse.json({
          success: true,
          insight: safetyInsight,
          metadata: { blocked: true, categories: safetyHits },
        })
      }
    }

    // Build system prompt for insight generation
    const pageName = PAGE_NAMES[pageContext] || pageContext
    const pageDescription = PAGE_DESCRIPTIONS[pageContext] || pageContext

    const systemPrompt = `Bạn là Trợ lý Y tế AI. Nhiệm vụ: phân tích câu hỏi/tình huống người dùng và cung cấp insight.

TRANG HIỆN TẠI: ${pageName} - ${pageDescription}

HƯỚNG DẪN TRẢ VỀ:
Trả về CHÍNH XÁC một JSON object (không markdown, không wrapper):
{
  "show_insight": true/false,
  "main_response": "câu trả lời 1-2 câu",
  "suggested_page": "/tam-su" hoặc "/tra-cuu" hoặc "/sang-loc" hoặc "/tri-lieu" hoặc null,
  "suggestion_reason": "lý do gợi ý trang" hoặc null,
  "insight_type": "advice"
}

LUẬT:
- Nếu không có câu hỏi: show_insight=false
- Nếu câu hỏi phù hợp trang hiện tại: show_insight=true, suggested_page=null
- Nếu câu hỏi nên chuyển trang: show_insight=true, suggested_page=trang thích hợp
- main_response: câu trả lời ngắn gọn, bằng tiếng Việt
- Chỉ trả về JSON, không có text khác`

    const userMessage = userQuestion
      ? userQuestion
      : 'Người dùng vừa truy cập trang này. Hãy quyết định xem có cần insight hay không.'

    try {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
          { error: 'Missing GEMINI_API_KEY' },
          { status: 500 }
        )
      }

      const startTime = Date.now()
      const out = await geminiService.generateFromConfig({
        category: 'consultation',
        tier: 'flash',
        question: userMessage,
        persona: '',
        messages: conversationHistory,
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      })

      const responseText = String(out?.text || '').trim()
      if (!responseText) {
        return NextResponse.json(
          { error: 'Empty response from LLM' },
          { status: 502 }
        )
      }

      // Parse JSON response from LLM
      let parsedResponse: Partial<PageInsight> = {}
      try {
        // Try to extract JSON from markdown code blocks first
        let jsonStr = responseText
        const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
        if (jsonMatch) {
          jsonStr = jsonMatch[1]
        } else {
          // Try to find JSON object directly in response
          const directMatch = responseText.match(/\{[\s\S]*\}/)
          if (directMatch) {
            jsonStr = directMatch[0]
          }
        }
        
        parsedResponse = JSON.parse(jsonStr)
      } catch (parseErr) {
        console.error('[v0] Failed to parse LLM JSON response:', responseText)
        // If parsing fails, treat response as plain text advice
        // This handles cases where LLM doesn't return valid JSON
        parsedResponse = {
          show_insight: true,
          main_response: responseText.substring(0, 512), // Limit to reasonable length
          suggested_page: null,
          suggestion_reason: null,
          insight_type: 'advice',
        }
      }

      // Validate and sanitize response
      const insight: PageInsight = {
        show_insight:
          typeof parsedResponse.show_insight === 'boolean'
            ? parsedResponse.show_insight
            : false,
        main_response:
          String(parsedResponse.main_response || '').trim() || '',
        suggested_page: validatePageRoute(
          parsedResponse.suggested_page as string
        ),
        suggestion_reason:
          String(parsedResponse.suggestion_reason || '').trim() || null,
        insight_type: validateInsightType(
          parsedResponse.insight_type as string
        ),
        timestamp: Date.now(),
      }

      // Cache the insight
      pageInsightStore.set(pageContext, insight, userQuestion)

      return NextResponse.json({
        success: true,
        cached: false,
        insight,
        metadata: {
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          model: out?.model || 'gemini-flash',
        },
      })
    } catch (error: any) {
      console.error('[v0] Error generating page insight:', error?.message)
      return NextResponse.json(
        {
          error: 'Failed to generate insight',
          details: error?.message || 'unknown',
        },
        { status: 502 }
      )
    }
  } catch (error: any) {
    console.error('[v0] Page insight API error:', error?.message)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'unknown' },
      { status: 500 }
    )
  }
}

function validatePageRoute(route?: string): string | null {
  if (!route) return null
  const validRoutes = Object.values(PAGE_ROUTES)
  const normalized = String(route).trim().toLowerCase()
  return validRoutes.includes(normalized) ? normalized : null
}

function validateInsightType(
  type?: string
): 'advice' | 'clarification' | 'guidance' {
  const t = String(type || '').toLowerCase().trim()
  if (t === 'clarification' || t === 'guidance') return t
  return 'advice'
}
