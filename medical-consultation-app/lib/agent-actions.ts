import { z } from "zod"
import { ChatDeliveryMessageSchema, ChatDeliverySchema } from "@/lib/chat-delivery-schema"

// Embeddable feature IDs - các tính năng có thể nhúng vào chat
export const EmbeddableFeatureId = z.enum([
  "sang-loc",      // Sàng lọc tâm lý
  "tri-lieu",      // Trị liệu/bài tập thư giãn
  "tra-cuu",       // Tra cứu thuốc/bệnh
  "bac-si",        // Tìm/đặt lịch bác sĩ
  "ke-hoach",      // Kế hoạch chăm sóc
  "thong-ke",      // Thống kê sức khỏe
])
export type EmbeddableFeatureId = z.infer<typeof EmbeddableFeatureId>

// YouTube music recommendation
export const MusicRecommendationSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  artist: z.string().optional(),
  thumbnail: z.string().optional(),
  duration: z.string().optional(),
  mood: z.enum(["calm", "uplifting", "meditation", "sleep", "focus"]).optional(),
})
export type MusicRecommendation = z.infer<typeof MusicRecommendationSchema>

export const AgentActionSchema = z.discriminatedUnion("type", [
  // Navigate - chuyển hướng đến trang khác
  z.object({
    type: z.literal("navigate"),
    args: z.object({
      path: z.string().min(1),
    }),
  }),
  // Speak - nói/hiển thị text
  z.object({
    type: z.literal("speak"),
    args: z.object({
      text: z.string().min(1),
    }),
  }),
  // Embed - nhúng mini component vào chat
  z.object({
    type: z.literal("embed"),
    args: z.object({
      feature: EmbeddableFeatureId,
      context: z.record(z.any()).optional(), // Dữ liệu context để truyền vào component
    }),
  }),
  // Ask Navigation - hỏi người dùng muốn nhúng hay mở trang mới
  z.object({
    type: z.literal("ask_navigation"),
    args: z.object({
      feature: EmbeddableFeatureId,
      reason: z.string(), // Lý do gợi ý tính năng này
      context: z.record(z.any()).optional(),
    }),
  }),
  // Play Music - phát nhạc YouTube ngay trong chat (cho Tâm sự)
  z.object({
    type: z.literal("play_music"),
    args: z.object({
      videoId: z.string(),
      title: z.string(),
      artist: z.string().optional(),
      autoplay: z.boolean().optional(),
    }),
  }),
  // Recommend Music - gợi ý danh sách nhạc (cho Tâm sự)
  z.object({
    type: z.literal("recommend_music"),
    args: z.object({
      recommendations: z.array(MusicRecommendationSchema),
      mood: z.string().optional(),
      message: z.string().optional(),
    }),
  }),
  // Legacy actions - giữ lại để backward compatible
  z.object({
    type: z.literal("open_screening"),
    args: z.object({}).optional(),
  }),
  z.object({
    type: z.literal("open_therapy"),
    args: z.object({}).optional(),
  }),
  z.object({
    type: z.literal("open_reminders"),
    args: z.object({}).optional(),
  }),
])

export type AgentAction = z.infer<typeof AgentActionSchema>

export const AgentResponseSchema = z
  .object({
    response: z.string(),
    messages: z.array(ChatDeliveryMessageSchema).optional(),
    delivery: ChatDeliverySchema.optional(),
    actions: z.array(AgentActionSchema).optional(),
    metadata: z.record(z.any()).optional(),
    conversation_id: z.string().optional(),
  })
  .passthrough()

export type AgentResponse = z.infer<typeof AgentResponseSchema>

export function normalizeActions(raw: unknown): AgentAction[] {
  if (!raw) return []
  const parsed = z.array(AgentActionSchema).safeParse(raw)
  return parsed.success ? parsed.data : []
}

export function isAllowedPath(path: string) {
  const p = String(path || "").trim()
  if (!p.startsWith("/")) return false
  const allowPrefixes = [
    "/sang-loc",
    "/tri-lieu",
    "/nhac-nho",
    "/tin-tuc-y-khoa",
    "/tam-su",
    "/tu-van",
    "/bac-si",
    "/doctor",
    "/ke-hoach",
    "/tra-cuu",
    "/thong-ke",
  ]
  return allowPrefixes.some((pre) => p === pre || p.startsWith(`${pre}/`))
}

// Feature metadata for embeddable components
export const EMBEDDABLE_FEATURES: Record<EmbeddableFeatureId, {
  name: string
  description: string
  path: string
  icon: string
}> = {
  "sang-loc": {
    name: "Sàng lọc tâm lý",
    description: "Đánh giá sức khỏe tâm thần với các bài test chuẩn",
    path: "/sang-loc",
    icon: "clipboard-check",
  },
  "tri-lieu": {
    name: "Trị liệu",
    description: "Bài tập thư giãn, thiền định và kỹ thuật giảm stress",
    path: "/tri-lieu",
    icon: "heart-pulse",
  },
  "tra-cuu": {
    name: "Tra cứu",
    description: "Tìm kiếm thông tin về thuốc và bệnh",
    path: "/tra-cuu",
    icon: "search",
  },
  "bac-si": {
    name: "Bác sĩ",
    description: "Tìm và đặt lịch hẹn với bác sĩ",
    path: "/bac-si",
    icon: "user-md",
  },
  "ke-hoach": {
    name: "Kế hoạch chăm sóc",
    description: "Lập kế hoạch và theo dõi tiến trình sức khỏe",
    path: "/ke-hoach",
    icon: "calendar-check",
  },
  "thong-ke": {
    name: "Thống kê",
    description: "Xem báo cáo và thống kê sức khỏe cá nhân",
    path: "/thong-ke",
    icon: "chart-bar",
  },
}
