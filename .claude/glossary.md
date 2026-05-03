---
title: Glossary (K–2 Scoped)
scope: [mvp, k-2]
last_reviewed: 2026-05-02
---

# Glossary

Terms used in prompts, docs, and agent instructions for the Questerix Fractions K–2 MVP.

---

## Curriculum

**equal parts** — A whole divided so every piece is the same size.

**unit fraction** — A fraction with numerator 1: 1/2, 1/3, 1/4. The building block of all other fractions.

**halves** — Two equal parts of a whole. Unit fraction: 1/2.

**thirds** — Three equal parts of a whole. Unit fraction: 1/3.

**fourths / quarters** — Four equal parts of a whole. Unit fraction: 1/4. "Fourths" and "quarters" are synonymous; the app uses "fourths" consistently.

**partition** — The act of dividing a shape into equal parts.

**denominator** — The bottom number of a fraction; how many equal parts the whole is divided into.

**numerator** — The top number of a fraction; how many equal parts are being referred to.

**same-denominator comparison** — Comparing fractions that share a denominator (e.g. 3/4 vs. 1/4). Larger numerator = larger fraction.

**same-numerator comparison** — Comparing fractions that share a numerator (e.g. 1/4 vs. 1/3). Larger denominator = smaller fraction (more pieces means each piece is smaller).

**benchmark fraction** — A reference value used for estimation: 0, 1/2, or 1. Every fraction is either less than, equal to, or greater than each benchmark.

**linear denominator progression** — The C8-mandated ordering of denominators introduced: halves → thirds → fourths. No level introduces a new denominator before mastering the prior ones.

---

## Archetypes

**partition** — Student draws a dividing line to split a shape into equal parts.

**identify** — Student selects or names the fraction shown in a given model.

**label** — Student writes or confirms the fraction label on a pre-partitioned model.

**make** — Student constructs a model to represent a given fraction.

**compare** — Student decides which of two fractions is larger using `<` / `>` / `=`.

**snap_match** — Student drag-snaps a fraction card to its matching visual model.

**benchmark** — Student places a fraction at the correct position relative to 0, 1/2, and 1.

**placement** — Student drags a fraction to its position on a number line.

**order** — Student sorts 3+ fractions from least to greatest or vice versa.

**equal_or_not** — Student decides whether a given partition is equal or unequal.

**explain_your_order** — Student orders fractions and provides a verbal rationale (capstone, L9).

---

## Misconception Codes

See `docs/10-curriculum/misconceptions.md` for full descriptions.

| Code | Short name |
|---|---|
| MC-WHB-01 | Whole-half bias (always picks "half") |
| MC-MAG-01 | Larger denominator = larger fraction |
| MC-PRX-01 | Proximity (picks fraction closest to a number visually) |

---

## Engine

**BKT** — Bayesian Knowledge Tracing. The engine's mastery model; tracks p(mastery) per skill as the student responds. See `src/engine/bkt.ts`.

**skill** — A discrete learning objective, coded `SK-NN`. Each question maps to one or more skills. See `docs/10-curriculum/skills.md`.

**archetype** — One of the 10 question interaction types listed above.

**router** — `src/engine/router.ts`; selects which archetype to serve next based on BKT state.

---

## Architecture

**LEVEL_META** — Array in `src/scenes/utils/levelMeta.ts`; single source of truth for level display info (name, concept, gradeBand, track).

**curriculum bundle** — Dual-file: `public/curriculum/v1.json` (runtime) + `src/curriculum/bundle.json` (static fallback). Must always match. Update via `npm run build:curriculum`.

**Dexie** — IndexedDB wrapper used for all persistence. Schema at `src/persistence/db.ts`.

**progressionStat** — Planned Dexie entity to replace `localStorage` keys `unlockedLevels:<id>` and `completedLevels:<id>`. See `docs/30-architecture/data-schema.md`.
