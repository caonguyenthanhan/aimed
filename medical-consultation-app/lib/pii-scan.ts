export type PiiFindingType =
  | "email"
  | "phone"
  | "age"
  | "patient_name_marker"
  | "address_marker"
  | "dob"
  | "id_number"

export type PiiFinding = {
  type: PiiFindingType
  label: string
  match: string
}

function addFinding(findings: PiiFinding[], type: PiiFindingType, label: string, match: string) {
  const m = String(match || "").trim()
  if (!m) return
  if (findings.some((f) => f.type === type && f.match === m)) return
  findings.push({ type, label, match: m.slice(0, 120) })
}

export function scanPii(text: string): { blocked: boolean; findings: PiiFinding[] } {
  const t = String(text || "")
  const findings: PiiFinding[] = []

  for (const m of t.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
    addFinding(findings, "email", "Email", m[0])
  }

  for (const m of t.matchAll(/(?:\+?84|0)\s?(?:\d[\s.-]?){8,10}\d/g)) {
    addFinding(findings, "phone", "Số điện thoại", m[0])
  }

  for (const m of t.matchAll(/\b(\d{1,3})\s*tuổi\b/gi)) {
    addFinding(findings, "age", "Tuổi", m[0])
  }

  for (const m of t.matchAll(/\b(?:tên\s*[:\-]|bệnh\s*nhân\s*[:\-]|bn\s*[:\-]|họ\s*tên\s*[:\-])\s*[^\n]{2,80}/gi)) {
    addFinding(findings, "patient_name_marker", "Dấu hiệu tên bệnh nhân", m[0])
  }

  for (const m of t.matchAll(/\b(?:địa\s*chỉ\s*[:\-]|số\s*nhà\s*[:\-]|phường|quận|huyện|tỉnh|thành\s*phố)\b[^\n]{0,80}/gi)) {
    addFinding(findings, "address_marker", "Dấu hiệu địa chỉ", m[0])
  }

  for (const m of t.matchAll(/\b(?:ngày\s*sinh|dob)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/gi)) {
    addFinding(findings, "dob", "Ngày sinh", m[0])
  }

  for (const m of t.matchAll(/\b(?:cccd|cmnd|căn\s*cước|chứng\s*minh)\s*[:\-]?\s*\d{6,15}\b/gi)) {
    addFinding(findings, "id_number", "Số giấy tờ", m[0])
  }

  return { blocked: findings.length > 0, findings }
}

