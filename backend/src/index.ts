import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// .env liegt im Repo-Root (eine Ebene über backend/)
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env') })

import Fastify, { type FastifyError } from 'fastify'
import cors from '@fastify/cors'
import mongoose from 'mongoose'
import { TopicNotFoundError, BadRequestError } from './errors.js'
import type { ErrorResponse } from './types/api.js'
import { tagRoutes } from './routes/tags.js'
import { topicRoutes } from './routes/topics.js'

const server = Fastify({ logger: true })

await server.register(cors)

server.setErrorHandler((error: FastifyError, request, reply) => {
  const status =
    error instanceof TopicNotFoundError || error instanceof BadRequestError
      ? error.statusCode
      : (error.statusCode ?? 500)

  const body: ErrorResponse = {
    error: error.name ?? 'InternalServerError',
    message: error.message,
    status,
    path: request.url,
    timestamp: new Date().toISOString(),
  }

  reply.status(status).send(body)
})

server.get('/health', async () => {
  return { status: 'ok' }
})

await server.register(tagRoutes)
await server.register(topicRoutes)

const start = async () => {
  try {
    const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/schoolsystem3'
    await mongoose.connect(mongoUri)
    server.log.info('MongoDB verbunden')

    const port = Number(process.env.PORT ?? 3000)
    await server.listen({ port, host: '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
