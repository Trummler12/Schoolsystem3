import { Tag, Topic } from '../models/index.js'
import type { TagMatchingClient } from './TagMatchingClient.js'
import type {
  InterestMatchedTagDto,
  InterestSearchRequestDto,
  InterestSearchResponseDto,
  InterestTopicMatchedTagDto,
  InterestTopicResultDto,
} from '../types/api.js'

// ── Weight matrix (ported from Schoolsystem2) ────────────────────────────────

const WEIGHT_MATRIX: Record<number, number[]> = {
  3: [5, 4, 3, 1],
  4: [5, 4, 3, 2, 1],
  5: [5, 4, 3, 3, 1],
  6: [5, 4, 3, 2, 2, 1],
  7: [5, 4, 3, 3, 2, 1],
  8: [5, 4, 3, 3, 2, 1, 1],
}
const MAX_LAYER_EQ = 8

function computeLayerEquivalent(textLength: number): number {
  return Math.min(3 + Math.max(0, Math.floor(Math.log2(textLength / 50))), MAX_LAYER_EQ)
}

function getWeights(textLength: number): number[] {
  const layerEq = computeLayerEquivalent(textLength)
  return WEIGHT_MATRIX[layerEq] ?? WEIGHT_MATRIX[MAX_LAYER_EQ]
}

// ── Service ───────────────────────────────────────────────────────────────────

export class InterestSearchService {
  private readonly tagMatchingClient: TagMatchingClient

  constructor(tagMatchingClient: TagMatchingClient) {
    this.tagMatchingClient = tagMatchingClient
  }

  async search(request: InterestSearchRequestDto): Promise<InterestSearchResponseDto> {
    const {
      interestsText,
      language = 'en',
      maxResults,
      explainMatches = false,
    } = request

    // 1. Load all tags and call LLM
    const allTags = await Tag.find().lean()
    const tagDtos = allTags.map((t) => ({
      id: t._id as number,
      name: t.name,
      synonyms: t.synonyms ?? [],
    }))

    const matchedTagIds = await this.tagMatchingClient.findMatchingTagIds(
      interestsText,
      tagDtos,
      language,
    )

    // 2. Assign interest weights by position
    const weights = getWeights(interestsText.length)
    const tagLabelMap = new Map(allTags.map((t) => [t._id as number, t.name]))

    const matchedTags: InterestMatchedTagDto[] = matchedTagIds.map((tagId, idx) => ({
      tagId,
      label: tagLabelMap.get(tagId) ?? String(tagId),
      interestWeight: weights[idx] ?? 1,
    }))

    const interestWeightMap = new Map(matchedTags.map((t) => [t.tagId, t.interestWeight]))

    // 3. Load topics and score
    const allTopics = await Topic.find().select('_id name typeName layer tags').lean()
    const totalTopics = allTopics.length

    const scored: Array<{ topic: typeof allTopics[0]; score: number; breakdown: InterestTopicMatchedTagDto[] }> = []

    for (const topic of allTopics) {
      let score = 0
      const breakdown: InterestTopicMatchedTagDto[] = []

      for (const tt of topic.tags ?? []) {
        const interestWeight = interestWeightMap.get(tt.tagId)
        if (interestWeight === undefined) continue

        const topicWeight = tt.weight
        const contribution = interestWeight * topicWeight
        score += contribution

        if (explainMatches) {
          breakdown.push({
            tagId: tt.tagId,
            label: tt.label,
            interestWeight,
            topicWeight,
            contribution,
          })
        }
      }

      if (score > 0) {
        scored.push({ topic, score, breakdown })
      }
    }

    // 4. Sort DESC, apply limit
    scored.sort((a, b) => b.score - a.score)

    const defaultLimit = Math.max(5, Math.floor(totalTopics * 0.1))
    const limit = Math.min(maxResults ?? defaultLimit, defaultLimit)

    const topics: InterestTopicResultDto[] = scored.slice(0, limit).map(({ topic, score, breakdown }) => ({
      id: topic._id as string,
      name: topic.name,
      typeName: topic.typeName,
      layer: topic.layer,
      score,
      ...(explainMatches ? { matchedTags: breakdown } : {}),
    }))

    return { interestsText, usedLanguage: language, matchedTags, topics }
  }
}
