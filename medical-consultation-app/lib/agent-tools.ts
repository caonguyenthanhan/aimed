import type { AgentAction, EmbeddableFeatureId } from "@/lib/agent-actions"

export type AgentToolCall = { name: string; args: any }

// Danh sách các feature có thể embed
const EMBEDDABLE_FEATURES = ["sang-loc", "tri-lieu", "tra-cuu", "bac-si", "ke-hoach", "thong-ke"]

export function geminiToolDeclarations() {
  return [
    // Navigation tools
    {
      name: "navigate",
      description: "Điều hướng UI sang một trang trong ứng dụng (path bắt đầu bằng /). Dùng khi người dùng muốn mở trang mới.",
      parameters: {
        type: "OBJECT",
        properties: {
          path: { type: "STRING", description: "Đường dẫn nội bộ, ví dụ /sang-loc, /tri-lieu, /bac-si" },
        },
        required: ["path"],
      },
    },
    
    // Embed tool - nhúng mini component vào chat
    {
      name: "embed",
      description: "Nhúng một tính năng mini vào khung chat. Phù hợp khi người dùng muốn thao tác nhanh mà không rời khỏi cuộc trò chuyện.",
      parameters: {
        type: "OBJECT",
        properties: {
          feature: { 
            type: "STRING", 
            description: `Tính năng cần embed: ${EMBEDDABLE_FEATURES.join(", ")}`,
            enum: EMBEDDABLE_FEATURES
          },
          context: { 
            type: "OBJECT", 
            description: "Dữ liệu context truyền vào component (optional)" 
          },
        },
        required: ["feature"],
      },
    },
    
    // Ask navigation - hỏi người dùng muốn embed hay navigate
    {
      name: "ask_navigation",
      description: "Hỏi người dùng muốn mở tính năng ngay trong chat (embed) hay mở trang đầy đủ (navigate). LUÔN dùng tool này thay vì tự ý navigate/embed.",
      parameters: {
        type: "OBJECT",
        properties: {
          feature: { 
            type: "STRING", 
            description: `Tính năng gợi ý: ${EMBEDDABLE_FEATURES.join(", ")}`,
            enum: EMBEDDABLE_FEATURES
          },
          reason: { 
            type: "STRING", 
            description: "Lý do gợi ý tính năng này cho người dùng" 
          },
          context: { 
            type: "OBJECT", 
            description: "Dữ liệu context (optional)" 
          },
        },
        required: ["feature", "reason"],
      },
    },
    
    // Music tools - cho Tâm sự
    {
      name: "play_music",
      description: "Phát nhạc YouTube ngay trong chat. Dùng cho trị liệu âm nhạc, thư giãn trong mode Tâm sự.",
      parameters: {
        type: "OBJECT",
        properties: {
          videoId: { type: "STRING", description: "YouTube video ID (11 ký tự)" },
          title: { type: "STRING", description: "Tên bài hát/video" },
          artist: { type: "STRING", description: "Tên nghệ sĩ (optional)" },
          autoplay: { type: "BOOLEAN", description: "Tự động phát (default: true)" },
        },
        required: ["videoId", "title"],
      },
    },
    
    {
      name: "recommend_music",
      description: "Gợi ý danh sách nhạc healing/thư giãn. Hiển thị cards để người dùng chọn và phát.",
      parameters: {
        type: "OBJECT",
        properties: {
          mood: { 
            type: "STRING", 
            description: "Tâm trạng/mục đích: calm, uplifting, meditation, sleep, focus" 
          },
          message: { 
            type: "STRING", 
            description: "Tin nhắn đi kèm gợi ý nhạc" 
          },
          recommendations: {
            type: "ARRAY",
            description: "Danh sách nhạc gợi ý",
            items: {
              type: "OBJECT",
              properties: {
                videoId: { type: "STRING" },
                title: { type: "STRING" },
                artist: { type: "STRING" },
                thumbnail: { type: "STRING" },
                duration: { type: "STRING" },
                mood: { type: "STRING" },
              },
              required: ["videoId", "title"],
            },
          },
        },
        required: ["recommendations"],
      },
    },
    
    // TTS tool
    {
      name: "speak",
      description: "Đọc to (TTS) một đoạn văn bản ngắn cho người dùng.",
      parameters: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING", description: "Nội dung cần đọc to" },
        },
        required: ["text"],
      },
    },
    
    // Legacy tools - giữ lại để backward compatible
    {
      name: "open_screening",
      description: "[Legacy] Mở trang sàng lọc tâm lý. Ưu tiên dùng ask_navigation thay thế.",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "open_therapy",
      description: "[Legacy] Mở trang trị liệu. Ưu tiên dùng ask_navigation thay thế.",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "open_reminders",
      description: "[Legacy] Mở trang nhắc nhở. Ưu tiên dùng ask_navigation thay thế.",
      parameters: { type: "OBJECT", properties: {} },
    },
  ]
}

export function toolCallsToActions(calls: AgentToolCall[]): AgentAction[] {
  const out: AgentAction[] = []
  for (const c of calls) {
    const name = String(c?.name || "").trim()
    if (!name) continue
    
    // Navigate action
    if (name === "navigate") {
      out.push({ type: "navigate", args: { path: String(c?.args?.path || "").trim() } } as any)
      continue
    }
    
    // Embed action - nhúng mini component vào chat
    if (name === "embed") {
      const feature = String(c?.args?.feature || "").trim()
      if (EMBEDDABLE_FEATURES.includes(feature)) {
        out.push({ 
          type: "embed", 
          args: { 
            feature: feature as EmbeddableFeatureId, 
            context: c?.args?.context || {} 
          } 
        } as any)
      }
      continue
    }
    
    // Ask navigation - hỏi người dùng muốn embed hay navigate
    if (name === "ask_navigation") {
      const feature = String(c?.args?.feature || "").trim()
      if (EMBEDDABLE_FEATURES.includes(feature)) {
        out.push({ 
          type: "ask_navigation", 
          args: { 
            feature: feature as EmbeddableFeatureId, 
            reason: String(c?.args?.reason || "").trim() || "Bạn có muốn sử dụng tính năng này?",
            context: c?.args?.context || {} 
          } 
        } as any)
      }
      continue
    }
    
    // Play music - phát nhạc YouTube
    if (name === "play_music") {
      const videoId = String(c?.args?.videoId || "").trim()
      const title = String(c?.args?.title || "").trim()
      if (videoId && title) {
        out.push({ 
          type: "play_music", 
          args: { 
            videoId, 
            title,
            artist: c?.args?.artist ? String(c.args.artist).trim() : undefined,
            autoplay: c?.args?.autoplay !== false
          } 
        } as any)
      }
      continue
    }
    
    // Recommend music - gợi ý danh sách nhạc
    if (name === "recommend_music") {
      const recommendations = Array.isArray(c?.args?.recommendations) 
        ? c.args.recommendations.filter((r: any) => r?.videoId && r?.title)
        : []
      if (recommendations.length > 0) {
        out.push({ 
          type: "recommend_music", 
          args: { 
            recommendations: recommendations.map((r: any) => ({
              videoId: String(r.videoId).trim(),
              title: String(r.title).trim(),
              artist: r.artist ? String(r.artist).trim() : undefined,
              thumbnail: r.thumbnail ? String(r.thumbnail).trim() : undefined,
              duration: r.duration ? String(r.duration).trim() : undefined,
              mood: r.mood ? String(r.mood).trim() : undefined,
            })),
            mood: c?.args?.mood ? String(c.args.mood).trim() : undefined,
            message: c?.args?.message ? String(c.args.message).trim() : undefined,
          } 
        } as any)
      }
      continue
    }
    
    // Speak action (TTS)
    if (name === "speak") {
      out.push({ type: "speak", args: { text: String(c?.args?.text || "").trim() } } as any)
      continue
    }
    
    // Legacy actions - convert to ask_navigation để hỏi người dùng
    if (name === "open_screening") {
      out.push({ type: "ask_navigation", args: { feature: "sang-loc" as EmbeddableFeatureId, reason: "Bạn có muốn làm bài sàng lọc tâm lý?" } } as any)
      continue
    }
    if (name === "open_therapy") {
      out.push({ type: "ask_navigation", args: { feature: "tri-lieu" as EmbeddableFeatureId, reason: "Bạn có muốn thử các bài tập trị liệu?" } } as any)
      continue
    }
    if (name === "open_reminders") {
      out.push({ type: "navigate", args: { path: "/nhac-nho" } } as any)
      continue
    }
  }
  return out
}
