'use client'
import { MiniPsychologicalScreening } from './mini-psychological-screening'

interface EmbeddedComponentRendererProps {
  type: 'sang-loc' | 'tri-lieu' | 'tra-cuu' | 'bac-si' | 'ke-hoach' | 'thong-ke'
  props?: Record<string, any>
  onExpand?: () => void
  onClose?: () => void
}

export function EmbeddedComponentRenderer({
  type,
  props,
  onExpand,
  onClose,
}: EmbeddedComponentRendererProps) {
  switch (type) {
    case 'sang-loc':
      return (
        <MiniPsychologicalScreening
          onExpand={onExpand}
          onClose={onClose}
          screeningType={props?.screeningType || 'auto'}
        />
      )

    case 'tri-lieu':
      return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            [Trị liệu component - sắp có]
          </div>
        </div>
      )

    case 'tra-cuu':
      return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            [Tra cứu component - sắp có]
          </div>
        </div>
      )

    case 'bac-si':
      return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            [Đặt lịch bác sĩ component - sắp có]
          </div>
        </div>
      )

    case 'ke-hoach':
      return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            [Kế hoạch chăm sóc component - sắp có]
          </div>
        </div>
      )

    case 'thong-ke':
      return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            [Thống kê sức khỏe component - sắp có]
          </div>
        </div>
      )

    default:
      return null
  }
}
