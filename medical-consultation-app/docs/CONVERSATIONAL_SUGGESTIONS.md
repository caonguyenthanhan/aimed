# Conversational Agent Suggestions Guide

## Overview

Instead of forcing users to switch pages when they mention specific symptoms or concerns, the conversational suggestion system **asks clarifying questions first** to understand user needs better, then offers relevant options. This creates a more natural, less intrusive user experience.

## How It Works

### 1. User asks or mentions something relevant
```
User: "Tôi cảm thấy lo về báo cáo ngày mai" (I feel anxious about the report tomorrow)
```

### 2. System asks clarifying questions
```
AI: "Bạn có muốn kiểm tra sức khỏe toàn diện không?" (Would you like a health check?)
   [Có] [Không]
```

### 3. After user responds, show relevant options
```
AI: "Tại sao: Sàng lọc sức khỏe có thể giúp bạn hiểu rõ hơn về tình trạng hiện tại"
   [📊 Sàng lọc ngay trong chat]
   [🔗 Mở trang sàng lọc đầy đủ]
   [✕ Không cần, cảm ơn]
```

## Key Features

✅ **Non-Intrusive**: Asks before suggesting  
✅ **User-Driven**: Let's users make informed choices  
✅ **Contextual**: Questions match user's concern  
✅ **Flexible**: Dual-action options (embed or open in tab)  
✅ **Progressive**: Multiple questions before showing options  

## Component Structure

### `ConversationalAgentSuggestion` Component

```typescript
interface ConversationalAgentSuggestion {
  agent: Agent                    // Which agent to suggest
  clarifyingQuestions: string[]   // Questions to ask first
  suggestedActions: Array<{       // Actions after questions
    id: string
    label: string
    description: string
  }>
  reason?: string                 // Why this agent helps
}
```

### Usage in Chat Component

```typescript
import { ConversationalAgentSuggestion } from '@/components/conversational-agent-suggestion'
import { useConversationalSuggestions } from '@/hooks/use-conversational-suggestions'

export function ChatInterface() {
  const { suggestions, suggestAgent, dismissSuggestion, handleSuggestionAction } 
    = useConversationalSuggestions()

  // Render suggestions
  return (
    <div className="space-y-4">
      {suggestions.map((s) => (
        <ConversationalAgentSuggestion
          key={s.id}
          suggestion={s.suggestion}
          suggestionId={s.id}
          onDismiss={() => dismissSuggestion(s.id)}
          onSelected={(actionId, responses) =>
            handleSuggestionAction(s.id, actionId, responses)
          }
        />
      ))}
    </div>
  )
}
```

## Available Suggestion Templates

### 1. Anxiety/Worry Concern
**Template Key**: `anxiety_concern`
```typescript
suggestAgent('anxiety_concern')
```

**Questions**:
- "Bạn có muốn kiểm tra sức khỏe toàn diện không?"
- "Liệu bạn có quan tâm đến việc tìm hiểu thêm về chiến lược quản lý lo âu?"

**Actions**:
- Sàng lọc ngay trong chat
- Mở trang sàng lọc đầy đủ
- Không cần, cảm ơn

---

### 2. Symptom Description
**Template Key**: `symptom_description`
```typescript
suggestAgent('symptom_description')
```

**Questions**:
- "Bạn có muốn phân tích chi tiết các triệu chứng của mình không?"

**Actions**:
- Phân tích triệu chứng ngay
- Xem công cụ đầy đủ

---

### 3. Doctor Consultation Needed
**Template Key**: `consultation_needed`
```typescript
suggestAgent('consultation_needed')
```

**Questions**:
- "Bạn có muốn tìm bác sĩ chuyên khoa phù hợp không?"
- "Bạn có muốn đặt lịch hẹn ngay hôm nay không?"

**Actions**:
- Tìm bác sĩ trong chat
- Mở công cụ tìm bác sĩ

---

### 4. Medication Inquiry
**Template Key**: `medication_inquiry`
```typescript
suggestAgent('medication_inquiry')
```

**Questions**:
- "Bạn muốn tìm hiểu chi tiết về một loại thuốc cụ thể không?"

**Actions**:
- Tìm thông tin thuốc
- Mở công cụ đầy đủ

---

### 5. Appointment Needed
**Template Key**: `appointment_needed`
```typescript
suggestAgent('appointment_needed')
```

**Questions**:
- "Bạn muốn đặt lịch hẹn với bác sĩ không?"
- "Bạn có ưu tiên thời gian nào không?"

**Actions**:
- Đặt lịch hẹn ngay
- Xem lịch hẹn

---

## Custom Suggestions

You can create custom suggestions beyond the templates:

```typescript
const { suggestAgent } = useConversationalSuggestions()

// Custom suggestion
suggestAgent('anxiety_concern', {
  reason: 'Tùy chỉnh: Hãy xem xét các tùy chọn dưới đây',
  clarifyingQuestions: [
    'Điều gì đang làm bạn lo lắng nhất?',
    'Bạn đã cố gắng quản lý stress bằng cách nào?',
  ],
  suggestedActions: [
    {
      id: 'meditation',
      label: 'Hướng dẫn Thiền định',
      description: 'Học kỹ thuật thư giãn',
    },
    {
      id: 'expert',
      label: 'Tư vấn Chuyên gia',
      description: 'Nói chuyện với chuyên gia tâm lý',
    },
  ],
})
```

## Integration with Chat AI

When the AI detects certain keywords or user concerns, it should trigger appropriate suggestions:

```typescript
// In your chat response handler
async function handleChatResponse(userMessage: string) {
  // ... get AI response ...
  
  // Detect concerns and suggest agents
  if (userMessage.includes('lo') || userMessage.includes('cảm thấy lo')) {
    suggestAgent('anxiety_concern')
  }
  
  if (userMessage.includes('triệu chứng') || userMessage.includes('đau')) {
    suggestAgent('symptom_description')
  }
  
  if (userMessage.includes('bác sĩ') || userMessage.includes('tư vấn')) {
    suggestAgent('consultation_needed')
  }
  
  if (userMessage.includes('thuốc') || userMessage.includes('medication')) {
    suggestAgent('medication_inquiry')
  }
}
```

## User Experience Flow

```
┌─────────────────────────────────────────┐
│ User sends message with concern keyword │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ AI detects and triggers suggestion      │
└──────────────┬──────────────────────────┘
               ↓
     ┌─────────────────────┐
     │ Show clarifying     │
     │ question (Question 1)
     └──────────┬──────────┘
                ↓
         ┌──────────────┐
         │ [Có] [Không] │
         └──────┬───────┘
                ↓
        ┌───────────────┐
        │ More questions?
        └───┬───────┬───┘
            ↓       ↓
          Yes      No
            ↓       ↓
         Q2...  Show Options
                 ↓
        ┌──────────────────┐
        │ [Action 1]       │
        │ [Action 2]       │
        │ [Skip/Dismiss]   │
        └──────┬───────────┘
               ↓
        ┌─────────────────┐
        │ Execute chosen  │
        │ action & log    │
        └─────────────────┘
```

## Styling

The component uses Tailwind CSS with these color schemes:

- **Asking Questions** (Amber): `bg-amber-50 dark:bg-amber-950 border-amber-200`
- **Showing Options** (Green): `bg-green-50 dark:bg-green-950 border-green-200`
- **Progress Indicator**: Filled bars show question progress

## Analytics & Tracking

Each interaction is logged:

```typescript
console.log('[v0] Suggestion action:', {
  suggestionId,      // Unique suggestion ID
  actionId,          // Which action was selected
  userResponses,     // User's answers to questions
  agent: agent.id,   // Which agent was suggested
})
```

You can extend this to send to your analytics backend:

```typescript
const handleSuggestionAction = useCallback(async (id, action, responses) => {
  // Send to analytics
  await fetch('/api/analytics/suggestion-interaction', {
    method: 'POST',
    body: JSON.stringify({
      suggestionId: id,
      actionId: action,
      userResponses: responses,
      timestamp: new Date(),
    }),
  })
}, [])
```

## Benefits vs. Forced Navigation

| Aspect | Conversational | Force Navigate |
|--------|----------------|---|
| User Experience | Natural, asking first | Intrusive, pushy |
| Control | User decides | System decides |
| Questions Answered | Get feedback | No feedback |
| Engagement | Higher (user involvement) | Lower (user frustrated) |
| Data | Collect user preferences | Limited data |
| Accessibility | Better (clear flow) | May confuse users |

## Implementation Checklist

- [ ] Import `useConversationalSuggestions` in chat component
- [ ] Render `ConversationalAgentSuggestion` components in conversation flow
- [ ] Add keyword detection to trigger suggestions
- [ ] Map user message keywords to suggestion templates
- [ ] Test question flow and action selection
- [ ] Style to match your chat UI theme
- [ ] Add analytics tracking
- [ ] Test on mobile and desktop
- [ ] Gather user feedback on experience

## Future Enhancements

1. **ML-based Suggestion**: Train model to predict best suggestions
2. **User Preferences**: Remember which suggestions users prefer
3. **Context Awareness**: Use conversation history for better suggestions
4. **A/B Testing**: Test different question phrasings
5. **Multi-language**: Support more languages with cultural adaptations
6. **Personalization**: Tailor questions based on user profile
