"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { BarChart3, ExternalLink, TrendingUp, TrendingDown, Minus, Activity, Brain, Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmbedThongKeProps {
  context?: {
    period?: "week" | "month"
    metric?: string
    reason?: string
  }
  onComplete?: () => void
  onNavigate?: () => void
}

interface StatCard {
  id: string
  label: string
  value: string | number
  unit?: string
  trend: "up" | "down" | "stable"
  trendValue?: string
  icon: typeof Activity
  color: string
}

// Mock stats - in real app from API
const mockStats: StatCard[] = [
  {
    id: "mood",
    label: "Tâm trạng",
    value: 3.8,
    unit: "/5",
    trend: "up",
    trendValue: "+0.3",
    icon: Brain,
    color: "text-purple-500",
  },
  {
    id: "sleep",
    label: "Giấc ngủ",
    value: 7.2,
    unit: "h",
    trend: "stable",
    icon: Heart,
    color: "text-blue-500",
  },
  {
    id: "exercise",
    label: "Vận động",
    value: 4,
    unit: "/7 ngày",
    trend: "up",
    trendValue: "+1",
    icon: Activity,
    color: "text-green-500",
  },
  {
    id: "stress",
    label: "Căng thẳng",
    value: 2.5,
    unit: "/5",
    trend: "down",
    trendValue: "-0.5",
    icon: TrendingDown,
    color: "text-amber-500",
  },
]

const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-3 w-3 text-green-500" />
    case "down":
      return <TrendingDown className="h-3 w-3 text-red-500" />
    default:
      return <Minus className="h-3 w-3 text-slate-400" />
  }
}

export function EmbedThongKe({ context, onComplete, onNavigate }: EmbedThongKeProps) {
  const router = useRouter()

  const goToFullPage = () => {
    if (onNavigate) {
      onNavigate()
    } else {
      router.push("/thong-ke")
    }
  }

  return (
    <Card className="w-full max-w-md border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Thống kê tuần này</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Tổng quan sức khỏe của bạn
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {mockStats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.id}
                className="p-3 rounded-lg border bg-gradient-to-br from-background to-muted/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <Icon className={cn("h-4 w-4", stat.color)} />
                  <TrendIcon trend={stat.trend} />
                </div>
                <div className="text-lg font-semibold">
                  {stat.value}
                  <span className="text-xs text-muted-foreground font-normal ml-0.5">
                    {stat.unit}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                {stat.trendValue && (
                  <div className={cn(
                    "text-xs mt-1",
                    stat.trend === "up" && stat.id !== "stress" ? "text-green-500" : 
                    stat.trend === "down" && stat.id === "stress" ? "text-green-500" :
                    stat.trend === "down" ? "text-red-500" : "text-slate-400"
                  )}>
                    {stat.trendValue} vs tuần trước
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary insight */}
        <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-xs text-center text-muted-foreground">
            Sức khỏe tổng thể của bạn đang <span className="font-medium text-green-600">cải thiện</span>. 
            Tiếp tục duy trì thói quen tốt!
          </p>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goToFullPage}
          className="w-full text-xs text-muted-foreground"
        >
          Xem báo cáo chi tiết <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  )
}
