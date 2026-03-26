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

### Slice 2a: Topics + Tags 🔄

Ziel: Topics und Tags in MongoDB, REST-API, TopicsList und TopicDetail im Frontend.

| Modul | Plan | Status |
|-------|------|--------|
| Backend (Models, Seeder, Routes) | [backend/TASK_PLAN.md](./backend/TASK_PLAN.md) | 🔄 IN PROGRESS |
| Frontend (Router, Views) | [frontend/TASK_PLAN.md](./frontend/TASK_PLAN.md) | ⏳ wartet auf Backend Slice 2a |

Cross-Slice-Abhängigkeit:
- Frontend Slice 2a kann erst beginnen, wenn Backend-Routes stehen
- → Übergang: [backend/TASK_PLAN.md — Schritt: Routes fertig](./backend/TASK_PLAN.md#slice-2a-routes)
  → dann weiter: [frontend/TASK_PLAN.md — Slice 2a Views](./frontend/TASK_PLAN.md#slice-2a-views)

---

### Slice 2b: Interest-Search ⏳

Ziel: Keyword-basiertes Matching von Nutzer-Interessen gegen Tags → scored Topics.

| Modul | Plan | Status |
|-------|------|--------|
| Backend (InterestSearch-Service, POST /interest-search) | wird in `backend/TASK_PLAN.md` ergänzt | ⏳ |
| Frontend (InterestSearch-View) | wird in `frontend/TASK_PLAN.md` ergänzt | ⏳ |

Voraussetzung: Slice 2a abgeschlossen (Tags + Topics in DB).

---

### Slice 2c: Resources + Scoring ⏳

Ziel: Resources und Sources in MongoDB; Score-Berechnung pro Topic; ResourceTabelle in TopicDetail.

| Modul | Plan | Status |
|-------|------|--------|
| Backend (Resource/Source Models, Seeder, Score-Service) | wird ergänzt | ⏳ |
| Frontend (Resource-Tabelle in TopicDetail) | wird ergänzt | ⏳ |

Voraussetzung: Slice 2a + 2b abgeschlossen.
Hinweis: `ct_resource_to_topic.csv` und `t_resource.csv` sind in `data/import/` vorhanden, aber noch leer.

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
