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

export interface ResourceDto {
  id: number
  title: string
  url: string
  description: string
  typeName: string
  authorName: string
  overlapScore: number
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
  resources: ResourceDto[]
}

export interface TopicListResponse {
  items: TopicSummaryDto[]
  total: number
}

export type TopicResolutionResponse =
  | { resolutionStatus: 'EXACT'; topic: TopicDetailDto }
  | { resolutionStatus: 'AMBIGUOUS'; candidates: TopicSummaryDto[] }

// ── Interest Search ───────────────────────────────────────────────────────────

/** A tag selected by the LLM, with its assigned interest weight */
export interface InterestMatchedTagDto {
  tagId: number
  label: string
  interestWeight: number
}

/** Per-tag score breakdown (only present when explainMatches=true) */
export interface InterestTopicMatchedTagDto {
  tagId: number
  label: string
  interestWeight: number
  topicWeight: number
  contribution: number
}

/** A scored topic in the interest-search results */
export interface InterestTopicResultDto {
  id: string
  name: string
  typeName: string
  layer: number
  score: number
  matchedTags?: InterestTopicMatchedTagDto[]
}

export interface InterestSearchRequestDto {
  interestsText: string
  language?: string
  maxResults?: number
  explainMatches?: boolean
}

export interface InterestSearchResponseDto {
  interestsText: string
  usedLanguage: string
  matchedTags: InterestMatchedTagDto[]
  topics: InterestTopicResultDto[]
}

// ── Error ─────────────────────────────────────────────────────────────────────

export interface ErrorResponse {
  error: string
  message: string
  status: number
  path: string
  timestamp: string
}
