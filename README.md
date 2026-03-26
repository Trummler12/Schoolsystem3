# Schoolsystem3

Neuimplementierung von Schoolsystem2 — Verwaltung und Entdeckung von Lernressourcen nach Kompetenzlevel.

## Stack

- **Backend**: Node.js + Fastify + TypeScript + Mongoose
- **Datenbank**: MongoDB
- **Frontend**: React + Vite + TypeScript
- **Datenpipeline**: TypeScript-Skripte (`scripts/`)

## Voraussetzungen

- Node.js >= 20 LTS
- Docker (für MongoDB lokal)

## Setup

```bash
# MongoDB starten
docker compose up -d

# .env anlegen
cp .env.example .env

# Backend
cd backend && npm install && npm run dev

# Frontend (neues Terminal)
cd frontend && npm install && npm run dev

# DB seeden (einmalig oder nach Reset)
cd backend && npm run seed
```

## Datenstruktur (`data/`)

| Ordner | Inhalt |
|--------|--------|
| `data/import/` | Review-te CSVs — Seeder liest von hier |
| `data/staging/` | `*PLANNING.csv.txt` — Ziel der Update-Skripte; manuell nach `import/` promoten |
| `data/raw/youtube/` | Rohdaten aus der YouTube Data API |
| `data/raw/topics/` | Rohdaten zu akademischen Disziplinen (Wikipedia etc.) |
