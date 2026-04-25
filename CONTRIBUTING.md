# Contributing to Questerix Fractions

This is a solo validation project. The guidelines below set the quality bar so the codebase stays healthy if anyone else picks it up.

---

## Setup

```bash
git clone https://github.com/ryanmidogonzalez/questerix-fractions.git
cd questerix-fractions
npm install --legacy-peer-deps
npm run dev          # http://localhost:5173
```

Requirements: Node 20+, Python 3.11+ (for content pipeline only).

---

## Tests

```bash
npm run test:unit          # Vitest unit + integration (122+ tests)
npm run test:e2e           # Playwright end-to-end smoke suite
npm run typecheck          # tsc --noEmit strict check
```

All three must be green before any PR merges.

---

## Content pipeline

The pipeline generates `QuestionTemplate` records for each activity archetype and writes them to `src/assets/curriculum/`.

```bash
cd pipeline
pip install -r requirements.txt

# Generate questions for a single level (e.g. Level 1)
python -m pipeline.generate --level 1

# Regenerate all levels
python -m pipeline.generate --all
```

The pipeline uses Claude Haiku 4.5 (generation) + Sonnet 4.6 (editorial polish). Set `ANTHROPIC_API_KEY` in your environment. See `docs/30-architecture/content-pipeline.md` for full spec.

---

## Adding a level

`LevelScene` is config-driven. To add or modify a level:

1. Add an entry to `LEVEL_META` in `src/data/levels.ts` with the level number, title, denominator family, and mastery threshold.
2. Add a per-level archetype list (which activity types appear, in what order) in the same file.
3. Run the pipeline for that level: `python -m pipeline.generate --level <N>`
4. Verify the generated JSON passes validators: `npm run test:unit -- --filter validators`
5. Add a level spec to `docs/10-curriculum/levels/level-NN.md` (see existing files for format).

Do not hard-code question data in `src/`. All question content comes from the pipeline-generated JSON.

---

## Code style

- **Prettier** defaults (`.prettierrc` at root). Run `npm run format` before committing.
- **TypeScript strict mode** — `strict: true` in `tsconfig.json`. No `any`. No `@ts-ignore` without a comment explaining why.
- **Branded ID types** — use `LevelId`, `StudentId`, `QuestionId` etc. from `src/types/ids.ts`. Do not use plain `string` for identifiers.
- **No new runtime dependencies** without discussion. The 1 MB gzipped performance budget is tight (see `docs/30-architecture/performance-budget.md`).

---

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/) style is preferred:

```
feat(level): add L3 identify-thirds archetype
fix(persistence): handle Dexie upgrade from schema v1 to v2
docs(constraints): clarify C8 two-axis progression
```

Types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`.

---

## PR checklist

Before opening a pull request, verify:

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run test:unit` — all tests pass
- [ ] `npm run test:e2e` — smoke suite passes
- [ ] `npm run build` — production build succeeds, `dist/` size ≤ 1 MB gzipped
- [ ] Accessibility: interactive elements have labels; new touch targets are ≥ 44×44 px
- [ ] No `any`, no `@ts-ignore` without justification
- [ ] If content changed: pipeline re-run and validators pass
- [ ] `CHANGELOG.md` `[Unreleased]` section updated

---

## Constraints

All contributions must respect **C1–C10** in [`docs/00-foundation/constraints.md`](./docs/00-foundation/constraints.md). The short version:

- No backend, no accounts, no external data egress (C1, C5)
- No teacher / parent / admin UI (C2)
- Levels 1–9 only (C3)
- No new frameworks; Phaser 4 + TS + Vite + Dexie only (C4)
- Simple + bright visual style, no neon (C6)
- Responsive 360–1024 px (C7)
- Sessions ≤ 15 minutes per level (C9)
- Every change must serve validation, not polish (C10)

If a proposal violates a constraint, the proposal is rejected — not the constraint.
