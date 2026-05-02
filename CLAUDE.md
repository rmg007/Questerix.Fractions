# Questerix Fractions — Agent Guide

Educational browser game (Phaser 4 + TypeScript) teaching K–2 fraction concepts via magnetic-drag mechanics. Solo validation project. No backend, no accounts, no external data egress.

> **Search hygiene:** ignore any `_archive/` path during exploration unless the user explicitly asks. Those folders are completed-work debriefs kept for history; their content does not reflect the current code.

---

## Slash commands (in `.claude/commands/`)

Many slash commands are now harness skills that auto-discover by intent — typing them is rarely necessary. Project-specific commands (those not covered by skills) live in `.claude/commands/`:

<!-- AUTO:slash-commands-list:start -->
- `/c5-check` — Grep for localStorage usage outside documented C5 exceptions — catches constraint drift
- `/decision` — Append a new architectural decision entry to docs/00-foundation/decision-log.md
- `/economy` — Summarize this session's token cost — file reads vs tool output vs assistant prose
- `/learn` — Append a one-line gotcha or pattern to .claude/learnings.md
- `/recreate-pr` — Re-open an auto-closed PR with a merged-with-main head and rephrased title.
- `/retro-weekly` — Weekly token-cost rollup — group _session-log.md by day, print percentiles, flag outliers
- `/retro` — End-of-session retro — propose CLAUDE.md / learnings.md / PLANS updates based on what changed
- `/sprint-status` — Print active sprint blockers and their current status in compact form
<!-- AUTO:slash-commands-list:end -->

> The list above is auto-generated from `.claude/commands/*.md` frontmatter by `npm run sync:claude-md`. Edit the source files, not this section.

Harness skills also available: `preflight`, `sync-curriculum`, `diag`, `test-changed` (these replaced the previous project slash commands of the same names — auto-fired by hooks where possible, otherwise invoked by intent).

## Continuous self-improvement

- **Skim `.claude/learnings.md` at session start.** It captures non-obvious gotchas surfaced in prior sessions.
- **Append to it whenever you discover something a future agent would benefit from.** Use `/learn <text>` — one line per entry, newest first. Bar for inclusion: cost you debugging time, contradicted apparent docs, or wasn't in CLAUDE.md.
- **Run `/retro` before closing a substantive session.** It proposes targeted updates to CLAUDE.md, nested CLAUDE.mds, PLANS, CHANGELOG, and the decision log based on the diff.

### Plans must have phases. End-of-phase = update docs.

- **Every plan in `PLANS/` must be structured as ordered phases with explicit gate criteria.** Free-form task lists without phase boundaries are not acceptable; if a plan lacks phases, restructure it before starting work.
- **At the close of every phase** (not every session — every *phase*): sweep this conversation for non-obvious lessons and propagate them to (a) `.claude/learnings.md` (one-line gotchas), (b) this `CLAUDE.md` if a durable rule changed, (c) any nested `CLAUDE.md` whose surface was touched, (d) `.claude/agents/*.md` and `.claude/commands/*.md` if subagent or skill behavior should evolve, then (e) `npm run sync:claude-md` to refresh the auto-generated tables. Commit those doc updates as part of the phase-closing PR — do not defer to a later "cleanup" branch.

## Specialist subagents (in `.claude/agents/`)

Delegate to these via the Agent tool when scope warrants. CI auto-fires them on PR open via `.github/workflows/subagent-pr-audit.yml`. The table body below is auto-generated from `.claude/agents/*.md` frontmatter by `npm run sync:claude-md`.

**Swarm orchestration (when to fan out):** prefer parallel agent fan-out for independent workstreams within a phase — partition by **file**, not by feature. Two agents touching the same file in parallel = guaranteed merge mess. Workflow: list each workstream's file set, group into rounds where every round's agents have **zero file overlap**, run rounds sequentially, give each agent an explicit "do NOT touch these files" guard. Don't fan out for sequential or contended work — overusing agents has a real coordination cost.

**God-file-heavy phases (Phase 3 pattern):** when ≥4 groups touch the same saturated files (`Level01Scene.ts`, `LevelScene.ts`, `Mascot.ts`), use a 2-round hybrid: (a) **Round 1** — parallel agents on independent file domains (FeedbackOverlay, deviceMeta, OnboardingScene, MenuScene); (b) **Round 2** — strictly sequential agents on the god files, one group at a time. Verified zero merge conflicts across 20+ commits in Phase 3. Sequential coordination cost is paid once per round, not once per commit.

| Subagent | Description |
|---|---|
<!-- AUTO:subagents-table:start -->
| `a11y-auditor` | Audits new or changed interactions and components for WCAG 2.1 AA compliance — ARIA labels, touch target sizes, reduced-motion gating, keyboard parity via A11yLayer. Use after adding or modifying interactive elements. |
| `bundle-watcher` | Audits production bundle size against the 1.0 MB gzipped JS budget. Use after dependency changes, large feature merges, or whenever the build looks heavier than expected. |
| `c1-c10-auditor` | Audits a diff or branch for violations of the locked C1–C10 constraints. Use proactively when significant code changes touch persistence, networking, UI surface area, dependencies, or device targets. |
| `curriculum-byte-parity` | Confirms public/curriculum/v1.json and src/curriculum/bundle.json are byte-identical (sha256 match). Use whenever a diff touches either curriculum bundle file or pipeline output. |
| `engine-determinism-auditor` | Audits diffs touching src/engine/** for direct host-global calls (Math.random, Date.now, crypto.randomUUID) and points to the correct port in src/engine/ports.ts. Use proactively whenever engine code changes. |
| `validator-parity-checker` | Confirms that a changed TypeScript validator has a matching Python clone in pipeline/validators_py.py and that parity fixtures still pass. Use after any change to src/validators/*.ts. |
<!-- AUTO:subagents-table:end -->

## Auto-invoke skills

The harness exposes user-invocable skills that overlap our slash commands. Hooks cover *mechanical* triggers (file paths). The triggers below are *semantic* and live with me — when the condition is met I invoke the skill via the Skill tool **before** finalizing a response, without waiting to be asked.

| Skill | Auto-invoke when… |
|---|---|
| `simplify` | I just wrote >40 net new LOC to a single file under `src/`, or my change touched ≥3 files in `src/scenes/interactions/`, `src/validators/`, or `src/engine/`. |
| `security-review` | The diff touches `src/persistence/**`, `src/lib/observability/**`, `src/lib/i18n/**`, anything that reads `import.meta.env`, or adds a `WebFetch` / `fetch(` call. |
| `review` | I am about to ask the user to open a PR, or the working tree contains a commit on a `feat/`, `fix/`, or `refactor/` branch with no review yet. |
| `fewer-permission-prompts` | A session has hit ≥3 permission prompts for read-only Bash/Grep/Read invocations not yet in `.claude/settings.json`. |

**Recursion guard:** auto-invoke fires once per skill per turn; never auto-invoke from inside a skill response. Any skill response can write `[no-auto-followup]` to suppress the next auto-invocation.

## Autonomous mode

`.claude/settings.json` (committed, repo-wide) pre-approves the safe surface so agents work without permission prompts:
- **allow** — all `npm run` scripts, `npx tsc`/`eslint`/`prettier`/`vitest`/`playwright`, read-only `git`, project `node scripts/*`, pipeline Python, `git add`/`commit`/`mv`/`rm`/`push`, and the GitHub MCP PR tools (`create_pull_request`, `merge_pull_request`, `update_pull_request`).
- **ask** — `git reset --hard`, `npm run deploy`, `npx wrangler`, `npm publish` (always confirm).
- **deny** — `.env*` reads, `git push --force`, `curl`/`wget`, `rm -rf /`/`~`.
- **SessionStart hook** — prints branch, dirty count, doc pointers, and slash commands when a session starts so the agent orients in one screen.

Personal overrides go in `.claude/settings.local.json` (gitignored — your local file persists; not committed).

### Push-and-merge default

After a successful commit on a non-`main` feature/`claude/*` branch where typecheck + lint + unit tests are green, **push to remote and squash-merge the PR without asking**. The flow:

1. `git push -u origin <branch>` (with the network-retry policy already documented above).
2. `mcp__github__create_pull_request` against `main` with a Summary + Test plan body.
3. `mcp__github__merge_pull_request` with `merge_method: "squash"` (matches the existing `(#NN)` history).

Skip the PR step only if the branch already has an open PR — update it instead. Pause for confirmation only when: `main` itself is the head, the diff touches `.env*` or CI infra, force-push would be involved, or the user has indicated otherwise this turn.

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

### Git workflow
- **Branch names must include a date.** Format: `<type>/YYYY-MM-DD-<slug>` — e.g. `feat/2026-04-30-hint-ladder`, `fix/2026-04-30-nan-guard`, `plans/2026-04-30-sprint-1`.
- **Types:** `feat` (new behaviour), `fix` (bug), `refactor`, `plans` (doc/plan only), `chore` (tooling/infra).
- **Enforced by `.husky/pre-push` regex:** `^(feat|fix|refactor|chore|test|plans|docs)/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+$`. Exempt: `main`, `claude/*`, `worktree-agent-*`. Bypass with `--no-verify` only when justified.
- **No bare slugs, no random suffixes.** A branch without a date is non-compliant and must be renamed before pushing.
- **One concern per branch.** Don't mix feature work with plan-doc updates.
- **Before opening a PR:** rebase onto current `main` — never let a branch sit stale long enough to conflict.
- Full process: `docs/00-foundation/git-workflow.md`

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

## Active bugs (as of 2026-05-01)

**No active Sprint 0 bugs.** All 5 (BUG-01, BUG-02, BUG-04, G-E1, G-C7) verified fixed against the current `Level01Scene.ts`:

- BUG-01: filtered to partition archetype at `Level01Scene.ts:231` (`// Fix 1 (BUG-01)`)
- BUG-02: progress increment + session-complete check land in correct order at `Level01Scene.ts:1058,1105-1106,1114`
- BUG-04: hint tiers advance via `hintLadder.next()` at `Level01Scene.ts:1125-1135` (`// Fix 3 (BUG-04)`)
- G-E1: `updateMastery()` is called at `Level01Scene.ts:1348-1369`
- G-C7: "Play Again" routes through `LevelScene { levelNumber: ... }` at `Level01Scene.ts:1518,1542` — no longer re-enters `Level01Scene` directly

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
| Roadmap index + closed phases | `PLANS/PLAN.md` |
| Items requiring a human (Phase 0 walkthrough, iPad, Cloudflare) | `PLANS/MANUAL_VERIFICATION.md` |
| `test.skip`'d e2e/a11y clusters with fix paths | `PLANS/E2E_FOLLOWUPS.md` |
| UI/UX design principles | `docs/00-foundation/ui-design-principles.md` |
| Git branch + PR process | `docs/00-foundation/git-workflow.md` |
