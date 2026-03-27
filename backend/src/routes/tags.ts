import type { FastifyInstance } from 'fastify'
import { Tag } from '../models/index.js'
import type { TagListResponse } from '../types/api.js'

export async function tagRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/tags', async (): Promise<TagListResponse> => {
    const docs = await Tag.find().sort({ name: 1 }).lean()
    const items = docs.map((d) => ({
      id: d._id as number,
      name: d.name,
      synonyms: d.synonyms ?? [],
    }))
    return { items, total: items.length }
  })
}
