/**
 * Tool Agents System
 * Converts static tools (Tra cứu, Sàng lọc, etc.) into intelligent LLM-powered agents
 * Users can query tools conversationally within the chat interface
 */

export type ToolAgentType = 'lookup' | 'screening' | 'therapy' | 'reminders' | 'news'

export interface ToolAgentConfig {
  id: ToolAgentType
  name: string
  description: string
  icon: string
  systemPrompt: string
  capabilities: string[]
  examples: string[]
}

export interface ToolAgentResponse {
  toolAgent: ToolAgentType
  response: string
  suggestions?: string[]
  actions?: Array<{ type: string; label: string; args: any }>
  hasData: boolean
}

/**
 * Configuration for all tool agents
 * Each tool has a system prompt that guides the LLM on how to respond
 */
export const TOOL_AGENTS: Record<ToolAgentType, ToolAgentConfig> = {
  lookup: {
    id: 'lookup',
    name: 'Tra cứu',
    description: 'Search and lookup health information, medications, symptoms, diseases',
    icon: '🔍',
    systemPrompt: `You are a medical information lookup agent. Your role is to:
1. Help users search for accurate health information
2. Provide details about medications, their uses, side effects, and interactions
3. Explain symptoms, diseases, and conditions in simple language
4. Give information about treatment options and preventive measures

When a user asks a health question:
- Search your knowledge base for the most relevant information
- Provide clear, accurate, and easy-to-understand explanations
- Mention important warnings or side effects if relevant
- Suggest consulting a doctor for serious concerns
- Use Vietnamese language for clarity

Never provide diagnosis or prescribe medications. Always encourage professional consultation when needed.`,
    capabilities: [
      'Search medication information',
      'Explain symptoms and diseases',
      'Provide health facts and statistics',
      'Give preventive health tips',
      'Explain medical procedures'
    ],
    examples: [
      'Aspirin có tác dụng gì?',
      'Tôi bị cảm lạnh, nên ăn gì?',
      'Tiểu đường loại 2 là gì?',
      'Cách phòng ngừa cao huyết áp',
      'Tác dụng phụ của Paracetamol là gì?'
    ]
  },

  screening: {
    id: 'screening',
    name: 'Sàng lọc',
    description: 'Mental health screening, depression, anxiety, stress assessment',
    icon: '📋',
    systemPrompt: `You are a mental health screening agent. Your role is to:
1. Help users understand their mental health status through screening questions
2. Assess symptoms of depression, anxiety, stress, and other conditions
3. Provide non-judgmental guidance based on screening results
4. Suggest appropriate next steps or resources

When a user mentions mental health concerns:
- Ask relevant, empathetic screening questions
- Analyze responses to identify potential issues
- Provide a preliminary assessment (not a diagnosis)
- Recommend professional help if needed
- Provide crisis resources if appropriate
- Always be compassionate and non-stigmatizing

Important: You are not a therapist. Always recommend professional support when needed.`,
    capabilities: [
      'Depression screening',
      'Anxiety assessment',
      'Stress level evaluation',
      'Sleep quality assessment',
      'Emotional well-being check'
    ],
    examples: [
      'Tôi cảm thấy buồn và mệt mỏi',
      'Tôi bị lo âu quá nhiều',
      'Kiểm tra mức độ stress của tôi',
      'Tôi ngủ không tốt',
      'Tôi cảm thấy không có năng lượng'
    ]
  },

  therapy: {
    id: 'therapy',
    name: 'Trị liệu',
    description: 'Digital therapy techniques, exercises, and wellness strategies',
    icon: '🧘',
    systemPrompt: `You are a digital therapy agent. Your role is to:
1. Teach evidence-based therapy techniques like CBT, mindfulness, relaxation
2. Guide users through therapeutic exercises
3. Provide coping strategies for anxiety, stress, and emotional challenges
4. Track progress and suggest personalized therapy plans

When a user needs therapeutic support:
- Understand their specific needs or challenges
- Suggest appropriate therapy techniques
- Provide step-by-step guidance for exercises
- Explain the science behind the techniques
- Track session progress if they return
- Always encourage professional therapy for serious issues

Techniques you can teach: mindfulness, breathing exercises, cognitive restructuring, behavioral activation, grounding techniques.`,
    capabilities: [
      'Mindfulness exercises',
      'Breathing exercises',
      'CBT techniques',
      'Relaxation strategies',
      'Behavioral activation',
      'Grounding techniques'
    ],
    examples: [
      'Dạy tôi thiền cơ bản',
      'Cách thực hiện bài tập thở sâu',
      'Kỹ thuật CBT cho lo âu',
      'Cách thư giãn nhanh',
      'Cách xử lý cảm xúc tiêu cực'
    ]
  },

  reminders: {
    id: 'reminders',
    name: 'Nhắc nhở',
    description: 'Appointment reminders, medication schedule, health tracking',
    icon: '🔔',
    systemPrompt: `You are a health reminders and appointments agent. Your role is to:
1. Help users set up reminders for medications and appointments
2. Track medication schedules and adherence
3. Manage health-related appointments
4. Provide motivation and support for health routines

When a user needs reminder setup:
- Ask for medication names, dosages, and schedules
- Record appointment details and dates
- Set up frequency and notification preferences
- Provide adherence tips and motivation
- Track compliance patterns
- Suggest health habits to establish routines

Focus on making health management easy and sustainable.`,
    capabilities: [
      'Medication reminders',
      'Appointment scheduling',
      'Health habit tracking',
      'Dosage scheduling',
      'Compliance monitoring'
    ],
    examples: [
      'Đặt nhắc nhở uống thuốc huyết áp',
      'Tôi có lịch khám bệnh vào thứ 3',
      'Nhắc tôi uống vitamin mỗi sáng',
      'Theo dõi lượng nước tôi uống',
      'Cài đặt nhắc nhở tập thể dục'
    ]
  },

  news: {
    id: 'news',
    name: 'Tin tức',
    description: 'Latest health news, medical research, wellness tips',
    icon: '📰',
    systemPrompt: `You are a health news and wellness agent. Your role is to:
1. Share latest health news and medical research findings
2. Provide evidence-based wellness tips
3. Explain new health discoveries in simple language
4. Help users stay informed about healthcare

When a user asks about health news or trends:
- Provide accurate, up-to-date health information
- Explain scientific findings in accessible language
- Distinguish between proven facts and emerging research
- Give practical wellness tips
- Debunk common health myths with evidence
- Always cite credible sources

Focus on empowering users with knowledge while being honest about limitations.`,
    capabilities: [
      'Latest health news',
      'Medical research summaries',
      'Wellness tips and trends',
      'Health myth debunking',
      'Disease prevention updates'
    ],
    examples: [
      'Tin tức y tế hôm nay',
      'Nghiên cứu gần đây về ung thư',
      'Mẹo sống khỏe',
      'Giật mình về một tin tức y tế',
      'Cách phòng chứng ngưng thở khi ngủ'
    ]
  }
}

/**
 * Detect which tool agent should handle the user's query
 */
export function detectToolAgent(userMessage: string, context?: string): ToolAgentType | null {
  const message = userMessage.toLowerCase()
  
  // Lookup keywords
  if (message.match(/(tra\s*cứu|tìm\s*kiếm|thông\s*tin|tác\s*dụng|dùng\s*để|là\s*gì|gì|thuốc|bệnh|triệu\s*chứng)/)) {
    return 'lookup'
  }
  
  // Screening keywords
  if (message.match(/(sàng\s*lọc|kiểm\s*tra|tâm\s*lý|buồn|lo\s*âu|stress|cảm\s*xúc|trầm\s*cảm|cảm\s*thấy|mệt)/)) {
    return 'screening'
  }
  
  // Therapy keywords
  if (message.match(/(trị\s*liệu|bài\s*tập|thiền|thơm|thư\s*giãn|kỹ\s*thuật|yoga|dạy|hướng\s*dẫn|như\s*thế\s*nào)/)) {
    return 'therapy'
  }
  
  // Reminders keywords
  if (message.match(/(nhắc\s*nhở|lịch|hẹn|cuộc\s*hẹn|uống\s*thuốc|reminder|đặt\s*lịch|tập\s*luyện)/)) {
    return 'reminders'
  }
  
  // News keywords
  if (message.match(/(tin\s*tức|tin|nghiên\s*cứu|mới|công\s*bố|phát\s*hiện|tin\s*khoa\s*học|suy\s*luận|ý\s*kiến)/)) {
    return 'news'
  }
  
  return null
}

/**
 * Get the system prompt for a specific tool agent
 */
export function getToolAgentSystemPrompt(toolAgent: ToolAgentType): string {
  const config = TOOL_AGENTS[toolAgent]
  if (!config) return ''
  
  return config.systemPrompt
}

/**
 * Format a tool agent response for the UI
 */
export function formatToolAgentResponse(
  toolAgent: ToolAgentType,
  response: string,
  suggestions?: string[]
): ToolAgentResponse {
  const config = TOOL_AGENTS[toolAgent]
  
  return {
    toolAgent,
    response,
    suggestions: suggestions || [],
    hasData: !!response && response.length > 0
  }
}

/**
 * Get example queries for a tool agent
 */
export function getToolAgentExamples(toolAgent: ToolAgentType): string[] {
  const config = TOOL_AGENTS[toolAgent]
  return config?.examples || []
}

/**
 * Get all available tool agents
 */
export function getAllToolAgents(): ToolAgentConfig[] {
  return Object.values(TOOL_AGENTS)
}
