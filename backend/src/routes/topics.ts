import type { FastifyInstance } from 'fastify'
import { Topic } from '../models/index.js'
import { TopicNotFoundError, BadRequestError, LLMUnavailableError } from '../errors.js'
import { InterestSearchService } from '../services/InterestSearchService.js'
import { StubTagMatchingClient } from '../services/StubTagMatchingClient.js'
import type {
  TopicListResponse,
  TopicResolutionResponse,
  TopicSummaryDto,
  TopicDetailDto,
  InterestSearchRequestDto,
  InterestSearchResponseDto,
} from '../types/api.js'

const interestSearchService = new InterestSearchService(new StubTagMatchingClient())

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function topicRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/v1/topics
  app.get<{
    Querystring: {
      tag?: string
      maxLayer?: string
      showCourses?: string
      showAchievements?: string
      sortBy?: string
      sortDirection?: string
    }
  }>(
    '/api/v1/topics',
    async (request): Promise<TopicListResponse> => {
      const {
        tag,
        maxLayer,
        showCourses = 'true',
        showAchievements = 'true',
        sortBy = 'name',
        sortDirection = 'asc',
      } = request.query

      const filter: Record<string, unknown> = {}

      if (tag !== undefined) {
        const tagId = Number(tag)
        if (!Number.isInteger(tagId) || tagId <= 0) {
          throw new BadRequestError(`Invalid tag id: ${tag}`)
        }
        filter['tags.tagId'] = tagId
      }

      if (maxLayer !== undefined) {
        const layer = Number(maxLayer)
        if (!Number.isInteger(layer) || layer < 1) {
          throw new BadRequestError(`Invalid maxLayer: ${maxLayer}`)
        }
        filter['layer'] = { $lte: layer }
      }

      if (showCourses === 'false') {
        filter['typeId'] = { ...(filter['typeId'] as object ?? {}), $nin: [4, 5] }
      }

      if (showAchievements === 'false') {
        const existing = (filter['typeId'] as { $nin?: number[] } | undefined) ?? {}
        filter['typeId'] = { ...existing, $nin: [...(existing.$nin ?? []), 3] }
      }

      const sortField = sortBy === 'layer' ? 'layer' : 'name'
      const sortOrder = sortDirection === 'desc' ? -1 : 1

      const docs = await Topic.find(filter)
        .select('_id name typeId typeName layer description tags')
        .sort({ [sortField]: sortOrder })
        .lean()

      const items: TopicSummaryDto[] = docs.map((d) => ({
        id: d._id as string,
        name: d.name,
        typeId: d.typeId,
        typeName: d.typeName,
        layer: d.layer,
        description: d.description,
        tags: d.tags ?? [],
      }))

      return { items, total: items.length }
    },
  )

  // GET /api/v1/topics/:topicId
  app.get<{ Params: { topicId: string } }>(
    '/api/v1/topics/:topicId',
    async (request): Promise<TopicResolutionResponse> => {
      const { topicId } = request.params

      // 1. Exact match (case-insensitive)
      const exact = await Topic.findOne({
        _id: new RegExp(`^${escapeRegex(topicId)}$`, 'i'),
      }).lean()

      if (exact) {
        const topic: TopicDetailDto = {
          id: exact._id as string,
          name: exact.name,
          typeId: exact.typeId,
          typeName: exact.typeName,
          layer: exact.layer,
          description: exact.description,
          version: exact.version,
          urls: exact.urls ?? [],
          tags: exact.tags ?? [],
          levels: exact.levels ?? [],
          resources: [],
        }
        return { resolutionStatus: 'EXACT', topic }
      }

      // 2. Prefix match for AMBIGUOUS
      const candidates = await Topic.find({
        _id: new RegExp(`^${escapeRegex(topicId)}`, 'i'),
      })
        .select('_id name typeId typeName layer description tags')
        .lean()

      if (candidates.length > 0) {
        const summaries: TopicSummaryDto[] = candidates.map((d) => ({
          id: d._id as string,
          name: d.name,
          typeId: d.typeId,
          typeName: d.typeName,
          layer: d.layer,
          description: d.description,
          tags: d.tags ?? [],
        }))
        return { resolutionStatus: 'AMBIGUOUS', candidates: summaries }
      }

      throw new TopicNotFoundError(topicId)
    },
  )

  // POST /api/v1/topics/interest-search
  app.post<{ Body: InterestSearchRequestDto }>(
    '/api/v1/topics/interest-search',
    async (request): Promise<InterestSearchResponseDto> => {
      const { interestsText } = request.body ?? {}

      if (typeof interestsText !== 'string' || interestsText.length < 12) {
        throw new BadRequestError('interestsText must be at least 12 characters')
      }
      if (interestsText.length > 2048) {
        throw new BadRequestError('interestsText must not exceed 2048 characters')
      }

      try {
        return await interestSearchService.search(request.body)
      } catch (err) {
        if (err instanceof BadRequestError || err instanceof LLMUnavailableError) throw err
        throw new LLMUnavailableError(err instanceof Error ? err.message : undefined)
      }
    },
  )
}
