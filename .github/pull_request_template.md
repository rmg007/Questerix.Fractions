## Summary

<!-- What does this PR do, and why? One or two sentences. Lead with intent, not files touched. -->

## Test plan

<!-- Check all that apply. Anything skipped should be justified one line below the box. -->

- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean (0 warnings)
- [ ] `npm run test:unit` green
- [ ] `npm run test:integration` green (required if `src/persistence/**` or `src/engine/**` touched)
- [ ] `npm run test:e2e` green (required if scene UI touched)
- [ ] `npm run build` succeeds
- [ ] `npm run measure-bundle` ≤ 1.0 MB gzipped JS
- [ ] Manual session at `localhost:5000` (required if scene UI or interaction touched)
- [ ] `npm run validate:curriculum` clean (required if curriculum bundle changed)

## Conflict warning

<!-- Fill in if this branch is likely to collide with another open PR — e.g. shared decision-log slot,
     overlapping LEVEL_META edits, both branches touching the same scene. Otherwise write "none". -->

## Decision-log impact

<!-- Does this PR add or alter a `D-NN` entry in docs/00-foundation/decision-log.md?
     If yes: which number, and is it the next free slot at time of writing this PR? -->

## Constraint references

<!-- Which of C1–C10 does this PR touch or verify? Constraints in docs/00-foundation/constraints.md.
     Mark each as: not affected / verified / known deviation (link the docs that bless it). -->

| Constraint | Status |
| --- | --- |
| C1 — no backend | not affected / verified |
| C4 — Phaser+TS+Vite+Dexie only | not affected / verified |
| C5 — localStorage only `lastUsedStudentId` | not affected / verified |

## Bundle delta

<!-- Required if any change touches dependencies, dynamic imports, or assets.
     Run `npm run measure-bundle` before and after. -->

|        | Gzipped JS (bytes) |
| ------ | ------------------ |
| Before |                    |
| After  |                    |
| Delta  |                    |

If delta > 10% of any single budget slice, justify here. Per `docs/30-architecture/performance-budget.md §5`.
