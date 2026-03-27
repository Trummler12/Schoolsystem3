// ── Tag ──────────────────────────────────────────────────────────────────────

export interface TagDto {
  id: number
  name: string
  synonyms: string[]
}

export interface TagListResponse {
  items: TagDto[]
  total: number
}

// ── Topic ─────────────────────────────────────────────────────────────────────

export interface TopicTagDto {
  tagId: number
  weight: number
  label: string
}

export interface TopicLevelDto {
  levelNumber: number
  description: string
}

export interface TopicSummaryDto {
  id: string
  name: string
  typeId: number
  typeName: string
  layer: number
  description: string
  tags: TopicTagDto[]
}

export interface TopicDetailDto {
  id: string
  name: string
  typeId: number
  typeName: string
  layer: number
  description: string
  version: number
  urls: string[]
  tags: TopicTagDto[]
  levels: TopicLevelDto[]
  resources: []
}

export interface TopicListResponse {
  items: TopicSummaryDto[]
  total: number
}

export type TopicResolutionResponse =
  | { resolutionStatus: 'EXACT'; topic: TopicDetailDto }
  | { resolutionStatus: 'AMBIGUOUS'; candidates: TopicSummaryDto[] }
