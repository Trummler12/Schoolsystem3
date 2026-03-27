# Schoolsystem3 — Projektplan (Navigation Hub)

> Diese Datei ist der übergeordnete Navigations-Plan.
> Detaillierte Implementierungspläne leben in den jeweiligen Modul-Ordnern.

---

## Projektübersicht

Neuimplementierung von Schoolsystem2: eine Plattform zur Verwaltung und Entdeckung von Lernressourcen nach Kompetenzlevel-basiertem Bildungskonzept.

**Stack:** Node.js + Fastify + TypeScript + MongoDB (Mongoose) | React + Vite | TypeScript-Skripte

---

## Phase 1: Setup & Architektur ✅

| Was | Status |
|-----|--------|
| Tech-Stack-Entscheidungen | ✅ |
| Projektstruktur & Ordner | ✅ |
| Backend-Scaffold (Fastify, Mongoose, Seeder-Skeleton) | ✅ |
| Frontend-Scaffold (React, Vite, react-query) | ✅ |
| Scripts-Scaffold (Datenpipeline-Vorbereitung) | ✅ |
| CSVs aus Schoolsystem2 migriert → `data/` | ✅ |

Architektur-Entscheide: → [Phase-1-Archiv weiter unten](#phase-1-entscheide-archiv)

---

## Phase 2: Kern-Implementierung

Umsetzung in **Vertical Slices** — jeder Slice liefert ein vollständig durchgestochenes Feature (DB → API → UI).

### Slice 2a: Topics + Tags ✅

Ziel: Topics und Tags in MongoDB, REST-API, TopicsList und TopicDetail im Frontend.

| Modul | Plan | Status |
|-------|------|--------|
| Backend (Models, Seeder, Routes) | [backend/TASK_PLAN.md](./backend/TASK_PLAN.md) | ✅ |
| Frontend (Router, Views) | [frontend/TASK_PLAN.md](./frontend/TASK_PLAN.md) | ✅ |

---

### Slice 2b: Interest-Search ✅ (Stub — LLM provider TBD)

Ziel: LLM-basiertes Matching von Nutzer-Interessen gegen Tags → scored Topics.

| Modul | Plan | Status |
|-------|------|--------|
| Backend (Pre-Fix Filter, InterestSearchService, POST /interest-search) | [backend/TASK_PLAN.md — Slice 2b](./backend/TASK_PLAN.md#slice-2b) | ✅ |
| Frontend (InterestSearchView) | [frontend/TASK_PLAN.md — Slice 2b](./frontend/TASK_PLAN.md#slice-2b) | ✅ |

Voraussetzung: Slice 2a ✅
LLM-Provider: TBD (nicht OpenAI) — Abstraktionsschicht (`TagMatchingClient`-Interface) ermöglicht späteren Austausch ohne Service-Änderung.

---

### Slice 2c: Resources ⏳

Ziel: Sources (YouTube-Videos) in MongoDB; Tag-Overlap-Berechnung pro Topic; ResourceTabelle in TopicDetail.

| Modul | Plan | Status |
|-------|------|--------|
| Backend (Source-Model, Seeder-Erweiterung, Route-Erweiterung) | [backend/TASK_PLAN.md — Slice 2c](./backend/TASK_PLAN.md#slice-2c) | ⏳ |
| Frontend (ResourcesTable in TopicDetail) | [frontend/TASK_PLAN.md — Slice 2c](./frontend/TASK_PLAN.md#slice-2c) | ⏳ |

Voraussetzung: Slice 2a + 2b abgeschlossen. ✅
Ansatz: `t_source.csv` (2199 Sources) + `ct_resource_tags.csv` → Overlap-Score = Σ(sourceTagWeight × topicTagWeight); Top-10 per Topic gespeichert.
Hinweis: `ct_resource_to_topic.csv` ist leer — Verbindung wird per Overlap-Berechnung beim Seeding hergeleitet (Überbrückung bis Phase 3-Pipeline).

---

## Phase 3: Datenpipeline (später)

Automatisiertes Befüllen von `data/raw/` und `data/staging/` über externe APIs:
- YouTube Data API → `scripts/youtube/`
- Wikipedia / Akademische Disziplinen → `scripts/topics/`

Plan: → wird in `scripts/TASK_PLAN.md` erarbeitet, wenn Phase 2 abgeschlossen ist.

---

## Phase 1 — Entscheide Archiv

- **Backend-Framework:** Fastify (TypeScript-first, schneller als Express)
- **ODM:** Mongoose (Schema-Validierung, TypeScript-Typen via InferSchemaType)
- **Seeder:** `backend/scripts/seed.ts` (im Backend-Projekt, damit Mongoose-Models geteilt werden; kein separater Ordner)
- **Scripts:** Top-Level `scripts/`-Ordner, kein `src/`-Unterordner (kein Build-Step, tsx führt direkt aus)
- **Data-Workflow:** `data/raw/` → (manuell aufbereiten) → `data/staging/` → (manuell prüfen) → `data/import/` → Seeder → MongoDB
- **Docker:** Nur MongoDB lokal; für AWS Lambda: Backend stateless halten, MongoDB Atlas für Cloud
- **Commits:** Englisch, Subject endet mit `;` wenn Body vorhanden; nie auto-committen
