# Page AI Insight Feature

## Overview

The **Page AI Insight** feature adds intelligent, context-aware AI analysis at the top of major feature pages (Tâm sự, Tra cứu, Sàng lọc, Điều trị). When a user is on one of these pages, the AI can:

1. **Analyze user input** - Understand questions or comments made by the user
2. **Provide smart insights** - Deliver relevant advice, clarification, or guidance
3. **Suggest page navigation** - Intelligently recommend switching to other feature pages if more relevant
4. **Make smart decisions** - The LLM decides whether to show insights (not forced)

## Architecture

### Components

- **`/components/page-ai-insight.tsx`** - Reusable React component for displaying insights
  - Shows animated card at top of page
  - Handles API communication
  - Session-based state management
  - User dismissal support

### API Endpoint

- **`/app/api/page-ai-insight/route.ts`** - Backend service
  - Uses Gemini LLM to generate insights
  - Includes safety checks (SOS detection, content blocking)
  - Returns structured JSON with decisions on visibility
  - Caches results in session

### Utilities

- **`/lib/page-insight-store.ts`** - Session cache with TTL (30 minutes)
  - Prevents duplicate API calls for same questions
  - Handles dismissed insights
  - Hash-based key generation

## Integration Points

### 1. Tâm Sự (Emotional Support) - `components/tam-su-minimal.tsx`
```tsx
<PageAiInsight
  pageContext="emotional_support"
  userQuestion={messages.length > 0 ? messages[messages.length - 1]?.role === "user" ? messages[messages.length - 1]?.content : undefined : undefined}
  conversationHistory={messages.map(m => ({ role: m.role, content: m.content }))}
/>
```

### 2. Tra Cứu (Health Knowledge) - `components/health-lookup.tsx`
```tsx
<PageAiInsight
  pageContext="health_knowledge"
  userQuestion={searchQuery}
/>
```

### 3. Sàng Lọc (Mental Health Screening) - `components/psychological-screening.tsx`
```tsx
<PageAiInsight
  pageContext="mental_health_screening"
/>
```

### 4. Điều Trị (Therapy Planning) - `components/dtx-tri-lieu.tsx`
```tsx
<PageAiInsight
  pageContext="therapy_planning"
  pageData={{ moodItems, therapyPlan }}
/>
```

## How It Works

### Page Navigation Flow

1. User navigates to a feature page (e.g., `/tam-su`)
2. `PageAiInsight` component mounts
3. Component sends request to `/api/page-ai-insight` with:
   - `page_context`: Current page identifier
   - `user_question`: User's input (if any)
   - `page_data`: Additional context (search results, form values, etc.)
   - `conversation_history`: Recent chat history

4. Backend processes request:
   - Checks for SOS keywords → triggers emergency response
   - Checks for blocked content → returns safety response
   - Calls Gemini LLM with structured prompt
   - Parses JSON response from LLM
   - Caches result

5. Frontend receives response:
   - If `show_insight = true`: Displays animated card
   - Shows main response + optional navigation suggestion
   - User can dismiss card (session-persisted)

### LLM Decision Making

The system prompt instructs the LLM to decide intelligently:

```
1. If person asks a question, answer briefly (2-3 sentences)
2. Determine if they should switch to another page
3. If yes, suggest the page with reasoning
4. If not needed, set show_insight = false
```

This means:
- ✅ Insights only appear when relevant
- ✅ Not forced to show every time
- ✅ Smart cross-page recommendations

## Response Format

The API returns structured JSON:

```json
{
  "show_insight": true,
  "main_response": "...",
  "suggested_page": "/tra-cuu",
  "suggestion_reason": "...",
  "insight_type": "advice|clarification|guidance"
}
```

## Safety Features

1. **SOS Detection** - Triggers hotline display if keywords detected
2. **Content Blocking** - Blocks harmful/inappropriate content
3. **Rate Limiting** - Per-session rate limits applied
4. **Gemini Failover** - Falls back gracefully if server unavailable

## UI/UX Design

- **Animated entry** - Slides in from top with fade effect
- **Gradient background** - Amber/orange theme for consistency
- **Icon badges** - Visual indicator of insight type (💡 advice, 🤔 clarification, 🎯 guidance)
- **Dismiss button** - Users can hide card (session-persisted)
- **Action button** - "Chuyển sang {page}" button for navigation
- **Responsive** - Full-width mobile, centered desktop

## Configuration

### Supported Page Contexts

- `emotional_support` → `/tam-su` (Tâm sự)
- `health_knowledge` → `/tra-cuu` (Tra cứu)
- `mental_health_screening` → `/sang-loc` (Sàng lọc)
- `therapy_planning` → `/tri-lieu` (Điều trị)

### Cache TTL

Default: 30 minutes per session (configurable in `/lib/page-insight-store.ts`)

## Future Enhancements

- Multi-turn conversation context
- Personalized insights based on user profile
- Analytics on insight effectiveness
- A/B testing different prompt strategies
- Caching improvements with Redis (if scaling)

## Troubleshooting

### Insights not appearing:
- Check browser console for errors
- Verify GEMINI_API_KEY is set
- Check network tab for `/api/page-ai-insight` requests

### LLM returning unparseable JSON:
- Check the `console.error('[v0]')` logs
- Fallback mechanism should handle gracefully
- Verify Gemini API is responding correctly

### High API costs:
- Cache is working (check `cached: true` in response)
- Adjust TTL in `page-insight-store.ts` if needed
- Consider fewer calls by adjusting when component fetches
