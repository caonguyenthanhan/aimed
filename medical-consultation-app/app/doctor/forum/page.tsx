"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, RefreshCcw, Search, ShieldCheck, Sparkles, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { scanPii, type PiiFinding } from "@/lib/pii-scan"
import { normalizeForumPost, type DoctorForumPost } from "@/lib/doctor-forum"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"

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
  const [search, setSearch] = useState("")

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
  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return posts
    return posts.filter((post) =>
      [post.title, post.content, ...(post.tags || [])].join(" ").toLowerCase().includes(q),
    )
  }, [posts, search])

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
    <PortalShell
      eyebrow="Clinical Forum"
      title="Cộng đồng bác sĩ"
      description="Trao đổi ca lâm sàng, chia sẻ kinh nghiệm và giữ an toàn dữ liệu nhờ cơ chế quét PII trước khi đăng."
      actions={
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tiêu đề, nội dung, tag..." className="input-glow rounded-full border-border/70 bg-card pl-10" />
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => void refresh()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Làm mới
          </Button>
        </div>
      }
      aside={
        <div className="space-y-6">
          <SectionCard title="Forum State" description="Trạng thái hiện tại của luồng forum bác sĩ.">
            <div className="rounded-[1.2rem] bg-primary px-5 py-5 text-primary-foreground">
              <div className="mb-2 flex items-center gap-2 text-primary-foreground/90">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em]">PII Guard</span>
              </div>
              <p className="text-sm leading-6 text-primary-foreground/85">
                Hệ thống tiếp tục chặn tên, tuổi, số điện thoại, địa chỉ và dữ liệu nhận diện bệnh nhân trước khi cho phép đăng bài.
              </p>
            </div>
          </SectionCard>
          <SectionCard title="Trending Topics" description="Các chủ đề gợi ý để định hình sidebar theo mockup FE.">
            <div className="space-y-3">
              {["#LongCovidPediatrics", "#AI_Diagnostics_Radiology", "#ImmunoOncology_Update"].map((topic) => (
                <div key={topic} className="rounded-xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm font-medium text-foreground">
                  {topic}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Bài viết" value={posts.length} helper="Tổng thảo luận hiện có" icon={<MessageSquare className="h-5 w-5" />} tone="primary" />
        <StatCard label="Kết quả lọc" value={filteredPosts.length} helper="Theo từ khóa hiện tại" icon={<Users className="h-5 w-5" />} tone="neutral" />
        <StatCard label="PII findings" value={findings.length} helper="Phải bằng 0 để đăng" icon={<Sparkles className="h-5 w-5" />} tone="teal" />
      </div>

      {dbDisabled ? <div className="rounded-xl border bg-background p-4 text-sm">Chưa cấu hình database nên forum đang ở chế độ offline.</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <SectionCard
          title="Bài viết mới nhất"
          description="Danh sách ca thảo luận mới nhất trong cộng đồng bác sĩ."
          badge={<span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{filteredPosts.length} items</span>}
          contentClassName="space-y-4"
        >
          {loading ? <div className="text-sm text-muted-foreground">Đang tải...</div> : null}
          {!loading && !filteredPosts.length ? <div className="text-sm text-muted-foreground">Chưa có bài viết.</div> : null}
          {filteredPosts.map((p) => (
            <button
              key={p.id}
              type="button"
              className="app-surface hover-lift w-full rounded-[1.35rem] bg-card/90 p-5 text-left"
              onClick={() => router.push(`/doctor/forum/${encodeURIComponent(p.id)}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold tracking-tight text-foreground">{p.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("vi-VN")}</div>
                  <div className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{p.content}</div>
                </div>
              </div>
              {p.tags?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.tags.slice(0, 8).map((t) => (
                    <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          ))}
        </SectionCard>

        <SectionCard title="Đăng bài mới" description="Soạn case discussion mới cho peer review." contentClassName="space-y-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">Tiêu đề</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="input-glow" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Nội dung</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm"
              placeholder="Không chia sẻ tên/tuổi/sđt/địa chỉ/CCCD của bệnh nhân..."
            />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Tags</div>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ví dụ: lo-âu, mất-ngủ, dinh-dưỡng" />
          </div>
          {findings.length ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <div className="font-medium text-foreground">Đang phát hiện thông tin cá nhân</div>
              <div className="mt-1 text-muted-foreground">Xóa các mục sau trước khi đăng:</div>
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
            <Button className="rounded-xl" disabled={!canPost || saving} onClick={() => void submit()}>
              {saving ? "Đang đăng..." : "Đăng bài"}
            </Button>
          </div>
        </SectionCard>
      </div>
    </PortalShell>
  )
}

