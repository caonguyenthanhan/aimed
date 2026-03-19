export type DoctorForumPost = {
  id: string
  doctor_id: string
  title: string
  content: string
  tags: string[]
  created_at: string
}

export function normalizeForumPost(x: any): DoctorForumPost | null {
  const id = String(x?.id || "").trim()
  const doctor_id = String(x?.doctor_id || "").trim()
  const title = String(x?.title || "").trim()
  const content = String(x?.content || "").trim()
  const created_at = String(x?.created_at || "").trim()
  const tagsRaw = Array.isArray(x?.tags) ? x.tags : []
  const tags = tagsRaw.map((t: any) => String(t || "").trim()).filter(Boolean).slice(0, 12)
  if (!id || !doctor_id || !title || !content || !created_at) return null
  return { id, doctor_id, title, content, tags, created_at }
}

export function newForumPostId() {
  return `dfp-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

