# Task Plan: Schoolsystem3 — Architektur & Framework-Entscheidungen (Phase 1)

## Mode & Score
Mode: plan-gate (user-requested)
Score: 2 (rein docs/planning; kein Code, keine Configs — aber Architekturentscheidungen mit langer Tragweite rechtfertigen Gate)

## Task Scope Paths
- AKSEP/Schoolsystem3/**
- TASK_PLAN.md

## Scope (verbatim)
> Wir wollen in Schoolsystem3 eine neue Version desselben Projekts umsetzen, jedoch mit deutlich sinnvolleren Frameworks als in der Version Schoolsystem2;
> Folgendes haben wir soweit geplant:
> Backend: Node.js
> DB: mongoDB
> Seeden der DB auf Basis der bereits vorliegenden csv-Files: TypeScript
> Frontend: React
>
> Dazu noch Abklärung mit meinem Kollegen:
> """
> Ich: Gut, und das Updaten der (csv-)Daten? Ist in Schoolsystem2 momentan über Python umgesetzt
> Kollege: ja ok. Korrekt wäre immer Typescript, wenn das Backend mit nodejs läuft. Python passt nicht dazu, aber kann trotzdem zusammenarbeiten und es erfüllen.
> Als würde ich ein c++ script in meiner Java anwendung nutzen, weil c++ schneller ist.
> python ist für die ki halt einfacher.
> wenn du vibe codest
> """
>
> Was ist deine Einschätzung? Sind die bis dato geplanten Frameworks sinnvoll für unser Vorhaben?
> Und was meinst du zur Frage wegen des Updatens der csv-Datensätze?
> Bitte eröffne in AKSEP\Schoolsystem3 ein Plan-Gate, wo wir in dieser ersten Phase alles planen (und uns beraten), was Framework- und Architektur-Entscheidungen anbelangt - inkl. Notieren der init-Befehle für die jeweiligen Frameworks

**Scope-Hash**: `(kein Code-Hash nötig — reine Planungsphase)`

---

## Discovery

### Problem Statement
Schoolsystem2 hat ein konzeptuell solides Domänenmodell, aber eine technisch ungeeignete Implementierung:
- Java übernimmt gleichzeitig Domänenlogik, CSV-Parsing und "Datenbank" (alles im Heap)
- Kein echter Persistenzlayer → nicht skalierbar, kein echtes CRUD
- Frontend (Vite + Vanilla JS) ohne typsicheres Framework
- Python-Skripte für Datenupdates erzeugen einen zweiten, unabhängigen Runtime-Stack

### Ziel von Schoolsystem3
Neuimplementierung desselben Domänenmodells mit einer modernen, konsistenten TypeScript-basierten Stack:
- Echter Persistenzlayer (MongoDB)
- Typsichere API (Node.js + TypeScript)
- Komponentenbasiertes Frontend (React)
- Einheitlicher Toolchain: alles TypeScript/Node

### Bestehendes Domänenmodell (aus Schoolsystem2 übernommen)
- **Topics** — Hierarchie (Fach → Kurs → Achievement), Level 1–9, mehrsprachig
- **Tags** — Schlüsselwörter mit Synonymen + Gewichtung (1–5) pro Topic
- **Resources** — Externe Inhalte (URLs, Videos), versioniert, mehrsprachig
- **Sources** — Ursprungsquellen (YouTube, Artikel etc.)
- **Interest-Search** — User-Interessen → Tag-Matching → Topics/Resources

Status: READY

---

## Planning

### Einschätzung des geplanten Stacks

#### ✅ Node.js als Backend — sinnvoll
Node.js mit TypeScript ist eine sehr gute Wahl:
- Gleiche Sprache wie Frontend → geteilte Typen möglich (Monorepo oder shared package)
- Erstklassige MongoDB-Unterstützung (Mongoose, native Driver)
- Grosses Ökosystem für REST-APIs (Fastify, Express)
- Kein Sprachen-Mismatch mehr wie in Schoolsystem2

**Empfehlung: Fastify** statt Express — Fastify ist TypeScript-first, schneller, hat eingebaute Schema-Validierung (JSON Schema / Zod) und ist produktionsreif. Express ist simpler, aber weniger typsicher by default.

#### ✅ MongoDB — sehr gute Wahl für dieses Domänenmodell
Das Domänenmodell passt ideal zu MongoDB:
- `LocalizedText` = `{ "de": "...", "en": "..." }` → natürliches JSON-Dokument
- `TopicLevels` (1–9 mit optionaler Beschreibung) → eingebettetes Array
- `TopicTags` mit Gewicht → Array of objects `[{ tagId, weight }]`
- Resource-Versionen → eingebettetes `versions[]`-Array
- Keine komplexen Joins nötig → kein Vorteil von SQL

Ein relationales DB wäre möglich, würde aber zahlreiche Join-Tabellen erfordern (TopicTag, ResourceToTopic, RLangVersion...) — das schreibt sich aufwändiger und gewinnt hier nichts.

**Empfehlung: Mongoose** als ODM — bringt Schema-Validierung, TypeScript-Typen (`InferSchemaType`) und Middleware-Hooks. Wer es schlanker mag: native MongoDB-Driver mit manuellen Zod-Schemas.

#### ✅ TypeScript für den Seeder — korrekt, Kollege hat recht
Der Kollegen-Vergleich trifft es gut. Konkrete Gründe für TypeScript statt Python:
1. **Geteilte Typen**: Der Seeder kann dieselben Mongoose-Schemas / Interfaces importieren wie das Backend → keine Typ-Divergenz möglich
2. **Kein zusätzlicher Runtime**: Python müsste separat installiert/konfiguriert werden; mit `tsx` läuft ein TypeScript-Seeder-Skript direkt
3. **CSV-Parsing in Node ist ausreichend**: `csv-parse` (npm) ist vollwertig; kein Bedarf für pandas
4. **Wartbarkeit**: Ein Entwickler, der das Backend kennt, kennt auch den Seeder

**Ausnahme — wann Python trotzdem Sinn macht:**
Wenn in Phase 2 ML-gestütztes Matching oder Embedding-Generierung (wie in `PLANUNG2.md` geplant: sentence-transformers, YouTube-Transkripte) eingebaut wird, ist Python als separates, optionales Enrichment-Tool gerechtfertigt — aber als eigenständiges Tool, nicht als Teil des Haupt-Stacks.

#### ✅ React als Frontend — Standardwahl, solide
Mit Vite als Build-Tool. Gemeinsam mit TypeScript ermöglicht es typsichere API-Aufrufe (z.B. mit `react-query` + generierte Typen).

---

### Projektstruktur-Vorschlag

```text
Schoolsystem3/
├── backend/              # Fastify + TypeScript + Mongoose
│   ├── src/
│   │   ├── domain/       # Interfaces & Value Objects (geteilte Typen)
│   │   ├── models/       # Mongoose Schemas
│   │   ├── routes/       # Fastify Route-Handler
│   │   ├── services/     # Business Logic (Interest-Search etc.)
│   │   └── index.ts
│   ├── scripts/          # CLI-Tools, die Backend-Code nutzen aber nicht Teil des Servers sind
│   │   └── seed.ts       # Seeder: liest data/import/, importiert in MongoDB via Mongoose
│   ├── package.json      # enthält auch csv-parse für den Seeder
│   └── tsconfig.json
│
├── scripts/              # Datenaufbereitungs-Skripte (TypeScript, tsx, kein Build-Step)
│   ├── youtube/          # YouTube Data API Fetcher → schreibt nach data/raw/youtube/
│   ├── topics/           # Wikipedia/Akademisch → schreibt nach data/raw/topics/
│   ├── package.json
│   └── tsconfig.json
│
├── data/                 # CSV-Quelldaten — versioniert im Repo
│   ├── import/           # Seeder liest von hier: "saubere", review-te Import-CSVs
│   ├── staging/          # *PLANNING.csv.txt: Ziel der Update-Skripte, manuell geprüft
│   │                     #   → nach Prüfung manuell nach import/ kopieren
│   └── raw/              # Rohdaten von externen APIs (nie direkt geseeded)
│       ├── youtube/      # YouTube Data API Dumps
│       └── topics/       # Wikipedia / akademische Disziplin-Daten
│
├── frontend/             # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   ├── services/     # API-Client
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml    # Nur MongoDB lokal (kein full-stack Docker jetzt)
├── .env.example          # Alle Env-Vars dokumentiert; nie .env committen
└── README.md
```

**O1 — Entschieden:** Seeder lebt in `backend/scripts/seed.ts` (im Backend-Projekt, ausserhalb von `src/`). `scripts/` bleibt eigener Top-Level-Ordner für Datenpipeline-Skripte.
Begründung:
- Seeder nutzt dieselben Mongoose-Models wie der Server → muss im Backend-Projekt sein, um sie importieren zu können
- `scripts/` (ausserhalb `src/`) folgt der Konvention: `src/` = Server-Runtime-Code; CLI-Tools gehören daneben, nicht hinein
- `scripts/` (Top-Level) = Rohdaten holen & aufbereiten (API-abhängig, unabhängig vom Backend)
- `data/` = versionierte Quelldaten; `staging/` als manuell geprüfte Zwischenstufe

---

**O2 — Entschieden:** Docker jetzt nur für MongoDB lokal. AWS Lambda später — aber folgende Vorab-Entscheidungen sind jetzt nötig:

**Wichtige Lambda-Kompatibilitäts-Constraints (von Anfang an einhalten):**
1. **Backend muss stateless sein** — kein In-Memory-Cache auf Modulebene (anders als Schoolsystem2, das alles im Heap hält). Alle State in MongoDB. Lambda kann mehrere Instanzen parallel laufen lassen.
2. **Env-Vars von Tag 1** — `.env` + `.env.example`, keine hardcodierten Configs. AWS Lambda injiziert Config als Umgebungsvariablen (Parameter Store / Secrets Manager).
3. **MongoDB Atlas für Cloud** — kein self-hosted Mongo auf EC2; Atlas funktioniert seamless mit Lambda (connection pooling über `serverless-http` oder Mongoose connection caching beachten).
4. **Seeder läuft separat** — nie als Teil des Lambda-Handlers; Seeder ist ein einmaliges CLI-Tool.
5. **Kein persistentes Dateisystem im Backend nutzen** — Lambda hat nur `/tmp` (512 MB, ephemeral). CSVs nie vom Backend direkt lesen.

**Docker-Fahrplan:**
- Jetzt: `docker-compose.yml` mit nur `mongo:7` für lokale Entwicklung
- Später (vor AWS-Deployment): Dockerfile für Backend ergänzen (optional, wenn Lambda Container Image statt ZIP genutzt wird)

---

### Init-Befehle

#### Voraussetzungen
```bash
node --version   # >= 20 LTS empfohlen
npm --version
```

#### MongoDB lokal (Docker)
```bash
# docker-compose.yml anlegen (siehe unten), dann:
docker compose up -d
# Verbindungs-URL: mongodb://localhost:27017/schoolsystem3
```

`docker-compose.yml` Minimal-Template:
```yaml
services:
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
volumes:
  mongo_data:
```

#### Backend (Fastify + TypeScript + Mongoose + Seeder)
```bash
mkdir backend && cd backend
npm init -y
npm install fastify @fastify/cors mongoose dotenv csv-parse
npm install -D typescript @types/node tsx nodemon
npx tsc --init --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --outDir dist --rootDir src
# package.json scripts ergänzen:
# "dev":        "nodemon --exec tsx src/index.ts"
# "build":      "tsc"
# "start":      "node dist/index.js"
# "seed":       "tsx scripts/seed.ts"
# "seed:reset": "tsx scripts/seed.ts --reset"   (optional: DB leeren + neu seeden)
# Hinweis: scripts/ liegt ausserhalb von src/, braucht aber keinen eigenen
# tsconfig — tsx nutzt das bestehende backend/tsconfig.json
```

#### Scripts (Datenaufbereitungs-Skripte, kein Build-Step — direkt mit tsx ausgeführt)
```bash
mkdir scripts && cd scripts
npm init -y
npm install csv-parse csv-stringify dotenv
npm install -D typescript @types/node tsx
npx tsc --init --target ES2022 --module NodeNext --moduleResolution NodeNext --strict
# Kein outDir/rootDir — kein Compile-Step; tsx führt .ts direkt aus
# package.json scripts (Beispiele, werden nach Bedarf ergänzt):
# "fetch:youtube": "tsx youtube/fetch.ts"
# "fetch:topics":  "tsx topics/fetch.ts"
```

#### Datenordner anlegen
```bash
mkdir -p data/import data/staging data/raw/youtube data/raw/topics
# Bestehende CSVs aus Schoolsystem2 nach data/import/ kopieren (manuell)
```

#### Frontend (React + Vite + TypeScript)
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
# Optional: react-query für API-State, axios oder fetch
npm install @tanstack/react-query
# dev starten:
npm run dev
```

---

### Acceptance Criteria (Phase 1 — Architektur)
- [x] Tech-Stack-Entscheidungen schriftlich dokumentiert
- [x] O1 beantwortet: Seeder in `backend/scripts/`; `scripts/` als Top-Level-Datenpipeline; `data/` mit `import/staging/raw/`-Unterstruktur
- [x] O2 beantwortet: Docker nur Mongo lokal; Lambda-Constraints dokumentiert (stateless, env-vars, Atlas)
- [x] Init-Befehle für alle 3 Packages (backend inkl. Seeder, scripts, frontend) vorhanden
- [x] Entscheidung TypeScript für alle Datenupdates gefallen; Python nur als optionales ML-Tool
- [ ] Tobia & Kollege haben Plan reviewed und freigegeben (APPROVE PLAN)

### Initialisierungsreihenfolge & Commit-Plan

Jeder Commit ist ein in sich abgeschlossenes Paket. Commits werden von Claude *vorgeschlagen*, nie selbst ausgeführt.
Convention: Subject-Zeile endet mit `;` wenn ein Commit-Body vorhanden ist.

**Commit 1 — Root-Infra & Datenstruktur**
Dateien: `.gitignore`, `.env.example`, `docker-compose.yml`, `README.md`, `data/import/.gitkeep`, `data/staging/.gitkeep`, `data/raw/youtube/.gitkeep`, `data/raw/topics/.gitkeep`
Begründung: Alles reine Konfiguration / Infrastruktur ohne Code; logisch eine Einheit.
```
chore: init project structure, docker compose and data folders;

- .gitignore (node_modules, dist, .env, mongo data)
- .env.example mit MONGO_URI, PORT, NODE_ENV
- docker-compose.yml (mongo:7, port 27017)
- data/ mit import/, staging/, raw/youtube/, raw/topics/
```

**Commit 2 — Backend-Scaffold (inkl. Seeder)**
Dateien: `backend/package.json`, `backend/tsconfig.json`, `backend/src/index.ts` (Skeleton mit health-check), `backend/scripts/seed.ts` (Skeleton)
```
feat(backend): init Fastify + TypeScript + Mongoose scaffold with seeder;

- Fastify, @fastify/cors, mongoose, dotenv, csv-parse
- tsx + nodemon für dev
- tsconfig: NodeNext, strict, ES2022
- src/index.ts: server bootstrap + GET /health
- scripts/seed.ts: seeder skeleton (liest data/import/, schreibt in MongoDB)
```

**Commit 3 — Scripts-Scaffold**
Dateien: `scripts/package.json`, `scripts/tsconfig.json`, `scripts/youtube/.gitkeep`, `scripts/topics/.gitkeep`
```
feat(scripts): init data pipeline scripts scaffold;

- csv-parse, csv-stringify, dotenv
- tsconfig: NodeNext, strict (kein outDir — tsx führt .ts direkt aus)
- Placeholder-Ordner youtube/ und topics/
```

**Commit 4 — Frontend-Scaffold**
Dateien: `frontend/**` (alles was `npm create vite` erzeugt)
```
feat(frontend): scaffold React + Vite + TypeScript app;

- Template: react-ts via create-vite
- @tanstack/react-query installiert
- Vite dev server auf Port 5173
```

**Commit 5 — TASK_PLAN.md (Planungsdoku)**
Dateien: `TASK_PLAN.md`
```
docs: add architecture planning doc (Phase 1)
```

---

### Nächste Phase (Phase 2 — Umsetzung, separater Plan)
- MongoDB-Schemas definieren (analog zu Schoolsystem2 Domain-Modell)
- Seeder implementieren (CSV → Mongoose-Dokumente)
- Fastify-Routes aufbauen (analog zu `api-contract.md` aus Schoolsystem2)
- React-Views portieren

Status: READY FOR APPROVAL

---

## Pre-Approval Checklist
- [x] Discovery: Status = READY
- [x] Planning: Status = READY FOR APPROVAL
- [x] Dokument ist reine Planung — keine Code/Config-Änderungen
- [x] Offene Fragen O1/O2 explizit markiert
- [x] Init-Befehle vorhanden
- [x] Mode & Score gesetzt

---

## Implementation Steps (Phase 1)

> Phase 1 = reine Planungsphase. "Implementation" bedeutet hier: Entscheidungen herbeiführen, nicht coden.

0) **Plan Sync:** Dieses Dokument laden; Developer Interactions prüfen.
1) ~~**O1 klären:** Seeder-Verortung~~ → ✅ Entschieden: `backend/scripts/seed.ts`
2) ~~**O2 klären:** Docker-Scope~~ → ✅ Entschieden: nur Mongo lokal; Lambda-Constraints dokumentiert
3) **Approval durch Tobia & Kollegen** → dann Phase 2 planen.
N) **Final @codex Sweep:** Alle Dateien auf `@claude`/`@codex`-Marker prüfen.

---

## Developer Interactions
*(leer — wird befüllt sobald Code/Config entsteht)*

---

## Checks & Pass Criteria
- Phase 1 ist reine Doku → kein Lint/Build/Test
- Manual Verification:
  - [ ] Tobia hat Stack-Entscheidungen gelesen und abgenickt
  - [ ] Kollege hat Init-Befehle geprüft
  - [x] O1 und O2 sind beantwortet

---

## Risks / Rollback
- ~~Risiko: Mongoose-Schema und Seeder teilen keine Typen~~ → ✅ Aufgelöst: Seeder in `backend/scripts/`, importiert direkt aus `backend/src/models/`
- Risiko: MongoDB-Schemaflexibilität führt zu unstrukturierten Daten → Mitigierung: Mongoose-Schemas mit `strict: true` + Zod-Validierung an der API-Grenze
- Rollback: Plan ist reine Doku → kein Code-Rollback nötig
