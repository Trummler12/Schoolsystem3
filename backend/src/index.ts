import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// .env liegt im Repo-Root (eine Ebene über backend/)
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env') })

import Fastify from 'fastify'
import cors from '@fastify/cors'
import mongoose from 'mongoose'

const server = Fastify({ logger: true })

await server.register(cors)

server.get('/health', async () => {
  return { status: 'ok' }
})

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
