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
<a name="slice-2b"></a>

## Mode & Score
Mode: plan-gate, Score: 6 (>2 files +2, cross-file coupling +2, no tests +1, diff >50 LOC +1)
Note: kein +3 für new dependency — Stub braucht keine neue npm-Abhängigkeit; produktiver LLM-Client kommt in separatem Slice

## Task Scope Paths
- AKSEP/Schoolsystem3/backend/**
- AKSEP/Schoolsystem3/backend/TASK_PLAN.md

---

## Discovery

### Pre-2b Fix: GET /api/v1/topics — fehlende Filter
Beim Vergleich mit Schoolsystem2 aufgefallen: Der Plan sah `maxLayer`, `showCourses`, `showAchievements`, `sortBy`, `sortDirection` vor, implementiert ist jedoch nur `?tag=`. Das Frontend sendet die Parameter bereits — sie werden still ignoriert.

Betroffene typeIds (aus `t_topic_type.csv`):
- `showCourses: false` → `{ typeId: { $nin: [4, 5] } }` (typeId 4=General Course, 5=Optional Course)
- `showAchievements: false` → `{ typeId: { $nin: [3] } }` (typeId 3=Achievement)

### Interest-Search Algorithmus (aus Schoolsystem2 übernommen)

**Scoring-Formel:**
```
score(topic) = Σ interestWeight[i] × topicWeight[i]
               für alle Tags i, die sowohl im Topic als auch in matchedTags vorkommen
```
- `topicWeight`: 1–5, bereits in `Topic.tags[].weight` gespeichert
- `interestWeight`: 1–5, vom LLM basierend auf Relevanz-Position vergeben

**Weight-Matrix (Positions-basiert, aus S2 portiert):**
```
layerEquivalent = 3 + max(0, floor(log₂(textLength / 50)))

Matrix (layerEq → Gewichte nach Rang-Position):
  3 → [5, 4, 3, 1]
  4 → [5, 4, 3, 2, 1]
  5 → [5, 4, 3, 3, 1]
  6 → [5, 4, 3, 2, 2, 1]
  7 → [5, 4, 3, 3, 2, 1]
  8 → [5, 4, 3, 3, 2, 1, 1]
  (≥9 → letzten Eintrag wiederholen)
```
Beispiel: Text mit 120 Zeichen → layerEq=4 → Top-Tag bekommt weight=5, zweiter=4, dritter=3, vierter=2, fünfter=1.

### LLM-Integration

**Provider:** Nicht OpenAI (wie in S2). Konkreter Provider wird evaluiert wenn der Schritt ansteht.
**Abstraktions-Schicht erforderlich:** `TagMatchingClient`-Interface (Port), damit Provider austauschbar bleibt.

**LLM-Prompt-Struktur (aus S2 adaptiert):**
```
You are selecting tags that best match the given interests.
- Choose between {minTags} and {maxTags} tag IDs.
- Order tags by relevance (most relevant first).
- Only return tag IDs from the catalog; never invent new IDs.
- Respond with a plain JSON array of integers, e.g. [12, 4, 7].

USER INTERESTS:
{interestsText}

TAG CATALOG:
- 1: art
- 76: artificial intelligence (synonyms: AI, A.I.)
- ...
```
Synonyme sind nur als LLM-Kontext im Prompt — kein eigenes String-Matching.

**Scope-Entscheidung:** Die produktive LLM-Implementierung wird bewusst auf später verschoben (Provider noch nicht gewählt). Der `StubTagMatchingClient` gibt immer eine leere Tag-Liste zurück → Score 0 für alle Topics → leere Ergebnisliste. Das Interface bleibt als Erweiterungspunkt. Frontend zeigt einen Hinweis: *"Interest matching is not yet available — LLM provider pending."*

### Result-Limits

- Filter: `score > 0`
- Cap: `min(max(5, floor(totalTopics × 0.1)), requestedMaxResults)`
  Bei 723 Topics → 10% = 72 → Standardlimit ~72; mindestens 5 wenn möglich
- `maxResults` per Request konfigurierbar (Default: `floor(totalTopics × 0.1)`, min 5)

`maxResults` kommt in den POST-Body (konsistent mit allen anderen Parametern; Query-Params bei POST unkonventionell).

### API-Vertrag

```
POST /api/v1/topics/interest-search
Body: {
  interestsText: string        // Freitext, 12–2048 Zeichen
  language?: string            // default: "en"
  maxResults?: number          // default: floor(totalTopics × 0.1), min 5
  explainMatches?: boolean     // default: false (Scoring-Breakdown pro Tag)
}

Response 200: {
  interestsText: string
  usedLanguage: string
  matchedTags: InterestMatchedTagDto[]   // LLM-Output mit interestWeight
  topics: InterestTopicResultDto[]       // score-sortiert, score > 0
}

Response 400: interestsText zu kurz/lang
Response 502: LLM nicht erreichbar
```

### DTOs (neu in types/api.ts)

```ts
InterestMatchedTagDto    { tagId, label, interestWeight }
InterestTopicMatchedTagDto { tagId, label, interestWeight, topicWeight, contribution }
InterestTopicResultDto   { id, name, typeName, layer, score, matchedTags? }
InterestSearchRequestDto { interestsText, language?, maxResults?, explainMatches? }
InterestSearchResponseDto { interestsText, usedLanguage, matchedTags, topics }
```

Status: READY

---

## Planning

### Komponentenstruktur Backend

```
backend/src/
├── routes/
│   └── topics.ts              # POST route ergänzen
├── services/
│   ├── TagMatchingClient.ts   # Interface (Port)
│   ├── StubTagMatchingClient.ts  # Fallback/Stub-Implementierung
│   └── InterestSearchService.ts  # Scoring-Logik
└── types/
    └── api.ts                 # neue DTOs ergänzen
```

### Entscheidungen

**D1 — TagMatchingClient als Interface:**
Provider (Anthropic/OpenAI/lokal) ist noch nicht gewählt → Interface zuerst, Stub-Implementierung für Entwicklung. Produktive Implementierung kommt in separatem Commit wenn Provider feststeht.

**D2 — Service-Schicht einführen:**
Die Scoring-Logik ist zu komplex für direkte Route-Handler → `InterestSearchService.ts` als dedizierter Service.

**D3 — POST statt GET:**
`interestsText` kann lang sein (bis 2048 Zeichen) → POST mit JSON-Body.

**D4 — maxResults-Berechnung:**
`floor(totalTopics × 0.1)` wird zur Laufzeit berechnet (nicht hardcoded), da sich die Topic-Anzahl ändern kann.

Status: READY FOR APPROVAL

---

## Pre-Approval Checklist
- [x] Discovery: READY
- [x] Planning: READY FOR APPROVAL
- [x] Steps atomar
- [x] Developer Interactions vorhanden
- [x] Checks vorhanden
- [x] Mode & Score gesetzt
- [ ] git status clean (nur TASK_PLAN.md/TASK_DOCS.md geändert)

---

## Implementation Steps — Slice 2b

0) **Plan Sync:** Dieses Dokument laden; Developer Interactions prüfen.

### Pre-Fix: GET /api/v1/topics Filter vervollständigen

**P1)** `backend/src/routes/topics.ts` — Filter implementieren:
- `maxLayer` (number, default 3) → `{ layer: { $lte: maxLayer } }`
- `showCourses` (bool, default true) → wenn false: `{ typeId: { $nin: [4, 5] } }`
- `showAchievements` (bool, default true) → wenn false: `{ typeId: { $nin: [3] } }`
- `sortBy` (`name`|`layer`, default `name`) + `sortDirection` (`asc`|`desc`, default `asc`) → `.sort()`

→ **Commit nach P1:**
```
fix(backend/routes): implement missing topic list filters;

- maxLayer, showCourses, showAchievements, sortBy, sortDirection
- frontend was already sending these params, backend was ignoring them
```

---

### Block I: DTOs erweitern

**I1)** `backend/src/types/api.ts` — neue Interfaces ergänzen:
```ts
InterestMatchedTagDto, InterestTopicMatchedTagDto,
InterestTopicResultDto, InterestSearchRequestDto, InterestSearchResponseDto
```

**I2)** `backend/src/errors.ts` — `LLMUnavailableError` ergänzen:
```ts
export class LLMUnavailableError extends Error {
  readonly statusCode = 502
  constructor(cause?: string) { ... }
}
```
Ebenfalls in `index.ts` setErrorHandler registrieren (analog zu TopicNotFoundError).

→ **Commit nach I1–I2:**
```
feat(backend/types): add InterestSearch DTOs and LLMUnavailableError (502)
```

---

### Block J: TagMatchingClient Interface + Stub

**J1)** `backend/src/services/TagMatchingClient.ts` — Interface anlegen:
```ts
export interface TagMatchingClient {
  findMatchingTagIds(interestsText: string, tags: TagDto[], language: string): Promise<number[]>
}
```

**J2)** `backend/src/services/StubTagMatchingClient.ts` — Stub-Implementierung:
- Gibt leeres Array zurück (kein LLM-Call)
- Logged eine Warnung: `"StubTagMatchingClient: no LLM provider configured"`

→ **Commit nach J1–J2:**
```
feat(backend/services): add TagMatchingClient interface and stub implementation;

- interface allows swapping LLM providers without touching service logic
- stub returns empty matches (used until real provider is wired)
```

---

### Block K: InterestSearchService

**K1)** `backend/src/services/InterestSearchService.ts` — anlegen:
```ts
// ACHTUNG: erasableSyntaxOnly aktiv → kein parameter property syntax!
// Korrekt:
export class InterestSearchService {
  private readonly tagMatchingClient: TagMatchingClient
  constructor(tagMatchingClient: TagMatchingClient) {
    this.tagMatchingClient = tagMatchingClient
  }
  async search(request: InterestSearchRequestDto): Promise<InterestSearchResponseDto> { ... }
}
```

Logik:
1. Alle Tags laden
2. `tagMatchingClient.findMatchingTagIds()` aufrufen
3. Weight-Matrix anwenden (layerEquivalent-Formel aus S2)
4. Alle Topics laden
5. Score pro Topic berechnen: `Σ(interestWeight × topicWeight)`
6. Score > 0 filtern
7. Nach Score DESC sortieren
8. Auf `min(max(5, floor(total × 0.1)), maxResults)` limitieren
9. Response zusammenbauen (inkl. `matchedTags` breakdown wenn `explainMatches: true`)

→ **Commit nach K1:**
```
feat(backend/services): implement InterestSearchService with S2 scoring algorithm;

- score = Σ(interestWeight × topicWeight) per matched tag
- position-based weight matrix (layerEquivalent from text length)
- result cap: min(max(5, 10% of topics), maxResults)
```

---

### Block L: Route

**L1)** `backend/src/routes/topics.ts` — POST route ergänzen:
```ts
POST /api/v1/topics/interest-search
```
- Input-Validierung: `interestsText` 12–2048 Zeichen → `BadRequestError`
- `InterestSearchService` aufrufen
- LLM-Fehler → 502 mit strukturierter Fehlermeldung

→ **Commit nach L1:**
```
feat(backend/routes): add POST /api/v1/topics/interest-search;

- validates interestsText length (12-2048 chars)
- wires InterestSearchService + StubTagMatchingClient
- returns 502 on LLM provider failure
```

---

N) **Final @codex Sweep:** alle touched/new Files + Control Paths prüfen.

---

## Developer Interactions
*(leer)*

---

## Checks & Pass Criteria

```bash
cd backend && npx tsc --noEmit   # keine TypeScript-Fehler
```

Manuelle Smoke-Tests (Temp-File-Methode, kein /dev/stdin auf Windows):
```bash
# Stub liefert leere matchedTags → leere topics-Liste (korrekt)
curl -s -X POST http://localhost:3042/api/v1/topics/interest-search \
  -H "Content-Type: application/json" \
  -d '{"interestsText": "I love artificial intelligence and music"}' \
  > /tmp/r_interest.json && node -e "const d=require('/tmp/r_interest.json'); console.log('topics:', d.topics.length, 'matchedTags:', d.matchedTags.length)"

# Validierung: zu kurz → 400
curl -s -X POST http://localhost:3042/api/v1/topics/interest-search \
  -H "Content-Type: application/json" \
  -d '{"interestsText": "short"}' > /tmp/r_400.json && node -e "const d=require('/tmp/r_400.json'); console.log(d.status, d.error)"
```

Frontend (nach Slice 2b Frontend-Block):
- [ ] `/interesting` lädt und zeigt Formular
- [ ] Absenden → Lade-Spinner → leere Ergebnisliste (Stub)
- [ ] Zu kurzer Text → Fehlermeldung (client-seitig oder 400)

---

## Risks / Rollback
- Risiko: LLM-Provider noch nicht gewählt → bewusst als Stub implementiert; produktive Implementierung in separatem zukünftigem Slice
- Risiko: Topic-Anzahl ändert sich → maxResults dynamisch berechnet, kein Problem
- Rollback: `git revert` auf Slice 2b Commits; Slice 2a unberührt

---

# Slice 2c: Resources + Scoring ⏳

*(Wird nach Abschluss von Slice 2b ergänzt)*
