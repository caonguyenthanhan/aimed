export type SafetyHit = { category: 'self_harm' | 'violence'; term: string }

const SELF_HARM_TERMS = [
  'tự tử',
  'tự sát',
  'muốn chết',
  'kết liễu',
  'nhảy lầu',
  'cắt tay',
  'cắt cổ',
  'uống thuốc quá liều',
  'quá liều',
  'overdose',
  'tôi muốn chết',
  'tôi không muốn sống nữa',
]

const VIOLENCE_TERMS = [
  'giết người',
  'giết ai đó',
  'làm hại người khác',
  'bom',
  'chế tạo bom',
]

const normalize = (text: string) => String(text || '').toLowerCase().trim().replace(/\s+/g, ' ')

export function checkText(text: string): SafetyHit[] {
  const t = normalize(text)
  if (!t) return []
  const hits: SafetyHit[] = []
  for (const term of SELF_HARM_TERMS) if (t.includes(term)) hits.push({ category: 'self_harm', term })
  for (const term of VIOLENCE_TERMS) if (t.includes(term)) hits.push({ category: 'violence', term })
  return hits
}

export function buildBlockResponse(hits: SafetyHit[]): string {
  const cats = new Set(hits.map(h => h.category))
  if (cats.has('self_harm')) {
    return [
      'Mình nghe bạn đang ở trong trạng thái rất khó chịu. Vì an toàn của bạn, mình không thể hỗ trợ nội dung liên quan đến tự làm hại bản thân.',
      '',
      'Nếu bạn đang có ý định hoặc cảm thấy có thể làm hại bản thân ngay lúc này:',
      '- Gọi số khẩn cấp tại nơi bạn đang ở (115 ở Việt Nam) hoặc nhờ người thân ở cạnh.',
      '- Nếu có thể, hãy đến cơ sở y tế gần nhất hoặc gọi người thân/bạn bè tin cậy.',
      '',
      'Nếu bạn muốn, bạn có thể nói: lúc này cảm xúc nào đang mạnh nhất, và điều gì vừa xảy ra trước đó?',
    ].join('\n')
  }
  return [
    'Vì an toàn, mình không thể hỗ trợ nội dung liên quan đến gây hại cho người khác hoặc hướng dẫn bạo lực.',
    '',
    'Nếu bạn đang mất kiểm soát, hãy rời khỏi tình huống ngay và tìm hỗ trợ từ người thân hoặc dịch vụ khẩn cấp tại nơi bạn đang ở.',
  ].join('\n')
}

export function shouldBlock(userText: string, history?: Array<{ role?: string; content?: string }>): SafetyHit[] {
  const parts: string[] = [String(userText || '')]
  if (Array.isArray(history)) {
    for (const m of history.slice(-8)) {
      if (String(m?.role || '').toLowerCase() === 'user') parts.push(String(m?.content || ''))
    }
  }
  return checkText(parts.join(' '))
}

