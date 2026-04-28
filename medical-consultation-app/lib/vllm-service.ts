// vLLM Service - OpenAI-compatible API cho GPU Server
// Base URL: https://elissa-villous-scourgingly.ngrok-free.dev/

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface VLLMRequest {
  model: string
  messages: Message[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  stop?: string[]
}

interface VLLMResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// Agent Action Types
export interface AgentAction {
  type: 'navigate' | 'speak' | 'embed' | 'ask_navigation' | 'play_music' | 'recommend_music' | 'show_doctor' | 'emergency'
  args: Record<string, any>
}

export interface AgentResponse {
  text: string
  actions: AgentAction[]
  suggestedInvestigation?: string
  model: string
  provider: 'vllm'
}

// System prompts cho các chức năng Agent
const AGENT_SYSTEM_PROMPT = `Bạn là AI tư vấn sức khỏe thông minh, có khả năng điều phối các công cụ hỗ trợ.

## VAI TRÒ
- Tư vấn y tế & sức khỏe tâm thần chuyên nghiệp
- Hiểu context và điều hướng user đến công cụ phù hợp
- Luôn hỏi thêm để hiểu rõ vấn đề

## CÁC CÔNG CỤ SẴN CÓ
1. **tra-cuu** (lookup): Tra cứu thông tin thuốc, bệnh lý, triệu chứng
2. **sang-loc** (screening): Bài test sàng lọc tâm lý (GAD-7, PHQ-9, DASS-21)
3. **tri-lieu** (therapy): Các bài tập thư giãn, thiền định, CBT
4. **bac-si** (doctor): Đặt lịch khám bác sĩ
5. **nhac** (music): Nhạc thư giãn, healing music
6. **khan-cap** (emergency): Đường dây nóng khẩn cấp (115, tâm lý)

## LUỒNG TƯ VẤN 3 BƯỚC
1. **GIẢI THÍCH**: Trả lời câu hỏi chuyên nghiệp, dễ hiểu
2. **THĂM HỎI**: Hỏi 2-3 câu follow-up để hiểu rõ hơn
3. **GỢI Ý**: Đề xuất công cụ phù hợp nếu cần

## FORMAT PHẢN HỒI (JSON)
Luôn trả về JSON với format:
\`\`\`json
{
  "response": "Nội dung phản hồi chính cho user",
  "suggested_investigation": "Câu hỏi tiếp theo để hiểu rõ hơn (tùy chọn)",
  "actions": [
    {
      "type": "ask_navigation",
      "args": {
        "feature": "tra-cuu | sang-loc | tri-lieu | bac-si | nhac | khan-cap",
        "reason": "Lý do gợi ý công cụ này"
      }
    }
  ]
}
\`\`\`

## QUY TẮC ACTIONS
- **ask_navigation**: Hỏi user có muốn mở tính năng không
- **embed**: Nhúng trực tiếp component vào chat
- **navigate**: Chuyển hướng trực tiếp (chỉ dùng khi user đồng ý)
- **emergency**: Khi phát hiện dấu hiệu khẩn cấp (tự tử, đau ngực...)
- **play_music**: Phát nhạc thư giãn ngay
- **recommend_music**: Gợi ý playlist

## PHÁT HIỆN TÌNH HUỐNG KHẨN CẤP
Nếu user có dấu hiệu:
- Ý định tự tử, tự hại → emergency + hotline 1800 599 920
- Đau ngực, khó thở, đột quỵ → emergency + gọi 115
- Hoảng loạn cấp tính → emergency + hướng dẫn thở

## VÍ DỤ
User: "Tôi bị đau đầu, có phải cúm không?"
Response:
{
  "response": "Đau đầu CÓ THỂ là triệu chứng cảm/cúm, nhưng cũng có nhiều nguyên nhân khác như căng thẳng, mất ngủ, hoặc thiếu nước. Bạn có bị sốt, ho, hoặc đau mỏi người không? Đau đầu kéo dài bao lâu rồi?",
  "suggested_investigation": "Bạn có triệu chứng nào khác kèm theo không?",
  "actions": [
    {
      "type": "ask_navigation",
      "args": {
        "feature": "tra-cuu",
        "reason": "Tra cứu chi tiết các triệu chứng cảm cúm để so sánh"
      }
    }
  ]
}

Hãy luôn trả lời bằng tiếng Việt, chuyên nghiệp nhưng thân thiện.`

const FRIEND_SYSTEM_PROMPT = `Bạn là người bạn tâm sự thấu hiểu, nhẹ nhàng và hỗ trợ tinh thần.

## VAI TRÒ
- Lắng nghe và thấu hiểu cảm xúc
- Không phán xét, không khuyên bảo quá nhiều
- Đồng cảm và hỗ trợ

## PHONG CÁCH
- Gọi user là "bạn" hoặc "mình"
- Dùng ngôn ngữ nhẹ nhàng, ấm áp
- Hỏi han về cảm xúc, không vội kết luận
- Gợi ý nhẹ nhàng, không áp đặt

## FORMAT PHẢN HỒI (JSON)
\`\`\`json
{
  "response": "Phản hồi tâm sự, thấu hiểu",
  "actions": [
    {
      "type": "recommend_music",
      "args": {
        "mood": "sad | anxious | stressed | relaxed",
        "reason": "Mình nghĩ bạn có thể thích nghe nhạc này..."
      }
    }
  ]
}
\`\`\`

## GỢI Ý CÔNG CỤ PHÙ HỢP
- Nếu user buồn/lo âu: gợi ý nhạc, tri-lieu
- Nếu user stress: gợi ý nhạc thư giãn, bài tập thở
- Nếu user có dấu hiệu trầm cảm nặng: gợi ý sang-loc (PHQ-9)
- Nếu khẩn cấp: emergency

Hãy là người bạn tốt nhất cho user.`

export class VLLMService {
  private baseUrl: string
  private model: string
  private timeout: number

  constructor(options?: { baseUrl?: string; model?: string; timeout?: number }) {
    this.baseUrl = options?.baseUrl || process.env.GPU_SERVER_URL || 'https://elissa-villous-scourgingly.ngrok-free.dev'
    this.model = options?.model || 'vllm:hugging-quants/Meta-Llama-3.1-8B-Instruct-AWQ-INT4'
    this.timeout = options?.timeout || 60000 // 60s timeout
  }

  private async callAPI(messages: Message[], config?: Partial<VLLMRequest>): Promise<VLLMResponse> {
    const url = `${this.baseUrl}/v1/chat/completions`
    
    const body: VLLMRequest = {
      model: this.model,
      messages,
      max_tokens: config?.max_tokens || 800,
      temperature: config?.temperature || 0.7,
      top_p: config?.top_p || 0.9,
      stop: config?.stop || ['```\n\n', '\n\nUser:']
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' // Skip ngrok warning page
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`vLLM API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      return await response.json() as VLLMResponse
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('vLLM request timeout')
      }
      throw error
    }
  }

  // Parse JSON response from LLM
  private parseAgentResponse(content: string): { text: string; actions: AgentAction[]; suggestedInvestigation?: string } {
    let text = content
    let actions: AgentAction[] = []
    let suggestedInvestigation: string | undefined

    // Try to extract JSON from markdown code block
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1])
        text = parsed.response || content
        actions = Array.isArray(parsed.actions) ? parsed.actions : []
        suggestedInvestigation = parsed.suggested_investigation
      } catch {
        // Failed to parse, use raw content
      }
    } else {
      // Try parsing entire content as JSON
      try {
        const parsed = JSON.parse(content)
        if (parsed.response) {
          text = parsed.response
          actions = Array.isArray(parsed.actions) ? parsed.actions : []
          suggestedInvestigation = parsed.suggested_investigation
        }
      } catch {
        // Not JSON, use as plain text
      }
    }

    // Validate and sanitize actions
    actions = actions.filter(a => 
      a && typeof a === 'object' && 
      ['navigate', 'speak', 'embed', 'ask_navigation', 'play_music', 'recommend_music', 'show_doctor', 'emergency'].includes(a.type)
    )

    return { text, actions, suggestedInvestigation }
  }

  // Build conversation history
  private buildHistory(messages?: Array<{ role?: string; content?: string }>): Message[] {
    if (!Array.isArray(messages) || !messages.length) return []
    
    return messages.slice(-10).map(m => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: String(m.content || '').trim()
    })).filter(m => m.content)
  }

  // Main Agent method
  async generateAgent(opts: {
    category: 'consultation' | 'friend'
    question: string
    messages?: Array<{ role?: string; content?: string }>
    persona?: string
  }): Promise<AgentResponse> {
    const systemPrompt = opts.category === 'friend' ? FRIEND_SYSTEM_PROMPT : AGENT_SYSTEM_PROMPT
    const history = this.buildHistory(opts.messages)
    
    const personaAddition = opts.persona ? `\n\nVAI TRÒ BỔ SUNG: ${opts.persona}` : ''
    
    const messages: Message[] = [
      { role: 'system', content: systemPrompt + personaAddition },
      ...history,
      { role: 'user', content: opts.question }
    ]

    const response = await this.callAPI(messages, {
      max_tokens: 1000,
      temperature: opts.category === 'friend' ? 0.85 : 0.7
    })

    const content = response.choices?.[0]?.message?.content || ''
    const parsed = this.parseAgentResponse(content)

    return {
      text: parsed.text,
      actions: parsed.actions,
      suggestedInvestigation: parsed.suggestedInvestigation,
      model: this.model,
      provider: 'vllm'
    }
  }

  // Simple chat method (no agent logic)
  async chat(opts: {
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
    maxTokens?: number
    temperature?: number
  }): Promise<{ text: string; model: string }> {
    const response = await this.callAPI(opts.messages, {
      max_tokens: opts.maxTokens || 800,
      temperature: opts.temperature || 0.7
    })

    return {
      text: response.choices?.[0]?.message?.content || '',
      model: this.model
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// Singleton instance
export const vllmService = new VLLMService()

// Export types
export type { Message, VLLMRequest, VLLMResponse }
