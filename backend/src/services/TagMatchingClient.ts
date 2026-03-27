import type { TagDto } from '../types/api.js'

/** Port — swap implementations to change LLM provider */
export interface TagMatchingClient {
  findMatchingTagIds(
    interestsText: string,
    tags: TagDto[],
    language: string,
  ): Promise<number[]>
}
