import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(req: Request) {
  try {
    const { messages, conversationId } = await req.json()

    if (!messages || messages.length === 0) {
      return Response.json({ name: "New Conversation" })
    }

    // Get first user message for naming
    const firstUserMessage = messages.find((m: any) => m.isUser)?.content
    if (!firstUserMessage) {
      return Response.json({ name: "New Conversation" })
    }

    // Generate a short, meaningful name (max 50 chars) for the conversation
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })
    const prompt = `Based on this user query, generate a very short conversation title (max 8 words, max 50 characters). Reply with ONLY the title, nothing else.

Query: "${firstUserMessage}"`

    const result = await model.generateContent(prompt)
    const conversationName = result.response.text().trim().slice(0, 50)

    return Response.json({ 
      name: conversationName || "New Conversation",
      conversationId 
    })
  } catch (error) {
    console.error("[v0] Error auto-naming conversation:", error)
    return Response.json({ name: "New Conversation" }, { status: 500 })
  }
}
