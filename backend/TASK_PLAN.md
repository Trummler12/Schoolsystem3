# Backend — Task Plan

## Mode & Score
Mode: plan-gate, Score: 6 (>2 files +2, cross-file coupling +2, no tests +1, diff >50 LOC +1)

## Task Scope Paths
- AKSEP/Schoolsystem3/backend/**
- AKSEP/Schoolsystem3/TASK_PLAN.md
- AKSEP/Schoolsystem3/backend/TASK_PLAN.md

---

# Slice 2a: Topics + Tags
<a name="slice-2a-routes"></a>

## Discovery

### CSV-Struktur (relevante Files für Slice 2a)

| Datei | Spalten | Anmerkung |
|-------|---------|-----------|
| `t_tag.csv` | `tagID, name, synonyms` | synonyms = leerer String oder CSV-Liste |
| `t_topic.csv` | `topicID, lang, name, typeID, layer, description, version, url` | url-Spalte = redundant mit t_topic_url; lang immer "en" |
| `t_topic_type.csv` | `typeID, type_name, definition` | 8 Typen; wird in Topic denormalisiert |
| `t_topic_levels.csv` | `topicID, level_number, description` | nicht alle Topics haben Levels |
| `t_topic_url.csv` | `topicID, urlNr, url` | Liste von URLs pro Topic |
| `ct_topic_tags.csv` | `topicID, tagID, weight` | weight 1–5; n:m zwischen Topic und Tag |

### Mongoose-Schema-Design-Entscheidung

**Topics:** `_id` = topicID-String (z.B. "ART0") — natürlicher Dokumenten-Key, kein extra Index nötig.

Eingebettete Sub-Dokumente (keine separaten Collections für diese):
- `levels[]` — nur beim jeweiligen Topic sinnvoll, nie eigenständig abgefragt
- `urls[]` — einfaches String-Array
- `tags[]` — `{ tagId, weight, label }` — **label wird beim Seeden denormalisiert** (join mit t_tag), vermeidet populate() bei jedem API-Call

**Tags:** `_id` = tagID-Nummer (Integer). Eigene Collection, weil Tag-Liste auch separat per `GET /api/v1/tags` exponiert wird.

**TopicType:** Nicht als eigene Collection — nur `typeId` und `typeName` direkt im Topic-Dokument denormalisiert (8 statische Typen, nie eigenständig abgefragt).

### API-Vertrag (aus api-contract.md, Auszug für Slice 2a)

```
GET /api/v1/topics
  ?maxLayer=2 &showCourses=true &showAchievements=false
  &sortBy=name &sortDirection=asc &lang=en
→ { items: TopicSummaryDto[], total: number }

GET /api/v1/topics/:topicId
→ { resolutionStatus: "EXACT"|"AMBIGUOUS", topic?: TopicDetailDto, candidates?: [...] }
→ 404 wenn nicht gefunden

GET /api/v1/tags
→ { items: TagDto[], total: number }
```

TopicDetailDto enthält `resources: []` (leer in Slice 2a — ct_resource_to_topic noch nicht befüllt).

Status: READY

---

## Planning

### Seeder-Strategie

Ladereihenfolge (Abhängigkeiten beachten):
1. Tags laden (t_tag.csv) → Tag-Collection — wird für Label-Denormalisierung in Schritt 2 benötigt
2. Topics aufbauen (Join aus 4 CSVs in Memory):
   - t_topic.csv → Basis
   - t_topic_type.csv → typeName denormalisieren
   - t_topic_url.csv → urls[] aufbauen (t_topic.url-Spalte ignorieren — Duplikat)
   - t_topic_levels.csv → levels[] aufbauen
   - ct_topic_tags.csv → tags[] aufbauen mit label aus Schritt 1

Alle CSV-Joins in Memory (kein DB-Lookup während Seeding). Tags-Map (tagId → label) als Lookup-Table.

Reset-Modus (`--reset`): `Tag.deleteMany()` + `Topic.deleteMany()` vor dem Insert.

### Route-Design

**`GET /api/v1/topics`**
- Mongoose-Query mit Filter-Params:
  - `maxLayer` → `{ layer: { $lte: maxLayer } }`
  - `showCourses: false` → typeId nicht in [4, 5] (General Course, Optional Course)
  - `showAchievements: false` → typeId !== 3 (Achievement)
- Projektion: nur TopicSummaryDto-Felder zurückgeben (kein `levels`)
- Sort: `sortBy=name` → `{ name: 1 }`, `sortBy=layer` → `{ layer: 1 }`

**`GET /api/v1/topics/:topicId`**
- Exact match: `Topic.findById(topicId)` (case-sensitive)
- Kein Treffer → Case-insensitive Suche mit escaped Input:
  `{ _id: { $regex: new RegExp('^' + topicId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }`
  (ReDoS-Schutz: Regex-Sonderzeichen im topicId werden escaped)
  - 0 Treffer → 404
  - 1 Treffer → EXACT mit dem gefundenen Topic
  - >1 Treffer → AMBIGUOUS mit Kandidaten-Liste

**`GET /api/v1/tags`**
- `Tag.find().sort({ _id: 1 })`
- Kein Paging nötig (Anzahl überschaubar)

### Error-Handler

Zentraler Fastify-Error-Handler (einmalig in index.ts registrieren):
```ts
{ error: string, message: string, status: number, path: string, timestamp: string }
```
Custom Error-Klassen: `TopicNotFoundError`, `BadRequestError`.

Status: READY FOR APPROVAL

---

## Pre-Approval Checklist
- [x] Discovery: Status = READY
- [x] Planning: Status = READY FOR APPROVAL
- [x] Steps sind atomar (pro File + Anchor)
- [x] Developer Interactions vorhanden (leer)
- [x] Checks vorhanden
- [x] Mode & Score gesetzt

---

## Implementation Steps — Slice 2a

0) **Plan Sync:** Dieses Dokument laden; Developer Interactions prüfen.

### Block A: Models

**A1)** `backend/src/models/Tag.ts` — anlegen
```
TagSchema: { _id: Number, name: String, synonyms: [String] }
export const Tag = mongoose.model('Tag', TagSchema)
```

**A2)** `backend/src/models/Topic.ts` — anlegen
```
TopicSchema: {
  _id: String,           // topicID
  name: String,
  typeId: Number,
  typeName: String,      // denormalisiert
  layer: Number,
  description: String,
  version: Number,
  urls: [String],
  levels: [{ levelNumber: Number, description: String }],
  tags: [{ tagId: Number, weight: Number, label: String }]
}
export const Topic = mongoose.model('Topic', TopicSchema)
```

**A3)** `backend/src/models/index.ts` — Re-Export beider Models

→ **Commit nach A1–A3:**
```
feat(backend/models): add Tag and Topic Mongoose schemas;

- Tag: _id=number, name, synonyms[]
- Topic: _id=topicId string, embedded levels/urls/tags (label denormalized)
- typeId + typeName denormalized (no separate TopicType collection)
```

---

### Block B: Seeder

**B1)** `backend/scripts/seed.ts` — vollständig implementieren

Funktionen:
- `loadCsv<T>(filename): T[]` — liest aus `../../data/import/`, parst mit csv-parse sync
- `seedTags(rows)` — Tag-Dokumente bauen und inserten; gibt `Map<number, string>` zurück (tagId → label)
- `seedTopics(topicRows, typeRows, urlRows, levelRows, tagRows, tagLabelMap)` — Join in Memory, Topic-Dokumente bauen und inserten
- `main()` — Einstiegspunkt, Reset-Logik, Reihenfolge

Absoluter Pfad für CSV-Ordner: `resolve(dirname(fileURLToPath(import.meta.url)), '../../data/import')`
(backend/scripts/ → backend/ → Schoolsystem3/ → data/import)

→ **Commit nach B1:**
```
feat(backend/seeder): implement Slice 2a CSV loading (tags + topics);

- loads t_tag, t_topic, t_topic_type, t_topic_levels, t_topic_url, ct_topic_tags
- joins in-memory: typeName + urls[] + levels[] + tags[]{tagId,weight,label} per topic
- supports --reset flag (deleteMany before insert)
```

---

### Block C: Shared Types + Error-Handler

**C1)** `backend/src/types/api.ts` — DTOs als TypeScript-Interfaces
```ts
TopicSummaryDto, TopicDetailDto, TagDto,
TopicListResponse, TagListResponse,
TopicResolutionResponse, ErrorResponse
```

**C2)** `backend/src/errors.ts` — Custom Error-Klassen
```ts
export class TopicNotFoundError extends Error { ... }
export class BadRequestError extends Error { ... }
```

**C3)** `backend/src/index.ts` — zentralen Error-Handler registrieren (setErrorHandler)

→ **Commit nach C1–C3:**
```
feat(backend): add API types, custom errors and central error handler
```

---

### Block D: Routes

**D1)** `backend/src/routes/tags.ts` — `GET /api/v1/tags`
```ts
Tag.find().sort({ _id: 1 }) → TagListResponse
```

**D2)** `backend/src/routes/topics.ts` — `GET /api/v1/topics`
- Query-Params parsen + validieren (maxLayer default 2, showCourses default true, etc.)
- Mongoose-Filter aufbauen
- Projektion: nur SummaryDto-Felder
- Rückgabe: `{ items: TopicSummaryDto[], total }`

**D3)** `backend/src/routes/topics.ts` (erweitern) — `GET /api/v1/topics/:topicId`
- Exact-match → EXACT
- Case-insensitive Fallback → AMBIGUOUS oder 404
- Rückgabe: `TopicResolutionResponse` (`resources: []` für jetzt)

**D4)** `backend/src/routes/index.ts` — Routes in Fastify registrieren mit Prefix `/api/v1`

**D5)** `backend/src/index.ts` — routes/index importieren

→ **Commit nach D1–D5:**
```
feat(backend/routes): add GET /api/v1/topics, /topics/:topicId and /tags;

- topic list: maxLayer, showCourses, showAchievements, sortBy, sortDirection filters
- topic detail: exact match + case-insensitive ambiguity resolution + 404
- tags: full list sorted by id
- resources[] empty for now (Slice 2c)
```

---

N) **Final @codex Sweep:** alle touched/new Files + Control Paths auf `@claude`/`@codex` prüfen.

---

## Developer Interactions
*(leer)*

---

## Checks & Pass Criteria

Nach Seeder-Implementierung (Block B):
```bash
cd backend && npm run seed
# Erwartung: "Seeding abgeschlossen", keine Fehler
```
Dann in mongosh oder Compass:
```js
db.tags.countDocuments()    // > 0
db.topics.countDocuments()  // > 0
db.topics.findOne({ _id: "ART0" })  // hat urls[], levels (wenn vorhanden), tags[]
```

Nach Routes (Block D) — manuelle Smoke-Tests:
```bash
curl "http://localhost:3000/api/v1/tags" | jq '.total'
curl "http://localhost:3000/api/v1/topics?maxLayer=1" | jq '.total'
curl "http://localhost:3000/api/v1/topics/ART0" | jq '.resolutionStatus'
# → "EXACT"
curl "http://localhost:3000/api/v1/topics/art0" | jq '.resolutionStatus'
# → "EXACT" oder "AMBIGUOUS" (case-insensitive fallback)
curl "http://localhost:3000/api/v1/topics/DOESNOTEXIST" | jq '.status'
# → 404
```

---

## Risks / Rollback
- Risiko: synonyms-Spalte in t_tag.csv hat unbekanntes Format (CSV-in-CSV?) → Seeder prüft und splittet defensiv; leere Strings → leeres Array
- Risiko: Topic-URL in t_topic.csv und t_topic_url.csv nicht immer identisch → t_topic_url.csv ist kanonisch; t_topic.url-Spalte wird ignoriert
- Rollback: `npm run seed:reset` setzt DB zurück; Mongoose-Schemas via `git revert`

---

# Slice 2b: Interest-Search ⏳

*(Wird nach Abschluss von Slice 2a in diesem File ergänzt)*

Geplante Schritte:
- `InterestSearchService`: Keyword-Matching von `interestsText` gegen Tag-Labels + Synonyms → `interestWeight` 1–5
- Route: `POST /api/v1/topics/interest-search`
- → dann weiter: [frontend/TASK_PLAN.md — Slice 2b](../frontend/TASK_PLAN.md#slice-2b)

---

# Slice 2c: Resources + Scoring ⏳

*(Wird nach Abschluss von Slice 2b ergänzt)*
