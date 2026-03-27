import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// .env liegt im Repo-Root: backend/scripts/ → backend/ → Schoolsystem3/
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env') })

import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import mongoose from 'mongoose'
import { Tag, Topic } from '../src/models/index.js'

const CSV_DIR = resolve(__dirname, '../../data/import')
const reset = process.argv.includes('--reset')

// ── CSV loader ──────────────────────────────────────────────────────────────

function loadCsv<T extends Record<string, string>>(filename: string): T[] {
  const content = readFileSync(resolve(CSV_DIR, filename), 'utf-8')
  return parse(content, { columns: true, skip_empty_lines: true }) as T[]
}

// ── Seeder functions ─────────────────────────────────────────────────────────

async function seedTags(
  rows: Array<{ tagID: string; name: string; synonyms: string }>,
): Promise<Map<number, string>> {
  const docs = rows.map((r) => ({
    _id: Number(r.tagID),
    name: r.name.trim(),
    synonyms: r.synonyms.trim()
      ? r.synonyms.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  }))

  await Tag.insertMany(docs, { ordered: false })
  console.log(`  Tags geseedet: ${docs.length}`)

  const labelMap = new Map<number, string>()
  for (const d of docs) labelMap.set(d._id, d.name)
  return labelMap
}

async function seedTopics(
  topicRows: Array<{ topicID: string; lang: string; name: string; typeID: string; layer: string; description: string; version: string }>,
  typeRows: Array<{ typeID: string; type_name: string; definition: string }>,
  urlRows: Array<{ topicID: string; urlNr: string; url: string }>,
  levelRows: Array<{ topicID: string; level_number: string; description: string }>,
  tagRows: Array<{ topicID: string; tagID: string; weight: string }>,
  tagLabelMap: Map<number, string>,
): Promise<void> {
  // Build lookup maps
  const typeMap = new Map<number, string>()
  for (const t of typeRows) typeMap.set(Number(t.typeID), t.type_name.trim())

  const urlMap = new Map<string, string[]>()
  for (const u of urlRows) {
    const list = urlMap.get(u.topicID) ?? []
    list.push(u.url.trim())
    urlMap.set(u.topicID, list)
  }

  const levelMap = new Map<string, Array<{ levelNumber: number; description: string }>>()
  for (const l of levelRows) {
    const list = levelMap.get(l.topicID) ?? []
    list.push({ levelNumber: Number(l.level_number), description: l.description.trim() })
    levelMap.set(l.topicID, list)
  }

  const topicTagMap = new Map<string, Array<{ tagId: number; weight: number; label: string }>>()
  for (const tt of tagRows) {
    const tagId = Number(tt.tagID)
    const label = tagLabelMap.get(tagId) ?? ''
    const list = topicTagMap.get(tt.topicID) ?? []
    list.push({ tagId, weight: Number(tt.weight), label })
    topicTagMap.set(tt.topicID, list)
  }

  // Build Topic documents
  const docs = topicRows.map((r) => {
    const typeId = Number(r.typeID)
    return {
      _id: r.topicID,
      name: r.name.trim(),
      typeId,
      typeName: typeMap.get(typeId) ?? '',
      layer: Number(r.layer),
      description: r.description.trim(),
      version: Number(r.version),
      urls: urlMap.get(r.topicID) ?? [],
      levels: levelMap.get(r.topicID) ?? [],
      tags: topicTagMap.get(r.topicID) ?? [],
    }
  })

  await Topic.insertMany(docs, { ordered: false })
  console.log(`  Topics geseedet: ${docs.length}`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/schoolsystem3'
  await mongoose.connect(mongoUri)
  console.log('MongoDB verbunden')

  if (reset) {
    console.log('Reset-Modus: Collections werden geleert...')
    await Promise.all([Tag.deleteMany(), Topic.deleteMany()])
  }

  console.log('Lade CSVs...')
  const tagRows    = loadCsv<{ tagID: string; name: string; synonyms: string }>('t_tag.csv')
  const topicRows  = loadCsv<{ topicID: string; lang: string; name: string; typeID: string; layer: string; description: string; version: string }>('t_topic.csv')
  const typeRows   = loadCsv<{ typeID: string; type_name: string; definition: string }>('t_topic_type.csv')
  const urlRows    = loadCsv<{ topicID: string; urlNr: string; url: string }>('t_topic_url.csv')
  const levelRows  = loadCsv<{ topicID: string; level_number: string; description: string }>('t_topic_levels.csv')
  const tagRelRows = loadCsv<{ topicID: string; tagID: string; weight: string }>('ct_topic_tags.csv')

  console.log('Seede Tags...')
  const tagLabelMap = await seedTags(tagRows)

  console.log('Seede Topics...')
  await seedTopics(topicRows, typeRows, urlRows, levelRows, tagRelRows, tagLabelMap)

  await mongoose.disconnect()
  console.log('Seeding abgeschlossen')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
