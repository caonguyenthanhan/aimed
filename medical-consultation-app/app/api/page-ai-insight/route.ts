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

    const systemPrompt = `RESPONSE FORMAT - ONLY RETURN VALID JSON, NO TEXT BEFORE OR AFTER!

Return ONLY this JSON structure, nothing else:
{
  "show_insight": boolean,
  "main_response": "text response here",
  "suggested_page": "/tam-su" | "/tra-cuu" | "/sang-loc" | "/tri-lieu" | null,
  "suggestion_reason": "reason text" | null,
  "insight_type": "advice" | "clarification" | "guidance"
}

CONTEXT: User is on ${pageName} page.

LOGIC:
- If user asks a health question: answer briefly (2-3 sentences) and suggest a relevant page if helpful
- If no question yet: show_insight=false
- Always return JSON, never any text`

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
        persona: systemPrompt,
        messages: conversationHistory,
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
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
        // Try multiple parsing strategies
        let jsonStr = responseText.trim()
        
        // Strategy 1: Extract from markdown code blocks
        const jsonMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
        if (jsonMatch) {
          jsonStr = jsonMatch[1]
        }
        
        // Strategy 2: Find first { and last } if not already extracted
        if (!jsonMatch) {
          const startIdx = jsonStr.indexOf('{')
          const endIdx = jsonStr.lastIndexOf('}')
          if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
            jsonStr = jsonStr.substring(startIdx, endIdx + 1)
          }
        }
        
        parsedResponse = JSON.parse(jsonStr)
      } catch (parseErr) {
        console.error('[v0] Failed to parse LLM JSON response:', responseText.substring(0, 200))
        // Fallback: create a safe default insight (don't show)
        parsedResponse = {
          show_insight: false,
          main_response: '',
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
