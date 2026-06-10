/**
 * Medical disclaimer text injected into every AI consultation response.
 * WHY: legally required in most jurisdictions — AI medical guidance must
 * be clearly labeled as informational, not a substitute for professional care.
 */
const DISCLAIMER_LINES = [
  "---",
  "**Lưu ý quan trọng:** Thông tin trên chỉ mang tính chất tham khảo và không thay thế cho tư vấn y khoa chuyên nghiệp. Mọi chẩn đoán, kê đơn thuốc hoặc quyết định điều trị cần được thực hiện bởi bác sĩ có chuyên môn. Trong trường hợp khẩn cấp, hãy gọi 115 hoặc đến cơ sở y tế gần nhất.",
]

export const MEDICAL_DISCLAIMER = DISCLAIMER_LINES.join("\n")

/**
 * Appends the medical disclaimer to a response string.
 * Only adds it if the response doesn't already contain a disclaimer marker.
 */
export function appendMedicalDisclaimer(response: string): string {
  if (response.includes("---") && response.includes("Lưu ý quan trọng")) {
    return response
  }
  return `${response}\n\n${MEDICAL_DISCLAIMER}`
}
