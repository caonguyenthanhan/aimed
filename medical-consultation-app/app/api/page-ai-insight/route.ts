import { NextRequest, NextResponse } from 'next/server'
import { geminiService } from '@/lib/gemini-service'
import { buildBlockResponse, shouldBlock } from '@/lib/safety'
import { assessSos, buildSosResponse } from '@/lib/sos-mode'
import { pageInsightStore, PageInsight } from '@/lib/page-insight-store'
import { getRateLimit } from '@/lib/rate-limiter'
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

    // Apply rate limiting per page context (5 requests per minute)
    const rateLimitKey = `page-insight:${pageContext}`
    const rateLimitCheck = getRateLimit(rateLimitKey)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          details: `Too many requests. Please wait ${rateLimitCheck.retryAfter}s before trying again`,
          retry_after: rateLimitCheck.retryAfter,
        },
        { status: 429, headers: { 'Retry-After': String(rateLimitCheck.retryAfter || 60) } }
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

    const systemPrompt = `Bạn là Trợ lý Y tế AI hỗ trợ người dùng trên trang "${pageName}".

NGỮ CẢNH: Người dùng đang ở trang ${pageName} - ${pageDescription}

HƯỚNG DẪN:
1. Nếu người dùng đặt câu hỏi, trả lời ngắn gọn (1-2 câu).
2. Nếu câu hỏi phù hợp trang này, không gợi ý chuyển.
3. Nếu câu hỏi nên chuyển sang trang khác, gợi ý trang tương ứng:
   - Tâm sự (/tam-su): cho các vấn đề cảm xúc, tâm trạng
   - Tra cứu (/tra-cuu): cho thông tin y tế, bệnh tật
   - Sàng lọc (/sang-loc): cho đánh giá tâm lý
   - Điều trị (/tri-lieu): cho kế hoạch điều trị

LƯU Ý: Giọng điệu ấm áp, chuyên nghiệp, hỗ trợ. Chỉ trả về plain text, không markdown.`

    const userMessage = userQuestion
      ? userQuestion
      : 'Người dùng vừa truy cập trang này. Có thể cần insight gì không?'

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

      // LLM returns plain text now, no need to parse JSON
      const responseText = String(out?.text || '').trim()
      if (!responseText) {
        return NextResponse.json(
          { error: 'Empty response from LLM' },
          { status: 502 }
        )
      }

      // Create insight from plain text response
      const insight: PageInsight = {
        show_insight: userQuestion ? true : false, // Show insight if user asked question
        main_response: responseText.substring(0, 512), // Limit length
        suggested_page: null, // Can be enhanced with keywords detection if needed
        suggestion_reason: null,
        insight_type: 'advice',
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
      const errorMessage = error?.message || 'unknown error'
      const errorStatus = error?.status || error?.response?.status || 502
      
      // Log with context
      console.error('[v0] Error generating page insight:', errorMessage, { 
        status: errorStatus,
        code: error?.code 
      })
      
      // Handle specific error cases
      if (errorStatus === 503 || errorMessage.includes('UNAVAILABLE')) {
        return NextResponse.json(
          {
            error: 'Service temporarily unavailable',
            details: 'AI model overloaded, please try again in a moment',
          },
          { status: 503 }
        )
      }
      
      if (errorStatus === 429) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            details: 'Too many requests, please wait before trying again',
          },
          { status: 429 }
        )
      }
      
      return NextResponse.json(
        {
          error: 'Failed to generate insight',
          details: errorMessage,
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
