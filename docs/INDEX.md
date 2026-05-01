---
title: Documentation Index
status: active
owner: solo
last_reviewed: 2026-04-30
---

# Documentation Index

Complete map of `/docs`. Read in the order shown for the first pass; jump around for everything after.

---

## Start Here

1. [Constraints](./00-foundation/constraints.md) — **The Gate.** C1 through C10.
2. [Vision](./00-foundation/vision.md) — Why this exists, what success looks like.
3. [Glossary](./00-foundation/glossary.md) — Every term used everywhere else.

## Live Planning Artifacts

- [Open Questions Register](./00-foundation/open-questions.md) — what still needs to be decided
- [Decision Log](./00-foundation/decision-log.md) — append-only record of D-01 through D-20
- [Risk Register](./00-foundation/risk-register.md) — R-NN consolidated risks with mitigations

## Curriculum

- [Scope and Sequence](./10-curriculum/scope-and-sequence.md) — what concepts the MVP covers
- [Standards Map](./10-curriculum/standards-map.md) — CCSS K/1/2 crosswalk
- [Misconceptions](./10-curriculum/misconceptions.md) — MC catalog with detection signals
- [Skills Registry](./10-curriculum/skills.md) — canonical SK-NN registry

### Per-Level Specs

| Level | File                                           | Concept                                   | Mechanic family           |
| ----- | ---------------------------------------------- | ----------------------------------------- | ------------------------- |
| L1    | [level-01](./10-curriculum/levels/level-01.md) | Halves: equal parts                       | partition, identify       |
| L2    | [level-02](./10-curriculum/levels/level-02.md) | Identify halves (depth)                   | identify, label, match    |
| L3    | [level-03](./10-curriculum/levels/level-03.md) | Thirds and fourths (identify)             | identify, name            |
| L4    | [level-04](./10-curriculum/levels/level-04.md) | Make halves                               | make, fold                |
| L5    | [level-05](./10-curriculum/levels/level-05.md) | Make thirds and fourths                   | make, fold, compositional |
| L6    | [level-06](./10-curriculum/levels/level-06.md) | Compare same-denominator (symbols arrive) | compare, snap_match       |
| L7    | [level-07](./10-curriculum/levels/level-07.md) | Compare same-numerator                    | compare, ladder           |
| L8    | [level-08](./10-curriculum/levels/level-08.md) | Benchmarks (0, 1/2, 1)                    | placement, benchmark_sort |
| L9    | [level-09](./10-curriculum/levels/level-09.md) | Order 3+ fractions (capstone)             | order, explain            |

## Mechanic

- [Activity Archetypes](./20-mechanic/activity-archetypes.md) — 10 archetypes with validators
- [Design Language](./20-mechanic/design-language.md) — palette, typography, spacing, motion
- [Interaction Model](./20-mechanic/interaction-model.md) — feedback, hint ladder, accessibility

## Architecture

- [Stack](./30-architecture/stack.md) — Phaser 4 + TS + Vite + Tailwind v4 + Dexie 4
- [Data Schema](./30-architecture/data-schema.md) — 9 static + 8 dynamic entities
- [Persistence Spec](./30-architecture/persistence-spec.md) — Dexie + PWA + JSON backup
- [Runtime Architecture](./30-architecture/runtime-architecture.md) — boot, lifecycle, store map
- [Content Pipeline](./30-architecture/content-pipeline.md) — build-time question authoring tool
- [Test Strategy](./30-architecture/test-strategy.md) — unit/integration/E2E/property/parity layers
- [Accessibility](./30-architecture/accessibility.md) — WCAG 2.1 AA commitments and verification
- [Performance Budget](./30-architecture/performance-budget.md) — 1.0 MB gzipped budget by slice
- [Hint System README](./30-architecture/hint-system/HINTS_README.md) — 3-tier hint ladder spec
- [Hint Generation](./30-architecture/hint-system/HINT_GENERATION.md) — pipeline for authoring hints
- [Hint System Files](./30-architecture/hint-system/HINT_SYSTEM_FILES.md) — file map for hint code paths
- [Keyboard Bindings](./KEYBOARD_BINDINGS.md) — keyboard accessibility map
- [Audio Assets — Provenance & Licensing](../assets/audio/README.md) — source URLs, download commands, curation policy for SFX

## Validation

- [Learning Hypotheses](./40-validation/learning-hypotheses.md) — 7 testable claims with falsification criteria
- [Playtest Protocol](./40-validation/playtest-protocol.md) — 8–10 students × 3 sessions
- [In-App Telemetry](./40-validation/in-app-telemetry.md) — what's recorded, exported, kept private
- [Privacy Notice](./40-validation/privacy-notice.md) — public-facing parent-readable notice

## Roadmap

- [MVP L1-L9 Roadmap](./50-roadmap/mvp-l1-l9.md) — 5 phases, ~5–6 months solo
- [Post-MVP 2029 Parking Lot](./50-roadmap/post-mvp-2029.md) — what we're deferring

---

## File-Type Map

```
docs/
├── 00-foundation/   (6 docs) — constraints, vision, glossary, open-questions, decision-log, risk-register
├── 10-curriculum/   (13 docs) — scope, standards, misconceptions, skills registry, levels 1-9
├── 20-mechanic/     (3 docs) — archetypes, design-language, interaction-model
├── 30-architecture/ (8 docs) — stack, data-schema, persistence, runtime, content-pipeline, test-strategy, accessibility, performance-budget
├── 40-validation/   (4 docs) — hypotheses, playtest-protocol, telemetry, privacy-notice
├── 50-roadmap/      (2 docs) — mvp roadmap, post-mvp parking lot
└── INDEX.md         (this file)
```

**Total:** 36 documents. (audit §1.4 fix)

---

## Frontmatter Conventions

Every doc begins with YAML front-matter:

```yaml
---
title: <human-readable title>
status: active | draft | parking-lot | superseded | archived
owner: solo
last_reviewed: YYYY-MM-DD
applies_to: [mvp] # or [post-mvp-2029]
constraint_refs: [C1, C3] # optional
related: [path/to/doc.md, ...] # optional
supersedes: [] # optional
---
```

A doc tagged `applies_to: [post-mvp-2029]` may not be referenced by an `[mvp]` doc except through `50-roadmap/post-mvp-2029.md`.

---

## ID Schemas

| Type              | Pattern                           | Example                             | Defined In                                             |
| ----------------- | --------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| Constraint        | `C{N}`                            | `C8`                                | `00-foundation/constraints.md`                         |
| Decision          | `D-{NN}`                          | `D-09`                              | `00-foundation/decision-log.md`                        |
| Open Question     | `Q{N}`                            | `Q3`                                | `00-foundation/open-questions.md`                      |
| Skill             | `SK-{NN}`                         | `SK-02`                             | `10-curriculum/skills.md` (canonical registry)         |
| Misconception     | `MC-{FAM}-{NN}`                   | `MC-WHB-01`                         | `10-curriculum/misconceptions.md`                      |
| Activity          | `<slug>`                          | `magnitude_scales`                  | per-level specs + `20-mechanic/activity-archetypes.md` |
| Validator         | `validator.<archetype>.<variant>` | `validator.placement.snapTolerance` | `20-mechanic/activity-archetypes.md`                   |
| Question Template | `q:<archetype-short>:L{N}:NNNN`   | `q:ms:L1:0001`                      | per-level specs                                        |
| Hypothesis        | `H-{NN}`                          | `H-03`                              | `40-validation/learning-hypotheses.md`                 |
| Risk              | `R-{NN}`                          | `R-04`                              | `00-foundation/risk-register.md`                       |
