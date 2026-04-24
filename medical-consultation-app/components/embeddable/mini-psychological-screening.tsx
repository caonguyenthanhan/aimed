'use client'
import { useState } from 'react'
import { ChevronUp, ChevronDown, X } from 'lucide-react'

interface MiniPsychologicalScreeningProps {
  onExpand?: () => void
  onClose?: () => void
  initialExpanded?: boolean
  screeningType?: 'GAD-7' | 'PHQ-9' | 'auto'
}

export function MiniPsychologicalScreening({
  onExpand,
  onClose,
  initialExpanded = false,
  screeningType = 'auto',
}: MiniPsychologicalScreeningProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])

  const GAD7Questions = [
    "Bạn có cảm thấy lo lắng hoặc căng thẳng không?",
    "Bạn không thể kiểm soát lo lắng của mình không?",
    "Bạn có lo lắng quá nhiều về những việc khác nhau không?",
    "Bạn có khó thư giãn không?",
    "Bạn không thể yên tĩnh được không?",
    "Bạn dễ cáu kỉnh hay bực bội không?",
    "Bạn có cảm thấy sợ rằng điều tồi tệ sắp xảy ra không?",
  ]

  const PHQ9Questions = [
    "Bạn có cảm thấy buồn hay vô vọng không?",
    "Bạn mất hứng thú với việc làm không?",
    "Bạn có khó ngủ hoặc ngủ quá nhiều không?",
    "Bạn có cảm thấy mệt mỏi không?",
    "Bạn có vấn đề về ăn uống không?",
    "Bạn cảm thấy tự ti về bản thân không?",
    "Bạn khó tập trung không?",
    "Bạn có cảm thấy nên động thái chậm hoặc bồn chồn không?",
    "Bạn có suy nghĩ về tự làm hại bản thân không?",
  ]

  const questions = screeningType === 'GAD-7' ? GAD7Questions : screeningType === 'PHQ-9' ? PHQ9Questions : GAD7Questions
  const total = answers.length
  const progress = total > 0 ? Math.round((total / questions.length) * 100) : 0

  const handleAnswer = (score: number) => {
    const newAnswers = [...answers, score]
    setAnswers(newAnswers)
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handleReset = () => {
    setCurrentQuestion(0)
    setAnswers([])
  }

  const score = answers.reduce((a, b) => a + b, 0)
  const isComplete = answers.length === questions.length

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
            📋
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-50 text-sm">
              {screeningType === 'PHQ-9' ? 'Sàng lọc: PHQ-9' : 'Sàng lọc: GAD-7'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{total}/{questions.length} câu trả lời</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <button
            onClick={onExpand}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Mở rộng"
          >
            ↗️
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {!isComplete && (
        <div className="h-1 bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Content */}
      {isExpanded && (
        <div className="p-4 max-h-96 overflow-y-auto">
          {!isComplete ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50 mb-3">
                  <span className="text-blue-600 dark:text-blue-400">{currentQuestion + 1}/{questions.length}</span> {questions[currentQuestion]}
                </p>
              </div>

              <div className="space-y-2">
                {['Không bao giờ', 'Thỉnh thoảng', 'Thường xuyên', 'Luôn luôn'].map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-600 transition-all text-sm text-slate-700 dark:text-slate-300"
                  >
                    ◯ {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{score}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {score < 5 ? '✅ Bình thường' : score < 10 ? '⚠️ Nhẹ' : score < 15 ? '⚠️ Vừa phải' : '🚨 Nặng'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mb-3">
                Nên tham khảo với chuyên gia tâm lý để có đánh giá chi tiết hơn.
              </p>
              <button
                onClick={handleReset}
                className="w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
              >
                Làm lại
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
