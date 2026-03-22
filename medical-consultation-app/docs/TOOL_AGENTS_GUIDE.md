# Tool Agents System Guide

## Overview

The Tool Agents System transforms static tools into intelligent LLM-powered agents that respond conversationally within the chat interface. Instead of just links to separate pages, users can now ask questions and get intelligent responses from specialized agents.

## Available Tool Agents

### 1. **Tra cứu (Lookup)** 🔍
- **Purpose**: Search and lookup health information
- **Capabilities**:
  - Search medication information (uses, side effects, interactions)
  - Explain symptoms, diseases, and conditions
  - Provide health facts and statistics
  - Suggest preventive health measures
  - Explain medical procedures

**Example queries**:
- "Aspirin có tác dụng gì?"
- "Tôi bị cảm lạnh, nên ăn gì?"
- "Tiểu đường loại 2 là gì?"
- "Cách phòng ngừa cao huyết áp"

### 2. **Sàng lọc (Screening)** 📋
- **Purpose**: Mental health assessment and screening
- **Capabilities**:
  - Depression screening
  - Anxiety assessment
  - Stress level evaluation
  - Sleep quality assessment
  - Emotional well-being check

**Example queries**:
- "Tôi cảm thấy buồn và mệt mỏi"
- "Tôi bị lo âu quá nhiều"
- "Kiểm tra mức độ stress của tôi"
- "Tôi ngủ không tốt"

### 3. **Trị liệu (Therapy)** 🧘
- **Purpose**: Digital therapy techniques and exercises
- **Capabilities**:
  - Mindfulness exercises
  - Breathing exercises
  - CBT techniques
  - Relaxation strategies
  - Behavioral activation
  - Grounding techniques

**Example queries**:
- "Dạy tôi thiền cơ bản"
- "Cách thực hiện bài tập thở sâu"
- "Kỹ thuật CBT cho lo âu"
- "Cách thư giãn nhanh"

### 4. **Nhắc nhở (Reminders)** 🔔
- **Purpose**: Appointment and medication management
- **Capabilities**:
  - Medication reminders
  - Appointment scheduling
  - Health habit tracking
  - Dosage scheduling
  - Compliance monitoring

**Example queries**:
- "Đặt nhắc nhở uống thuốc huyết áp"
- "Tôi có lịch khám bệnh vào thứ 3"
- "Nhắc tôi uống vitamin mỗi sáng"
- "Theo dõi lượng nước tôi uống"

### 5. **Tin tức (News)** 📰
- **Purpose**: Health news, research, and wellness tips
- **Capabilities**:
  - Latest health news
  - Medical research summaries
  - Wellness tips and trends
  - Health myth debunking
  - Disease prevention updates

**Example queries**:
- "Tin tức y tế hôm nay"
- "Nghiên cứu gần đây về ung thư"
- "Mẹo sống khỏe"
- "Cách phòng chứng ngưng thở khi ngủ"

## How It Works

### 1. User Query Detection
When a user sends a message, the system automatically detects which tool agent can best help:
- Keywords in the message are analyzed
- Appropriate tool agent is identified
- Query is routed to that agent's specialized system prompt

### 2. LLM Processing
The selected tool agent uses its specialized system prompt to:
- Understand the user's question
- Apply domain-specific knowledge
- Provide relevant, accurate responses
- Maintain context and conversation history

### 3. Response Formatting
The agent's response is displayed in a rich format with:
- Agent icon and name
- Formatted response with markdown support
- Agent capabilities badge
- Error handling and loading states

## Integration Guide

### Using Tool Agents in Chat Components

```typescript
import { useToolAgent } from '@/hooks/use-tool-agent'
import { ToolAgentResponse } from '@/components/tool-agent-response'

export function ChatComponent() {
  const { query, response, toolAgent, loading, error, reset } = useToolAgent({
    onSuccess: (response, toolAgent) => {
      console.log(`Got response from ${toolAgent}:`, response)
    },
    onError: (error) => {
      console.error('Tool agent error:', error)
    }
  })

  const handleUserMessage = async (message: string) => {
    await query(message)
  }

  return (
    <div>
      {/* Chat input */}
      <input 
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleUserMessage(e.currentTarget.value)
            e.currentTarget.value = ''
          }
        }}
      />

      {/* Tool agent response */}
      <ToolAgentResponse
        toolAgent={toolAgent}
        response={response}
        loading={loading}
        error={error}
        onClose={reset}
      />
    </div>
  )
}
```

### Detecting Tool Agent Capability

Check if a message can be handled by a tool agent:

```typescript
import { useToolAgent } from '@/hooks/use-tool-agent'

export function CheckIfToolCanHandle() {
  const { isToolDetectable } = useToolAgent()

  const canHandle = isToolDetectable("Thuốc aspirin có tác dụng gì?")
  // Returns: true (Lookup agent can handle this)
}
```

### Manual Tool Agent Query

```typescript
import { detectToolAgent } from '@/lib/tool-agents'

const toolAgent = detectToolAgent("Tôi bị lo âu quá nhiều")
// Returns: 'screening'

const response = await fetch('/api/tool-agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Tôi bị lo âu quá nhiều",
    context: "User in emotional support session"
  })
})

const data = await response.json()
console.log(data.response) // Agent's response
```

## Architecture

### File Structure
```
lib/
├── tool-agents.ts          # Tool agent configurations and utilities
│   ├── TOOL_AGENTS         # Agent definitions
│   ├── detectToolAgent()   # Query → Agent routing
│   └── getToolAgentSystemPrompt()

app/api/
└── tool-agents/
    └── route.ts            # API endpoint for tool agent queries

components/
└── tool-agent-response.tsx # UI component for displaying responses

hooks/
└── use-tool-agent.ts       # React hook for managing tool agent state
```

### Data Flow
```
User Message
    ↓
useToolAgent.query()
    ↓
detectToolAgent() → Identify agent type
    ↓
API: POST /api/tool-agents
    ↓
Get system prompt for agent
    ↓
Call Gemini API with specialized prompt
    ↓
Return response
    ↓
<ToolAgentResponse /> displays result
```

## System Prompts

Each tool agent has a specialized system prompt that guides the LLM on how to respond. These prompts are designed to:

1. **Define the agent's role**: "You are a medical information lookup agent"
2. **Specify capabilities**: What the agent can and cannot do
3. **Set guidelines**: How to respond (format, safety, language)
4. **Provide context**: Why this agent exists and what it serves

Example (Lookup Agent):
```
You are a medical information lookup agent. Your role is to:
1. Help users search for accurate health information
2. Provide details about medications, their uses, side effects, and interactions
3. Explain symptoms, diseases, and conditions in simple language
...
Never provide diagnosis or prescribe medications. Always encourage professional consultation.
```

## Keyword Detection

The system automatically routes queries to the correct agent based on keywords:

| Agent | Keywords |
|-------|----------|
| **Lookup** | tra cứu, tìm kiếm, thông tin, tác dụng, thuốc, bệnh, triệu chứng |
| **Screening** | sàng lọc, kiểm tra, tâm lý, buồn, lo âu, stress, cảm xúc |
| **Therapy** | trị liệu, bài tập, thiền, thư giãn, kỹ thuật, yoga, dạy |
| **Reminders** | nhắc nhở, lịch, hẹn, cuộc hẹn, uống thuốc, tập luyện |
| **News** | tin tức, tin, nghiên cứu, mới, công bố, phát hiện |

## Future Enhancements

1. **Tool Combination**: Chain multiple tool agents together
   - "Show me therapy techniques AND remind me to practice them"

2. **Contextual Awareness**: Remember tool agent context across conversations
   - User's previous screening results inform therapy suggestions

3. **Feedback Loop**: Users rate tool agent responses
   - Improve accuracy of detection and system prompts

4. **Custom Agents**: Allow doctors/admins to create specialized agents
   - Domain-specific screening tools
   - Institutional protocols and guidelines

5. **Integration with External APIs**:
   - Real appointment booking systems
   - Actual medication databases
   - News API for real health news
   - Music/wellness content APIs

6. **Multi-turn Conversations**: Maintain context within agent conversations
   - Follow-up questions and clarifications
   - Progressive screening assessments

## Best Practices

1. **Keep queries focused**: Each agent has a specific domain
   - ❌ "Tell me about medication and my stress levels"
   - ✅ "What are the side effects of this medication?" OR "How can I reduce stress?"

2. **Be specific**: More details = better responses
   - ❌ "Tôi bị bệnh"
   - ✅ "Tôi bị nhức đầu, buồn nôn và sốt trong 3 ngày"

3. **Ask clarifying questions**: Users should prompt the agent to go deeper
   - "Tell me more about treatment options"
   - "What exercises would help my anxiety?"

4. **Follow up**: Tool agents support multi-turn conversations
   - First message: "I have insomnia"
   - Follow-up: "What if I can't meditate before bed?"

## Testing

To test tool agents:

```bash
# Test in development
curl -X POST http://localhost:3000/api/tool-agents \
  -H "Content-Type: application/json" \
  -d '{"message": "Aspirin có tác dụng gì?"}'

# Should return:
{
  "success": true,
  "toolAgent": "lookup",
  "response": "Aspirin là một thuốc giảm đau, hạ sốt..."
}
```

## Security Considerations

1. **Content Filtering**: System prompts prevent harmful content
   - Agents refuse to diagnose diseases
   - Agents encourage professional consultation for serious issues
   - Crisis resources provided when needed

2. **Rate Limiting**: Prevent abuse with API rate limits
3. **Input Validation**: All queries validated before processing
4. **Output Sanitization**: Responses cleaned before display

## Support

For questions or issues:
- Check example queries in each agent section
- Review the integration guide above
- Test with the curl command in Testing section
