import plan from "@/data/plan.json"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type PlanItem = { id: string; epic: string; title: string; status: string }

function statusLabel(status: string) {
  if (status === "done") return { text: "Done", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
  if (status === "in_progress") return { text: "In progress", cls: "bg-blue-50 text-blue-700 border-blue-200" }
  if (status === "partial") return { text: "Partial", cls: "bg-amber-50 text-amber-700 border-amber-200" }
  return { text: "Todo", cls: "bg-slate-50 text-slate-700 border-slate-200" }
}

export default function KeHoachTrackPage({ params }: { params: { trackId: string } }) {
  const tracks = Array.isArray((plan as any)?.tracks) ? ((plan as any).tracks as any[]) : []
  const id = String(params?.trackId || "").trim()
  const track = tracks.find((t) => String(t?.id || "").toLowerCase() === id.toLowerCase())
  if (!track) notFound()

  const items: PlanItem[] = Array.isArray(track?.items) ? (track.items as any[]) : []
  const done = items.filter((x) => x?.status === "done").length
  const total = items.length
  const pct = total ? Math.round((done / total) * 100) : 0

  const order: string[] = Array.isArray(track?.buildOrder) ? track.buildOrder.map((x: any) => String(x || "")).filter(Boolean) : []
  const byId = new Map(items.map((i: any) => [String(i?.id || ""), i]))
  const orderedItems = order.length ? order.map((k) => byId.get(k)).filter(Boolean) : items

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="text-2xl font-semibold">{String(track?.name || track?.id || "Kế hoạch")}</div>
          <div className="text-sm text-muted-foreground">{String(track?.description || "")}</div>
        </div>
        <div className="flex gap-2">
          <a href="/ke-hoach" className="inline-flex">
            <Button variant="outline">Tổng kết</Button>
          </a>
        </div>
      </div>

      <div className="rounded-xl border bg-background p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">Tiến độ</div>
          <div className="text-xs text-muted-foreground">{done}/{total}</div>
        </div>
        <Progress value={pct} />
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Danh sách việc</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {orderedItems.length ? (
            orderedItems.map((it: any) => {
              const s = statusLabel(String(it?.status || "todo"))
              return (
                <div key={String(it?.id || "")} className="rounded-xl border p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {String(it?.id || "")} • {String(it?.title || "")}
                    </div>
                    <div className="text-xs text-muted-foreground">{String(it?.epic || "")}</div>
                  </div>
                  <Badge variant="outline" className={s.cls}>
                    {s.text}
                  </Badge>
                </div>
              )
            })
          ) : (
            <div className="text-sm text-muted-foreground">Chưa có việc.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

