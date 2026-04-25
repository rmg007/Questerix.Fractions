---
title: Test Strategy
status: active
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
related:
  - stack.md
  - content-pipeline.md
  - runtime-architecture.md
  - ../20-mechanic/activity-archetypes.md
---

# Test Strategy

Per audit §4.2, this document enumerates what is tested at each layer, which tooling is used, what coverage targets apply, and how tests gate CI. The goal is a test suite that catches regressions in the highest-risk code cheaply, without gold-plating UI test coverage that is expensive to maintain.

---

## 1. Test Layers

### 1.1 Unit — Vitest

Pure TypeScript functions with no I/O or DOM dependencies.

**Scope:** all validator functions (`src/validators/`), BKT math formulas (`src/progression/bkt.ts`), fraction arithmetic helpers, schema migration helpers, any utility that is pure and synchronous.

**Why:** validators are the most critical correctness boundary in the app. A wrong validator silently accepts or rejects student answers. They are pure functions — cheapest possible test surface. No mocking, no setup.

### 1.2 Integration — Vitest + fake-indexeddb

Tests that exercise the Dexie persistence layer using an in-memory IndexedDB substitute.

**Scope:** `PersistenceLayer` repos (CRUD for each dynamic store), bootstrap sequence (schema version reconciliation, static seed loading), backup/restore round-trip via `dexie-export-import`.

**Tooling:** `fake-indexeddb` package drops in as a replacement for the browser IndexedDB API in the Vitest Node environment. No browser required.

**Why:** persistence bugs (migration failure, data corruption, wrong index used) are high-impact but hard to catch with unit tests alone. Integration tests at this layer surface them without running a browser.

### 1.3 E2E — Playwright

Full browser playthroughs against a Vite dev-server build.

**Scope:** boot → student create → level pick → first attempt → outcome (happy path); backup export → restore round-trip; session end summary; level mastery modal; reduced-motion mode toggle.

**Browsers tested:** Chromium (primary), WebKit (Safari proxy), Firefox.

**Why:** catches regressions in Phaser scene orchestration, Dexie initialization in a real browser, and the HTML/Tailwind UI interactions that wrap the game canvas. Does not attempt to cover every mechanic variant — that is validators' job.

### 1.4 Property-Based — fast-check

Generative testing of BKT formulas and fraction arithmetic invariants.

**Scope:** BKT: for any prior `(p, t, s, g)` ∈ [0,1]⁴ and outcome ∈ {EXACT, WRONG}, verify posterior stays in [0,1] and monotonically advances on EXACT. Fraction arithmetic: round-trip decimal conversions, ordering invariants.

**Why:** BKT priors will be tuned repeatedly. Property tests catch numerical edge cases (NaN, values outside [0,1]) that example-based tests miss.

### 1.5 Validator Parity — TS ↔ Python

Conformance tests that prove the Python pipeline validators (`tools/content-pipeline/validators_py/`) produce identical results to the TypeScript runtime validators (`src/validators/`) on the same fixture inputs.

**Scope:** all validator archetypes in use: `placement.snap8`, `equal_or_not.areaTolerance`, `partition.equalAreas`, `identify.exactIndex`, plus any others added per `activity-archetypes.md` registry.

**Tooling:** `tools/content-pipeline/test/test_validators_match_ts.py` — loads golden fixtures from `tests/fixtures/`, runs both Python and TS validators, asserts identical `outcome` values. TS side is invoked via `tsx` or a compiled stub.

**Why:** if the Python pipeline passes a template that the TS runtime rejects, or vice versa, content quality breaks silently. This test is the only guard. Per `content-pipeline.md §6.2`.

---

## 2. What Gets Which Test

| Code | Test Layer | Rationale |
|------|-----------|-----------|
| All validator functions (`src/validators/`) | Unit (Vitest) + Parity (Python↔TS) | Pure; highest correctness risk; cheap to test |
| BKT formulas (`src/progression/bkt.ts`) | Unit (Vitest) + Property (fast-check) | Pure math; edge cases matter for mastery gating |
| Dexie repos + schema migrations | Integration (fake-indexeddb) | High-impact; requires real IndexedDB behavior |
| Backup / restore round-trip | Integration (fake-indexeddb) | Data loss risk; must be exercised end-to-end |
| Bootstrap / seed sequence | Integration (fake-indexeddb) | Content version reconciliation is complex |
| Phaser activity scenes | E2E (Playwright) | UI-expensive; happy path only |
| HTML/Tailwind UI (menus, modals) | E2E (Playwright) | DOM interactions, accessibility hooks |
| Content pipeline Python scripts | Unit (pytest) in `tools/content-pipeline/test/` | Build-time tool; schema + math checks |
| Archetype validator parity | Parity (TS↔Python) — CI-gated | Cross-language conformance critical |

---

## 3. Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| Validators (pure code) | 90% line coverage | Cheap to cover; high correctness risk |
| BKT / progression math | 90% line coverage | Same: pure and critical |
| Persistence layer (Dexie repos) | 70% line coverage | Integration tests cover key paths |
| Phaser scenes | 70% line coverage (E2E proxy) | UI-heavy code is expensive to test exhaustively |
| UI-only code (visual chrome, animations) | No numeric target | Motion and visual polish not unit-testable |
| Content pipeline (Python) | 80% statement coverage (pytest-cov) | Build tool; regression risk on schema change |

Coverage is measured by Vitest's `--coverage` flag (Istanbul provider). Reports are generated in CI but do not block PRs unless validators fall below 90%.

---

## 4. Test Data

- Fixture JSON lives in `tests/fixtures/` and `tools/content-pipeline/test/fixtures/`.
- Fixture templates are hand-authored golden examples — not LLM-generated — representing one correct and one incorrect case per validator archetype.
- **Never hit a live LLM in CI.** The content pipeline's LLM calls are development-time only. CI runs only `python -m pipeline verify` (no LLM), not `build`.
- Dexie integration tests use `fake-indexeddb` seeded from the same fixtures.

---

## 5. CI Gating

| Gate | Effect |
|------|--------|
| Validator parity tests fail | PR blocked — merge forbidden |
| Vitest unit/integration suite fails | PR blocked |
| Playwright E2E suite fails | PR blocked |
| Validator line coverage drops below 90% | PR blocked |
| Bundle size over 1.0 MB gzipped | PR blocked (see `performance-budget.md`) |
| fast-check property test fails | PR blocked |
| `python -m pipeline verify` fails | PR blocked |

Playwright runs in CI against `playwright.config.ts` using the installed Chromium, WebKit, and Firefox binaries. E2E tests are intentionally limited to the happy path and critical regression scenarios to keep CI time under 5 minutes.
