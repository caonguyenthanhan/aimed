"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MessageSquare, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DoctorForumPost } from "@/lib/doctor-forum"
import { normalizeForumPost } from "@/lib/doctor-forum"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"

const LOCAL_KEY = "mcs_doctor_forum_posts_v1"

function loadLocalPosts(): DoctorForumPost[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.map(normalizeForumPost).filter(Boolean) as any
  } catch {
    return []
  }
}

export default function DoctorForumPostDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dbDisabled, setDbDisabled] = useState(false)
  const [post, setPost] = useState<DoctorForumPost | null>(null)

  const postId = useMemo(() => {
    const raw = Array.isArray((params as any)?.id) ? (params as any).id[0] : (params as any)?.id
    return String(raw || "").trim()
  }, [params])

  const authToken = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("authToken") : null), [])

  useEffect(() => {
    setMounted(true)
    const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null
    if (!t || role !== "doctor") {
      router.replace("/login")
      return
    }
  }, [router])

  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setDbDisabled(false)
      try {
        if (!authToken) throw new Error("no_auth")
        const resp = await fetch("/api/doctor-forum/posts", { headers: { Authorization: `Bearer ${authToken}` } })
        if (resp.status === 503) {
          setDbDisabled(true)
          const local = loadLocalPosts()
          const found = local.find((p) => p.id === postId) || null
          if (!cancelled) setPost(found)
          return
        }
        if (!resp.ok) throw new Error(await resp.text())
        const j: any = await resp.json()
        const items = Array.isArray(j?.items) ? j.items : []
        const found = (items.map(normalizeForumPost).filter(Boolean) as any[]).find((p) => p.id === postId) || null
        if (!cancelled) setPost(found)
      } catch {
        const local = loadLocalPosts()
        const found = local.find((p) => p.id === postId) || null
        if (!cancelled) setPost(found)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mounted, authToken, postId])

  if (!mounted) return null

  return (
    <PortalShell
      eyebrow="Forum Detail"
      title={post?.title || "Chi tiết bài viết"}
      description="Màn xem chi tiết một case discussion trong doctor forum."
      actions={
        <Button variant="outline" className="rounded-xl" onClick={() => router.push("/doctor/forum")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      }
      aside={
        <div className="space-y-6">
          <SectionCard title="Thread State" description="Trạng thái dữ liệu của bài thảo luận này.">
            <div className="rounded-[1.2rem] bg-primary px-5 py-5 text-primary-foreground">
              <div className="mb-2 flex items-center gap-2 text-primary-foreground/90">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em]">{dbDisabled ? "Offline Mode" : "Forum Thread"}</span>
              </div>
              <p className="text-sm leading-6 text-primary-foreground/85">
                {dbDisabled ? "Bài viết đang được đọc từ fallback cục bộ." : "Bài viết được nạp từ nguồn forum hiện có."}
              </p>
            </div>
          </SectionCard>
        </div>
      }
    >
      {loading ? <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">Đang tải...</div> : null}
      {dbDisabled ? <div className="rounded-xl border bg-background p-4 text-sm">Chế độ offline.</div> : null}

      {post ? (
        <SectionCard
          title="Nội dung thảo luận"
          description={new Date(post.created_at).toLocaleString("vi-VN")}
          badge={<span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Case Thread</span>}
        >
          {post.tags?.length ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          <div className="rounded-[1.3rem] bg-secondary/35 p-5 text-sm leading-7 text-foreground whitespace-pre-wrap">{post.content}</div>
        </SectionCard>
      ) : (
        !loading && (
          <SectionCard title="Không tìm thấy bài viết" description="Bài viết có thể đã bị xóa hoặc không có trong nguồn hiện tại.">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Không tìm thấy bài viết.
            </div>
          </SectionCard>
        )
      )}
    </PortalShell>
  )
}

