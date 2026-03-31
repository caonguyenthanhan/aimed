"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { CalendarCheck, ExternalLink, Target, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmbedKeHoachProps {
  context?: {
    planType?: string
    reason?: string
  }
  onComplete?: (progress: { completed: number; total: number }) => void
  onNavigate?: () => void
}

interface Task {
  id: string
  title: string
  time?: string
  completed: boolean
  category: "health" | "exercise" | "nutrition" | "mindfulness"
}

// Mock daily tasks - in real app from API/local storage
const mockTasks: Task[] = [
  { id: "1", title: "Uống 2 lít nước", time: "Cả ngày", completed: false, category: "health" },
  { id: "2", title: "Đi bộ 30 phút", time: "Sáng", completed: true, category: "exercise" },
  { id: "3", title: "Ăn rau xanh", time: "Trưa/Tối", completed: false, category: "nutrition" },
  { id: "4", title: "Bài tập thở 5 phút", time: "Tối", completed: false, category: "mindfulness" },
  { id: "5", title: "Ngủ đủ 7-8 tiếng", time: "Tối", completed: true, category: "health" },
]

const categoryIcons = {
  health: "💚",
  exercise: "🏃",
  nutrition: "🥗",
  mindfulness: "🧘",
}

export function EmbedKeHoach({ context, onComplete, onNavigate }: EmbedKeHoachProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(mockTasks)

  const completedCount = tasks.filter((t) => t.completed).length
  const progress = (completedCount / tasks.length) * 100

  useEffect(() => {
    onComplete?.({ completed: completedCount, total: tasks.length })
  }, [completedCount, tasks.length, onComplete])

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      )
    )
  }

  const goToFullPage = () => {
    if (onNavigate) {
      onNavigate()
    } else {
      router.push("/ke-hoach")
    }
  }

  return (
    <Card className="w-full max-w-md border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Kế hoạch hôm nay</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" />
            {completedCount}/{tasks.length}
          </div>
        </div>
        <Progress value={progress} className="h-1.5 mt-1" />
      </CardHeader>
      
      <CardContent className="space-y-2 max-h-56 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-colors",
              task.completed 
                ? "bg-primary/5 opacity-70" 
                : "hover:bg-muted/50"
            )}
          >
            <Checkbox
              id={task.id}
              checked={task.completed}
              onCheckedChange={() => toggleTask(task.id)}
              className="h-5 w-5"
            />
            
            <div className="flex-1 min-w-0">
              <label
                htmlFor={task.id}
                className={cn(
                  "text-sm cursor-pointer block",
                  task.completed && "line-through text-muted-foreground"
                )}
              >
                <span className="mr-1">{categoryIcons[task.category]}</span>
                {task.title}
              </label>
              {task.time && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {task.time}
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>

      <CardFooter className="pt-2 flex flex-col gap-2">
        {progress === 100 && (
          <div className="w-full text-center py-1 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              🎉 Tuyệt vời! Bạn đã hoàn thành tất cả!
            </span>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goToFullPage}
          className="w-full text-xs text-muted-foreground"
        >
          Quản lý kế hoạch chi tiết <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  )
}
