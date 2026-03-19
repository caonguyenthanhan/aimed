// Gemini API Service for Medical Consultation
// Tích hợp API Gemini cho hệ thống tư vấn y tế

import fs from 'fs'
import path from 'path'

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string
    }>
  }>
  tools?: Array<{
    functionDeclarations: Array<{
      name: string
      description?: string
      parameters?: any
    }>
  }>
  generationConfig?: {
    temperature?: number
    topK?: number
    topP?: number
    maxOutputTokens?: number
    stopSequences?: string[]
  }
  safetySettings?: Array<{
    category: string
    threshold: string
  }>
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string
        functionCall?: { name?: string; args?: any }
      }>
    }
    finishReason: string
    index: number
    safetyRatings: Array<{
      category: string
      probability: string
    }>
  }>
  promptFeedback?: {
    safetyRatings: Array<{
      category: string
      probability: string
    }>
  }
}

export class GeminiService {
  private apiKey: string
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models'
  private model: string = 'gemini-2.5-flash'

  constructor(apiKey: string) {
    this.apiKey = apiKey
    if (process.env.GEMINI_MODEL && String(process.env.GEMINI_MODEL).trim()) {
      this.model = String(process.env.GEMINI_MODEL).trim()
    }
  }

  private loadPromptConfig(): any | null {
    try {
      const p = process.env.PROMPT_CONFIG_PATH && String(process.env.PROMPT_CONFIG_PATH).trim()
        ? String(process.env.PROMPT_CONFIG_PATH).trim()
        : path.join(process.cwd(), 'data', 'prompt-config.json')
      if (!fs.existsSync(p)) return null
      const raw = fs.readFileSync(p, 'utf-8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  private renderTemplate(template: string, vars: Record<string, string>): string {
    let out = String(template || '')
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{{${k}}}`, String(v ?? ''))
    }
    out = out.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '')
    return out
  }

  private buildHistoryBlock(messages?: Array<{ role?: string; content?: string }>): string {
    if (!Array.isArray(messages) || !messages.length) return ''
    const lines = messages
      .slice(-12)
      .map(m => {
        const role = String(m?.role || '').toLowerCase() === 'assistant' ? 'Assistant' : 'User'
        const content = String(m?.content || '').trim()
        if (!content) return ''
        return `${role}: ${content}`
      })
      .filter(Boolean)
    if (!lines.length) return ''
    return `Lịch sử:\n${lines.join('\n')}\n`
  }

  private getGenerationConfigForCategory(category: 'consultation' | 'friend' | 'lookup' | 'speech_stream') {
    if (category === 'friend') {
      return {
        temperature: 0.85,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 1400,
        stopSequences: []
      }
    }
    return this.getGenerationConfig()
  }

  async generateFromConfig(opts: {
    category: 'consultation' | 'friend' | 'lookup' | 'speech_stream'
    tier?: 'flash' | 'pro'
    question: string
    persona?: string
    messages?: Array<{ role?: string; content?: string }>
    generationConfig?: { temperature?: number; maxOutputTokens?: number }
  }): Promise<{ text: string; model: string }> {
    const cfg = this.loadPromptConfig()
    const tier = opts?.tier === 'pro' ? 'pro' : 'flash'
    const providerCfg = cfg?.providers?.gemini
    const modelFromCfg = providerCfg?.models?.[tier]
    const modelToUse = (process.env.GEMINI_MODEL && String(process.env.GEMINI_MODEL).trim())
      ? String(process.env.GEMINI_MODEL).trim()
      : (modelFromCfg && String(modelFromCfg).trim()) ? String(modelFromCfg).trim() : this.model

    const prompts = cfg?.prompts || {}
    const categoryBlock = prompts?.[opts.category] || {}
    const template =
      (typeof categoryBlock?.[tier] === 'string' ? categoryBlock[tier] : null) ||
      (typeof categoryBlock?.default === 'string' ? categoryBlock.default : null) ||
      ''

    const personaText = String(opts.persona || '').trim()
    const personaBlock = personaText ? `VAI TRÒ: ${personaText}` : ''
    const historyBlock = this.buildHistoryBlock(opts.messages)
    const prompt = this.renderTemplate(template, {
      question: String(opts.question || ''),
      persona_block: personaBlock,
      history_block: historyBlock
    }).trim()

    const requestBody: GeminiRequest = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { ...this.getGenerationConfigForCategory(opts.category), ...(opts.generationConfig || {}) },
      safetySettings: this.getSafetySettings()
    }

    const url = `${this.baseUrl}/${modelToUse}:generateContent`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} ${errorText}`)
    }

    const data = (await response.json()) as GeminiResponse
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
    return { text: String(text || '').trim(), model: modelToUse }
  }

  async generateAgent(opts: {
    category: 'consultation' | 'friend'
    tier?: 'flash' | 'pro'
    question: string
    persona?: string
    messages?: Array<{ role?: string; content?: string }>
    tools: Array<{ name: string; description?: string; parameters?: any }>
  }): Promise<{ text: string; model: string; toolCalls: Array<{ name: string; args: any }> }> {
    const cfg = this.loadPromptConfig()
    const tier = opts?.tier === 'pro' ? 'pro' : 'flash'
    const providerCfg = cfg?.providers?.gemini
    const modelFromCfg = providerCfg?.models?.[tier]
    const modelToUse = (process.env.GEMINI_MODEL && String(process.env.GEMINI_MODEL).trim())
      ? String(process.env.GEMINI_MODEL).trim()
      : (modelFromCfg && String(modelFromCfg).trim()) ? String(modelFromCfg).trim() : this.model

    const system = [
      'Bạn là AI agent cho ứng dụng tư vấn y tế & tâm lý.',
      'Bạn có thể gọi các tool để thực thi hành động trên UI.',
      'Chỉ gọi tool khi cần thao tác cụ thể (mở trang, điều hướng).',
      'Nếu gọi tool, vẫn trả lời ngắn gọn để người dùng hiểu bạn đang làm gì.',
    ].join('\n')

    const historyBlock = this.buildHistoryBlock(opts.messages)
    const personaText = String(opts.persona || '').trim()
    const personaBlock = personaText ? `VAI TRÒ: ${personaText}` : ''
    const prompt = `${system}\n${personaBlock}\n${historyBlock}\nYêu cầu: ${String(opts.question || '').trim()}`.trim()

    const requestBody: GeminiRequest = {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ functionDeclarations: (Array.isArray(opts.tools) ? opts.tools : []).map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })) }],
      generationConfig: this.getGenerationConfigForCategory(opts.category),
      safetySettings: this.getSafetySettings(),
    }

    const url = `${this.baseUrl}/${modelToUse}:generateContent`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} ${errorText}`)
    }

    const data = (await response.json()) as GeminiResponse
    const parts = data?.candidates?.[0]?.content?.parts || []
    const text = parts.map((p: any) => p?.text || '').join('').trim()
    const toolCalls = parts
      .map((p: any) => p?.functionCall ? { name: String(p.functionCall?.name || '').trim(), args: p.functionCall?.args ?? {} } : null)
      .filter((x: any) => x && x.name)
    return { text, model: modelToUse, toolCalls }
  }

  // Prompt templates cho từng context
  private getPromptTemplate(context: string, question: string): string {
    switch (context) {
      case 'general':
      case 'health consultation':
        return this.getHealthConsultationPrompt(question)
      
      case 'health lookup':
        return this.getHealthLookupPrompt(question)
      
      case 'psychological support':
        return this.getPsychologicalSupportPrompt(question)
      
      default:
        return this.getGeneralMedicalPrompt(question)
    }
  }

  // Prompt cho tư vấn sức khỏe tổng quát
  private getHealthConsultationPrompt(question: string): string {
    return `Bạn là một trợ lý AI chuyên về y tế, được huấn luyện để hỗ trợ tư vấn sức khỏe bằng tiếng Việt. Hãy trả lời câu hỏi sau một cách chính xác, hữu ích và an toàn.

NGUYÊN TẮC QUAN TRỌNG:
- Luôn nhấn mạnh rằng thông tin chỉ mang tính chất tham khảo
- Khuyến khích người dùng tham khảo ý kiến bác sĩ chuyên khoa
- Không đưa ra chẩn đoán chính thức
- Cung cấp thông tin dựa trên kiến thức y khoa đáng tin cậy
- Sử dụng ngôn ngữ dễ hiểu, thân thiện

ĐỊNH DẠNG TRẢ LỜI:
1. Trả lời trực tiếp câu hỏi
2. Giải thích ngắn gọn về vấn đề
3. Đưa ra lời khuyên chung (nếu phù hợp)
4. Khuyến nghị tham khảo chuyên gia (nếu cần)
5. Lưu ý quan trọng về an toàn

Câu hỏi: ${question}

Hãy trả lời bằng tiếng Việt một cách chuyên nghiệp và dễ hiểu:`
  }

  // Prompt cho tra cứu thông tin y khoa
  private getHealthLookupPrompt(question: string): string {
    return `Bạn là một cơ sở dữ liệu y khoa thông minh, chuyên cung cấp thông tin chính xác về bệnh lý, thuốc men, triệu chứng bằng tiếng Việt.

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

Truy vấn: ${question}

Hãy cung cấp thông tin chi tiết và chính xác bằng tiếng Việt:`
  }

  // Prompt cho hỗ trợ tâm lý
  private getPsychologicalSupportPrompt(question: string): string {
    return `Bạn là một chuyên gia tâm lý học lâm sàng, chuyên hỗ trợ sức khỏe tâm thần bằng tiếng Việt. Hãy đưa ra lời khuyên chuyên nghiệp và thấu hiểu.

NGUYÊN TẮC HỖ TRỢ:
- Thể hiện sự đồng cảm và hiểu biết
- Cung cấp thông tin dựa trên nghiên cứu khoa học
- Đề xuất các kỹ thuật tự chăm sóc an toàn
- Nhận biết khi nào cần can thiệp chuyên nghiệp
- Tránh chẩn đoán tâm lý chính thức

ĐỊNH DẠNG TRẢ LỜI:
💙 **Hiểu và thấu cảm:**
- Thừa nhận cảm xúc của người dùng
- Bình thường hóa trải nghiệm

🧠 **Thông tin tâm lý:**
- Giải thích về tình trạng/cảm xúc
- Nguyên nhân có thể có

🌱 **Gợi ý hỗ trợ:**
- Kỹ thuật tự chăm sóc
- Hoạt động có lợi
- Thay đổi lối sống tích cực

🆘 **Khi nào cần hỗ trợ chuyên nghiệp:**
- Dấu hiệu cần can thiệp
- Nguồn hỗ trợ có sẵn

Câu hỏi/Tình huống: ${question}

Hãy hỗ trợ một cách chuyên nghiệp và ấm áp bằng tiếng Việt:`
  }

  // Prompt tổng quát cho y tế
  private getGeneralMedicalPrompt(question: string): string {
    return `Bạn là một trợ lý AI y tế thông minh, được thiết kế để hỗ trợ người dùng Việt Nam về các vấn đề sức khỏe.

HƯỚNG DẪN TRẢ LỜI:
- Sử dụng tiếng Việt chuẩn, dễ hiểu
- Cung cấp thông tin chính xác dựa trên y học hiện đại
- Luôn nhấn mạnh tính chất tham khảo
- Khuyến khích tham khảo chuyên gia khi cần
- Tránh gây hoang mang hoặc lo lắng không cần thiết

CẤU TRÚC TRẢ LỜI:
1. Trả lời ngắn gọn và rõ ràng
2. Giải thích chi tiết nếu cần
3. Đưa ra lời khuyên thực tế
4. Disclaimer về tính chất tham khảo

Câu hỏi: ${question}

Trả lời bằng tiếng Việt:`
  }

  // Cấu hình an toàn cho nội dung y tế
  private getSafetySettings() {
    return [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH", 
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  }

  // Cấu hình generation cho nội dung y tế
  private getGenerationConfig() {
    return {
      temperature: 0.3, // Giảm tính ngẫu nhiên cho độ chính xác cao
      topK: 40,
      topP: 0.8,
      maxOutputTokens: 1024,
      stopSequences: []
    }
  }

  // Gọi API Gemini
  async generateResponse(question: string, context: string = 'general', retryCount: number = 0): Promise<string> {
    try {
      console.log(`[Gemini API] Context: ${context}`)
      console.log(`[Gemini API] Question: ${question}`)

      const prompt = this.getPromptTemplate(context, question)
      
      const requestBody: GeminiRequest = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: this.getGenerationConfig(),
        safetySettings: this.getSafetySettings()
      }

      const url = `${this.baseUrl}/${this.model}:generateContent`
      console.log('[Gemini API] URL:', url)
      console.log('[Gemini API] Request body:', JSON.stringify(requestBody, null, 2))
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey
        },
        body: JSON.stringify(requestBody)
      })

      console.log('[Gemini API] Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Gemini API error: ${response.status} ${response.statusText}`)
        console.error('Error details:', errorText)
        
        // Retry logic for rate limiting (429) or service unavailable (503)
        if ((response.status === 429 || response.status === 503) && retryCount < 3) {
          const waitTime = Math.pow(2, retryCount) * 2000 // Exponential backoff: 2s, 4s, 8s
          console.log(`[Gemini API] Retrying in ${waitTime/1000} seconds... (attempt ${retryCount + 1}/3)`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          return this.generateResponse(question, context, retryCount + 1)
        }
        
        return this.getFallbackResponse(context, question)
      }

      const data: GeminiResponse = await response.json()
      
      if (!data.candidates || data.candidates.length === 0) {
        console.error('No response generated from Gemini API')
        return this.getFallbackResponse(context, question)
      }

      // Kiểm tra cấu trúc response an toàn
      const candidate = data.candidates[0]
      if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('Invalid response structure from Gemini API')
        console.error('Response data:', JSON.stringify(data, null, 2))
        console.error('Candidate:', candidate)
        return this.getFallbackResponse(context, question)
      }

      const generatedText = candidate.content.parts[0].text
      
      // Thêm disclaimer an toàn cho nội dung y tế
      return this.addMedicalDisclaimer(generatedText)

    } catch (error) {
      console.error('Error calling Gemini API:', error)
      return this.getFallbackResponse(context, question)
    }
  }

  // Fallback response khi API gặp lỗi
  private getFallbackResponse(context: string, question: string): string {
    const fallbackResponses = {
      'general': `Xin chào! Tôi hiểu bạn đang quan tâm về vấn đề sức khỏe. Hiện tại hệ thống AI đang gặp sự cố tạm thời, nhưng tôi vẫn có thể đưa ra một số lời khuyên chung:

Đối với câu hỏi của bạn về "${question}", tôi khuyên bạn nên:
- Tham khảo ý kiến bác sĩ chuyên khoa để được tư vấn chính xác
- Theo dõi các triệu chứng và ghi chép lại để báo cáo với bác sĩ
- Duy trì lối sống lành mạnh với chế độ ăn uống cân bằng và tập thể dục đều đặn
- Không tự ý sử dụng thuốc mà chưa có chỉ định của bác sĩ`,

      'health consultation': `Xin chào! Tôi hiểu bạn đang quan tâm về vấn đề sức khỏe. Hiện tại hệ thống AI đang gặp sự cố tạm thời, nhưng tôi vẫn có thể đưa ra một số lời khuyên chung:

Đối với câu hỏi của bạn về "${question}", tôi khuyên bạn nên:
- Tham khảo ý kiến bác sĩ chuyên khoa để được tư vấn chính xác
- Theo dõi các triệu chứng và ghi chép lại để báo cáo với bác sĩ
- Duy trì lối sống lành mạnh với chế độ ăn uống cân bằng và tập thể dục đều đặn
- Không tự ý sử dụng thuốc mà chưa có chỉ định của bác sĩ`,

      'psychological support': `Tôi hiểu bạn đang trải qua những khó khăn về mặt tâm lý. Mặc dù hệ thống AI hiện đang gặp sự cố, tôi vẫn muốn chia sẻ một số lời khuyên:

Về vấn đề "${question}" mà bạn đang quan tâm:
- Hãy nhớ rằng việc tìm kiếm sự giúp đỡ là dấu hiệu của sức mạnh, không phải yếu đuối
- Thực hành các kỹ thuật thở sâu và thiền định có thể giúp giảm căng thẳng
- Duy trì kết nối với gia đình và bạn bè
- Nếu cảm thấy quá tải, hãy liên hệ với chuyên gia tâm lý hoặc đường dây nóng hỗ trợ tâm lý`,

      'psychological': `Tôi hiểu bạn đang trải qua những khó khăn về mặt tâm lý. Mặc dù hệ thống AI hiện đang gặp sự cố, tôi vẫn muốn chia sẻ một số lời khuyên:

Về vấn đề "${question}" mà bạn đang quan tâm:
- Hãy nhớ rằng việc tìm kiếm sự giúp đỡ là dấu hiệu của sức mạnh, không phải yếu đuối
- Thực hành các kỹ thuật thở sâu và thiền định có thể giúp giảm căng thẳng
- Duy trì kết nối với gia đình và bạn bè
- Nếu cảm thấy quá tải, hãy liên hệ với chuyên gia tâm lý hoặc đường dây nóng hỗ trợ tâm lý`,

      'health lookup': `Tôi hiểu bạn đang tìm kiếm thông tin về vấn đề sức khỏe cụ thể. Hiện tại hệ thống tra cứu đang gặp sự cố, nhưng tôi có thể đưa ra một số hướng dẫn chung:

Về "${question}":
- Thông tin y tế chính xác nhất nên được lấy từ các nguồn đáng tin cậy như bác sĩ, bệnh viện, hoặc trang web y tế chính thức
- Mỗi trường hợp bệnh lý có thể khác nhau tùy theo cơ địa và tình trạng sức khỏe cá nhân
- Không nên tự chẩn đoán dựa trên thông tin trên internet
- Hãy đặt lịch khám với bác sĩ để được tư vấn chuyên nghiệp`
    }

    const response = fallbackResponses[context as keyof typeof fallbackResponses] || fallbackResponses['general']
    return this.addMedicalDisclaimer(response)
  }

  // Thêm disclaimer y tế vào cuối response
  private addMedicalDisclaimer(response: string): string {
    const disclaimer = `

---
⚠️ **Lưu ý quan trọng:** Thông tin này chỉ mang tính chất tham khảo và không thể thay thế lời khuyên chuyên môn của bác sĩ. Vui lòng tham khảo ý kiến chuyên gia y tế để có chẩn đoán và điều trị chính xác.`

    return response + disclaimer
  }

  // Kiểm tra kết nối API
  async testConnection(): Promise<boolean> {
    try {
      await this.generateResponse("Xin chào", "general")
      return true
    } catch (error) {
      console.error('Gemini API connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiService(process.env.GEMINI_API_KEY || '')

// Export types for use in other files
export type { GeminiRequest, GeminiResponse }
