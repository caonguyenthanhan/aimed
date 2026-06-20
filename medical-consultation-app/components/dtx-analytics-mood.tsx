"use client"

import React, { useEffect, useState, useMemo } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Calendar,
  Frown,
  HeartPulse,
  Meh,
  MessageSquare,
  Smile,
  Sparkles,
  Tag,
  TrendingUp,
} from "lucide-react"

export type MoodEntry = {
  id: string
  ts: number
  mood: 1 | 2 | 3 | 4 | 5
  tags: string[]
  note: string
}

export type JournalEntry = {
  id: string
  ts: number
  title: string
  content: string
}

interface DtxAnalyticsMoodProps {
  moodItems: MoodEntry[]
  journalItems: JournalEntry[]
}

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

export function DtxAnalyticsMood({ moodItems = [], journalItems = [] }: DtxAnalyticsMoodProps) {
  const [timeRange, setTimeRange] = useState<"7" | "30" | "all">("7")
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Filtered mood entries based on selected time range
  const filteredMoods = useMemo(() => {
    const sorted = [...moodItems].sort((a, b) => a.ts - b.ts) // chronological order for line chart
    if (timeRange === "7") {
      return sorted.slice(-7)
    }
    if (timeRange === "30") {
      return sorted.slice(-30)
    }
    return sorted
  }, [moodItems, timeRange])

  // Data formatted for Trend chart
  const trendData = useMemo(() => {
    return filteredMoods.map((entry) => {
      const date = new Date(entry.ts)
      return {
        dateStr: date.toLocaleDateString("vi-VN", { month: "numeric", day: "numeric" }),
        fullDate: date.toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" }),
        moodVal: entry.mood,
        moodName: moodLabel(entry.mood),
        emoji: moodEmoji(entry.mood),
        note: entry.note || "",
        tags: entry.tags || [],
      }
    })
  }, [filteredMoods])

  // Distribution of all moods logged
  const distributionData = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    moodItems.forEach((m) => {
      const val = m.mood as 1 | 2 | 3 | 4 | 5
      if (counts[val] !== undefined) {
        counts[val]++
      }
    })
    return [
      { moodVal: 1, name: "Rất tệ", count: counts[1], color: "#ef4444" },
      { moodVal: 2, name: "Tệ", count: counts[2], color: "#f59e0b" },
      { moodVal: 3, name: "Bình thường", count: counts[3], color: "#64748b" },
      { moodVal: 4, name: "Tốt", count: counts[4], color: "#10b981" },
      { moodVal: 5, name: "Rất tốt", count: counts[5], color: "#14b8a6" },
    ]
  }, [moodItems])

  // Tag frequency analysis
  const tagStats = useMemo(() => {
    const stats: Record<string, { count: number; totalMood: number; avgMood: number }> = {}
    moodItems.forEach((m) => {
      if (Array.isArray(m.tags)) {
        m.tags.forEach((tag) => {
          if (!stats[tag]) {
            stats[tag] = { count: 0, totalMood: 0, avgMood: 0 }
          }
          stats[tag].count++
          stats[tag].totalMood += m.mood
        })
      }
    })

    const result = Object.entries(stats).map(([name, val]) => ({
      name,
      count: val.count,
      avgMood: Number((val.totalMood / val.count).toFixed(1)),
    }))

    // Sort by count descending
    return result.sort((a, b) => b.count - a.count).slice(0, 8)
  }, [moodItems])

  // Local rule-based sentiment scanner
  const sentimentAnalysis = useMemo(() => {
    const posKeywords = [
      "vui", "khỏe", "tốt", "ổn", "hạnh phúc", "bình yên", "thư giãn", "tiến bộ", 
      "hi vọng", "tự tin", "yêu", "thích", "cười", "nhẹ nhàng", "hài lòng", 
      "an tâm", "phấn chấn", "thoải mái", "đạt được", "yên tĩnh", "tích cực"
    ]
    const negKeywords = [
      "buồn", "mệt", "chán", "lo lắng", "lo âu", "áp lực", "stress", "cô đơn", 
      "bế tắc", "sợ", "khóc", "đau", "tức giận", "khó chịu", "thất vọng", 
      "tuyệt vọng", "căng thẳng", "bồn chồn", "kém", "tệ", "suy sụp", "hoang mang"
    ]

    let totalWords = 0
    let posCount = 0
    let negCount = 0
    let processedEntries = 0

    const scanText = (text: string) => {
      if (!text) return
      const clean = text.toLowerCase()
      posKeywords.forEach((kw) => {
        const matches = clean.split(kw).length - 1
        posCount += matches
        totalWords += matches
      })
      negKeywords.forEach((kw) => {
        const matches = clean.split(kw).length - 1
        negCount += matches
        totalWords += matches
      })
    }

    // Scan mood notes
    moodItems.forEach((m) => {
      if (m.note) {
        scanText(m.note)
        processedEntries++
      }
    })

    // Scan journal content
    journalItems.forEach((j) => {
      if (j.content) {
        scanText(j.content)
        processedEntries++
      }
    })

    const totalMatches = posCount + negCount
    const posPercent = totalMatches > 0 ? Math.round((posCount / totalMatches) * 100) : 50
    const negPercent = totalMatches > 0 ? Math.round((negCount / totalMatches) * 100) : 50

    let summaryText = "Chưa có đủ ghi chép để phân tích sắc thái cảm xúc. Hãy ghi chép nhật ký và ghi chú tâm trạng thường xuyên hơn nhé!"
    let suggestion = "Bắt đầu ghi lại suy nghĩ mỗi ngày là một bài tập tuyệt vời trong kích hoạt hành vi (Behavioral Activation)."
    let tone: "neutral" | "positive" | "negative" | "warning" = "neutral"

    if (totalMatches > 0) {
      if (posPercent > 60) {
        summaryText = `Ghi chép gần đây của bạn thể hiện xu hướng tích cực (${posPercent}% tích cực). Bạn thường xuyên sử dụng các từ ngữ mang lại cảm giác thoải mái và biết ơn.`
        suggestion = "Duy trì tần suất hoạt động tốt hiện tại. Bạn có thể chia sẻ niềm vui này với người thân hoặc ghi lại những việc cụ thể khiến bạn vui."
        tone = "positive"
      } else if (negPercent > 60) {
        summaryText = `Phân tích phát hiện xu hướng căng thẳng hoặc u uất (${negPercent}% từ ngữ lo âu/tiêu cực). Điều này hoàn toàn bình thường khi bạn đang trải qua giai đoạn thử thách.`
        suggestion = "Hãy thử bài tập điều hòa nhịp thở trong tab Kế hoạch, hoặc bắt đầu một cuộc hội thoại 'Tâm sự' với AI để giải tỏa cảm xúc."
        tone = "negative"
      } else {
        summaryText = `Cảm xúc trong ghi chép của bạn ở trạng thái cân bằng (${posPercent}% tích cực, ${negPercent}% tiêu cực). Bạn đang tự điều hòa cảm xúc khá tốt.`
        suggestion = "Tiếp tục quan sát các yếu tố gây xao nhãng. Ghi lại các tag cụ thể để nhận diện rõ hơn nguyên nhân gây thay đổi tâm trạng."
        tone = "warning"
      }
    }

    return {
      posPercent,
      negPercent,
      totalMatches,
      summaryText,
      suggestion,
      processedEntries,
      tone,
    }
  }, [moodItems, journalItems])

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="glass-panel p-3 rounded-xl border border-slate-200 shadow-lg text-sm max-w-[240px] space-y-1 bg-white/95 text-slate-800">
          <div className="flex items-center justify-between font-semibold">
            <span>{data.fullDate}</span>
            <span>{data.emoji}</span>
          </div>
          <div className="text-primary font-medium">
            Tâm trạng: <span className="font-semibold">{data.moodName}</span> ({data.moodVal}/5)
          </div>
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.tags.map((t: string) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full border bg-slate-50 text-slate-600">
                  {t}
                </span>
              ))}
            </div>
          )}
          {data.note && (
            <div className="text-xs text-slate-500 italic mt-1 border-t pt-1 line-clamp-3">
              "{data.note}"
            </div>
          )}
        </div>
      )
    }
    return null
  }

  if (!isMounted) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground rounded-2xl border border-dashed">
        Đang chuẩn bị biểu đồ Recharts...
      </div>
    )
  }

  if (moodItems.length === 0) {
    return (
      <Card className="app-surface border-0 bg-card/90 shadow-none">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <HeartPulse size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">Chưa có dữ liệu phân tích</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Hãy lưu tâm trạng của bạn ít nhất một lần để chúng tôi bắt đầu lập biểu đồ xu hướng cảm xúc.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mood Trend Analysis Card */}
      <Card className="app-surface border-0 bg-card/90 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Xu hướng Cảm xúc
            </CardTitle>
            <CardDescription>Biểu diễn sự biến động tâm lý của bạn</CardDescription>
          </div>
          <div className="flex gap-1 bg-secondary/80 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setTimeRange("7")}
              className={`px-2 py-1 rounded-md transition ${
                timeRange === "7" ? "bg-white text-primary font-medium shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              7 ngày
            </button>
            <button
              onClick={() => setTimeRange("30")}
              className={`px-2 py-1 rounded-md transition ${
                timeRange === "30" ? "bg-white text-primary font-medium shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              30 ngày
            </button>
            <button
              onClick={() => setTimeRange("all")}
              className={`px-2 py-1 rounded-md transition ${
                timeRange === "all" ? "bg-white text-primary font-medium shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full mt-2">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.12)" />
                  <XAxis
                    dataKey="dateStr"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    domain={[1, 5]}
                    tickCount={5}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => {
                      if (val === 1) return "😞"
                      if (val === 2) return "😕"
                      if (val === 3) return "😐"
                      if (val === 4) return "🙂"
                      if (val === 5) return "😄"
                      return ""
                    }}
                    tick={{ fontSize: 14 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="moodVal"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMood)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Không có dữ liệu trong khoảng thời gian này.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Mood Distribution Bar Chart */}
        <Card className="app-surface border-0 bg-card/90 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Tần suất Cảm xúc
            </CardTitle>
            <CardDescription>Tỉ lệ phân bổ các mức độ tâm trạng</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.1)" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: "rgba(100,116,139,0.05)" }}
                    formatter={(value) => [`${value} lần`, "Số lần ghi ghi nhận"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Analysis from Notes & Journal */}
        <Card className="app-surface border-0 bg-card/90 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Sắc thái Nhật ký (AI Sentiment)
            </CardTitle>
            <CardDescription>Phân tích từ ngữ từ các ghi chú & nhật ký</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Smile size={14} /> Tích cực ({sentimentAnalysis.posPercent}%)
                </span>
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <Frown size={14} /> Tiêu cực ({sentimentAnalysis.negPercent}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${sentimentAnalysis.posPercent}%` }}
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${sentimentAnalysis.negPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border p-3.5 text-sm space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="font-medium text-slate-800 dark:text-slate-200">
                {sentimentAnalysis.summaryText}
              </div>
              <div className="text-xs text-muted-foreground italic flex gap-1.5 items-start">
                <AlertTriangle size={14} className="shrink-0 text-amber-500 mt-0.5" />
                <span>{sentimentAnalysis.suggestion}</span>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground text-right">
              Đã quét {sentimentAnalysis.processedEntries} mục ghi chép ({sentimentAnalysis.totalMatches} từ khóa cảm xúc)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Triggers and Associated Tags */}
      {tagStats.length > 0 && (
        <Card className="app-surface border-0 bg-card/90 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-indigo-500" />
              Yếu tố Ảnh hưởng phổ biến
            </CardTitle>
            <CardDescription>Các yếu tố thường gắn liền với tâm trạng của bạn</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2.5">
              {tagStats.map((item) => {
                const getMoodBadgeColor = (val: number) => {
                  if (val >= 4.0) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400"
                  if (val <= 2.5) return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400"
                  return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400"
                }

                return (
                  <div
                    key={item.name}
                    className={`px-3 py-2 rounded-xl border flex items-center gap-2 text-xs transition duration-150 ${getMoodBadgeColor(
                      item.avgMood
                    )}`}
                  >
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</span>
                    <span className="opacity-40">|</span>
                    <span>Xuất hiện: <strong>{item.count}</strong></span>
                    <span className="opacity-40">|</span>
                    <span>Mood TB: <strong>{item.avgMood}</strong></span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
