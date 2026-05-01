# Next-Agent Guidance — 2026-05-01

**Status:** End of architectural hardening sprint. 17 PRs (#10–#30) merged. The plan's tactical surface is substantively complete. Remaining items are flagged here with explicit risk levels and recommended sequencing.

**For an agent picking this repo up next, read:**
1. This file (start here)
2. `CLAUDE.md` — current state of active bugs (empty), source map, hard rules
3. `.claude/learnings.md` — fresh gotchas from 2026-05-01 (vi.mock hoisting, worktree path trap, bot misfires, etc.)
4. `PLANS/code-quality-2026-05-01.md` and `PLANS/forensic-deep-dive-2026-05-01.md` only if you're doing the structural refactor work below
5. `CHANGELOG.md` `[Unreleased]` block for the catalog of what landed today

---

## Critical-path next move: validation, not more code

The user's clear directive at end-of-session:

> "This code is expensive. Don't take risks."

The MVP exit criterion (per `CLAUDE.md`) is **"a real student completes a 5-question L1 session at `localhost:5000` in a real browser tab."** That hasn't been verified end-to-end since today's merge train started.

**Recommended first action for the next agent:**

```bash
npm run dev:app
# Open http://localhost:5000 in Chrome
# Tap level 1 → drag handle → Check → repeat 4× → verify session-complete card
# Open DevTools → Application → IndexedDB → confirm:
#   - questerix-fractions/attempts has 5 rows
#   - questerix-fractions/skillMastery has a row with masteryEstimate > 0.1
#   - questerix-fractions/streakRecord has 1 row (count: 1)
```

**If anything breaks: fix that specific thing only.** Don't pre-emptively refactor. Per C10: every change must serve validation, not polish.

**If it works:** ship it. `npm run build && npx wrangler pages deploy dist` (the deploy script is wired). Run a synthetic playtest cycle. THEN consider the structural work below.

---

## Remaining plan items (do not pick these without explicit user authorization)

### HIGH RISK — defer until validation surfaces a real need

#### Sunset `Level01Scene.ts` (D-25 Path A)

- **Why deferred:** scene grew 1604 → 1727 LOC in this session (Phase 6.3 transaction + spans added; nothing removed). Touches 15 files. L1 has K-2-tuned UX details (handle position, snap modes, area tolerances) that may differ subtly from `LevelScene`'s `PartitionInteraction`.
- **Safe execution path** (~3 weeks, NOT a one-shot):
  1. Write a side-by-side parity test that runs L1 through both `Level01Scene` and `LevelScene` with identical inputs and asserts identical outputs (attempt records, mastery deltas, validator results).
  2. Land that parity test in CI for one week of green runs.
  3. Switch `MenuScene.ts:590`'s L1 route to `LevelScene { levelNumber: 1 }` behind a `?useLevelScene=1` URL flag.
  4. Synthetic playtest with the flag for one week.
  5. Make the flag default true.
  6. After two weeks of soak: delete `Level01Scene.ts`, remove from `main.ts` scene config, update `MenuScene.ts:590`.
- **Do NOT** try to do this in a single PR. The bot at #13 closed schema bumps as "C4 violations"; deletion of a 1727-line scene will trip every guardrail.

#### `SessionService` pivot (deep-dive §4 alternative)

- **Why deferred:** Same risk as Sunset, plus 30 hours of focused work. The deep-dive specifically positioned this as deferrable. Don't start without (a) Sunset proving impractical, AND (b) explicit user authorization scoped to the `SessionService` extraction phase.

### MEDIUM RISK — surface only if validation shows a need

#### `mastery.update` nested span inside the Phase 6.3 transaction

- **Why deferred:** Requires nested span pattern that PR #28 didn't establish. Low-value for current scale (one mastery update per submit; latency is dominated by Dexie write, not BKT compute).
- **If you do it:** add `tracerService.startSpan(SPAN_NAMES.MASTERY.UPDATE, { ... })` inside the `db.transaction` body in both `Level01Scene.recordAttempt` and `LevelScene.recordAttempt`. Use the existing `withSpan` helper if you want consistency.

#### Tighten persistence coverage gate from 45% to 75%+

- **Why deferred:** The 45% gate is regression-prevention. Real coverage is ~77% when integration suite runs. Tightening requires either folding integration into the unit run (vitest workspace config) or writing 10–25 LOC of unit tests per under-covered repo.
- **Where to start:** `src/persistence/repositories/streakRecord.ts` and `src/persistence/repositories/student.ts` are at 0% in the unit suite (covered only by integration). They're each <70 LOC; one focused test file would cover both.

#### Full L1–L9 happy-path E2E parameterization

- **Why deferred:** Requires `data-testid` attributes on scene chrome that don't exist yet for L2-L9. Risk of breaking selectors elsewhere if done sloppily.
- **Where to start:** `tests/e2e/level01.spec.ts` works today against `Level01Scene`. Add `data-testid="level-N-scene"` sentinels to `LevelScene` (`TestHooks.mountSentinel(\`level-\${n}-scene\`)`); parameterize the existing spec across `[1, 5, 9]`.

### LOW RISK — pick up freely

#### Update `master-plan-2026-04-26.md` task statuses

- Many sprint tasks are now done but not checked off in the doc. Mechanical refresh.

#### Run `/retro` at end of next session

- The `/retro` slash command proposes targeted updates to CLAUDE.md, learnings, and PLANS based on the diff. Cheap and useful.

---

## What to NOT do

- **Don't dispatch agents on Sunset Level01Scene one-shot.** It will not work in one PR and will burn the merge queue.
- **Don't add more zod schemas, more lint rules, more spans.** Diminishing returns past where we are.
- **Don't try to fold integration tests into the unit suite without a vitest workspace config.** Two configs is the current model; respect it.
- **Don't push to `main` directly.** Always dated branches: `<type>/YYYY-MM-DD-<slug>`. The autonomous-bot guarding C4 expects this.
- **Don't bypass the workflow-drift hook.** If `pre-push` fails because workflows were regenerated, amend and re-push — don't `--no-verify`.

---

## Useful slash commands (`.claude/commands/`)

- `/preflight` — typecheck + lint + unit + integration + build + bundle guard
- `/diag` — one-screen repo state
- `/c5-check` — grep localStorage for drift outside documented exceptions (should return only `lastUsedStudentId`)
- `/sprint-status` — active blockers vs codebase reality
- `/learn <text>` — append to `.claude/learnings.md`
- `/decision <title>` — append a new D-NN entry

## Useful subagents (`.claude/agents/`)

- `c1-c10-auditor` — run after dependency or persistence changes
- `bundle-watcher` — run after dependency additions or large feature merges
- `validator-parity-checker` — run after any change to `src/validators/*.ts`
- `a11y-auditor` — run after new interactions or components

---

## Session metrics (2026-05-01)

| Metric | Start | End |
|---|---|---|
| Unit tests | 372 | 654 |
| Integration tests | 573 | 656 |
| Bundle (gzip) | 606 KB | 630 KB |
| Lint warnings | 3 | 0 |
| `Level01Scene.ts` LOC | 1604 | 1727 ↑ |
| `LevelScene.ts` LOC | 1155 | 1316 ↑ |
| `misconceptionDetectors.ts` LOC | 952 | 122 ↓ |
| Open PRs | 1 | 0 (all merged) |

The product is healthier. The two scene god-files are not. Keep that asymmetry in mind when deciding what's next.
