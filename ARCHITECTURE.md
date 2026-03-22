# Medical Consultation Platform - Web Architecture

## Overview

This document describes the comprehensive web application architecture for the medical consultation platform, centered around the `/tu-van` (consultation) and `/tam-su` (emotional support) sections.

## Core Architecture Components

### 1. Agent Registry & Module System (`lib/agent-registry.ts`)

**Purpose**: Centralized management of agent modules with support for both full-page and embedded rendering.

**Key Features**:
- Pre-configured agents: doctor finder, health screening, symptom checker, medication info, appointment scheduler, medical records
- Embeddable agents (can appear inline in chat) vs. non-embeddable agents
- Agent suggestion tracking and usage statistics
- Category-based filtering (diagnosis, consultation, information, scheduling, records)

**Integration Points**:
- Chat interface suggests agents based on conversation context
- Dual-link strategy: users can embed or open in new tab
- API endpoints: `/api/agents`, `/api/agents/[agentId]`

---

### 2. Device Synchronization & Data Persistence

#### Device Sync Manager (`lib/device-sync-manager.ts`)

**Purpose**: Hybrid device + login synchronization system.

**Features**:
- **Device Profile**: Each device gets a unique ID, device name, type (web/mobile/tablet)
- **Local-First Sync**: Device-based sync for anonymous users
- **Account Linking**: When user logs in, device history merges with user account
- **Sync Queue**: Tracks pending changes with timestamps for conflict resolution
- **Cross-Device Access**: Logged-in users can access chat history across all linked devices

**Database Tables**:
- `device_profiles`: Device registration and metadata
- `sync_queue`: Pending synchronization events
- `chat_messages`: Chat history linked to both device and user

**API Endpoints**:
- `POST /api/device-sync`: Register or retrieve device
- `POST /api/device-sync/link`: Link device to user on login
- `POST /api/device-sync/unlink`: Unlink device on logout
- `POST /api/device-sync/sync`: Process pending syncs
- `GET /api/device-sync/user-devices`: Get all devices for user
- `GET /api/device-sync/history`: Get device chat history

**Hook**: `useDeviceSync()` - Client-side device management

---

### 3. Agent Suggestion System for /tu-van

#### Agent Suggestion UI Components

**AgentSuggestionCard** (`components/agent-suggestion-card.tsx`)
- Displays suggested agent with reason
- Dual-action buttons: "Embed in chat" or "Open in new tab"
- Dismissal option
- Visual feedback for user selection

**EmbeddedAgentContainer** (`components/embedded-agent-container.tsx`)
- Renders agent content directly within chat
- Agent-specific content rendering (forms, lists, etc.)
- Loading and error states
- Fallback to full-page option

**Flow**:
1. Chat AI detects user needs agent assistance
2. `AgentRegistry.suggestAgent()` creates suggestion
3. UI displays `AgentSuggestionCard`
4. User chooses: embed or link
5. Selection recorded via `recordSuggestionInteraction()`

**API Endpoints**:
- `POST /api/agents`: Create suggestion
- `POST /api/agents/[agentId]`: Get embedded content
- `PUT /api/agents/[agentId]`: Record interaction

**Hook**: `useAgentSuggestions()` - Manage suggestions in chat interface

---

### 4. Content Recommendation System for /tam-su

#### Content Recommendation Service (`lib/content-recommendation-service.ts`)

**Purpose**: Emotional support through curated content (YouTube videos, music, podcasts).

**Features**:
- **Content Types**: YouTube videos, music tracks, podcasts, audiobooks, meditation
- **Mood Tags**: Categorization (calming, energizing, motivational, etc.)
- **User Feedback**: Track helpful/not helpful/saved responses
- **Popular Content**: Surface trending content by mood

**Database Tables**:
- `content_recommendations`: Recommendation metadata
- `user_feedback`: Track user interactions with content

---

#### YouTube Integration (`lib/youtube-service.ts`)

**Purpose**: Search and recommend YouTube videos for emotional support.

**Features**:
- YouTube API integration (with fallback stub data)
- Wellness video search by mood
- Video metadata extraction (title, duration, thumbnails, view count)
- URL parsing and validation

**Stub Implementation**:
- Ready for YouTube API key when configured
- Returns sample wellness content without API key
- Easy integration path: just add `YOUTUBE_API_KEY` env var

**API Endpoints**:
- `GET /api/youtube/search?query=...&maxResults=5` - Search videos
- `GET /api/youtube/search?mood=...` - Search wellness videos
- `GET /api/youtube/video?videoId=...` - Get video details
- `POST /api/youtube/video` - Extract ID from URL

**Hook**: `useYouTube()` - Client-side video management

---

#### YouTube Video Embed Component (`components/youtube-video-embed.tsx`)

**Features**:
- Thumbnail with play button
- Embedded YouTube player (on click)
- Duration display
- Feedback buttons (helpful, not helpful, saved)
- Direct YouTube link for full experience
- Context-aware recommendation reason

---

#### Content Recommendation Card (`components/content-recommendation-card.tsx`)

**Features**:
- Displays music tracks, podcasts, audiobooks, etc.
- Thumbnail preview
- Mood tags and duration
- Play/Save actions
- Integrated with content service

---

### 5. Appointment Management Service

#### Appointment Service (`lib/appointment-service.ts`)

**Features** (Stub Ready):
- Create, retrieve, and manage appointments
- Status tracking (pending, confirmed, completed, cancelled)
- Appointment statistics
- Upcoming appointments view
- Stubs for external APIs:
  - Doctor availability lookup
  - Calendar integration
  - Email/SMS notifications

**Database Tables**:
- `medical_appointments`: Appointment records with full history

---

### 6. Data Flow & Synchronization

#### Chat Message Sync

```
User Device A (Anonymous)
  ↓
  [Device Sync Manager]
  ↓
  [Sync Queue] (pending)
  ↓
  [Chat Messages] (device-specific)
  
User logs in on Device A
  ↓
  [Link Device → User] (/api/device-sync/link)
  ↓
  [Merge Device History] (history moves to user_id)
  ↓
  Device A + User Account now share history

User logs in on Device B (new device)
  ↓
  [Register Device B]
  ↓
  [Link to Same User]
  ↓
  [Merge Device B history to user]
  ↓
  User can see all history from Device A & B
  ↓
  [Bi-directional sync every 30s] (via useDeviceSync hook)
```

#### Agent Suggestion & Selection

```
Chat Flow:
1. User message → AI processing
2. AI detects need for agent
3. AgentRegistry.suggestAgent() → DB record
4. AgentSuggestionCard displayed
5. User selects: embed or link
6. recordInteraction() → DB update
7. If embed: EmbeddedAgentContainer loads content
   If link: window.open(agent.route)
8. Track usage stats via AgentRegistry
```

#### Content Recommendation Flow (Tam-Su)

```
Chat Flow:
1. User expresses emotional need
2. AI suggests mood-based content
3. contentRecommendationService.recommendYouTubeVideo()
4. YouTubeVideoEmbed component rendered
5. User can: play, save, or dismiss
6. recordFeedback() → DB update
7. Popular content rankings updated
```

---

## Hooks & Client-Side Integration

### useDeviceSync()
- Initialize device ID and profile
- Link/unlink user accounts
- Manage periodic synchronization
- Access chat history

### useAgentSuggestions()
- Get available agents
- Create suggestions
- Record user interactions
- Track agent usage

### useContentRecommendations()
- Fetch recommendations for conversation
- Recommend YouTube videos
- Recommend music tracks
- Record user feedback

### useYouTube()
- Search videos by query
- Search wellness videos by mood
- Get video details
- Extract video IDs from URLs

---

## API Routes Summary

### Device Sync
- `POST /api/device-sync` - Register device
- `POST /api/device-sync/link` - Link to user
- `POST /api/device-sync/unlink` - Unlink from user
- `POST /api/device-sync/sync` - Sync pending changes
- `GET /api/device-sync/history` - Get device history
- `GET /api/device-sync/user-devices` - Get all user devices

### Agents
- `GET /api/agents` - Get all agents
- `POST /api/agents` - Create suggestion
- `POST /api/agents/[agentId]` - Get embedded content
- `PUT /api/agents/[agentId]` - Record interaction

### Content Recommendations
- `GET /api/content-recommendations` - Get recommendations
- `POST /api/content-recommendations` - Create recommendation
- `POST /api/content-recommendations/feedback` - Record feedback

### YouTube
- `GET /api/youtube/search` - Search videos
- `GET /api/youtube/video` - Get video details
- `POST /api/youtube/video` - Extract ID from URL

---

## Database Schema Overview

### Core Tables

**device_profiles**
```sql
- device_id (PK, UUID)
- device_name (string)
- device_type (enum: web, mobile, tablet)
- user_id (FK, nullable)
- last_synced (timestamp)
- is_active (boolean)
- created_at, updated_at
```

**sync_queue**
```sql
- id (PK)
- device_id (FK)
- user_id (FK, nullable)
- entity_type (enum)
- entity_id (string)
- action (enum: create, update, delete)
- device_timestamp (timestamp)
- synced_at (timestamp, nullable)
```

**agent_suggestions**
```sql
- id (PK)
- conversation_id (FK)
- agent_id (string)
- reason (text)
- suggested_at (timestamp)
- user_selected (enum: embed, link, ignored, nullable)
```

**content_recommendations**
```sql
- id (PK)
- conversation_id (FK)
- content_type (enum)
- external_id (string)
- title, description, url (strings)
- mood_tags (JSONB array)
- recommended_at (timestamp)
- user_feedback (enum: helpful, not_helpful, saved, nullable)
```

**medical_appointments**
```sql
- id (PK)
- user_id (FK, nullable)
- device_id (FK)
- doctor_name, specialist_type (strings)
- appointment_date, appointment_time (timestamp, time)
- reason, notes (text)
- status (enum: pending, confirmed, completed, cancelled)
- created_at, updated_at
```

---

## Future Enhancements

1. **Music Service Integration**
   - Spotify/Apple Music API integration
   - Music recommendation algorithm
   - Mood-based playlists

2. **Audiobook & Activity Tracking**
   - Audiobook library integration
   - User activity history
   - Engagement metrics

3. **Medical Professional Appointments**
   - Doctor profile database
   - Availability calendar
   - Appointment reminders
   - Notification system

4. **Advanced Sync Features**
   - Conflict resolution for concurrent edits
   - End-to-end encryption for sensitive data
   - Offline mode with eventual consistency
   - Batch sync optimization

5. **Analytics & Insights**
   - Agent usage trends
   - Content recommendation effectiveness
   - User engagement dashboards
   - Wellness tracking

---

## Configuration & Environment Variables

**Required for Full Functionality**:
```env
DATABASE_URL=postgresql://...
YOUTUBE_API_KEY=your_api_key (optional, stubs work without)
```

**Optional for Integrations**:
```env
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
```

---

## Security Considerations

1. **Data Privacy**: Device IDs and user links properly isolated
2. **Session Management**: Device unlink on logout prevents unintended sync
3. **API Security**: All endpoints validate required parameters
4. **RLS (Row Level Security)**: Implement per-user data access controls
5. **Rate Limiting**: Consider implementing rate limits on sync endpoints

---

## Implementation Checklist

- [x] Database schema and migrations
- [x] Device sync manager and API
- [x] Agent registry system
- [x] Agent suggestion UI components
- [x] YouTube service and integration
- [x] Content recommendation service
- [x] Client-side hooks (useDeviceSync, useAgentSuggestions, etc.)
- [x] API endpoints for all services
- [ ] Integration into existing chat interface
- [ ] Integration into existing tam-su page
- [ ] User authentication flow updates
- [ ] Testing and QA
- [ ] Documentation and user guides

---

## Integration Steps

### 1. Chat Interface Integration
Add `useDeviceSync()` and `useAgentSuggestions()` to chat interface to enable agent suggestions.

### 2. Tam-Su Page Enhancement
Integrate `useYouTube()` and `useContentRecommendations()` for emotional support content.

### 3. Authentication Flow Updates
- On login: `linkDeviceToUser()` 
- On logout: `unlinkDevice()`

### 4. Periodic Sync
- Initialize `useDeviceSync()` on app load
- Automatic sync every 30 seconds in background

---

## Example Usage

### Device Sync
```typescript
const { device, linkDeviceToUser, getChatHistory } = useDeviceSync()

// On login
await linkDeviceToUser(userId)

// Get chat history
const messages = await getChatHistory(50)
```

### Agent Suggestions
```typescript
const { suggestAgent, selectAgentForEmbedding } = useAgentSuggestions()

// Suggest a doctor finder agent
await suggestAgent(conversationId, 'doctor_finder', 'User asked about finding specialists')

// User clicks embed
await selectAgentForEmbedding(doctorAgent, suggestionId)
```

### YouTube Videos
```typescript
const { searchByMood, videos } = useYouTube()

// Search wellness videos
await searchByMood('relaxation', 5)

// Render videos
videos.forEach(video => <YouTubeVideoEmbed {...video} />)
```
