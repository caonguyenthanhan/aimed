"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { DoctorForumPost } from "@/lib/doctor-forum"
import { normalizeForumPost } from "@/lib/doctor-forum"

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
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="outline" onClick={() => router.push("/doctor/forum")}>
          Quay lại
        </Button>
      </div>

      {loading ? <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">Đang tải...</div> : null}
      {dbDisabled ? <div className="rounded-xl border bg-background p-4 text-sm">Chế độ offline.</div> : null}

      {post ? (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="text-2xl font-semibold text-slate-900">{post.title}</div>
            <div className="text-xs text-slate-500 mt-2">{new Date(post.created_at).toLocaleString("vi-VN")}</div>
            {post.tags?.length ? (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.map((t) => (
                  <span key={t} className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-6 text-sm text-slate-800 whitespace-pre-wrap">{post.content}</div>
          </div>
        </div>
      ) : (
        !loading && <div className="rounded-xl border bg-background p-4 text-sm">Không tìm thấy bài viết.</div>
      )}
    </div>
  )
}

