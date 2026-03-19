"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { scanPii, type PiiFinding } from "@/lib/pii-scan"
import { normalizeForumPost, type DoctorForumPost } from "@/lib/doctor-forum"

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

function saveLocalPosts(items: DoctorForumPost[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items))
  } catch {}
}

const parseTags = (s: string) =>
  String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12)

export default function DoctorForumPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [dbDisabled, setDbDisabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<DoctorForumPost[]>([])

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState("")
  const [saving, setSaving] = useState(false)
  const [findings, setFindings] = useState<PiiFinding[]>([])

  useEffect(() => {
    setMounted(true)
    const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null
    if (!t || role !== "doctor") {
      router.replace("/login")
      return
    }
  }, [router])

  const authToken = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("authToken") : null), [])

  const refresh = async () => {
    setLoading(true)
    setDbDisabled(false)
    try {
      if (!authToken) throw new Error("no_auth")
      const resp = await fetch("/api/doctor-forum/posts", { headers: { Authorization: `Bearer ${authToken}` } })
      if (resp.status === 503) {
        setDbDisabled(true)
        const local = loadLocalPosts()
        local.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        setPosts(local)
        return
      }
      if (!resp.ok) throw new Error(await resp.text())
      const j: any = await resp.json()
      const items = Array.isArray(j?.items) ? j.items : []
      const next = items.map(normalizeForumPost).filter(Boolean) as any
      setPosts(next)
      return
    } catch {
      const local = loadLocalPosts()
      local.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      setPosts(local)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!mounted) return
    void refresh()
  }, [mounted])

  useEffect(() => {
    const scan = scanPii([title, content].join("\n"))
    setFindings(scan.findings)
  }, [title, content])

  const canPost = title.trim() && content.trim() && findings.length === 0

  const submit = async () => {
    if (!canPost || saving) return
    setSaving(true)
    const payload = { title: title.trim(), content: content.trim(), tags: parseTags(tags) }
    try {
      if (!authToken) throw new Error("no_auth")
      const resp = await fetch("/api/doctor-forum/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(payload),
      })
      if (resp.status === 503) {
        setDbDisabled(true)
        const doctorId = typeof window !== "undefined" ? localStorage.getItem("userId") || "doctor" : "doctor"
        const post: DoctorForumPost = {
          id: `local-${Date.now().toString(16)}`,
          doctor_id: String(doctorId),
          title: payload.title,
          content: payload.content,
          tags: payload.tags,
          created_at: new Date().toISOString(),
        }
        const next = [post, ...loadLocalPosts()].slice(0, 200)
        saveLocalPosts(next)
        setTitle("")
        setContent("")
        setTags("")
        toast({ title: "Đã đăng (offline)", description: "Chưa cấu hình database nên chỉ lưu trên thiết bị." })
        void refresh()
        return
      }
      if (resp.status === 400) {
        const j: any = await resp.json().catch(() => null)
        const f = Array.isArray(j?.findings) ? j.findings : []
        toast({ title: "Bị chặn do PII", description: `Vui lòng xóa thông tin cá nhân (${f.length || 1}).` })
        void refresh()
        return
      }
      if (!resp.ok) throw new Error(await resp.text())
      toast({ title: "Đã đăng", description: "Bài chia sẻ đã được đăng." })
      setTitle("")
      setContent("")
      setTags("")
      void refresh()
    } catch {
      toast({ title: "Không đăng được", description: "Vui lòng thử lại." })
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50">Cộng đồng bác sĩ</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Hỏi đáp & chia sẻ kinh nghiệm. Hệ thống tự chặn thông tin cá nhân bệnh nhân.
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void refresh()}>
            Làm mới
          </Button>
        </div>
      </div>

      {dbDisabled ? (
        <div className="rounded-xl border bg-background p-4 text-sm">Chưa cấu hình database nên forum đang ở chế độ offline.</div>
      ) : null}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Đăng bài mới</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Tiêu đề</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Nội dung</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm resize-none"
              placeholder="Không chia sẻ tên/tuổi/sđt/địa chỉ/CCCD của bệnh nhân..."
            />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Tags (phân cách dấu phẩy)</div>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ví dụ: lo-âu, mất-ngủ, dinh-dưỡng" />
          </div>

          {findings.length ? (
            <div className="rounded-xl border bg-background p-3 text-sm">
              <div className="font-medium">Đang phát hiện thông tin cá nhân</div>
              <div className="text-muted-foreground mt-1">Xóa các mục sau trước khi đăng:</div>
              <div className="mt-2 space-y-1">
                {findings.slice(0, 8).map((f, i) => (
                  <div key={`${f.type}-${i}`} className="text-xs">
                    {f.label}: <span className="font-medium">{f.match}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-2 flex-wrap">
            <Button disabled={!canPost || saving} onClick={() => void submit()}>
              {saving ? "Đang đăng..." : "Đăng bài"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-50">Bài viết mới nhất</div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {loading ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-400">Đang tải...</div>
          ) : posts.length ? (
            posts.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                onClick={() => router.push(`/doctor/forum/${encodeURIComponent(p.id)}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-50 truncate">{p.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(p.created_at).toLocaleString("vi-VN")}</div>
                    <div className="text-sm text-slate-700 dark:text-slate-300 mt-2 line-clamp-2">{p.content}</div>
                  </div>
                </div>
                {p.tags?.length ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {p.tags.slice(0, 8).map((t) => (
                      <span key={t} className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </button>
            ))
          ) : (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-400">Chưa có bài viết.</div>
          )}
        </div>
      </div>
    </div>
  )
}

