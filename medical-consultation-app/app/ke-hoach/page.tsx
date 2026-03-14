"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type DocState = {
  id: string
  content: string
  updated_at: string
  updated_by: string | null
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
  const [doc, setDoc] = useState<DocState | null>(null)
  const [draft, setDraft] = useState("")
  const [dirty, setDirty] = useState(false)

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

  const saveDoc = async () => {
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
          base_updated_at: doc.updated_at,
        }),
      })
      if (resp.status === 409) {
        const data = await resp.json()
        const latest = data?.latest as DocState | undefined
        if (latest?.content) {
          setDoc(latest)
        }
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
    if (doc && draft !== doc.content) setDirty(true)
    if (doc && draft === doc.content) setDirty(false)
  }, [draft, doc])

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
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

        {error && <div className="text-sm text-red-600">{error}</div>}

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
            <div className="rounded-xl border bg-background p-4 space-y-2">
              <div className="text-sm font-medium">Markdown</div>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[70vh] font-mono text-sm"
                placeholder="Nội dung markdown..."
              />
            </div>
            <div className="rounded-xl border bg-background p-4 space-y-2 overflow-hidden">
              <div className="text-sm font-medium">Preview</div>
              <div className="prose prose-sm dark:prose-invert max-w-none overflow-auto min-h-[70vh]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

