import { detectToolAgent, getToolAgentSystemPrompt, formatToolAgentResponse } from '@/lib/tool-agents'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  try {
    const { message, context, history } = await request.json()

    if (!message || typeof message !== 'string') {
      return Response.json({
        success: false,
        error: 'Message is required'
      }, { status: 400 })
    }

    // Detect which tool agent should handle this
    const toolAgent = detectToolAgent(message, context)

    if (!toolAgent) {
      return Response.json({
        success: false,
        error: 'No suitable tool agent found for this query',
        toolAgent: null,
        response: null
      }, { status: 400 })
    }

    // Get the system prompt for this tool agent
    const systemPrompt = getToolAgentSystemPrompt(toolAgent)

    // Build conversation history
    const conversationMessages = Array.isArray(history)
      ? history.map((msg: any) => ({
          role: msg.role || 'user',
          content: msg.content || ''
        }))
      : []

    // Add current message
    conversationMessages.push({
      role: 'user',
      content: message
    })

    // Call Gemini API with tool agent system prompt
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: systemPrompt + '\n\n用户问题：' + message
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    })

    const responseText = result.response.text()

    // Format the response
    const formattedResponse = formatToolAgentResponse(toolAgent, responseText)

    return Response.json({
      success: true,
      toolAgent,
      response: responseText,
      formattedResponse
    })
  } catch (error: any) {
    console.error('[Tool Agent API Error]', error)
    return Response.json({
      success: false,
      error: error?.message || 'Failed to process tool agent request'
    }, { status: 500 })
  }
}
