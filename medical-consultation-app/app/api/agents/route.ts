import { NextRequest, NextResponse } from 'next/server'
import { agentRegistry } from '@/lib/agent-registry'

/**
 * GET /api/agents - Get all available agents
 * Lấy danh sách tất cả các agent
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const embeddableOnly = searchParams.get('embeddable') === 'true'

    let agents = agentRegistry.getAllAgents()

    if (category) {
      agents = agents.filter(a => a.category === category)
    }

    if (embeddableOnly) {
      agents = agents.filter(a => a.embeddable)
    }

    return NextResponse.json(agents)
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/agents - Suggest an agent for a conversation
 * Gợi ý một agent cho cuộc hội thoại
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, agentId, reason } = body

    if (!conversationId || !agentId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: conversationId, agentId, reason' },
        { status: 400 }
      )
    }

    // Verify agent exists
    const agent = agentRegistry.getAgent(agentId)
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentId} not found` },
        { status: 404 }
      )
    }

    // Record suggestion in database
    const suggestion = await agentRegistry.suggestAgent(conversationId, agentId, reason)

    return NextResponse.json(suggestion, { status: 201 })
  } catch (error) {
    console.error('Error suggesting agent:', error)
    return NextResponse.json(
      { error: 'Failed to suggest agent' },
      { status: 500 }
    )
  }
}
