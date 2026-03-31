"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ClipboardCheck, ExternalLink, ChevronRight, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmbedSangLocProps {
  context?: {
    assessmentType?: "phq9" | "gad7" | "dass21"
    reason?: string
  }
  onComplete?: (result: { score: number; level: string }) => void
  onNavigate?: () => void
}

// Mini PHQ-2 (quick depression screening - first 2 questions of PHQ-9)
const quickQuestions = [
  {
    id: "q1",
    text: "Ít hứng thú hoặc không thấy vui vẻ khi làm mọi việc?",
    options: [
      { value: 0, label: "Không" },
      { value: 1, label: "Vài ngày" },
      { value: 2, label: "Hơn nửa" },
      { value: 3, label: "Hầu như mỗi ngày" },
    ],
  },
  {
    id: "q2",
    text: "Cảm thấy buồn bã, chán nản, hoặc vô vọng?",
    options: [
      { value: 0, label: "Không" },
      { value: 1, label: "Vài ngày" },
      { value: 2, label: "Hơn nửa" },
      { value: 3, label: "Hầu như mỗi ngày" },
    ],
  },
]

export function EmbedSangLoc({ context, onComplete, onNavigate }: EmbedSangLocProps) {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [isComplete, setIsComplete] = useState(false)
  const [result, setResult] = useState<{ score: number; level: string; needFullTest: boolean } | null>(null)

  const handleAnswer = (value: number) => {
    const newAnswers = { ...answers, [quickQuestions[currentQuestion].id]: value }
    setAnswers(newAnswers)

    if (currentQuestion < quickQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // Calculate result
      const totalScore = Object.values(newAnswers).reduce((a, b) => a + b, 0)
      const level = totalScore >= 3 ? "Cần đánh giá thêm" : "Bình thường"
      const needFullTest = totalScore >= 3
      
      setResult({ score: totalScore, level, needFullTest })
      setIsComplete(true)
      onComplete?.({ score: totalScore, level })
    }
  }

  const goToFullTest = () => {
    if (onNavigate) {
      onNavigate()
    } else {
      router.push("/sang-loc")
    }
  }

  const progress = ((currentQuestion + 1) / quickQuestions.length) * 100

  if (isComplete && result) {
    return (
      <Card className="w-full max-w-md border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CheckCircle className={cn(
              "h-5 w-5",
              result.needFullTest ? "text-amber-500" : "text-green-500"
            )} />
            <CardTitle className="text-base">Kết quả sàng lọc nhanh</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={cn(
            "rounded-lg p-3 text-sm",
            result.needFullTest 
              ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" 
              : "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-200"
          )}>
            <p className="font-medium">{result.level}</p>
            <p className="mt-1 text-xs opacity-80">
              {result.needFullTest 
                ? "Kết quả cho thấy bạn có thể cần được đánh giá chi tiết hơn."
                : "Kết quả sơ bộ cho thấy bạn đang ổn. Hãy tiếp tục theo dõi sức khỏe!"}
            </p>
          </div>
          
          {result.needFullTest && (
            <Button 
              onClick={goToFullTest}
              className="w-full gap-2"
              variant="default"
            >
              <ClipboardCheck className="h-4 w-4" />
              Làm bài đánh giá đầy đủ (PHQ-9)
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={goToFullTest}
            className="w-full text-xs text-muted-foreground"
          >
            Xem tất cả bài đánh giá tâm lý
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const question = quickQuestions[currentQuestion]

  return (
    <Card className="w-full max-w-md border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Sàng lọc nhanh</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            {currentQuestion + 1}/{quickQuestions.length}
          </span>
        </div>
        <Progress value={progress} className="h-1 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-sm font-medium text-foreground">
          {question.text}
        </CardDescription>
        
        <RadioGroup
          value={answers[question.id]?.toString()}
          onValueChange={(val) => handleAnswer(parseInt(val))}
          className="grid grid-cols-2 gap-2"
        >
          {question.options.map((opt) => (
            <Label
              key={opt.value}
              htmlFor={`${question.id}-${opt.value}`}
              className={cn(
                "flex items-center justify-center rounded-lg border-2 p-2 cursor-pointer text-center text-xs transition-all",
                answers[question.id] === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted hover:border-primary/50"
              )}
            >
              <RadioGroupItem
                value={opt.value.toString()}
                id={`${question.id}-${opt.value}`}
                className="sr-only"
              />
              {opt.label}
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goToFullTest}
          className="text-xs text-muted-foreground"
        >
          Làm bài đầy đủ <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  )
}
