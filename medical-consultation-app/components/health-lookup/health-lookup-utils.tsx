"use client"

import { Activity, Book, Pill } from "lucide-react"
import type { HealthLookupResult } from "@/components/health-lookup/health-lookup-types"

export function classify_query(query: string) {
  const text = query.toLowerCase()
  const drugHints = ["thuốc", "viên", "mg", "mcg", "ml", "%", "dạng", "sirô", "siro", "kem", "mỡ", "ống", "chai", "hàm lượng", "liều"]
  const diseaseHints = ["bệnh", "hội chứng", "viêm", "ung thư", "tiểu đường", "cao huyết áp", "tim mạch", "hen", "suy", "nhiễm", "vi rút", "virus", "vi khuẩn"]
  const symptomHints = ["triệu chứng", "dấu hiệu", "đau", "nhức", "sốt", "ho", "mệt", "mệt mỏi", "chóng mặt", "buồn nôn", "phát ban", "khó thở", "tiêu chảy", "táo bón", "đau đầu"]
  const medicalContextHints = ["chẩn đoán", "điều trị", "phòng ngừa", "tác dụng phụ", "dược", "y khoa", "bác sĩ", "liều dùng"]
  const isDrug = drugHints.some((keyword) => text.includes(keyword)) || /\b\d+\s?(mg|ml|mcg|%)(\b|$)/.test(text)
  const isSymptom = symptomHints.some((keyword) => text.includes(keyword))
  const isDisease = diseaseHints.some((keyword) => text.includes(keyword))
  const looksMedical = isDrug || isSymptom || isDisease || medicalContextHints.some((keyword) => text.includes(keyword))

  if (isDrug) return { mode: "drug", type: "Thuốc", isMedical: true }
  if (isDisease) return { mode: "disease", type: "Bệnh lý", isMedical: true }
  if (isSymptom) return { mode: "symptom", type: "Triệu chứng", isMedical: true }
  return { mode: undefined, type: looksMedical ? "Thông tin y khoa" : "Không liên quan", isMedical: looksMedical }
}

export function get_severity_color(severity: string) {
  switch (severity) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200"
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "low":
      return "bg-green-100 text-green-800 border-green-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export function get_type_badge_class(type: string) {
  switch (type) {
    case "Thuốc":
      return "bg-[#48bb78]/15 text-[#2f855a] border-[#48bb78]/40"
    case "Bệnh lý":
      return "bg-[#f56565]/15 text-[#c53030] border-[#f56565]/40"
    case "Triệu chứng":
      return "bg-[#9f7aea]/15 text-[#6b46c1] border-[#9f7aea]/40"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export function get_type_icon(type: string) {
  switch (type) {
    case "Bệnh lý":
      return <Activity className="h-4 w-4" />
    case "Thuốc":
      return <Pill className="h-4 w-4" />
    default:
      return <Book className="h-4 w-4" />
  }
}

export function copy_lookup_result(result: HealthLookupResult) {
  const text = `${result.title}\n${typeof result.description === "string" ? result.description : ""}`.trim()
  try {
    navigator.clipboard.writeText(text)
  } catch {}
}

export async function share_lookup_result(result: HealthLookupResult) {
  const text = `${result.title}\n${typeof result.description === "string" ? result.description : ""}`.trim()
  try {
    if ((navigator as any).share) {
      await (navigator as any).share({ title: result.title, text })
    } else {
      navigator.clipboard.writeText(text)
    }
  } catch {}
}
