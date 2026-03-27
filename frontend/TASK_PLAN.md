# Frontend — Task Plan

> Voraussetzung für Slice 2a: Backend Slice 2a Routes müssen stehen.
> → [backend/TASK_PLAN.md — Slice 2a Routes fertig](../backend/TASK_PLAN.md#slice-2a-routes)

---

# Slice 2a: Topics + Tags — Views
<a name="slice-2a-views"></a>

## Mode & Score
Mode: plan-gate, Score: 5 (>2 files +2, cross-file coupling +2, diff >50 LOC +1)

## Task Scope Paths
- AKSEP/Schoolsystem3/frontend/**
- AKSEP/Schoolsystem3/frontend/TASK_PLAN.md

---

## Discovery

### API-Endpunkte die konsumiert werden

```
GET /api/v1/topics?maxLayer=&showCourses=&showAchievements=&sortBy=&sortDirection=
→ { items: TopicSummaryDto[], total: number }

GET /api/v1/topics/:topicId
→ { resolutionStatus: "EXACT"|"AMBIGUOUS", topic?: TopicDetailDto, candidates?: [...] }

GET /api/v1/tags
→ { items: TagDto[], total: number }
```

### Fehlende Dependencies (müssen installiert werden)
- `react-router-dom` — Routing (v6, createBrowserRouter)

`@tanstack/react-query` ist bereits installiert.

### Frontend-Routen (analog api-contract.md §2.1)
```
/           → redirect zu /topics
/topics     → TopicsListView
/topics/:id → TopicDetailView
```
(InterestSearch `/interesting` kommt in Slice 2b)

Status: READY

---

## Planning

### Komponentenstruktur

```
frontend/src/
├── types/
│   └── api.ts          # TypeScript-Interfaces (TopicSummaryDto, TopicDetailDto, TagDto...)
├── services/
│   └── apiClient.ts    # fetch-Wrapper, BASE_URL aus import.meta.env
├── router/
│   └── index.tsx       # createBrowserRouter mit allen Routen
├── components/
│   ├── Layout.tsx      # Header + Outlet
│   ├── TopicCard.tsx   # Karte für ein Topic in der Listen-Ansicht
│   └── TagBadge.tsx    # Wiederverwendbare Tag-Anzeige
└── views/
    ├── TopicsListView.tsx    # GET /api/v1/topics
    └── TopicDetailView.tsx   # GET /api/v1/topics/:id
```

### API-Client-Design

`apiClient.ts` — schlanker fetch-Wrapper:
```ts
// Leer-String = Requests gehen über den Vite-Proxy zu http://localhost:3000
// VITE_API_URL in .env setzen wenn der Proxy nicht gewünscht ist
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export async function get<T>(path: string, params?: Record<string, string>): Promise<T>
```

Typen in `types/api.ts` werden 1:1 vom Backend api-contract übernommen (kein Code-Generator — manuell synchron halten für jetzt).

### Vite-Proxy (dev)

Um CORS-Probleme lokal zu vermeiden, Vite-Proxy konfigurieren:
```ts
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```
Dann `BASE_URL = ''` im Dev-Modus (Requests gehen über Vite-Proxy).

### TopicsListView
- `useQuery` (react-query **v5**-Syntax) für `GET /api/v1/topics`
  ```ts
  useQuery({ queryKey: ['topics', filters], queryFn: () => get('/api/v1/topics', params) })
  ```
- Filter-Controls: maxLayer-Slider (0–3), Checkboxes für Courses/Achievements
- Karten-Grid mit `TopicCard`-Component
- Klick auf Karte → Navigation zu `/topics/:id`

### TopicDetailView
- `useQuery` (**v5**-Syntax) für `GET /api/v1/topics/:id`
  ```ts
  useQuery({ queryKey: ['topic', id], queryFn: () => get('/api/v1/topics/' + id) })
  ```
- Fallunterscheidung: EXACT → Detail anzeigen | AMBIGUOUS → "Welches meintest du?"-Auswahl | 404-Fallback
- Zeigt: Name, Typ, Layer, Beschreibung, URLs, Tags (als TagBadge), Levels (Tabelle), Resources (leer-Placeholder für Slice 2c)

### `VITE_API_URL` Environment Variable
`.env.example` im Frontend-Ordner **nicht** nötig — wir nutzen bereits die Root-`.env.example`. Stattdessen: Notiz in README.

Status: READY FOR APPROVAL

---

## Pre-Approval Checklist
- [x] Discovery: READY
- [x] Planning: READY FOR APPROVAL
- [x] Steps atomar
- [x] Developer Interactions vorhanden
- [x] Checks vorhanden
- [x] Mode & Score gesetzt

---

## Implementation Steps — Slice 2a

0) **Plan Sync + Voraussetzung prüfen:** Backend-Server läuft und gibt Daten zurück.

### Block E: Setup

**E1)** `frontend/` — `react-router-dom` installieren
```bash
npm install react-router-dom
```

**E2)** `frontend/vite.config.ts` — Proxy ergänzen
```ts
server: { proxy: { '/api': 'http://localhost:3000' } }
```

→ **Commit nach E1–E2:**
```
feat(frontend): add react-router-dom and configure Vite API proxy
```

---

### Block F: Typen + API-Client

**F1)** `frontend/src/types/api.ts` — anlegen
Interfaces: `TopicSummaryDto`, `TopicDetailDto`, `TagDto`, `TopicResolutionResponse`, `TopicListResponse`, `TagListResponse`

**F2)** `frontend/src/services/apiClient.ts` — anlegen
```ts
const BASE = import.meta.env.VITE_API_URL ?? ''
export async function get<T>(path: string, params?: Record<string, string>): Promise<T>
```

→ **Commit nach F1–F2:**
```
feat(frontend): add API types and fetch client
```

---

### Block G: Router + Layout

**G1)** `frontend/src/components/Layout.tsx` — Header mit Nav-Links + `<Outlet />`

**G2)** `frontend/src/router/index.tsx` — `createBrowserRouter`:
```
/ → redirect zu /topics
/topics → TopicsListView (lazy)
/topics/:id → TopicDetailView (lazy)
```

**G3)** `frontend/src/main.tsx` — `RouterProvider` statt `App`-Component

→ **Commit nach G1–G3:**
```
feat(frontend): add router and app layout;

- createBrowserRouter with / redirect + /topics + /topics/:id
- Layout component with header navigation
```

---

### Block H: Views

**H1)** `frontend/src/components/TagBadge.tsx` — kleines Badge-Component für Tags
**H2)** `frontend/src/components/TopicCard.tsx` — Karte mit Name, Typ, Layer, Tags (TagBadge), Link zu Detail

**H3)** `frontend/src/views/TopicsListView.tsx`
- `useQuery({ queryKey: ['topics', filters], queryFn: () => get('/api/v1/topics', params) })`
- Filter-State (maxLayer, showCourses, showAchievements)
- Topic-Karten-Grid mit Name, Typ, Layer, Tags (TagBadge), Link zu Detail

**H4)** `frontend/src/views/TopicDetailView.tsx`
- `useQuery({ queryKey: ['topic', id], queryFn: () => get('/api/v1/topics/' + id) })`
- EXACT: Detail-Layout mit allen Feldern, Levels-Tabelle, Tag-Badges, leerer Resources-Placeholder
- AMBIGUOUS: Auswahl-Liste
- Error/404: Fehlermeldung

→ **Commit nach H1–H4:**
```
feat(frontend): add TopicsListView and TopicDetailView;

- TopicsListView: filter controls (maxLayer, showCourses, showAchievements), topic grid
- TopicDetailView: EXACT/AMBIGUOUS/404 handling, levels table, tag badges
- TopicCard + TagBadge components
```

---

N) **Final @codex Sweep**

---

## Developer Interactions
*(leer)*

---

## Checks & Pass Criteria

```bash
cd frontend && npm run build  # TypeScript + Vite — keine Fehler
npm run dev                   # manuell testen
```

Manuelle Verifikation:
- [ ] `/topics` lädt und zeigt Topic-Karten
- [ ] Filter (maxLayer=1) reduziert die Anzahl sichtbarer Topics
- [ ] Klick auf Topic → `/topics/ART0` → Detail mit Name, Beschreibung, Tags, URLs
- [ ] `/topics/art0` (Kleinschreibung) → EXACT oder AMBIGUOUS (kein 500)
- [ ] `/topics/DOESNOTEXIST` → Fehlermeldung statt Absturz

---

## Risks / Rollback
- Risiko: CORS trotz Proxy — Fallback: `VITE_API_URL=http://localhost:3042` in root `.env` setzen
- Risiko: Typen zwischen Backend und Frontend divergieren → manuelle Sync nötig bis wir einen Typ-Generator einsetzen
- Rollback: `git revert` auf Frontend-Commits; Backend unberührt

---

# Slice 2b: InterestSearch-View ⏳
<a name="slice-2b"></a>

Voraussetzung: Backend `POST /api/v1/topics/interest-search` steht (Block L).
→ [backend/TASK_PLAN.md — Slice 2b](../backend/TASK_PLAN.md#slice-2b)

---

## Discovery

### API-Endpunkt
```
POST /api/v1/topics/interest-search
Body: { interestsText, language?, maxResults?, explainMatches? }
→ { interestsText, usedLanguage, matchedTags[], topics[] }
```

### Frontend-Route
```
/interesting   → InterestSearchView
```

### Komponenten
```
frontend/src/
├── views/
│   └── InterestSearchView.tsx   # Formular + Ergebnisse
└── components/
    ├── InterestForm.tsx          # Textarea, Submit, Validierung
    └── InterestResults.tsx       # Tag-Badges (matched), TopicCard-Liste mit Score
```

Status: READY

---

## Planning

### InterestSearchView
- State: `interestsText` (controlled input)
- `useMutation` (react-query v5) für POST (kein `useQuery` — kein automatisches Refetch)
- Cooldown: 60s nach erfolgreichem Submit (localStorage-persistiert, wie in S2)
- Loading-Spinner während Anfrage läuft

### InterestForm
- Textarea mit min=12 / max=2048 Zeichen (client-seitige Validierung vor Submit)
- Submit-Button disabled während Cooldown läuft; Countdown anzeigen

### InterestResults
- Banner oben: *"Interest matching is not yet available — LLM provider pending."* (immer sichtbar solange Stub aktiv, d.h. `matchedTags` leer nach Submit)
- `matchedTags[]` → Badge-Reihe mit `interestWeight` (erscheint wenn LLM aktiv)
- `topics[]` → TopicCard-Liste (sortiert nach Score, Score-Anzeige pro Karte)
- Leere `topics[]` bei nicht-leerem `matchedTags[]` → "No matching topics found — try different interests"

Status: READY FOR APPROVAL

---

## Implementation Steps — Slice 2b

### Block N: InterestSearch-View + Komponenten

**N1)** `frontend/src/types/api.ts` — neue Interfaces ergänzen:
```ts
InterestMatchedTagDto, InterestTopicMatchedTagDto,
InterestTopicResultDto, InterestSearchRequestDto, InterestSearchResponseDto
```
(`InterestTopicMatchedTagDto` für `explainMatches`-Support — auch wenn Stub es noch nicht liefert)

**N2)** `frontend/src/services/apiClient.ts` — `post<T>` Funktion ergänzen:
```ts
export async function post<T>(path: string, body: unknown): Promise<T>
```

**N3)** `frontend/src/components/InterestForm.tsx` — anlegen

**N4)** `frontend/src/components/InterestResults.tsx` — anlegen

**N5)** `frontend/src/views/InterestSearchView.tsx` — anlegen:
- `useMutation({ mutationFn: () => post('/api/v1/topics/interest-search', ...) })`
- Cooldown-Logik (localStorage)

**N6)** `frontend/src/router/index.tsx` — `/interesting` Route ergänzen

**N7)** `frontend/src/components/Layout.tsx` — Nav-Link zu `/interesting` ergänzen

→ **Commit nach N1–N7:**
```
feat(frontend): add InterestSearchView with form and results;

- POST /api/v1/topics/interest-search via useMutation
- 60s cooldown (localStorage-persisted)
- matched tags display + scored topic cards
- /interesting route + nav link
```

---

## Checks & Pass Criteria

```bash
cd frontend && npm run build   # keine TypeScript-Fehler
```

Manuelle Verifikation:
- [ ] `/interesting` lädt, Formular sichtbar
- [ ] Zu kurzer Text → Submit-Button disabled oder Fehlermeldung
- [ ] Submit mit gültigem Text → Spinner → leere Ergebnisliste (Stub-Backend)
- [ ] Cooldown läuft 60s ab, Button zeigt Countdown
- [ ] Nav-Link zu Topics und Interesting sichtbar

---

# Slice 2c: Resources in TopicDetail ⏳
<a name="slice-2c"></a>

## Mode & Score
Mode: plan-gate (gemeinsam mit Backend Slice 2c), Score: 8 (inherited — cross-file coupling, DB/Schema, diff >50 LOC)

## Task Scope Paths
- AKSEP/Schoolsystem3/frontend/**
- AKSEP/Schoolsystem3/frontend/TASK_PLAN.md

Voraussetzung: Backend Slice 2c (Block R) steht — `GET /api/v1/topics/:id` liefert `resources: ResourceDto[]`.
→ [backend/TASK_PLAN.md — Slice 2c](../backend/TASK_PLAN.md#slice-2c)

---

## Discovery

### API-Response (nach Backend Slice 2c)
```ts
TopicDetailDto.resources: ResourceDto[]
// ResourceDto: { id, title, url, description, typeName, authorName, overlapScore }
```

### Bestehender Stand
`TopicDetailView.tsx` L100–101 zeigt einen Placeholder:
```tsx
<h3>Resources</h3>
<p><em>Coming in Slice 2c.</em></p>
```
Dieser Block wird durch `<ResourcesTable>` ersetzt (JSX-Inhalt, kein Kommentar).

Status: READY

---

## Planning

### Neue Komponente: ResourcesTable

```
frontend/src/
└── components/
    └── ResourcesTable.tsx    # Tabelle mit Titel-Link, Autor, Typ, Score
```

Einfache Tabelle (kein eigenes useQuery — Daten kommen aus dem bestehenden TopicDetail-Query):

| Spalte | Quelle | Notiz |
|--------|--------|-------|
| Title | `resource.title` | Als anklickbarer Link (`resource.url`) |
| Type | `resource.typeName` | z.B. "YouTube Video" |
| Author | `resource.authorName` | YouTube-Channel |
| Score | `resource.overlapScore` | Optional anzeigen (Debug-Hilfe) |

Leere Resources (`resources.length === 0`) → Placeholder: *"No resources linked to this topic yet."*

Status: READY FOR APPROVAL

---

## Pre-Approval Checklist
- [x] Discovery: Status = READY
- [x] Planning: Status = READY FOR APPROVAL
- [x] Steps atomar (pro File + Anchor)
- [x] Developer Interactions vorhanden (leer)
- [x] Checks vorhanden
- [x] Mode & Score gesetzt

---

## Implementation Steps — Slice 2c Frontend

0) **Plan Sync:** Dieses Dokument laden; Developer Interactions prüfen.

### Block S: ResourcesTable + TopicDetailView-Integration

**S1)** `frontend/src/types/api.ts` — `ResourceDto` Interface ergänzen; `TopicDetailDto.resources` typisieren:
```ts
export interface ResourceDto {
  id: number
  title: string
  url: string
  description: string
  typeName: string
  authorName: string
  overlapScore: number
}
// TopicDetailDto.resources: ResourceDto[]  (war: resources: [])
```

**S2)** `frontend/src/components/ResourcesTable.tsx` — anlegen:
- Props: `resources: ResourceDto[]`
- `resources.length === 0` → Placeholder-Text
- Tabelle: Title als `<a href={url} target="_blank">`, typeName, authorName, overlapScore

**S3)** `frontend/src/views/TopicDetailView.tsx` — L100–101 (Placeholder-JSX) durch `<ResourcesTable>` ersetzen:
```tsx
// entfernen:
<h3>Resources</h3>
<p><em>Coming in Slice 2c.</em></p>
// ersetzen durch:
<ResourcesTable resources={topic.resources} />
```

→ **Commit nach S1–S3:**
```
feat(frontend): add ResourcesTable to TopicDetailView;

- ResourceDto type added
- ResourcesTable: title link, type, author, overlap score
- replaces Slice 2c placeholder in TopicDetail
```

N) **Final @codex Sweep:** touched/new Files + Control Paths prüfen.

---

## Developer Interactions
*(leer)*

---

## Checks & Pass Criteria

```bash
cd frontend && npm run build   # keine TypeScript-Fehler
```

Manuelle Verifikation (Backend muss laufen, Seeder durchgelaufen):
- [ ] TopicDetail eines Topics mit Resources → Tabelle mit Einträgen sichtbar
- [ ] Titel ist anklickbarer Link zur YouTube-URL (`target="_blank"`)
- [ ] TopicDetail ohne Resources → Placeholder-Text "No resources linked..."
- [ ] Kein TypeScript-Fehler (`npm run build` sauber)

---

## Risks / Rollback
- Risiko: `resources: []` im DTO-Typ noch nicht korrekt typisiert wenn Backend-Block P noch nicht committed → Frontend kompiliert ggf. mit Warnung. Frontend-Slice erst nach Backend-Blocks O–R implementieren.
- Rollback: `git revert` auf S-Commits; Backend-Blocks unberührt
