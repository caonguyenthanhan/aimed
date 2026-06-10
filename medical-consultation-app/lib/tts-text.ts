const isVietnameseLang = (lang?: string) => {
  const l = String(lang || "").trim().toLowerCase()
  return l === "vi" || l.startsWith("vi-")
}

const normalizeViMedical = (input: string) => {
  let text = String(input ?? "")
  text = text.replace(/(\d{2,3})\s*\/\s*(\d{2,3})(?=\s*mmhg\b)/gi, "$1 trên $2")
  text = text.replace(/\bmmhg\b/gi, "mi li mét thủy ngân")
  text = text.replace(/(\d+(?:[.,]\d+)?)\s*mg\s*\/\s*d[lL]\b/g, "$1 mi li gam trên đề xi lít")
  text = text.replace(/(\d+(?:[.,]\d+)?)\s*g\s*\/\s*d[lL]\b/g, "$1 gam trên đề xi lít")
  text = text.replace(/(\d+(?:[.,]\d+)?)\s*mmol\s*\/\s*l\b/gi, "$1 mi li mol trên lít")
  text = text.replace(/(\d+(?:[.,]\d+)?)\s*meq\s*\/\s*l\b/gi, "$1 mi li đương lượng trên lít")
  text = text.replace(/\bmg\s*\/\s*d[lL]\b/gi, "mi li gam trên đề xi lít")
  text = text.replace(/\bg\s*\/\s*d[lL]\b/gi, "gam trên đề xi lít")
  text = text.replace(/\bmmol\s*\/\s*l\b/gi, "mi li mol trên lít")
  text = text.replace(/\bmeq\s*\/\s*l\b/gi, "mi li đương lượng trên lít")
  text = text.replace(/\bbpm\b/gi, "nhịp mỗi phút")
  text = text.replace(/\bspo2\b/gi, "S P O 2")
  text = text.replace(/(\d+(?:[.,]\d+)?)\s*°\s*c\b/gi, "$1 độ C")
  text = text.replace(/(\d+(?:[.,]\d+)?)\s*(mcg|µg)\b/gi, "$1 mi crô gam")
  text = text.replace(/(\d+(?:[.,]\d+)?)\s*mg\b/gi, "$1 mi li gam")
  text = text.replace(/(\d+(?:[.,]\d+)?)\s*g\b/gi, "$1 gam")
  text = text.replace(/(\d+(?:[.,]\d+)?)\s*kg\b/gi, "$1 ki lô gam")
  text = text.replace(/(\d+(?:[.,]\d+)?)\s*ml\b/gi, "$1 mi li lít")
  text = text.replace(/(\d+(?:[.,]\d+)?)\s*l\b/gi, "$1 lít")
  text = text.replace(/\s{2,}/g, " ")
  return text
}

export function sanitizeTtsText(input: string, opts?: { lang?: string }): string {
  let text = String(input ?? '')
  text = text.replace(/\r\n/g, '\n')
  text = text.replace(/```[\s\S]*?```/g, '')
  text = text.replace(/`([^`]+)`/g, '$1')
  text = text.replace(/!\[([^\]]*)\]\((?:[^)]+)\)/g, '$1')
  text = text.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1')
  text = text.replace(/^#{1,6}\s+/gm, '')
  text = text.replace(/^>\s?/gm, '')
  text = text.replace(/^\s*[-*+]\s+\[[xX ]\]\s+/gm, '')
  text = text.replace(/^\s*[-*+]\s+/gm, '')
  text = text.replace(/^\s*\d+\.\s+/gm, '')
  text = text.replace(/^\s*[-*_]{3,}\s*$/gm, '')
  text = text.replace(/<\/?[^>]+>/g, '')
  text = text.replace(/\*\*(.*?)\*\*/g, '$1')
  text = text.replace(/\*(.*?)\*/g, '$1')
  text = text.replace(/__(.*?)__/g, '$1')
  text = text.replace(/_(.*?)_/g, '$1')
  text = text.replace(/~~(.*?)~~/g, '$1')
  text = text.replace(/\|/g, ' ')
  if (isVietnameseLang(opts?.lang)) {
    text = normalizeViMedical(text)
  }
  text = text.replace(/[ \t]{2,}/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

