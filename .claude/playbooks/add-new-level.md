---
title: Playbook — Add a New Level
applies_to: [all-agents]
scope: [mvp]
---

# Playbook — Add a New Level

Steps to add Level N to Questerix Fractions. Run in order; do not skip steps.

## 1. Spec the level

Create `docs/10-curriculum/levels/level-NN.md`. Use the existing level docs as a template. The spec must pass the `rubrics/level-spec.md` rubric before proceeding.

## 2. Add to LEVEL_META

Edit `src/scenes/utils/levelMeta.ts`. Add an entry to `LEVEL_META` with:
- `number` — the level number
- `name` — short display name (≤ 20 chars)
- `concept` — one-line concept description
- `gradeBand` — 'K' | '1' | '2' | '3' | ...
- `track` — which learning track: 'partition' | 'compare' | 'number-line' | 'operations'

## 3. Run the pipeline

```bash
cd pipeline
ANTHROPIC_API_KEY=sk-... python -m pipeline.generate --level N
cd ..
npm run build:curriculum
npm run validate:curriculum
```

## 4. Run checks

```bash
npm run typecheck
npm run lint
npm run test:unit -- --filter validators
```

## 5. Validate parity

Run the `curriculum-byte-parity` subagent to confirm `public/curriculum/v1.json` and `src/curriculum/bundle.json` match.

## 6. Write interaction wiring (if new archetype)

If the level introduces a new archetype, create `src/scenes/interactions/<ArchetypeInteraction>.ts` and register it in the scene router. Add corresponding validator in `src/validators/`.

## 7. Open PR

Branch: `feat/YYYY-MM-DD-level-N-<slug>`. PR must include: spec doc, LEVEL_META entry, curriculum build output, passing tests.
