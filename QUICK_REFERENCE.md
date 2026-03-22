# Quick Reference Guide - Medical Consultation Platform Architecture

## What Was Built

A complete web application architecture with:
- **Device Synchronization**: Chat history synced across devices and user accounts
- **Agent Module System**: Doctor finder, health screening, symptom checker, etc.
- **Dual-Link Strategy**: Users can embed agents in chat or open in new tabs
- **YouTube Integration**: Embed wellness videos directly in emotional support chat
- **Content Recommendations**: Music, podcasts, audiobooks for emotional support
- **Appointment Management**: Schedule appointments with medical professionals

## File Locations

### Core Services
```
lib/
  ├── device-sync-manager.ts          # Device & account synchronization
  ├── agent-registry.ts                # Agent module management
  ├── content-recommendation-service.ts # Content (YouTube, music, podcasts)
  ├── youtube-service.ts               # YouTube API integration
  └── appointment-service.ts           # Medical appointments
```

### UI Components
```
components/
  ├── agent-suggestion-card.tsx        # Agent recommendation UI
  ├── embedded-agent-container.tsx     # Inline agent rendering
  ├── youtube-video-embed.tsx          # Embedded YouTube player
  └── content-recommendation-card.tsx  # Content recommendation cards
```

### React Hooks
```
hooks/
  ├── use-device-sync.ts               # Device synchronization
  ├── use-agent-suggestions.ts         # Agent suggestion management
  ├── use-content-recommendations.ts   # Content recommendations
  └── use-youtube.ts                   # YouTube integration
```

### API Routes
```
app/api/
  ├── agents/                          # Agent management & suggestions
  ├── device-sync/                     # Device & account linking
  │   ├── link/                        # Link device to user on login
  │   ├── unlink/                      # Unlink device on logout
  │   ├── sync/                        # Process pending syncs
  │   └── user-devices/                # Get user's devices
  ├── content-recommendations/         # Content suggestions & feedback
  └── youtube/                         # YouTube search & details
```

### Database
```
scripts/
  └── 01-sync-infrastructure.sql      # 10 new tables for sync system
```

## Key Concepts

### Device Sync Flow
```
Anonymous User Device A
  ↓ (chat history stored by device_id)
  [device_profiles, sync_queue tables]
  ↓
User logs in on Device A
  ↓ (call /api/device-sync/link)
  Device history merges with user account
  ↓
User logs in on Device B
  ↓ (new device, same user)
  Device B history also merges
  ↓
User sees consolidated history across all devices
```

### Agent Suggestion Flow
```
Chat AI detects user needs agent help
  ↓
AgentRegistry.suggestAgent()
  ↓
AgentSuggestionCard displays
  ↓
User chooses: Embed or Link
  ↓
recordInteraction() saves choice
  ↓
Track usage statistics
```

### Content Recommendation Flow (Tam-Su)
```
User mentions emotional need
  ↓
contentRecommendationService.recommendYouTubeVideo()
  ↓
YouTubeVideoEmbed renders inline
  ↓
User can: Play, Save, or Dismiss
  ↓
recordFeedback() updates recommendations
```

## Quick Integration Examples

### Initialize Device Sync
```typescript
import { useDeviceSync } from '@/hooks/use-device-sync'

function MyComponent() {
  const { device, deviceId } = useDeviceSync()
  // Device syncing starts automatically
}
```

### Suggest an Agent
```typescript
import { useAgentSuggestions } from '@/hooks/use-agent-suggestions'

const { suggestAgent } = useAgentSuggestions()
await suggestAgent(conversationId, 'doctor_finder', 'User asked about specialists')
```

### Recommend YouTube Video
```typescript
import { useContentRecommendations } from '@/hooks/use-content-recommendations'

const { recommendYouTubeVideo } = useContentRecommendations()
await recommendYouTubeVideo(
  conversationId,
  'dQw4w9WgXcQ',
  'Relaxing Music Video',
  'Calming background music',
  'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  600,
  'To help you relax and reduce stress',
  ['calming', 'stress-relief']
)
```

### Link Device to User (On Login)
```typescript
const { linkDeviceToUser } = useDeviceSync()
await linkDeviceToUser(userId)
```

### Unlink Device from User (On Logout)
```typescript
const { unlinkDevice } = useDeviceSync()
await unlinkDevice()
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `device_profiles` | Device registration & metadata |
| `sync_queue` | Pending synchronization events |
| `agent_suggestions` | Agent recommendations & interactions |
| `content_recommendations` | Content (YouTube, music, etc.) |
| `medical_appointments` | Appointment scheduling |

## API Endpoints Reference

### Device Sync
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/device-sync` | Register device |
| POST | `/api/device-sync/link` | Link to user on login |
| POST | `/api/device-sync/unlink` | Unlink on logout |
| POST | `/api/device-sync/sync` | Sync pending changes |
| GET | `/api/device-sync/history` | Get device chat history |

### Agents
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/agents` | List all agents |
| POST | `/api/agents` | Create suggestion |
| POST | `/api/agents/[agentId]` | Get embedded content |

### Content
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/content-recommendations` | Get recommendations |
| POST | `/api/content-recommendations` | Create recommendation |
| POST | `/api/content-recommendations/feedback` | Record feedback |

### YouTube
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/youtube/search` | Search videos |
| GET | `/api/youtube/video` | Get video details |
| POST | `/api/youtube/video` | Extract ID from URL |

## Available Agents

1. **doctor_finder** - Find and connect with specialists
2. **health_screening** - Comprehensive health checks
3. **symptom_checker** - Analyze symptoms and diagnose
4. **medication_info** - Detailed medication information
5. **appointment_scheduler** - Book appointments
6. **medical_records** - View and manage health records

## Environment Configuration

No additional environment variables required to use stubs.

**Optional for Full Functionality**:
```env
YOUTUBE_API_KEY=your_youtube_api_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

## Content Types Supported

- `youtube_video` - YouTube videos
- `music_track` - Spotify/Apple Music tracks
- `podcast` - Podcast episodes
- `audiobook` - Audiobook chapters
- `meditation` - Meditation guides

## Mood Tags Examples

- `calming` - Reduces anxiety and stress
- `energizing` - Boosts energy and motivation
- `motivational` - Inspiring and uplifting
- `sleep` - Helps with sleep and relaxation
- `focus` - Improves concentration
- `happiness` - Promotes positive mood

## Integration Checklist

- [ ] Read `ARCHITECTURE.md` for detailed overview
- [ ] Import `useDeviceSync()` in main layout/app
- [ ] Add `useAgentSuggestions()` to chat component
- [ ] Add device link/unlink to auth flow
- [ ] Import components into tam-su page
- [ ] Add YouTube search to emotional support
- [ ] Test device sync across browsers
- [ ] Add YouTube API key (optional)
- [ ] Monitor API logs for errors
- [ ] Gather user feedback on features

## Common Patterns

### Check if Device is Linked to User
```typescript
const { device } = useDeviceSync()
if (device?.user_id) {
  // Device is linked to user account
}
```

### Get All User's Devices
```typescript
const response = await fetch(`/api/device-sync/user-devices?userId=${userId}`)
const devices = await response.json()
```

### Track Agent Selection
```typescript
const { recordInteraction } = useAgentSuggestions()
await recordInteraction(suggestionId, 'embed') // or 'link' or 'ignored'
```

### Search YouTube by Mood
```typescript
const { searchByMood } = useYouTube()
const videos = await searchByMood('relaxation', 5)
```

## Troubleshooting

### Device Not Syncing
- Check `localStorage` for `v0_device_id`
- Verify `/api/device-sync` returns 200 status
- Check database connection

### Agent Suggestions Not Appearing
- Ensure agent IDs are valid (see Available Agents list)
- Check if agent is embeddable (`embeddable: true`)
- Verify API endpoint returns data

### YouTube Videos Not Loading
- Check `YOUTUBE_API_KEY` if configured
- Verify video IDs are valid (11 characters)
- Check network requests in browser console

## Performance Tips

- Implement pagination for large agent/content lists
- Cache YouTube search results (30+ minute TTL)
- Use periodic sync (useDeviceSync does 30s by default)
- Implement lazy loading for embedded agents

## Security Notes

- Device IDs are not cryptographically secure - use for UX only
- Always validate user_id in backend before trusting
- Implement RLS policies in PostgreSQL for data isolation
- Don't expose API keys in frontend code

## Future Enhancements

- Multi-language support
- Real-time sync via WebSockets
- Offline mode with eventual consistency
- End-to-end encryption for sensitive data
- Advanced conflict resolution
- User activity analytics

## Support Resources

- **Full Architecture**: See `ARCHITECTURE.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`
- **This Quick Reference**: `QUICK_REFERENCE.md`

For detailed examples and integration patterns, refer to `ARCHITECTURE.md`.
