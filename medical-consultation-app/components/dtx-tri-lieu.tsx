"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { readLocal, writeLocal } from "@/lib/local-store"
import { getUserState, upsertUserState } from "@/lib/user-state-client"

type MoodEntry = {
  id: string
  ts: number
  mood: 1 | 2 | 3 | 4 | 5
  tags: string[]
  note: string
}

type JournalEntry = {
  id: string
  ts: number
  title: string
  content: string
}

const MOOD_KEY = "mcs_mood_entries_v1"
const JOURNAL_KEY = "mcs_journal_entries_v1"
const REMOTE_NS = "dtx"

const nowTs = () => Date.now()

const moodLabel = (m: number) => {
  if (m <= 1) return "Rất tệ"
  if (m === 2) return "Tệ"
  if (m === 3) return "Bình thường"
  if (m === 4) return "Tốt"
  return "Rất tốt"
}

const moodEmoji = (m: number) => {
  if (m <= 1) return "😞"
  if (m === 2) return "😕"
  if (m === 3) return "😐"
  if (m === 4) return "🙂"
  return "😄"
}

export function DtxTriLieu() {
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [moodNote, setMoodNote] = useState("")
  const [moodTags, setMoodTags] = useState<string[]>([])
  const [moodItems, setMoodItems] = useState<MoodEntry[]>([])

  const [journalTitle, setJournalTitle] = useState("")
  const [journalContent, setJournalContent] = useState("")
  const [journalItems, setJournalItems] = useState<JournalEntry[]>([])

  const tagCandidates = useMemo(
    () => ["Ngủ kém", "Áp lực", "Lo âu", "Buồn", "Cô đơn", "Vận động", "Ăn uống", "Gia đình", "Công việc", "Học tập"],
    [],
  )

  useEffect(() => {
    const m = readLocal<MoodEntry[]>(MOOD_KEY, [])
    const j = readLocal<JournalEntry[]>(JOURNAL_KEY, [])
    setMoodItems(Array.isArray(m) ? m : [])
    setJournalItems(Array.isArray(j) ? j : [])
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const items = await getUserState(REMOTE_NS)
      if (cancelled) return
      const moodRemote = items.find((x: any) => x?.key === "mood_entries")?.value
      const journalRemote = items.find((x: any) => x?.key === "journal_entries")?.value
      if (Array.isArray(moodRemote)) {
        setMoodItems(moodRemote as any)
        try { writeLocal(MOOD_KEY, moodRemote) } catch {}
      }
      if (Array.isArray(journalRemote)) {
        setJournalItems(journalRemote as any)
        try { writeLocal(JOURNAL_KEY, journalRemote) } catch {}
      }
    })()
    return () => { cancelled = true }
  }, [])

  const toggleTag = (t: string) => {
    setMoodTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].slice(0, 6)))
  }

  const saveMood = () => {
    const entry: MoodEntry = {
      id: `m-${nowTs()}`,
      ts: nowTs(),
      mood,
      tags: moodTags,
      note: moodNote.trim(),
    }
    const next = [entry, ...moodItems].slice(0, 120)
    setMoodItems(next)
    writeLocal(MOOD_KEY, next)
    void upsertUserState(REMOTE_NS, "mood_entries", next)
    setMoodNote("")
    setMoodTags([])
  }

  const deleteMood = (id: string) => {
    const next = moodItems.filter((x) => x.id !== id)
    setMoodItems(next)
    writeLocal(MOOD_KEY, next)
    void upsertUserState(REMOTE_NS, "mood_entries", next)
  }

  const saveJournal = () => {
    const content = journalContent.trim()
    if (!content) return
    const title = (journalTitle || content.split(/\n+/)[0] || "Ghi chú").trim().slice(0, 60)
    const entry: JournalEntry = { id: `j-${nowTs()}`, ts: nowTs(), title, content }
    const next = [entry, ...journalItems].slice(0, 200)
    setJournalItems(next)
    writeLocal(JOURNAL_KEY, next)
    void upsertUserState(REMOTE_NS, "journal_entries", next)
    setJournalTitle("")
    setJournalContent("")
  }

  const deleteJournal = (id: string) => {
    const next = journalItems.filter((x) => x.id !== id)
    setJournalItems(next)
    writeLocal(JOURNAL_KEY, next)
    void upsertUserState(REMOTE_NS, "journal_entries", next)
  }

  const mood7 = useMemo(() => moodItems.slice(0, 7), [moodItems])

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="rounded-2xl border bg-white/80 backdrop-blur-xl shadow-sm p-4">
        <div className="text-lg font-semibold">Trị liệu kỹ thuật số</div>
        <div className="text-sm text-muted-foreground">
          Theo dõi tâm trạng và ghi chép để tăng nhận thức và tuân thủ thói quen.
        </div>
      </div>

      <Tabs defaultValue="mood">
        <TabsList className="w-full justify-between">
          <TabsTrigger value="mood" className="flex-1">Tâm trạng</TabsTrigger>
          <TabsTrigger value="journal" className="flex-1">Nhật ký</TabsTrigger>
        </TabsList>

        <TabsContent value="mood" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mood tracker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Hôm nay bạn cảm thấy thế nào?</div>
                <div className="text-sm">
                  <span className="mr-2">{moodEmoji(mood)}</span>
                  <span className="font-medium">{moodLabel(mood)}</span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={mood}
                onChange={(e) => setMood(Number(e.target.value) as any)}
                className="w-full"
              />

              <div className="flex flex-wrap gap-2">
                {tagCandidates.map((t) => {
                  const active = moodTags.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition active:scale-[0.99] ${
                        active ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Ghi chú (tùy chọn)</div>
                <textarea
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  rows={3}
                  className="w-full border rounded-xl px-3 py-2 text-sm resize-none"
                  placeholder="Điều gì đang diễn ra?"
                />
              </div>

              <div className="flex gap-2">
                <Button className="w-full rounded-xl" onClick={saveMood}>Lưu</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">7 lần gần nhất</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mood7.length ? (
                <div className="space-y-2">
                  {mood7.map((m) => (
                    <div key={m.id} className="rounded-xl border p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium flex items-center gap-2">
                          <span>{moodEmoji(m.mood)}</span>
                          <span>{moodLabel(m.mood)}</span>
                          <span className="text-xs text-muted-foreground">{new Date(m.ts).toLocaleString("vi-VN")}</span>
                        </div>
                        {m.tags?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {m.tags.map((t) => (
                              <span key={`${m.id}-${t}`} className="text-[11px] px-2 py-0.5 rounded-full border bg-white">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {m.note ? <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{m.note}</div> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteMood(m.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border text-red-600 border-red-200 bg-red-50 active:scale-[0.99]"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Chưa có dữ liệu.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Journaling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={journalTitle}
                onChange={(e) => setJournalTitle(e.target.value)}
                placeholder="Tiêu đề (tùy chọn)"
              />
              <textarea
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                rows={7}
                className="w-full border rounded-xl px-3 py-2 text-sm resize-none"
                placeholder="Viết ra điều bạn đang nghĩ..."
              />
              <Button className="w-full rounded-xl" onClick={saveJournal} disabled={!journalContent.trim()}>
                Lưu ghi chú
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gần đây</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {journalItems.length ? (
                <div className="space-y-2">
                  {journalItems.slice(0, 12).map((j) => (
                    <div key={j.id} className="rounded-xl border p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{j.title || "Ghi chú"}</div>
                        <div className="text-xs text-muted-foreground">{new Date(j.ts).toLocaleString("vi-VN")}</div>
                        <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap line-clamp-6">{j.content}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteJournal(j.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border text-red-600 border-red-200 bg-red-50 active:scale-[0.99]"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Chưa có ghi chú.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
