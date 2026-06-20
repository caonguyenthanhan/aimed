"use client"

export type WebSearchItem = {
  title: string
  link: string
  snippet: string
  displayLink?: string
}

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

export const RIGHT_RATIO_KEY = "mcs_news_right_ratio_v1"
export const DEFAULT_QUERY = "tin-tuc-y-khoa"
export const DEFAULT_GOOGLE_NEWS_URL = `https://www.google.com.vn/search?tbm=nws&q=${encodeURIComponent(DEFAULT_QUERY)}`
