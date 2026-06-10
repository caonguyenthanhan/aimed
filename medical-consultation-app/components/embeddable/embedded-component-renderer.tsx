'use client'
import { MiniPsychologicalScreening } from './mini-psychological-screening'
import { EmbedTriLieu } from '@/components/embeds/embed-tri-lieu'
import { EmbedTraCuu } from '@/components/embeds/embed-tra-cuu'
import { EmbedBacSi } from '@/components/embeds/embed-bac-si'
import { EmbedKeHoach } from '@/components/embeds/embed-ke-hoach'
import { EmbedThongKe } from '@/components/embeds/embed-thong-ke'

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
        <EmbedTriLieu
          context={props?.context}
          onComplete={onClose}
          onNavigate={onExpand}
        />
      )

    case 'tra-cuu':
      return (
        <EmbedTraCuu
          context={props?.context}
          onComplete={onClose}
          onNavigate={onExpand}
        />
      )

    case 'bac-si':
      return (
        <EmbedBacSi
          context={props?.context}
          onComplete={onClose}
          onNavigate={onExpand}
        />
      )

    case 'ke-hoach':
      return (
        <EmbedKeHoach
          context={props?.context}
          onComplete={onClose}
          onNavigate={onExpand}
        />
      )

    case 'thong-ke':
      return (
        <EmbedThongKe
          context={props?.context}
          onComplete={onClose}
          onNavigate={onExpand}
        />
      )

    default:
      return null
  }
}
