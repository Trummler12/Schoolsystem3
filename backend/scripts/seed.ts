import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// .env liegt im Repo-Root: backend/scripts/ → backend/ → Schoolsystem3/
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env') })

import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import mongoose from 'mongoose'
import { Tag, Topic, Resource } from '../src/models/index.js'

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
): Promise<Map<string, Array<{ tagId: number; weight: number; label: string }>>> {
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
  return topicTagMap
}

function buildAuthorMap(
  rows: Array<{ sauthorID: string; sauthor_name: string }>,
): Map<number, string> {
  const map = new Map<number, string>()
  for (const r of rows) map.set(Number(r.sauthorID), r.sauthor_name.trim())
  return map
}

function buildSourceTypeMap(
  rows: Array<{ stypeID: string; stype_name: string }>,
): Map<number, string> {
  const map = new Map<number, string>()
  for (const r of rows) map.set(Number(r.stypeID), r.stype_name.trim())
  return map
}

// Seeds standalone Resources from t_source.csv (rows with sa_resource=1).
// For the PoC all rows have sa_resource=1, so every source becomes a resource.
async function seedResources(
  sourceRows: Array<{ sourceID: string; source_typeID: string; source_URL: string; sauthorID: string; source_title: string; description: string; created: string; updated: string; sa_resource: string }>,
  authorMap: Map<number, string>,
  typeMap: Map<number, string>,
): Promise<void> {
  const standaloneRows = sourceRows.filter((r) => r.sa_resource === '1')
  const docs = standaloneRows.map((r) => ({
    _id: Number(r.sourceID),
    typeId: Number(r.source_typeID),
    typeName: typeMap.get(Number(r.source_typeID)) ?? '',
    url: r.source_URL.trim(),
    authorId: Number(r.sauthorID),
    authorName: authorMap.get(Number(r.sauthorID)) ?? '',
    title: r.source_title.trim(),
    description: r.description.trim(),
    createdAt: new Date(r.created),
    updatedAt: new Date(r.updated),
  }))
  await Resource.insertMany(docs, { ordered: false })
  console.log(`  Resources geseedet: ${docs.length} (von ${sourceRows.length} Sources)`)
}

// MAX_TOPICS_PER_SOURCE: how many topics a single source can be assigned to.
// Topics themselves are unbounded — any number of sources may point to them.
const MAX_TOPICS_PER_SOURCE = 5

function computeSourceTopics(
  topicTagMap: Map<string, Array<{ tagId: number; weight: number; label: string }>>,
  resourceTagRows: Array<{ resourceID: string; tagID: string; weight: string }>,
): Map<number, Array<{ topicId: string; overlapScore: number }>> {
  // Build source tag index: sourceId → [{tagId, weight}]
  const sourceTagIndex = new Map<number, Array<{ tagId: number; weight: number }>>()
  for (const r of resourceTagRows) {
    const sourceId = Number(r.resourceID)
    const entry = { tagId: Number(r.tagID), weight: Number(r.weight) }
    const list = sourceTagIndex.get(sourceId) ?? []
    list.push(entry)
    sourceTagIndex.set(sourceId, list)
  }

  // Build inverted topic index: tagId → [{topicId, weight}]
  const tagTopicIndex = new Map<number, Array<{ topicId: string; weight: number }>>()
  for (const [topicId, topicTags] of topicTagMap) {
    for (const { tagId, weight } of topicTags) {
      const list = tagTopicIndex.get(tagId) ?? []
      list.push({ topicId, weight })
      tagTopicIndex.set(tagId, list)
    }
  }

  const result = new Map<number, Array<{ topicId: string; overlapScore: number }>>()

  for (const [sourceId, sourceTags] of sourceTagIndex) {
    // Accumulate scores per topic
    const scoreMap = new Map<string, number>()
    for (const { tagId, weight: sourceWeight } of sourceTags) {
      const topics = tagTopicIndex.get(tagId)
      if (!topics) continue
      for (const { topicId, weight: topicWeight } of topics) {
        scoreMap.set(topicId, (scoreMap.get(topicId) ?? 0) + sourceWeight * topicWeight)
      }
    }

    // Top-N topics by score DESC (score > 0 only)
    const topTopics = [...scoreMap.entries()]
      .filter(([, score]) => score > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, MAX_TOPICS_PER_SOURCE)
      .map(([topicId, overlapScore]) => ({ topicId, overlapScore }))

    result.set(sourceId, topTopics)
  }

  return result
}

// ── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27042/schoolsystem3'
  await mongoose.connect(mongoUri)
  console.log('MongoDB verbunden')

  if (reset) {
    console.log('Reset-Modus: Collections werden geleert...')
    await Promise.all([Tag.deleteMany(), Topic.deleteMany(), Resource.deleteMany()])
  }

  console.log('Lade CSVs...')
  const tagRows         = loadCsv<{ tagID: string; name: string; synonyms: string }>('t_tag.csv')
  const topicRows       = loadCsv<{ topicID: string; lang: string; name: string; typeID: string; layer: string; description: string; version: string }>('t_topic.csv')
  const topicTypeRows   = loadCsv<{ typeID: string; type_name: string; definition: string }>('t_topic_type.csv')
  const urlRows         = loadCsv<{ topicID: string; urlNr: string; url: string }>('t_topic_url.csv')
  const levelRows       = loadCsv<{ topicID: string; level_number: string; description: string }>('t_topic_levels.csv')
  const tagRelRows      = loadCsv<{ topicID: string; tagID: string; weight: string }>('ct_topic_tags.csv')
  const sourceRows      = loadCsv<{ sourceID: string; source_typeID: string; source_URL: string; sauthorID: string; source_title: string; description: string; created: string; updated: string; sa_resource: string }>('t_source.csv')
  const sourceTypeRows  = loadCsv<{ stypeID: string; stype_name: string }>('t_source_type.csv')
  const authorRows      = loadCsv<{ sauthorID: string; sauthor_name: string }>('t_source_author.csv')
  const resourceTagRows = loadCsv<{ resourceID: string; tagID: string; weight: string }>('ct_resource_tags.csv')

  console.log('Seede Tags...')
  const tagLabelMap = await seedTags(tagRows)

  console.log('Seede Topics...')
  const topicTagMap = await seedTopics(topicRows, topicTypeRows, urlRows, levelRows, tagRelRows, tagLabelMap)

  console.log('Seede Resources...')
  const authorMap = buildAuthorMap(authorRows)
  const sourceTypeMap = buildSourceTypeMap(sourceTypeRows)
  await seedResources(sourceRows, authorMap, sourceTypeMap)

  console.log('Berechne Resource-Topic-Overlaps...')
  const resourceTopics = computeSourceTopics(topicTagMap, resourceTagRows)
  const bulkOps = [...resourceTopics.entries()]
    .filter(([, refs]) => refs.length > 0)
    .map(([resourceId, refs]) => ({
      updateOne: {
        filter: { _id: resourceId },
        update: { $set: { topTopics: refs } },
      },
    }))
  if (bulkOps.length > 0) {
    await Resource.bulkWrite(bulkOps)
  }
  console.log(`  topTopics geschrieben: ${bulkOps.length} Resources`)

  await mongoose.disconnect()
  console.log('Seeding abgeschlossen')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
