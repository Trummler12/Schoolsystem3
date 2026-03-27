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

/** Lightweight shape used in list views */
export interface TopicSummaryDto {
  id: string
  name: string
  typeId: number
  typeName: string
  layer: number
  description: string
  tags: TopicTagDto[]
}

/** Full shape used in detail view */
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
  resources: []   // placeholder — populated in Slice 2c
}

export interface TopicListResponse {
  items: TopicSummaryDto[]
  total: number
}

export type TopicResolutionResponse =
  | { resolutionStatus: 'EXACT'; topic: TopicDetailDto }
  | { resolutionStatus: 'AMBIGUOUS'; candidates: TopicSummaryDto[] }

// ── Error ─────────────────────────────────────────────────────────────────────

export interface ErrorResponse {
  error: string
  message: string
  status: number
  path: string
  timestamp: string
}
