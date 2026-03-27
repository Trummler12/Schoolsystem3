import type { TagDto } from '../types/api.js'
import type { TagMatchingClient } from './TagMatchingClient.js'

/** Stub — used until a real LLM provider is configured */
export class StubTagMatchingClient implements TagMatchingClient {
  async findMatchingTagIds(
    _interestsText: string,
    _tags: TagDto[],
    _language: string,
  ): Promise<number[]> {
    console.warn('StubTagMatchingClient: no LLM provider configured — returning empty matches')
    return []
  }
}
