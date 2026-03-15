"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type DocState = {
  id: string
  content: string
  updated_at: string
  updated_by: string | null
}

type ChecklistTask = {
  lineNumber: number
  checked: boolean
  text: string
  indent: number
  section: string
}

type RevisionItem = {
  rev_id: number
  op: string
  created_at: string
  created_by: string | null
  base_updated_at: string | null
  doc_updated_at: string | null
}

type RevisionDetail = RevisionItem & {
  doc_id: string
  content: string
}

type CommentItem = {
  comment_id: number
  doc_id: string
  rev_id: number | null
  content: string
  created_at: string
  created_by: string | null
  resolved: boolean
}

function parseChecklist(md: string) {
  const lines = md.split("\n")
  const tasks: ChecklistTask[] = []
  const sections: { title: string; firstLine: number | null }[] = [{ title: "Chung", firstLine: null }]
  let currentSection = "Chung"

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1
    const line = lines[i] || ""

    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const title = (h[2] || "").trim()
      if (title) {
        currentSection = title
        sections.push({ title, firstLine: lineNumber })
      }
      continue
    }

    const m = line.match(/^(\s*)[-*+]\s+\[\s*([xX]?)\s*\]\s+(.*)$/)
    if (!m) continue
    const indent = (m[1] || "").length
    const checked = !!(m[2] || "").trim()
    const text = (m[3] || "").trim()
    tasks.push({ lineNumber, checked, text, indent, section: currentSection })
  }

  const bySection = new Map<string, ChecklistTask[]>()
  for (const t of tasks) {
    const arr = bySection.get(t.section) || []
    arr.push(t)
    bySection.set(t.section, arr)
  }

  const sectionItems = sections
    .filter((s, idx) => idx === 0 || bySection.has(s.title))
    .map((s) => ({ title: s.title, firstLine: s.firstLine, tasks: bySection.get(s.title) || [] }))

  const json = {
    sections: sectionItems.map((s) => ({
      title: s.title,
      items: s.tasks.map((t) => ({
        text: t.text,
        checked: t.checked,
      })),
    })),
  }

  return { tasks, sections: sectionItems, json }
}

function setTaskCheckedInMarkdown(md: string, lineNumber: number, nextChecked: boolean) {
  if (!lineNumber || lineNumber < 1) return md
  const lines = md.split("\n")
  const idx = lineNumber - 1
  if (idx < 0 || idx >= lines.length) return md
  const line = lines[idx] || ""
  if (!/\[\s*[xX]?\s*\]/.test(line)) return md
  lines[idx] = line.replace(/\[\s*[xX]?\s*\]/, nextChecked ? "[x]" : "[ ]")
  return lines.join("\n")
}

function setTaskTextInMarkdown(md: string, lineNumber: number, nextText: string) {
  if (!lineNumber || lineNumber < 1) return md
  const lines = md.split("\n")
  const idx = lineNumber - 1
  if (idx < 0 || idx >= lines.length) return md
  const line = lines[idx] || ""
  const m = line.match(/^(\s*)[-*+]\s+\[\s*([xX]?)\s*\]\s+(.*)$/)
  if (!m) return md
  const indent = m[1] || ""
  const checked = (m[2] || "").trim()
  const marker = checked ? "[x]" : "[ ]"
  lines[idx] = `${indent}- ${marker} ${nextText.trim()}`
  return lines.join("\n")
}

function deleteTaskLineInMarkdown(md: string, lineNumber: number) {
  if (!lineNumber || lineNumber < 1) return md
  const lines = md.split("\n")
  const idx = lineNumber - 1
  if (idx < 0 || idx >= lines.length) return md
  lines.splice(idx, 1)
  return lines.join("\n")
}

function insertTaskInMarkdown(md: string, sectionTitle: string, text: string) {
  const lines = md.split("\n")
  const cleanText = text.trim()
  if (!cleanText) return md

  if (!sectionTitle || sectionTitle === "Chung") {
    const next = [...lines]
    if (next.length && next[next.length - 1].trim()) next.push("")
    next.push(`- [ ] ${cleanText}`)
    return next.join("\n")
  }

  let insertIdx = lines.length
  let sectionLineIdx: number | null = null
  for (let i = 0; i < lines.length; i++) {
    const h = (lines[i] || "").match(/^(#{1,6})\s+(.*)$/)
    if (h && (h[2] || "").trim() === sectionTitle) {
      sectionLineIdx = i
      insertIdx = i + 1
      break
    }
  }

  if (sectionLineIdx === null) {
    const next = [...lines]
    if (next.length && next[next.length - 1].trim()) next.push("")
    next.push(`## ${sectionTitle}`)
    next.push(`- [ ] ${cleanText}`)
    return next.join("\n")
  }

  for (let i = sectionLineIdx + 1; i < lines.length; i++) {
    const line = lines[i] || ""
    if (/^(#{1,6})\s+/.test(line)) break
    if (/^(\s*)[-*+]\s+\[\s*([xX]?)\s*\]\s+/.test(line)) insertIdx = i + 1
  }

  const next = [...lines]
  if (insertIdx > 0 && insertIdx <= next.length && next[insertIdx - 1].trim() && next[insertIdx]?.trim()) {
    next.splice(insertIdx, 0, "")
    insertIdx += 1
  }
  next.splice(insertIdx, 0, `- [ ] ${cleanText}`)
  return next.join("\n")
}

export default function KeHoachPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [pw, setPw] = useState("")
  const [name, setName] = useState("")
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [hasConflict, setHasConflict] = useState(false)
  const [doc, setDoc] = useState<DocState | null>(null)
  const [draft, setDraft] = useState("")
  const [dirty, setDirty] = useState(false)
  const [revisions, setRevisions] = useState<RevisionItem[]>([])
  const [revLoading, setRevLoading] = useState(false)
  const [revError, setRevError] = useState("")
  const [selectedRev, setSelectedRev] = useState<RevisionDetail | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentDraft, setCommentDraft] = useState("")
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentError, setCommentError] = useState("")
  const [boardSection, setBoardSection] = useState("Chung")
  const [newTaskText, setNewTaskText] = useState("")
  const [editingLine, setEditingLine] = useState<number | null>(null)
  const [editingText, setEditingText] = useState("")
  const [jsonCopied, setJsonCopied] = useState(false)

  const toggleTaskAtLine = (lineNumber: number, nextChecked: boolean) => {
    setDraft((prev) => setTaskCheckedInMarkdown(prev, lineNumber, nextChecked))
  }

  const effectivePw = useMemo(() => {
    try {
      const urlPw = (params?.get("pw") || "").trim()
      if (urlPw) return urlPw
    } catch {}
    return pw.trim()
  }, [params, pw])

  const stripPwFromUrl = () => {
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.has("pw")) {
        url.searchParams.delete("pw")
        window.history.replaceState(null, "", url.toString())
      }
    } catch {}
  }

  const persistPw = (v: string) => {
    try {
      sessionStorage.setItem("team_todo_pass", v)
    } catch {}
  }

  const loadPersistedPw = () => {
    try {
      const v = sessionStorage.getItem("team_todo_pass")
      if (v && !pw) setPw(v)
    } catch {}
  }

  const loadDoc = async (password: string) => {
    setError("")
    setHasConflict(false)
    setLoading(true)
    try {
      const resp = await fetch("/api/team-todo", {
        method: "GET",
        headers: {
          "x-team-todo-pass": password,
        },
      })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(t || `HTTP ${resp.status}`)
      }
      const data = (await resp.json()) as DocState
      setDoc(data)
      setDraft(data.content || "")
      setDirty(false)
      setAuthed(true)
      persistPw(password)
    } catch (e: any) {
      setAuthed(false)
      setDoc(null)
      setError(e?.message || "Không tải được dữ liệu")
    } finally {
      setLoading(false)
    }
  }

  const loadRevisions = async (password: string) => {
    setRevError("")
    setRevLoading(true)
    try {
      const resp = await fetch("/api/team-todo/revisions?limit=80", {
        method: "GET",
        headers: { "x-team-todo-pass": password },
      })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(t || `HTTP ${resp.status}`)
      }
      const data = (await resp.json()) as { items: RevisionItem[] }
      setRevisions(Array.isArray(data?.items) ? data.items : [])
    } catch (e: any) {
      setRevError(e?.message || "Không tải được lịch sử")
      setRevisions([])
    } finally {
      setRevLoading(false)
    }
  }

  const viewRevision = async (revId: number) => {
    const password = effectivePw.trim()
    if (!password) return
    setRevError("")
    setSelectedRev(null)
    setRevLoading(true)
    try {
      const resp = await fetch(`/api/team-todo/revisions/${revId}`, {
        method: "GET",
        headers: { "x-team-todo-pass": password },
      })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(t || `HTTP ${resp.status}`)
      }
      const data = (await resp.json()) as RevisionDetail
      setSelectedRev(data)
    } catch (e: any) {
      setRevError(e?.message || "Không tải được nội dung bản ghi")
    } finally {
      setRevLoading(false)
    }
  }

  const restoreRevision = async (revId: number) => {
    const password = effectivePw.trim()
    if (!password) return
    const ok = typeof window !== "undefined" ? window.confirm(`Khôi phục theo bản lịch sử #${revId}? Thao tác này sẽ ghi đè bản hiện tại trong DB.`) : false
    if (!ok) return
    setError("")
    setHasConflict(false)
    setSaving(true)
    try {
      const resp = await fetch("/api/team-todo/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-team-todo-pass": password,
        },
        body: JSON.stringify({
          rev_id: revId,
          updated_by: name.trim(),
        }),
      })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(t || `HTTP ${resp.status}`)
      }
      const data = (await resp.json()) as DocState
      setDoc(data)
      setDraft(data.content || "")
      setDirty(false)
      setSelectedRev(null)
      await loadRevisions(password)
    } catch (e: any) {
      setError(e?.message || "Không khôi phục được")
    } finally {
      setSaving(false)
    }
  }

  const loadComments = async (password: string) => {
    setCommentError("")
    setCommentLoading(true)
    try {
      const resp = await fetch("/api/team-todo/comments", {
        method: "GET",
        headers: { "x-team-todo-pass": password },
      })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(t || `HTTP ${resp.status}`)
      }
      const data = (await resp.json()) as { items: CommentItem[] }
      setComments(Array.isArray(data?.items) ? data.items : [])
    } catch (e: any) {
      setCommentError(e?.message || "Không tải được bình luận")
      setComments([])
    } finally {
      setCommentLoading(false)
    }
  }

  const addComment = async () => {
    const password = effectivePw.trim()
    if (!password) return
    const content = commentDraft.trim()
    if (!content) return
    setCommentError("")
    setCommentLoading(true)
    try {
      const latestRevId = revisions?.[0]?.rev_id
      const resp = await fetch("/api/team-todo/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-team-todo-pass": password,
        },
        body: JSON.stringify({
          content,
          created_by: name.trim(),
          rev_id: latestRevId || null,
        }),
      })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(t || `HTTP ${resp.status}`)
      }
      setCommentDraft("")
      await loadComments(password)
    } catch (e: any) {
      setCommentError(e?.message || "Không gửi được bình luận")
    } finally {
      setCommentLoading(false)
    }
  }

  const saveDoc = async () => {
    if (!doc) return
    const password = effectivePw.trim()
    if (!password) return
    setError("")
    setHasConflict(false)
    setSaving(true)
    try {
      const resp = await fetch("/api/team-todo", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-team-todo-pass": password,
        },
        body: JSON.stringify({
          content: draft,
          updated_by: name.trim(),
          base_updated_at: doc.updated_at,
        }),
      })
      if (resp.status === 409) {
        const data = await resp.json()
        const latest = data?.latest as DocState | undefined
        if (latest?.content) {
          setDoc(latest)
        }
        setHasConflict(true)
        throw new Error("Có người vừa cập nhật. Bấm Tải lại để lấy bản mới nhất.")
      }
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(t || `HTTP ${resp.status}`)
      }
      const data = (await resp.json()) as DocState
      setDoc(data)
      setDraft(data.content || "")
      setDirty(false)
      persistPw(password)
      await loadRevisions(password)
    } catch (e: any) {
      setError(e?.message || "Không lưu được")
    } finally {
      setSaving(false)
    }
  }

  const syncFromSeed = async () => {
    const password = effectivePw.trim()
    if (!password) return
    const ok = typeof window !== "undefined" ? window.confirm("Đồng bộ nội dung theo file kế hoạch mới? Thao tác này sẽ ghi đè bản đang lưu trong DB.") : false
    if (!ok) return
    setError("")
    setHasConflict(false)
    setSaving(true)
    try {
      const resp = await fetch("/api/team-todo", {
        method: "POST",
        headers: {
          "x-team-todo-pass": password,
        },
      })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(t || `HTTP ${resp.status}`)
      }
      const data = (await resp.json()) as DocState
      setDoc(data)
      setDraft(data.content || "")
      setDirty(false)
      persistPw(password)
      await loadRevisions(password)
    } catch (e: any) {
      setError(e?.message || "Không đồng bộ được")
    } finally {
      setSaving(false)
    }
  }

  const forceSaveDoc = async () => {
    if (!doc) return
    const password = effectivePw.trim()
    if (!password) return
    setError("")
    setSaving(true)
    try {
      const resp = await fetch("/api/team-todo", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-team-todo-pass": password,
        },
        body: JSON.stringify({
          content: draft,
          updated_by: name.trim(),
        }),
      })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(t || `HTTP ${resp.status}`)
      }
      const data = (await resp.json()) as DocState
      setDoc(data)
      setDraft(data.content || "")
      setDirty(false)
      setHasConflict(false)
      persistPw(password)
      await loadRevisions(password)
    } catch (e: any) {
      setError(e?.message || "Không lưu được")
    } finally {
      setSaving(false)
    }
  }

  const logout = () => {
    try {
      sessionStorage.removeItem("team_todo_pass")
    } catch {}
    setAuthed(false)
    setPw("")
    setDoc(null)
    setDraft("")
    setDirty(false)
    try {
      router.replace("/ke-hoach")
    } catch {}
  }

  useEffect(() => {
    loadPersistedPw()
  }, [])

  useEffect(() => {
    const urlPw = (params?.get("pw") || "").trim()
    if (urlPw) {
      setPw(urlPw)
      stripPwFromUrl()
      loadDoc(urlPw)
    }
  }, [params])

  useEffect(() => {
    const password = effectivePw.trim()
    if (!authed || !password) return
    void loadRevisions(password)
    void loadComments(password)
  }, [authed, doc?.updated_at])

  useEffect(() => {
    if (doc && draft !== doc.content) setDirty(true)
    if (doc && draft === doc.content) setDirty(false)
  }, [draft, doc])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault()
        if (authed && !saving && dirty && draft.trim()) {
          void saveDoc()
        }
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKeyDown)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", onKeyDown)
      }
    }
  }, [authed, saving, dirty, draft])

  const parsed = useMemo(() => parseChecklist(draft), [draft])

  useEffect(() => {
    if (!authed) return
    const titles = parsed.sections.map((s) => s.title)
    if (!titles.includes(boardSection)) setBoardSection("Chung")
  }, [authed, parsed.sections, boardSection])

  return (
    <div className="h-[calc(100dvh-4rem)] overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4 pb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Kế hoạch & TODO Team</div>
            <div className="text-sm text-muted-foreground">
              {doc?.updated_at ? `Cập nhật: ${new Date(doc.updated_at).toLocaleString("vi-VN")}` : "Chưa tải"}
              {doc?.updated_by ? ` • bởi ${doc.updated_by}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {authed ? (
              <>
                <Button variant="outline" onClick={() => loadDoc(effectivePw)} disabled={loading || saving}>
                  Tải lại
                </Button>
                <Button variant="outline" onClick={syncFromSeed} disabled={loading || saving}>
                  Đồng bộ
                </Button>
                <Button onClick={saveDoc} disabled={saving || loading || !dirty || !draft.trim()}>
                  {saving ? "Đang lưu..." : "Lưu"}
                </Button>
                <Button variant="outline" onClick={logout} disabled={saving || loading}>
                  Thoát
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {!authed && (
          <div className="rounded-xl border bg-background p-4 space-y-3">
            <div className="text-sm font-medium">Nhập mật khẩu để xem/sửa</div>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                type="password"
                placeholder="Mật khẩu"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
              <Button onClick={() => loadDoc(pw.trim())} disabled={loading || !pw.trim()}>
                {loading ? "Đang kiểm tra..." : "Vào"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Có thể mở link dạng <span className="font-mono">/ke-hoach?pw=...</span> để tự điền, hệ thống sẽ tự xoá tham số khỏi URL sau khi vào.
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border bg-background p-3">
            <div className="text-sm text-red-600">{error}</div>
            {hasConflict && authed ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => loadDoc(effectivePw)} disabled={loading || saving}>
                  Tải lại
                </Button>
                <Button onClick={forceSaveDoc} disabled={saving || loading || !draft.trim()}>
                  Ghi đè
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {authed && (
          <div className="rounded-xl border bg-background p-4 flex flex-col md:flex-row gap-3">
            <div className="w-full md:w-1/3 space-y-2">
              <div className="text-sm font-medium">Tên người cập nhật</div>
              <Input placeholder="Ví dụ: Thịnh" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="text-xs text-muted-foreground">
                Mỗi lần Lưu sẽ ghi lại tên này (nếu có).
              </div>
            </div>
            <div className="w-full md:w-2/3 space-y-2">
              <div className="text-sm font-medium">Trạng thái</div>
              <div className="text-xs text-muted-foreground">
                {dirty ? "Có thay đổi chưa lưu" : "Đã đồng bộ"}
              </div>
            </div>
          </div>
        )}

        {authed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-background p-4 space-y-2 flex flex-col min-h-[70vh]">
              <div className="text-sm font-medium">Markdown</div>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 font-mono text-sm"
                placeholder="Nội dung markdown..."
              />
            </div>
            <div className="rounded-xl border bg-background p-4 space-y-2 overflow-hidden flex flex-col min-h-[70vh]">
              <Tabs defaultValue="preview" className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <TabsList>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="board">Bảng</TabsTrigger>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                    <TabsTrigger value="history">Lịch sử</TabsTrigger>
                    <TabsTrigger value="comments">Bình luận</TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const password = effectivePw.trim()
                        if (password) {
                          void loadRevisions(password)
                          void loadComments(password)
                        }
                      }}
                      disabled={revLoading || commentLoading || saving || loading}
                    >
                      Làm mới
                    </Button>
                  </div>
                </div>
                <TabsContent value="preview" className="overflow-hidden">
                  <div className="prose prose-sm dark:prose-invert max-w-none overflow-auto flex-1">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        input: ({ node, ...props }) => {
                          const isCheckbox = props.type === "checkbox"
                          if (!isCheckbox) return <input {...props} />
                          const checked = !!props.checked
                          const line = (node as any)?.position?.start?.line as number | undefined
                          return (
                            <input
                              {...props}
                              type="checkbox"
                              checked={checked}
                              disabled={false}
                              onChange={(e) => {
                                const next = e.target.checked
                                if (typeof line === "number") {
                                  toggleTaskAtLine(line, next)
                                }
                              }}
                            />
                          )
                        },
                      }}
                    >
                      {draft}
                    </ReactMarkdown>
                  </div>
                </TabsContent>
                <TabsContent value="board" className="overflow-hidden">
                  <div className="overflow-auto flex-1 space-y-3 pr-1">
                    <div className="rounded-lg border p-3 space-y-3">
                      <div className="text-sm font-medium">Thêm việc</div>
                      <div className="flex flex-col md:flex-row gap-2">
                        <select
                          className="h-10 rounded-md border bg-background px-3 text-sm"
                          value={boardSection}
                          onChange={(e) => setBoardSection(e.target.value)}
                        >
                          {parsed.sections.map((s) => (
                            <option key={s.title} value={s.title}>
                              {s.title}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={newTaskText}
                          onChange={(e) => setNewTaskText(e.target.value)}
                          placeholder="Nội dung việc cần làm..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTaskText.trim()) {
                              e.preventDefault()
                              setDraft((prev) => insertTaskInMarkdown(prev, boardSection, newTaskText))
                              setNewTaskText("")
                            }
                          }}
                        />
                        <Button
                          onClick={() => {
                            if (!newTaskText.trim()) return
                            setDraft((prev) => insertTaskInMarkdown(prev, boardSection, newTaskText))
                            setNewTaskText("")
                          }}
                          disabled={!newTaskText.trim()}
                        >
                          Thêm
                        </Button>
                      </div>
                    </div>

                    {parsed.sections.map((sec) => (
                      <div key={sec.title} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">{sec.title}</div>
                          <div className="text-xs text-muted-foreground">{sec.tasks.filter(t => t.checked).length}/{sec.tasks.length}</div>
                        </div>
                        {!sec.tasks.length ? (
                          <div className="text-sm text-muted-foreground">Chưa có mục nào.</div>
                        ) : (
                          <div className="space-y-2">
                            {sec.tasks.map((t) => (
                              <div key={t.lineNumber} className="rounded-md border px-3 py-2 flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={t.checked}
                                    onChange={(e) => toggleTaskAtLine(t.lineNumber, e.target.checked)}
                                    className="mt-1"
                                  />
                                  <div className="min-w-0">
                                    {editingLine === t.lineNumber ? (
                                      <div className="space-y-2">
                                        <Input value={editingText} onChange={(e) => setEditingText(e.target.value)} />
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              const next = editingText.trim()
                                              if (!next) return
                                              setDraft((prev) => setTaskTextInMarkdown(prev, t.lineNumber, next))
                                              setEditingLine(null)
                                              setEditingText("")
                                            }}
                                            disabled={!editingText.trim()}
                                          >
                                            Lưu
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setEditingLine(null)
                                              setEditingText("")
                                            }}
                                          >
                                            Hủy
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={`text-sm break-words ${t.checked ? "line-through text-muted-foreground" : ""}`}>{t.text}</div>
                                    )}
                                    <div className="text-xs text-muted-foreground">Dòng {t.lineNumber}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {editingLine !== t.lineNumber ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingLine(t.lineNumber)
                                        setEditingText(t.text)
                                      }}
                                    >
                                      Sửa
                                    </Button>
                                  ) : null}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const ok = typeof window !== "undefined" ? window.confirm("Xóa mục này?") : false
                                      if (!ok) return
                                      setDraft((prev) => deleteTaskLineInMarkdown(prev, t.lineNumber))
                                    }}
                                  >
                                    Xóa
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="json" className="overflow-hidden">
                  <div className="overflow-auto flex-1 space-y-3 pr-1">
                    <div className="rounded-lg border p-3 flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">JSON</div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(JSON.stringify(parsed.json, null, 2))
                              setJsonCopied(true)
                              setTimeout(() => setJsonCopied(false), 1500)
                            } catch {}
                          }}
                        >
                          {jsonCopied ? "Đã copy" : "Copy JSON"}
                        </Button>
                      </div>
                    </div>
                    <pre className="rounded-lg border bg-background p-3 text-xs overflow-auto">
                      {JSON.stringify(parsed.json, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="history" className="overflow-hidden">
                  <div className="overflow-auto flex-1 space-y-3 pr-1">
                    {revError ? <div className="text-sm text-red-600">{revError}</div> : null}
                    <div className="space-y-2">
                      {revLoading && !revisions.length ? <div className="text-sm text-muted-foreground">Đang tải...</div> : null}
                      {!revLoading && !revisions.length ? <div className="text-sm text-muted-foreground">Chưa có lịch sử.</div> : null}
                      {revisions.map((r) => (
                        <div key={r.rev_id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">#{r.rev_id} • {r.op}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(r.created_at).toLocaleString("vi-VN")}
                              {r.created_by ? ` • ${r.created_by}` : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => void viewRevision(r.rev_id)} disabled={revLoading}>
                              Xem
                            </Button>
                            <Button size="sm" onClick={() => void restoreRevision(r.rev_id)} disabled={saving || loading}>
                              Khôi phục
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedRev ? (
                      <div className="rounded-lg border p-3 space-y-2">
                        <div className="text-sm font-medium">Nội dung #{selectedRev.rev_id}</div>
                        <div className="prose prose-sm dark:prose-invert max-w-none overflow-auto max-h-[40vh]">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedRev.content}</ReactMarkdown>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </TabsContent>
                <TabsContent value="comments" className="overflow-hidden">
                  <div className="overflow-auto flex-1 space-y-3 pr-1">
                    {commentError ? <div className="text-sm text-red-600">{commentError}</div> : null}
                    <div className="rounded-lg border p-3 space-y-2">
                      <div className="text-sm font-medium">Gửi bình luận</div>
                      <Textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        className="text-sm"
                        placeholder="Nhập góp ý, feedback, hoặc hỏi về phần việc..."
                      />
                      <div className="flex items-center justify-end">
                        <Button onClick={addComment} disabled={commentLoading || !commentDraft.trim()}>
                          {commentLoading ? "Đang gửi..." : "Gửi"}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {commentLoading && !comments.length ? <div className="text-sm text-muted-foreground">Đang tải...</div> : null}
                      {!commentLoading && !comments.length ? <div className="text-sm text-muted-foreground">Chưa có bình luận.</div> : null}
                      {comments.map((c) => (
                        <div key={c.comment_id} className="rounded-lg border p-3 space-y-1">
                          <div className="text-xs text-muted-foreground">
                            {new Date(c.created_at).toLocaleString("vi-VN")}
                            {c.created_by ? ` • ${c.created_by}` : ""}
                            {c.rev_id ? ` • rev #${c.rev_id}` : ""}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{c.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
