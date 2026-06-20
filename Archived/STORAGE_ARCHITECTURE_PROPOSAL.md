# Đề Xuất Kiến Trúc Lưu Trữ Chat Cho Vercel Deployment

## 1. Tóm Tắt Hiện Tại
- **Current**: Chỉ dùng `localStorage` (client-side) - **Vấn đề: Mất dữ liệu khi clear cache**
- **Database**: Neon PostgreSQL đã kết nối nhưng chưa sync dữ liệu chat
- **Tables có sẵn**: `conversations`, `conversation_messages`, `conversation_sync_status`

## 2. Đề Xuất: Hybrid Approach (Best Practice cho Vercel)

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                             │
│  ┌──────────────────────────────────────┐                  │
│  │  localStorage (fast, offline)        │                  │
│  │  - conv_messages_${id}               │                  │
│  │  - conv_title_${id}                  │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                           ↑ Sync
                      (Every 3s)
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Backend                           │
│  ┌──────────────────────────────────────┐                  │
│  │  API Routes (/api/sync-chat)         │                  │
│  │  - Upload messages từ localStorage   │                  │
│  │  - Download lịch sử từ DB            │                  │
│  │  - Conflict resolution               │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                           ↑
┌─────────────────────────────────────────────────────────────┐
│                    Neon PostgreSQL                          │
│  ┌──────────────────────────────────────┐                  │
│  │  conversations                       │                  │
│  │  - id (uuid)                         │                  │
│  │  - user_id (uuid)                    │                  │
│  │  - title (text)                      │                  │
│  │  - last_active (timestamp)           │                  │
│  │  - created_at (timestamp)            │                  │
│  └──────────────────────────────────────┘                  │
│  ┌──────────────────────────────────────┐                  │
│  │  conversation_messages               │                  │
│  │  - id (bigint)                       │                  │
│  │  - conv_id (uuid)                    │                  │
│  │  - role (text: user/assistant)       │                  │
│  │  - content (text)                    │                  │
│  │  - created_at (timestamp)            │                  │
│  └──────────────────────────────────────┘                  │
│  ┌──────────────────────────────────────┐                  │
│  │  conversation_sync_status            │                  │
│  │  - device_id (text)                  │                  │
│  │  - conversation_id (uuid)            │                  │
│  │  - sync_status (pending/synced)      │                  │
│  │  - local_version / cloud_version     │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## 3. Flow Chi Tiết

### 3.1 Khởi Tạo / Mở Trang
```
1. Component mount
   ↓
2. fetchConversations() từ localStorage
   ↓
3. Sync với Neon: GET /api/sync-chat?action=fetch-all
   ↓
4. Merge data (localStorage priority nếu local version > cloud version)
   ↓
5. Hiển thị sidebar + messages
```

### 3.2 Gửi Message Mới
```
1. User gửi message
   ↓
2. Save vào localStorage ngay (instant UI update)
   ↓
3. Background sync: POST /api/sync-chat với:
   {
     conversationId,
     messages: [...new messages],
     device_id: uuid,
     local_version: 5
   }
   ↓
4. Server: Save vào Neon + update conversation_sync_status
   ↓
5. Return: { synced: true, cloud_version: 5 }
```

### 3.3 Mở Chat Lịch Sử
```
1. User click vào conversation cũ
   ↓
2. Local: Check localStorage['conv_messages_${id}']
   ↓
3. Nếu không có / version cũ:
   GET /api/sync-chat?convId=${id}&local_version=${version}
   ↓
4. Server trả về messages mới từ DB
   ↓
5. Merge + display
```

## 4. API Endpoints Cần Tạo

### POST /api/sync-chat
```typescript
// Request
{
  action: "sync-upload" | "fetch-all" | "fetch-one",
  conversationId?: string,
  messages?: Message[],
  device_id: string,
  local_version: number
}

// Response
{
  synced: boolean,
  conversations?: Conversation[],
  messages?: Message[],
  cloud_version: number,
  last_synced_at: timestamp
}
```

## 5. Implementation Steps

### Phase 1: API & DB (1 endpoint)
- [ ] Create POST /api/sync-chat endpoint
- [ ] Write queries: upsert messages, fetch conversations, update sync status
- [ ] Add error handling + conflict resolution

### Phase 2: Frontend Integration
- [ ] Create useChatSync() hook
- [ ] Auto-sync every 3 seconds (debounced)
- [ ] Handle offline mode gracefully
- [ ] Merge local + cloud data

### Phase 3: Testing & Deploy
- [ ] Test offline → online sync
- [ ] Test concurrent edits (conflict resolution)
- [ ] Deploy to Vercel
- [ ] Monitor sync status

## 6. Benefits

✅ **Offline Support**: App works without internet (localStorage)
✅ **Real-time Sync**: Data synced automatically to Neon
✅ **Multi-device**: User data available across devices
✅ **Permanent Storage**: No data loss on cache clear
✅ **Scalable**: Ready for future features (sharing, collaboration)
✅ **Vercel Optimized**: Uses Neon (built-in integration) + serverless functions

## 7. Security Considerations

- [ ] Add user_id validation (don't sync others' conversations)
- [ ] Implement RLS on Neon tables
- [ ] Add API rate limiting
- [ ] Encrypt sensitive data in transit (already HTTPS)
- [ ] Add audit logging for sync operations

## 8. Next Steps

1. **Implement API endpoint** (`/api/sync-chat`)
2. **Create sync hook** (`hooks/use-chat-sync.ts`)
3. **Update chat-interface.tsx** to use new sync mechanism
4. **Add conflict resolution** logic
5. **Test & deploy**
