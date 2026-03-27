import type { FastifyInstance } from 'fastify'
import { Topic } from '../models/index.js'
import { TopicNotFoundError, BadRequestError } from '../errors.js'
import type {
  TopicListResponse,
  TopicResolutionResponse,
  TopicSummaryDto,
  TopicDetailDto,
} from '../types/api.js'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function topicRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/v1/topics?tag=<tagId>
  app.get<{ Querystring: { tag?: string } }>(
    '/api/v1/topics',
    async (request): Promise<TopicListResponse> => {
      const { tag } = request.query

      const filter: Record<string, unknown> = {}

      if (tag !== undefined) {
        const tagId = Number(tag)
        if (!Number.isInteger(tagId) || tagId <= 0) {
          throw new BadRequestError(`Invalid tag id: ${tag}`)
        }
        filter['tags.tagId'] = tagId
      }

      const docs = await Topic.find(filter)
        .select('_id name typeId typeName layer description tags')
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
}
