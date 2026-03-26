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
- Risiko: CORS trotz Proxy — Fallback: `VITE_API_URL=http://localhost:3000` in root `.env` setzen
- Risiko: Typen zwischen Backend und Frontend divergieren → manuelle Sync nötig bis wir einen Typ-Generator einsetzen
- Rollback: `git revert` auf Frontend-Commits; Backend unberührt

---

# Slice 2b: InterestSearch-View ⏳
<a name="slice-2b"></a>

*(Wird nach Abschluss von Slice 2a ergänzt)*

Voraussetzung: Backend `POST /api/v1/topics/interest-search` steht.
→ [backend/TASK_PLAN.md — Slice 2b](../backend/TASK_PLAN.md#slice-2b)

---

# Slice 2c: Resources in TopicDetail ⏳

*(Wird nach Abschluss von Slice 2b ergänzt)*
