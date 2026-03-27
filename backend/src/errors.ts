export class TopicNotFoundError extends Error {
  readonly statusCode = 404
  constructor(topicId: string) {
    super(`Topic not found: ${topicId}`)
    this.name = 'TopicNotFoundError'
  }
}

export class BadRequestError extends Error {
  readonly statusCode = 400
  constructor(message: string) {
    super(message)
    this.name = 'BadRequestError'
  }
}

export class LLMUnavailableError extends Error {
  readonly statusCode = 502
  constructor(cause?: string) {
    super(cause ? `LLM provider unavailable: ${cause}` : 'LLM provider unavailable')
    this.name = 'LLMUnavailableError'
  }
}
