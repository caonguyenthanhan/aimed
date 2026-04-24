'use client'
import { ChevronRight } from 'lucide-react'

interface NavigationPromptCardProps {
  feature: 'sang-loc' | 'tri-lieu' | 'tra-cuu' | 'bac-si' | 'ke-hoach' | 'thong-ke'
  description: string
  onEmbed?: () => void
  onNavigate?: () => void
}

const featureNames: Record<string, string> = {
  'sang-loc': 'Sàng lọc tâm lý',
  'tri-lieu': 'Trị liệu & Bài tập',
  'tra-cuu': 'Tra cứu Y dược',
  'bac-si': 'Đặt lịch bác sĩ',
  'ke-hoach': 'Kế hoạch chăm sóc',
  'thong-ke': 'Thống kê sức khỏe',
}

export function NavigationPromptCard({
  feature,
  description,
  onEmbed,
  onNavigate,
}: NavigationPromptCardProps) {
  return (
    <div className="w-full rounded-xl border-2 border-blue-200 dark:border-blue-800/50 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 overflow-hidden shadow-sm hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-700">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="text-lg flex-shrink-0 mt-1">❓</div>
          <div className="flex-grow">
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 text-sm">
              Bạn có muốn dùng {featureNames[feature]}?
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {description}
        </p>

        {/* Buttons */}
        <div className="flex gap-2 flex-wrap">
          {onEmbed && (
            <button
              onClick={onEmbed}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-sm transition-colors"
            >
              📄 Làm ngay trong chat
            </button>
          )}
          {onNavigate && (
            <button
              onClick={onNavigate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-600 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700/50 font-medium text-sm transition-colors"
            >
              Mở trang mới <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
