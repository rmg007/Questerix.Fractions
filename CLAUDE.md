# Questerix Fractions — Agent Guide

Educational browser game (Phaser 4 + TypeScript) teaching K–2 fraction concepts via magnetic-drag mechanics. Solo validation project. No backend, no accounts, no external data egress.

> **Search hygiene:** ignore any `_archive/` path during exploration unless the user explicitly asks. Those folders are completed-work debriefs kept for history; their content does not reflect the current code.

---

## Slash commands (in `.claude/commands/`)

- `/preflight` — full pre-merge gate (typecheck, lint, unit, integration, build, bundle guard)
- `/sync-curriculum` — rebuild + validate curriculum bundles after pipeline output changes
- `/diag` — one-screen repo state (branch, dirty files, recent commits, bundle size, test count)
- `/learn <text>` — append a one-line gotcha to `.claude/learnings.md`
- `/retro` — end-of-session retro; proposes CLAUDE.md / learnings / PLANS / CHANGELOG updates
- `/sprint-status` — compact table of active blockers vs. codebase reality
- `/c5-check` — grep localStorage for constraint drift outside documented exceptions
- `/test-changed` — run Vitest only on tests for files changed since main (faster inner loop)
- `/decision <title>` — append a new D-NN entry to `docs/00-foundation/decision-log.md`

## Continuous self-improvement

- **Skim `.claude/learnings.md` at session start.** It captures non-obvious gotchas surfaced in prior sessions.
- **Append to it whenever you discover something a future agent would benefit from.** Use `/learn <text>` — one line per entry, newest first. Bar for inclusion: cost you debugging time, contradicted apparent docs, or wasn't in CLAUDE.md.
- **Run `/retro` before closing a substantive session.** It proposes targeted updates to CLAUDE.md, nested CLAUDE.mds, PLANS, CHANGELOG, and the decision log based on the diff.

## Specialist subagents (in `.claude/agents/`)

Delegate to these via the Agent tool when scope warrants:

- `c1-c10-auditor` — audits a diff/branch for constraint violations. Use after dependency changes, persistence edits, or new UI surfaces.
- `bundle-watcher` — audits gzipped JS against the 1 MB budget. Use after dep changes or large feature merges.
- `validator-parity-checker` — confirms a changed TS validator has a matching Python clone and parity fixtures pass. Use after any change to `src/validators/*.ts`.
- `a11y-auditor` — checks new interactions/components for ARIA labels, touch targets, reduced-motion gating, keyboard parity.

## Autonomous mode

`.claude/settings.json` (committed, repo-wide) pre-approves the safe surface so agents work without permission prompts:
- **allow** — all `npm run` scripts, `npx tsc`/`eslint`/`prettier`/`vitest`/`playwright`, read-only `git`, project `node scripts/*`, pipeline Python, plus `git add`/`commit`/`mv`/`rm` for normal flow.
- **ask** — `git push`, `git reset --hard`, `npm run deploy`, `npx wrangler`, `npm publish` (always confirm).
- **deny** — `.env*` reads, `git push --force`, `curl`/`wget`, `rm -rf /`/`~`.
- **SessionStart hook** — prints branch, dirty count, doc pointers, and slash commands when a session starts so the agent orients in one screen.

Personal overrides go in `.claude/settings.local.json` (gitignored — your local file persists; not committed).

---

## Commands

```bash
npm run dev:app              # Vite dev server → http://localhost:5000
npm run typecheck            # tsc --noEmit — must be clean
npm run lint                 # eslint + prettier check (0 warnings)
npm run lint:fix             # auto-fix formatting
npm run test:unit            # Vitest unit + integration
npm run test:e2e             # Playwright E2E (Chromium)
npm run test:a11y            # Playwright + axe-core
npm run build                # tsc + vite build (prebuild runs build:curriculum)
npm run build:curriculum     # sync BOTH curriculum files (see below)
npm run validate:curriculum  # JSON schema check
npm run measure-bundle       # gzipped JS vs 1 MB budget
```

All three — `typecheck`, `test:unit`, `test:e2e` — must be green before any commit.

---

## Source map

```
src/
  main.ts                        # Phaser boot, scene registry
  scenes/
    BootScene.ts                 # preload → PreloadScene
    PreloadScene.ts              # curriculum load → MenuScene
    MenuScene.ts                 # number-line-as-menu
    LevelMapScene.ts             # 9-node snake map (between menu and levels)
    Level01Scene.ts              # one-off L1 (migrating → LevelScene)
    LevelScene.ts                # config-driven router for L2–L9
    SettingsScene.ts
    interactions/                # one file per archetype:
      PartitionInteraction.ts    #   partition, identify, label, make,
      IdentifyInteraction.ts     #   compare, snap_match, benchmark,
      LabelInteraction.ts        #   placement, order, equal_or_not,
      MakeInteraction.ts         #   explain_your_order
      CompareInteraction.ts
      SnapMatchInteraction.ts
      BenchmarkInteraction.ts
      PlacementInteraction.ts
      OrderInteraction.ts
      EqualOrNotInteraction.ts
      ExplainYourOrderInteraction.ts
    utils/
      levelMeta.ts               # LEVEL_META array — source of truth for L1–L9 config
      levelRouter.ts             # scene key → level number mapping
      levelTheme.ts              # per-level color tokens
      colors.ts / colors-high-contrast.ts
      easings.ts
      TestHooks.ts               # Playwright data-testid helpers
  engine/
    bkt.ts                       # Bayesian Knowledge Tracing
    router.ts                    # selects next archetype
    selection.ts                 # item selection within archetype
    misconceptionDetectors.ts    # MC-WHB-*, MC-MAG-*, MC-PRX-*
    calibration.ts
  components/                    # Phaser GameObjects
    HintLadder.ts                # 3-tier hint (verbal → visual_overlay → worked_example)
    ProgressBar.ts
    FractionDisplay.ts
    SymbolicFractionDisplay.ts
    Mascot.ts                    # call mascot.setState('idle'), never mascot.idle()
    A11yLayer.ts                 # DOM mirror for keyboard/screen-reader
    FeedbackOverlay.ts
  validators/                    # pure functions, no Phaser — one file per archetype
    registry.ts                  # map archetype → validator function
  persistence/
    db.ts                        # Dexie 4 schema
    repositories/                # one file per entity (student, session, attempt, …)
  types/
    branded.ts                   # branded ID types — always use these
    entities.ts                  # all DB entity shapes
    archetype.ts                 # ActivityArchetype union
    validator.ts                 # ValidatorResult
  lib/
    observability/               # OpenTelemetry + error reporter (local-only, no egress)
    i18n/                        # string catalog + format helpers
    preferences.ts               # user prefs (IndexedDB-backed)

public/curriculum/v1.json        # runtime fetch path  ─┐ NEVER edit manually;
src/curriculum/bundle.json       # static import fallback ┘ always run build:curriculum
```

---

## Hard rules

### TypeScript
- No `any`. No `@ts-ignore` without a comment explaining why.
- Use branded ID types from `src/types/branded.ts` — never plain `string` for IDs.
- Smart constructors: `LevelId(3)`, `StudentId(uuid)`, etc. (same file).
- tsconfig: `strict`, `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`.

### Architecture
- All question content comes from the pipeline — never hardcode question data in `src/`.
- Curriculum dual-file: `public/curriculum/v1.json` and `src/curriculum/bundle.json` must always match. The only way to update them: `npm run build:curriculum`.
- No new runtime dependencies without size justification — 1 MB gzipped JS budget.
- No React, Redux, Zustand, Next.js, or any backend framework.

### Persistence
- All progression data → IndexedDB via Dexie (`src/persistence/`).
- localStorage: `lastUsedStudentId` only per C5. **Known deviation:** `MenuScene.ts` and `LevelMapScene.ts` also read/write `unlockedLevels:<studentId>` and `completedLevels:<studentId>`. Don't extend further; pending move to a Dexie `progressionStat` row.
- No external HTTP calls except static asset CDN.

### Observability (env-gated, off by default)
- `src/lib/observability/tracer.ts` ships OpenTelemetry. **Only fires when `VITE_OTLP_URL` is set at build time.** Default builds: no egress.
- `src/lib/observability/errorReporter.ts` ships Sentry. **Only fires when a `dsn` is passed to `init()`.** Default builds: no egress.
- Both are still in the bundle and count against the 1 MB budget. If they stay dormant for the MVP, consider lazy-importing them so unused builds don't pay the cost.

### Accessibility
- All new interactive elements need ARIA labels or accessible names.
- Touch targets ≥ 44×44 CSS px.
- All tweens must respect `prefers-reduced-motion`.

---

## Curriculum content pipeline

```bash
cd pipeline
pip install -r requirements.txt
ANTHROPIC_API_KEY=sk-... python -m pipeline.generate --level <N>   # one level
ANTHROPIC_API_KEY=sk-... python -m pipeline.generate --all          # all levels
cd ..
npm run build:curriculum   # sync both runtime files
npm run validate:curriculum
npm run test:unit -- --filter validators
```

Haiku 4.5 generates, Sonnet 4.6 polishes. Output → `pipeline/output/level_N/all.json`.

---

## Adding a level

1. Add entry to `LEVEL_META` in `src/scenes/utils/levelMeta.ts`
2. Add archetype list for that level in the same file
3. Run pipeline + `npm run build:curriculum`
4. `npm run validate:curriculum && npm run test:unit -- --filter validators`
5. Add spec to `docs/10-curriculum/levels/level-NN.md`

---

## Constraints (locked until 2029)

| ID  | Rule |
|-----|------|
| C1  | No backend, no external data egress, no accounts |
| C2  | No teacher / parent / admin UI |
| C3  | Levels 1–9 only — no Grade 3+ content |
| C4  | Phaser 4 + TS + Vite + Dexie — no new frameworks |
| C5  | localStorage: `lastUsedStudentId` only |
| C6  | Flat + bright visuals — no neon, no particle storms |
| C7  | Responsive 360–1024 px, iOS Safari + Android Chrome + desktop |
| C8  | Linear denominator progression: halves → thirds → fourths |
| C9  | Sessions ≤ 15 min per level |
| C10 | Every change must serve validation, not polish |

Full rationale: `docs/00-foundation/constraints.md`

---

## Test layers

| Layer       | Command                  | Covers |
|-------------|--------------------------|--------|
| Unit        | `npm run test:unit`      | validators, BKT, persistence repos, components |
| Integration | `npm run test:integration` | curriculum loader, DB schema upgrade paths |
| E2E         | `npm run test:e2e`       | Playwright smoke suite, Chromium |
| A11y        | `npm run test:a11y`      | axe-core via Playwright |
| Parity      | (part of unit)           | pipeline output ↔ runtime type contracts |

Full strategy: `docs/30-architecture/test-strategy.md`

---

## Active bugs (as of 2026-04-27)

All in `Level01Scene.ts` unless noted:

| ID     | Symptom | Effort |
|--------|---------|--------|
| BUG-01 | Wrong prompt — "identify" archetype shown on a "partition" scene | 2 min |
| BUG-02 | Validation never passes — progress stuck at 0/5 | ~30 min |
| BUG-04 | Hint tiers never advance past Tier 1 | 15 min |
| G-E1   | `updateMastery()` never called — BKT built but wired to nothing | Sprint 1 |
| G-C7   | "Keep going" loops L1 instead of advancing to L2 (`LevelScene.ts`) | 30 min |

Sprint 0 exit criteria: student completes a 5-question session at `localhost:5000` in a real browser tab.

---

## Key doc pointers

| Question | Doc |
|----------|-----|
| What concepts does each level cover? | `docs/10-curriculum/levels/level-NN.md` |
| What are the 10 activity archetypes? | `docs/20-mechanic/activity-archetypes.md` |
| DB schema + entity shapes | `docs/30-architecture/data-schema.md` |
| Hint system spec | `docs/30-architecture/hint-system/HINTS_README.md` |
| Performance budget breakdown | `docs/30-architecture/performance-budget.md` |
| Misconception catalog (MC-*) | `docs/10-curriculum/misconceptions.md` |
| Skill registry (SK-*) | `docs/10-curriculum/skills.md` |
| Roadmap + sprint plan | `PLANS/master-plan-2026-04-26.md` |
