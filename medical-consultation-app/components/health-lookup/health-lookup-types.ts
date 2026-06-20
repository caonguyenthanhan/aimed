"use client"

export type KnowledgeEntity = {
  id: string
  name: string
  category: string
  specialty?: string
  description?: string
}

export type KnowledgeRelation = {
  source_id: string
  target_id: string
  relation_type: string
  evidence_level?: number
  evidence_note?: string
  source_name?: string
  target_name?: string
}

export type KnowledgeIntervention = {
  id: string
  entity_id: string
  entity_name?: string
  title: string
  target_care_level: number
  content_markdown: string
}

export type HealthSuggestion = {
  name: string
  type: "Thuốc" | "Bệnh lý"
}

export type HealthLookupHistoryItem = {
  query: string
  type: string
  ts: number
}

export type HealthLookupResult = {
  id: number
  title: string
  type: string
  description: string
  severity: "high" | "medium" | "low"
  symptoms?: string[]
  dosage?: string
}
