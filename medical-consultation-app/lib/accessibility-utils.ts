// Accessibility utilities for chat applications

// Generate screen reader text for messages
export function generateMessageA11yText(
  content: string,
  role: 'user' | 'assistant',
  timestamp?: Date
): string {
  const roleText = role === 'user' ? 'Bạn' : 'Trợ lý AI'
  const timeText = timestamp ? ` lúc ${timestamp.toLocaleTimeString('vi-VN')}` : ''
  return `${roleText} nói${timeText}: ${content}`
}

// Generate skip links for keyboard navigation
export const SKIP_LINKS = {
  MAIN_CONTENT: 'main-content',
  CHAT_INPUT: 'chat-input',
  MESSAGE_LIST: 'message-list',
  CONVERSATION_LIST: 'conversation-list',
}

// Create keyboard event handler
export function createKeyboardHandler(handlers: Record<string, () => void>) {
  return (e: React.KeyboardEvent) => {
    const handler = handlers[e.key.toLowerCase()]
    if (handler && !e.defaultPrevented) {
      e.preventDefault()
      handler()
    }
  }
}

// Announce to screen readers
export function announceToScreenReader(message: string, polite: boolean = true) {
  const existing = document.querySelector('[role="status"]')
  if (existing) {
    existing.textContent = message
  } else {
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', polite ? 'polite' : 'assertive')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    document.body.appendChild(announcement)
    
    setTimeout(() => announcement.remove(), 3000)
  }
}

// Focus management
export function focusElement(selector: string | HTMLElement) {
  const element = typeof selector === 'string'
    ? document.querySelector(selector)
    : selector
  
  if (element instanceof HTMLElement) {
    element.focus()
    // Scroll into view with smooth behavior
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

// Trap focus within modal
export function createFocusTrap(container: HTMLElement) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
  
  return (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }
  }
}

// Validate color contrast (WCAG AA standard: 4.5:1 for text)
export function getContrastRatio(rgb1: string, rgb2: string): number {
  const getLuminance = (rgb: string) => {
    const [r, g, b] = rgb.match(/\d+/g)?.map(Number) || [0, 0, 0]
    const [rs, gs, bs] = [r, g, b].map(x => {
      x = x / 255
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }
  
  const l1 = getLuminance(rgb1)
  const l2 = getLuminance(rgb2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

// Generate aria-label for complex UI components
export function generateAriaLabel(
  type: string,
  props: Record<string, any>
): string {
  const labels = {
    'message': `Tin nhắn từ ${props.role === 'user' ? 'bạn' : 'trợ lý'}${
      props.timestamp ? ` lúc ${props.timestamp}` : ''
    }`,
    'conversation': `Hội thoại: ${props.title}${
      props.lastActive ? ` lần cuối ${props.lastActive}` : ''
    }`,
    'button': props.title || props.label || 'Nút',
    'input': props.placeholder || props.label || 'Nhập',
  }
  
  return labels[type] || 'Thành phần UI'
}

// Ensure semantic HTML structure
export const SEMANTIC_ROLES = {
  MAIN_CHAT: 'main',
  SIDEBAR: 'complementary',
  HEADER: 'banner',
  NAV: 'navigation',
  FOOTER: 'contentinfo',
  SEARCH: 'search',
  STATUS: 'status',
  ALERT: 'alert',
}
