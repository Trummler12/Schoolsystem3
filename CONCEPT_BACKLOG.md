# Schoolsystem3 — Concept Backlog

> Dieses Dokument erfasst offene konzeptionelle Fragen und programmatische Grossbaustellen, die **noch nicht planungsreif** sind.
> Es steht hierarchisch über den `TASK_PLAN.md`-Dateien: Slices, die von hier aufgeführten Entscheidungen abhängen, werden erst geplant, wenn die jeweilige Grundsatzfrage beantwortet ist.
>
> Statuswerte: `OPEN` | `EVALUATING` | `DECIDED`

---

## Inhaltsverzeichnis

1. [Konzeptionelle Offene Punkte](#1-konzeptionelle-offene-punkte)
   - [A — LLM-Provider-Auswahl](#a--llm-provider-auswahl)
   - [B — Tag-System-Überarbeitung](#b--tag-system-überarbeitung)
   - [C — TopicTag-Zuweisung](#c--topictag-zuweisung)
   - [D — Resource-Topic-Pipeline](#d--resource-topic-pipeline)
   - [E — Level-Zuweisung pro Ressource](#e--level-zuweisung-pro-ressource)
   - [F — Regionale / kulturelle Spezifität](#f--regionale--kulturelle-spezifität)
2. [Abhängigkeitskette](#2-abhängigkeitskette)
3. [Revidierte Slice-Priorisierung](#3-revidierte-slice-priorisierung)
4. [S2-Vergleichsnotizen](#4-s2-vergleichsnotizen)

---

## 1. Konzeptionelle Offene Punkte

---

### A — LLM-Provider-Auswahl

**Status:** `OPEN`

**Problem:**
In Schoolsystem2 wurde OpenAI (gpt-4.1-mini) eingesetzt, jedoch waren die Ergebnisse des Interest-Search unzuverlässig — das LLM lieferte generische oder repetitive Resultate statt individuell passende Tag-IDs. Es soll eine Alternative zu OpenAI evaluiert werden.

**Optionen:**

| Option | Kosten | Qualität | Aufwand | Notizen |
|--------|--------|----------|---------|---------|
| **Anthropic API** (Claude) | Pay-per-use (getrennt vom Abo) | Hoch | Niedrig | Kein Budget im Claude.ai-Abo inbegriffen |
| **OpenAI API** | Pay-per-use | Mittel–Hoch | Niedrig | S2-Implementierung vorhanden; Ergebnisse enttäuschend |
| **Ollama (lokal)** | Kostenlos | Modellabhängig | Mittel | Hardware-Check nötig (Laptop-GPU/RAM); Llama 3.x / Mistral / Gemma |
| **Groq / Together AI** | Pay-per-use (günstiger) | Gut | Niedrig | OpenAI-kompatible API; interessante Alternative |

**Was es blockiert:** C, D, E, und die produktive Implementierung der `TagMatchingClient`-Schnittstelle (Slice 2b real)

**Nächster Schritt:** Lokalen Ollama-Test durchführen (Hardware-Evaluation); parallel Anthropic API-Preisliste prüfen.

---

### B — Tag-System-Überarbeitung

**Status:** `OPEN`

**Problem:**
Der aktuelle Tag-Satz (290 Tags in `t_tag.csv`) ist unbefriedigend. Folgende Probleme wurden identifiziert:
- Manche Tags sind zu ähnlich oder redundant (Embedding-Analyse in S2 ergab Paare wie `climate` / `climate change`, `animals` / `animal behavior`)
- Manche Topics werden durch die aktuellen Tags nicht gut abgedeckt (Tag-Gaps)
- Region-spezifische Topics (z.B. Cultural Studies) lassen sich mit dem aktuellen flachen Tag-System nicht sauber abbilden
- Vollständig flache Hierarchie erschwert die LLM-Relevanzbeurteilung

**Evaluierte Ansätze:**

| Ansatz | Ergebnis |
|--------|----------|
| Embedding-Ähnlichkeit (sentence-transformers) | Funktioniert für Deduplizierung, NICHT für thematische Zuweisung (Semantik ≠ Themenrichtung) |
| 2-Ebenen-Hierarchie (grob ~20 Tags + fein ~200–300 Tags) | Vielversprechend, aber noch kein zufriedenstellendes Ergebnis |
| Embedding-basierte Optimierung der Tag-Reihenfolge | Implementiert in `S2/backend/.../scripts/embedding/testing/base_tag_order.py` |

**Anforderungen an die neue Tag-Struktur:**
- Thematisch klar trennbar (nicht: "soft discipline", "holistic discipline")
- Abdeckung aller vorhandenen Topics + wichtiger Ressourcen
- Handhabbar für LLM-Prompts (nicht zu viele, nicht zu wenige)
- Lösung für region-spezifische Topics (eigene Tag-Dimension? Separat-Feld?)

**Was es blockiert:** C (TopicTag-Zuweisung), D (Resource-Topic-Pipeline), Qualität von Interest-Search

**Nächster Schritt:** Konzept für 2-Ebenen-Struktur ausarbeiten; entscheiden ob regionale Spezifität als Tag-Dimension oder als separates Topic-Feld modelliert wird.

---

### C — TopicTag-Zuweisung

**Status:** `OPEN` — blockiert auf **B**

**Problem:**
Die aktuellen `ct_topic_tags.csv`-Daten (Zuweisung von Tags zu Topics mit Gewichtung 1–5) wurden manuell kuratiert und hängen direkt vom aktuellen Tag-Satz ab. Sobald B entschieden ist (neues Tag-System), müssen alle TopicTags neu zugewiesen werden.

**Geplanter Ansatz (nach B-Entscheid):**
- LLM-basierte Zuweisung (welcher Provider → hängt von A ab)
- Prompting-Strategie: Topic-Beschreibung + Tag-Katalog → LLM wählt 3–8 passende Tags + Gewichtung

**Was es blockiert:** Qualität von Interest-Search (direkt), Resource-Topic-Pipeline (indirekt über D)

---

### D — Resource-Topic-Pipeline

**Status:** `OPEN` — teilweise blockiert auf **A + B + C**

**Problem:**
In S2 wurden Ressourcen Topics zugewiesen rein über Tag-Score-Überlappung (Resource-Tags ∩ Topic-Tags). Das liefert unbefriedigende Ergebnisse. Die `ct_resource_to_topic.csv` ist in S3 leer.

**Geplante Pipeline (mehrstufig):**
1. **Tag-Score-Pre-Filter:** Für jede Ressource alle Topics berechnen, Score = Σ(resourceTagWeight × topicTagWeight). Top 10–15% behalten.
2. **Embedding-Reduktion:** Embedding-Modell (z.B. multilingual sentence-transformers) reduziert weiter auf top 1–2%.
3. **LLM-Explizit-Zuweisung:** LLM weist jede Ressource explizit 1–3 Topics zu (aus dem 1–2%-Kandidatenset).
4. **Speicherung:** Embedding-Score als provisorisches Ranking; alternativ oder zusätzlich: Video-Statistiken (Views × Bewertung).

**Vorhandene Daten:**
- `t_source.csv` — 2199 Quellen (YouTube-Videos; alle mit `sa_resource=1`)
- `ct_resource_tags.csv` — 10992 Resource-Tag-Mappings (resourceID = sourceID)
- `t_source_author.csv` — YouTube-Channel-Autoren
- Leer: `t_resource.csv`, `ct_resource_to_topic.csv`, `ct_uses_source.csv`

**Überbrückungs-Lösung für Slice 2c (kurzfristig):**
Resources via reinem Tag-Score-Overlap verbinden (Schritt 1 der Pipeline) und in TopicDetail anzeigen. Ergebnisse werden verbesserungswürdig sein, aber echte Daten sind besser als leere Platzhalter.

**Was es blockiert:** Resource-Anzeige in TopicDetail (Slice 2c)

---

### E — Level-Zuweisung pro Ressource

**Status:** `OPEN` — blockiert auf **A + B + C + D**

**Problem:**
Jede Ressource soll einem Kompetenzlevel (1–9, auf Zehntel genau) zugewiesen werden:
- **frühest sinnvoll:** Ab welchem Level ist die Ressource verständlich?
- **empfohlen:** Bei welchem Level wird maximaler Nutzen erzielt?

In S2 experimentierten wir mit LLM-basierter Zuweisung, jedoch:
- Varianz zwischen Durchläufen: bis zu ±2 Level
- Vermutliche Ursache: Unstabiles Prompting und/oder unklare Leveldefinitionen

**Was fehlt noch:**
- Klare, maschinenlesbare Definition der 9 Level (mit Beispielen)
- Stabiler, evaluierter Prompt der konsistente Ergebnisse liefert
- Evaluierungs-Framework (Gold-Standard-Set für A/B-Tests verschiedener Prompts)

**Was es blockiert:** Sinnvolle Level-Filterung in der UI

---

### F — Regionale / kulturelle Spezifität

**Status:** `OPEN` — abhängig von **B**

**Problem:**
Manche Topics sind inhärent region- oder kulturspezifisch (z.B. *Cultural Studies*, *History of [Region]*). Das aktuelle flat-Tag-System kann diese Dimension nicht sauber abbilden.

**Mögliche Ansätze:**
1. **Separate Region-Tags:** Spezielle Tag-Kategorie `region:europe`, `region:asia` etc. — einfach, aber bläht Tag-Raum auf
2. **Separates Feld im Topic-Dokument:** `regions: string[]` — sauber, aber braucht eigenen Filter in API und UI
3. **Teil der 2-Ebenen-Tag-Hierarchie:** Grob-Tag "Regional Studies" mit feinen Region-Tags — konsistent mit B

**Entscheidung:** Zusammen mit B-Entscheid treffen.

---

## 2. Abhängigkeitskette

```
A (LLM-Provider)
  └─► Slice 2b (Real LLM für TagMatchingClient)
  └─► C (TopicTag-Zuweisung — LLM-Calls)
  └─► D (Resource-Topic-Pipeline — LLM-Calls)
  └─► E (Level-Zuweisung — LLM-Calls)

B (Tag-System)
  └─► C (TopicTag-Zuweisung — braucht finalen Tag-Satz)
      └─► Qualität von Interest-Search
      └─► D (Resource-Topic-Pipeline — Resource-Tags müssen zu Topic-Tags passen)
          └─► E (Level-Zuweisung — braucht stabile Ressource-Topic-Zuordnung)
  └─► F (Regionale Spezifität — Entscheid zusammen mit B)

D (Resource-Topic-Pipeline — Schritt 1 via Tag-Overlap)
  └─► Slice 2c (kurzfristige Überbrückung — nur Tag-Score, ohne LLM)
```

**Kritischer Pfad:**
`B → C → D (vollständig) → E` — und `A` muss entschieden sein bevor C, D (vollständig), E angegangen werden.

---

## 3. Revidierte Slice-Priorisierung

| Priorität | Slice | Voraussetzung | Status |
|-----------|-------|---------------|--------|
| ① | **Slice 2c** (Resources — Grundversion) | Keine (Tag-Overlap reicht für MVP) | Nächster Schritt |
| ② | **Konzept B** — Tag-System-Entscheid | Manuelle Konzeptarbeit (kein Code) | Blockiert auf Diskussion |
| ③ | **Konzept A** — LLM-Provider-Evaluation | Hardware-Test (Ollama) + API-Preisvergleich | Blockiert auf Zeit |
| ④ | **Slice 2b Real** (echter TagMatchingClient) | A entschieden | Blockiert |
| ⑤ | **Slice 2d** — TopicTag-Re-Zuweisung | A + B entschieden | Blockiert |
| ⑥ | **Slice 2e** — Resource-Topic-Pipeline (vollständig) | A + B + C | Blockiert |
| ⑦ | **Slice 2f** — Level-Zuweisung | A + B + C + D | Blockiert |
| ⑧ | **Phase 3** — Datenpipeline (YouTube API) | Slice 2c steht | Später |
| — | **Styling-Pass** (Frontend) | Alle Content-Features stabil | Jederzeit |

---

## 4. S2-Vergleichsnotizen

> Erkenntnisse aus dem Abgleich von Schoolsystem3 Slice 2b mit der Schoolsystem2-Implementierung (Stand 2026-03-27).

**Parity-Check Slice 2b:**
- Response-Struktur: ✅ identisch (interestsText, usedLanguage, matchedTags[], topics[])
- Weight-Matrix + layerEquivalent-Formel: ✅ portiert
- Input-Validierung (12–2048 Zeichen): ✅
- Frontend-Cooldown (60s, localStorage): ✅ (S2 hatte das NICHT auf Backend-Ebene — S3 ist hier konservativer)

**Kleine Abweichung (akzeptiert):**
`maxResults`-Default: S2 = fix 50 (max 200); S3 = dynamisch `floor(totalTopics × 0.1)` min 5 (~72 bei 723 Topics).
→ S3-Ansatz ist sinnvoller (skaliert mit Topic-Wachstum).

**S2-Feature nicht portiert (bewusst deferred):**
Multi-Model-Borda-Count (mehrere LLM-Durchläufe → gewichteter Konsensus) — erst relevant wenn Punkt A entschieden.
