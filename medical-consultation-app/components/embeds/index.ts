// Embeddable mini components for chat integration
// Các component mini có thể nhúng vào chat

export { EmbedSangLoc } from "./embed-sang-loc"
export { EmbedTriLieu } from "./embed-tri-lieu"
export { EmbedTraCuu } from "./embed-tra-cuu"
export { EmbedBacSi } from "./embed-bac-si"
export { EmbedKeHoach } from "./embed-ke-hoach"
export { EmbedThongKe } from "./embed-thong-ke"

// Feature ID to component mapping
export const EMBED_COMPONENTS = {
  "sang-loc": "EmbedSangLoc",
  "tri-lieu": "EmbedTriLieu",
  "tra-cuu": "EmbedTraCuu",
  "bac-si": "EmbedBacSi",
  "ke-hoach": "EmbedKeHoach",
  "thong-ke": "EmbedThongKe",
} as const

export type EmbedFeatureId = keyof typeof EMBED_COMPONENTS
