---
title: Questerix Fractions — Full-Spectrum Hardening (Evidence-Backed)
date: 2026-05-03
status: planning
findings: 231
phases: 17
estimated_duration: 90–140 hours
related: ../docs/00-foundation/constraints.md, ../CLAUDE.md, ../PLANS/PLAN.md
---

# Questerix Fractions — Path to a Perfect App

A comprehensive, evidence-backed hardening, correctness, and accessibility pass. Every finding below cites a real file path and line number, audited from the live codebase on 2026-05-03 by five parallel deep-dive agents plus targeted independent reads.

> Constraints C1–C10 are locked. This plan respects them all. No new framework, no backend, no telemetry egress without env-var consent, no new localStorage keys.

---

## 0. Baseline (measured 2026-05-03)

| Signal | Current | Budget | Status |
|---|---|---|---|
| `npm run typecheck` | 0 errors | 0 | ✅ |
| `npm run lint` | **1 warning** (`src/persistence/db.ts:403:61` — `: any`) | 0 | ⚠ |
| `npm run test:unit` | **702 / 702 pass** in 64 files | all pass | ✅ |
| `npm run measure-bundle` | **489.3 KB gz** (47.8 % of 1 MB) | ≤ 1 MB gz | ✅ |
| Largest chunks (gz) | phaser 350 KB · scenes 85 KB · dexie 31 KB · observability 8.6 KB | — | — |
| Source files | 175 .ts files | — | — |
| Test files | 65 .ts files (~37 % file-coverage) | — | ⚠ |
| God files (LOC vs budget) | LevelScene 806/600 · MenuScene 940/600 · Mascot 775/300 · SessionCompleteOverlay 540/300 · LevelVignette 993/300 | per file | ⚠ |
| `any` / `@ts-ignore` instances | 20 in 18 files | 0 (with justified exceptions) | ⚠ |
| Skipped tests | 1 describe + 1 inner skip in [tests/e2e/settings.spec.ts](tests/e2e/settings.spec.ts) | 0 | ⚠ |

**Headline:** the app is in good shape — typecheck green, tests passing, bundle under budget. The work below is the difference between *good* and *bulletproof*.

---

## 1. Severity & Sequencing

Findings are tagged:

- **🔴 P0** — correctness, data-loss, or accessibility regression risk. Fix first, in isolation.
- **🟠 P1** — silent failure modes, contract violations, leaks, or test gaps that mask real bugs.
- **🟡 P2** — hardening, normalization, lazy-loading, schema strictness.
- **🟢 P3** — polish, docs, micro-perf, naming consistency.

Phases run **strictly serial within a god file** (LevelScene, MenuScene, Mascot, SessionCompleteOverlay) and **parallel across independent file domains** elsewhere — pattern from CLAUDE.md.

---

## Phase 1 — TypeScript & Lint Hardening

**Goal:** zero `any`, zero unjustified `@ts-ignore`, zero lint warnings, branded IDs everywhere a foreign key crosses a boundary.

### 1.1 🔴 Fix the existing lint warning
- [src/persistence/db.ts:403](src/persistence/db.ts:403) — `shadowEvents.map((event: any) => …)`. Replace with the legacy hint event shape. The shadow table is `_migratingHintEvents` with old `++id` autoincrement; type as `{ id: number; attemptId: string } & Partial<HintEvent>` and migrate that explicitly.

### 1.2 🟠 Remove the duplicate side-effect import in `main.ts`
- [src/main.ts:6](src/main.ts:6) and [src/main.ts:13](src/main.ts:13) both `import './lib/i18n/keys/quest';`. Remove the second one. (Caught visually; ESLint's `no-duplicate-imports` does not catch side-effect duplicates.)

### 1.3 🟠 Audit the 20 `any` / `@ts-ignore` instances
Files with hits per `grep -c '@ts-ignore|@ts-expect-error|: any\b|as any\b|as unknown as'`:

| File | Count | Action |
|---|---|---|
| [src/components/Mascot.ts](src/components/Mascot.ts) | 2 | god-file — handled in Phase 16.3 |
| [src/lib/observability/errorReporter.ts](src/lib/observability/errorReporter.ts) | 2 | Sentry dynamic import — keep with co-located comment; document API opacity |
| [src/persistence/db.ts](src/persistence/db.ts) | 1 | replaced in 1.1 |
| [src/persistence/schemas.ts](src/persistence/schemas.ts) | 1 | type from `z.infer` instead |
| [src/persistence/backup.ts](src/persistence/backup.ts) | 1 | unknown table loop — narrow with discriminated union |
| [src/persistence/repositories/questionTemplate.ts](src/persistence/repositories/questionTemplate.ts) | 1 | Dexie `where` index signature — replace with `WhereClause<QuestionTemplate>` |
| [src/components/LevelVignette.ts](src/components/LevelVignette.ts) | 1 | god-file — handled in Phase 16.5 |
| [src/lib/log.ts](src/lib/log.ts) | 1 | `unknown` + type guard suffices |
| [src/lib/levelSceneSession.ts](src/lib/levelSceneSession.ts) | 1 | scene data registry typed |
| [src/lib/observability/tracer.ts](src/lib/observability/tracer.ts) | 1 | OTel context — wrap with the local `Context` alias |
| [src/lib/levelSceneChrome.ts](src/lib/levelSceneChrome.ts) | 1 | tween targets — inline `Phaser.Tweens.TweenBuilderConfig` |
| [src/lib/logViewer.ts](src/lib/logViewer.ts) | 1 | log payload — `LogEvent['attrs']` |
| [src/curriculum/seed.ts](src/curriculum/seed.ts) | 1 | bulkPut row — typed |
| [src/scenes/OnboardingScene.ts](src/scenes/OnboardingScene.ts) | 1 | god-file (601 LOC) — handled with Phase 16 |
| [src/scenes/Level01SceneHintSystem.ts](src/scenes/Level01SceneHintSystem.ts) | 1 | hint context union |
| `src/components/__tests__/*.ts` | 3 | jsdom shims — keep with comment |
| [src/validators/registry.ts:21](src/validators/registry.ts:21) | 1 | `AnyValidatorRegistration` — already documented; **acceptable**, leave |

### 1.4 🟠 Brand the bare-string IDs in repositories (Agent 2 #8)
- [src/persistence/repositories/activityLevel.ts:10](src/persistence/repositories/activityLevel.ts:10) → `ActivityLevelId` (new brand).
- [src/persistence/repositories/bookmark.ts:24](src/persistence/repositories/bookmark.ts:24) → `BookmarkId` (new brand).
- [src/persistence/repositories/curriculumPack.ts:10](src/persistence/repositories/curriculumPack.ts:10) → `CurriculumPackId` (new brand).
- [src/persistence/repositories/fractionBank.ts:10](src/persistence/repositories/fractionBank.ts:10) → `FractionBankId` (new brand).
- [src/persistence/repositories/hint.ts:11,19](src/persistence/repositories/hint.ts:11) → `HintTemplateId`, `QuestionTemplateId`.
- [src/persistence/repositories/hintEvent.ts:28,44](src/persistence/repositories/hintEvent.ts:28) → `HintEventId` (new brand).
- [src/persistence/repositories/misconceptionFlag.ts:12](src/persistence/repositories/misconceptionFlag.ts:12) → `MisconceptionFlagId` (new brand).

Add the new brands to [src/types/branded.ts](src/types/branded.ts) (smart constructors stay zero-cost casts at the trusted-internal boundary; **only** restoreFromFile and curriculum loader need runtime validation — see Phase 12).

### 1.5 🟡 tsconfig stricter knobs
- [tsconfig.json:7](tsconfig.json:7) `"skipLibCheck": true` — keep, but document why ("Phaser 4 alpha .d.ts has known overlap with DOM lib"). Add a CI re-check job that runs `tsc --noEmit --skipLibCheck false` weekly to surface regressions.
- [tsconfig.json:28](tsconfig.json:28) `noPropertyAccessFromIndexSignature` is commented out. Enable it; the ~12 Dexie `where()` chains can be migrated to `where('field')` (typed) instead of `where['field']`. Burndown: ~1 hour.

### 1.6 🟢 ESLint additions
- Add `@typescript-eslint/no-floating-promises: error` (Agent 5 #14). Will catch the unhandled `void registration.update()` in [public/registerSW.js](public/registerSW.js) and similar patterns in scenes.
- Add `no-restricted-syntax` rule banning `Math.random()`, `Date.now()`, `crypto.randomUUID()` in `src/engine/**` — already documented (engine determinism), now mechanically enforced.
- Add `no-restricted-imports` banning `phaser` import inside `src/validators/**` and `src/engine/**`.

**Gate:** `npm run typecheck && npm run lint` → 0 errors / 0 warnings.

---

## Phase 2 — Engine Correctness (BKT, Router, Selection, Misconceptions)

**Goal:** every numeric path is bounded, deterministic, and unit-tested at boundaries.

### 2.1 🔴 BKT input validation (Agent 1 #12, #13)
- [src/engine/bkt.ts:58](src/engine/bkt.ts:58) `updatePKnown(pKnown, …)` — add input validation:
  ```ts
  if (!Number.isFinite(pKnown) || pKnown < 0 || pKnown > 1) {
    throw new Error(`pKnown must be a finite number in [0, 1], got ${pKnown}`);
  }
  ```
- [src/engine/bkt.ts:26](src/engine/bkt.ts:26) `validateBktParams` only checks `pGuess` and `pSlip`. Extend to `pInit` (must be in `[0, 1]`) and `pTransit` (must be in `[0, 1]`).
- Add property tests in [tests/unit/engine/bkt.test.ts](tests/unit/engine/bkt.test.ts) for: streak of 50 correct → bounded, streak of 50 wrong → bounded, alternating → converges.

### 2.2 🔴 Router unsafe `as LevelId` casts (Agent 1 #6, #7)
- [src/engine/router.ts:64](src/engine/router.ts:64) and [:71](src/engine/router.ts:71) — `(currentLevel - 1) as LevelId` and `(currentLevel + 1) as LevelId` lie to the type system at the boundary. Replace with the existing `Math.max/Math.min` clamp pattern:
  ```ts
  const downLevel = Math.max(MIN_LEVEL, currentLevel - 1) as LevelId;
  const upLevel = Math.min(MAX_LEVEL, currentLevel + 1) as LevelId;
  ```
  Add tests for `currentLevel=1, regress` and `currentLevel=9, promote`.

### 2.3 🔴 Misconception runner divide-by-zero (Agent 1 #1)
- [src/engine/misconceptionRunner.ts:105](src/engine/misconceptionRunner.ts:105) — `evidenceIds.length / candidates.length`. The `minCandidates` guard at line 81 protects the common case but allows `minCandidates: 0` configs. Add hard guard before the division:
  ```ts
  if (candidates.length === 0) return null;
  ```

### 2.4 🟠 Selection ZPD off-by-one (Agent 1 #35, #36)
- [src/engine/selection.ts:89](src/engine/selection.ts:89) — docstring says `0.4 < P < 0.85` but code uses `>=`. Either fix the code (`p > ZPD_LOW`) or fix the docstring; pick the inclusive boundary deliberately and document.
- [src/engine/selection.ts:94](src/engine/selection.ts:94) — same boundary inversion at the unmastered cutoff. Decide once and propagate.

### 2.5 🟠 Calibration logger violates port isolation (Agent 1 #18)
- [src/engine/calibration.ts:20](src/engine/calibration.ts:20) — direct `console.warn` violates the engine-port contract documented in [src/engine/ports.ts:6](src/engine/ports.ts:6). Inject `EngineLogger` via `DetectorContext`.

### 2.6 🟠 Misconception detector predicate gaps (Agent 1 #25, #27, #28)
- [src/engine/misconceptionRules.ts:176](src/engine/misconceptionRules.ts:176) MC-WHB-01 — only checks `studentRelation === '>'`; should also require `correctRelation === '<'` to avoid flagging correct `>` answers.
- [src/engine/misconceptionRules.ts:421-430](src/engine/misconceptionRules.ts:421) ORD-01 sequential pickup — guard `picked.length === 3` before the `picked[0]===0 && picked[1]===1 && picked[2]===2` check; otherwise `[undefined, undefined, undefined]` slips through.
- [src/engine/misconceptionRules.ts:438](src/engine/misconceptionRules.ts:438) — `evidenceIds.includes(attempt.id)` is O(N²). Switch to a `Set<AttemptId>` for O(1) lookup.

### 2.7 🟢 Documentation cleanup
- [src/engine/misconceptionRules.ts:264-266](src/engine/misconceptionRules.ts:264) — outdated comment about a fixed historical bug. Reword or delete.

**Gate:** all engine tests pass + new property tests + `engine-determinism-auditor` subagent reports clean.

---

## Phase 3 — Validator Hardening & TS↔Python Parity

**Goal:** every validator is pure, every score path is consistent, every TS validator has a Python clone with byte-identical outputs on shared fixtures.

### 3.1 🔴 Score normalization & outcome consistency
- [src/validators/order.ts:42-46](src/validators/order.ts:42) — hard-coded `score: 0.5` for swaps=2 inconsistent with normalized score for swaps≥3 (Agent 1 #19). Unify: `score = Math.max(0, 1 - swaps/maxSwaps)` for the entire branch.
- [src/validators/benchmark.ts:58](src/validators/benchmark.ts:58) — outcome `'incorrect'` paired with `score = 1 - errorRate ≈ 0.74` (Agent 1 #22). Either set `score=0` for incorrect, or escalate to `'partial'` when `errorRate ∈ (0, 0.5]`.
- [src/validators/explain_your_order.ts:72](src/validators/explain_your_order.ts:72) — sets `detectedMisconception: 'MC-ORD-01'` on a justification-mismatch path (Agent 1 #20). MC-ORD-01 is for ordering, not explanation. Introduce `MC-EXPL-01` or omit the flag.

### 3.2 🟠 Validator runtime input checks
- [src/validators/benchmark.ts:43](src/validators/benchmark.ts:43) — assumes `studentPlacements` is a `Map`; deserialized JSON is a plain object (Agent 1 #15, #39). Build the Map at the boundary: `const m = studentPlacements instanceof Map ? studentPlacements : new Map(Object.entries(studentPlacements));`
- [src/validators/utils.ts:64](src/validators/utils.ts:64) — `kendallTauDistance` assumes set equality of inputs (Agent 1 #16). Throw on shape mismatch instead of silently drifting.
- [src/validators/partition.ts:35](src/validators/partition.ts:35) — accept negative `regionAreas` silently (Agent 1 #14). Add `regionAreas.some(a => a < 0)` → `'negative_area'`.
- [src/validators/utils.ts:37-40](src/validators/utils.ts:37) — `polygonArea` returns 0 for <3 vertices but doesn't validate finite output (Agent 1 #41). Wrap with `Number.isFinite` guard.

### 3.3 🟠 Misconception detection corrections
- [src/validators/compare.ts:57-58](src/validators/compare.ts:57) — MC-WHB-02 detection conflates the student's wrong answer with the true value (Agent 1 #24). Re-derive from `correctRelation` only, then check student wrote the inverse.
- [src/validators/label.ts:59](src/validators/label.ts:59) — score doesn't penalize duplicate labels (Agent 1 #23). Add `wrong += labels.length - 1` when a region has >1 label.

### 3.4 🟡 Python parity gaps (Agent 1 #29-#34)
The following Python validators in `pipeline/validators_py.py` diverge from their TypeScript siblings. Each gap blocks the curriculum-pipeline parity guarantee.

| Validator | TS line | Python line | Defect |
|---|---|---|---|
| `compare_relation` | [src/validators/compare.ts:57](src/validators/compare.ts:57) | `validators_py.py:262-276` | Python omits MC-WHB-02 detection entirely |
| `benchmark_sort_to_zone` | [src/validators/benchmark.ts:58](src/validators/benchmark.ts:58) | `validators_py.py:303-315` | Python returns 0.0 for any error; TS supports partial credit |
| `order_sequence` | [src/validators/order.ts:45](src/validators/order.ts:45) | `validators_py.py:330-350` | Python returns 0.0 for dist≥3; TS uses Kendall normalization |
| `placement_snap_tolerance` | [src/validators/placement.ts:20](src/validators/placement.ts:20) | `validators_py.py:571` | Python reads `placedDecimal`; TS reads `studentPlacedDecimal` — **silent input-shape mismatch** |
| `snap_match_all_pairs` | [src/validators/snap_match.ts:20-23](src/validators/snap_match.ts:20) | `validators_py.py:517-526` | Python doesn't canonicalize pair order; TS sorts each pair — **direction-dependent** |
| `_label_exact_match` | [src/validators/label.ts:40-46](src/validators/label.ts:40) | `validators_py.py:163-185` | Logic divergence on duplicate-label penalty |

**Plan:** for each row, port logic to Python, add a fixture in `tests/parity/<archetype>.fixture.json`, add a parity test that runs both languages and asserts deep equality. Wire to `validator-parity-checker` subagent so future TS edits trigger an automatic Python audit.

### 3.5 🟢 Type narrowing helper
- Export `isRecord` from [src/engine/misconceptionRules.ts:129](src/engine/misconceptionRules.ts:129) (Agent 1 #40); reused across rules.

**Gate:** all validator tests pass · parity fixtures pass on both runtimes · `validator-parity-checker` subagent clean.

---

## Phase 4 — Persistence & Migration Safety

**Goal:** zero silent write failures, every migration idempotent and observable, restore is strict-validated, recovery from quota.

### 4.1 🔴 Stop swallowing repository write errors (Agent 2 #3)
The following repos `try { … } catch { /* swallow */ }` even on non-quota errors:

- [src/persistence/repositories/levelProgression.ts:32-37](src/persistence/repositories/levelProgression.ts:32) — `upsert()` swallows all errors with comment "caller will retry". The retry never happens.
- [src/persistence/repositories/progressionStat.ts:21-30](src/persistence/repositories/progressionStat.ts:21) — same pattern.
- [src/persistence/repositories/misconceptionFlag.ts:20-29](src/persistence/repositories/misconceptionFlag.ts:20) — same.

**Pattern:** use the existing `withQuotaGuard` from [src/persistence/db.ts:438](src/persistence/db.ts:438) (returns `T | null` only on quota; rethrows otherwise) and propagate non-quota errors via structured `log.error`.

### 4.2 🟠 v9 hint-event migration breaks audit trail (Agent 2 #1)
- [src/persistence/db.ts:397-412](src/persistence/db.ts:397) — `crypto.randomUUID()` mints fresh IDs from shadow rows, destroying the original temporal ordering carried by `++id`. Preserve the legacy id as `migratedFromId: number` on each restored row, or use the legacy id as the seed for a deterministic UUID5.

### 4.3 🟠 Pre/post counts on dangerous migrations (Agent 2 #1, #2)
- [src/persistence/db.ts:287-338](src/persistence/db.ts:287) v7 migration of streak rows from localStorage — log `{migrated: N, skipped: M}` so partial failures are visible in the diagnostics ring buffer.
- [src/persistence/db.ts:376-386](src/persistence/db.ts:376) v8 shadow copy — verify `oldEvents.length === shadowCount` and throw if mismatched (so the upgrade aborts rather than silently truncating).

### 4.4 🟠 Backup envelope strictness (Agent 2 #4)
- [src/persistence/backup.ts:139-157](src/persistence/backup.ts:139) — top-level Zod uses `.passthrough()`. Switch to `.strict()` so misspelled keys fail loudly. Field-level passthrough on individual table schemas can stay if forward-compat is required, but the envelope should be strict.
- [src/persistence/backup.ts:170-185](src/persistence/backup.ts:170) — `tryAddAll` collapses all `ConstraintError` to "skip this row" — including unique-index violations on non-PK fields. Distinguish PK from non-PK constraints; rethrow the latter.

### 4.5 🟠 Schema invariants (Agent 2 #9)
- [src/persistence/schemas.ts:160](src/persistence/schemas.ts:160) `levelProgressionSchema` — add `.refine(d => d.completedLevels.every(l => d.unlockedLevels.includes(l)))` so completed ⊆ unlocked at the type/runtime boundary.
- [src/persistence/schemas.ts:24-35](src/persistence/schemas.ts:24) `studentSchema.avatarConfig` — `z.record(z.string(), z.string())` accepts any keys. Define an `AVATAR_KEY_ENUM` and validate.
- [src/curriculum/schemas.ts:47-62](src/curriculum/schemas.ts:47) `questionTemplateSchema` — choose explicitly between `.strict()` (loud) and `.passthrough()` (forward-compat) and document the call.

### 4.6 🟠 Unbounded `.toArray()` queries (Agent 2 #6)
- [src/persistence/repositories/attempt.ts:83-102](src/persistence/repositories/attempt.ts:83) `getByArchetype` — add `limit?: number` (default 1000).
- [src/persistence/repositories/session.ts:33-42](src/persistence/repositories/session.ts:33) `listForStudent` — add `limit?: number`.
- [src/persistence/repositories/misconceptionFlag.ts:59-67](src/persistence/repositories/misconceptionFlag.ts:59) `getAllForStudent` — add `limit?: number`.
- [src/persistence/repositories/student.ts:42](src/persistence/repositories/student.ts:42) `list()` — paginate or cap at 100.
- [src/persistence/repositories/hint.ts:19-27](src/persistence/repositories/hint.ts:19) `getForQuestion` — drop redundant `.sortBy('order')` since the compound index already orders.

### 4.7 🟠 Quota recovery
- [src/persistence/db.ts:421-449](src/persistence/db.ts:421) — `_volatile` flag latches `true` and never resets (Agent 2 #15). Add `markRecovered()` called by `withQuotaGuard` after any successful write following a recovery probe (single-attempt `db.deviceMeta.put({…probe})` after 30 s).

### 4.8 🟠 Race fix in deviceMeta merge during restore
- [src/persistence/backup.ts:219-230](src/persistence/backup.ts:219) — wrap the `lastBackupAt` read-compare-write in a `db.transaction('rw', db.deviceMeta, …)` to close the read-modify-write race (Agent 2 #4).

### 4.9 🟢 Question template prefix bug
- [src/persistence/repositories/questionTemplate.ts:39-45](src/persistence/repositories/questionTemplate.ts:39) — `.includes(prefix)` matches `L1` inside `L10:…`. Use `startsWith()` or filter by the indexed `levelGroup` field (which already exists).

**Gate:** all persistence tests + integration tests pass · `c1-c10-auditor` subagent clean · backup/restore round-trip test covers reject-on-strict-failure path.

---

## Phase 5 — Scene Lifecycle (BootScene, Preload, Menu, LevelMap, LevelScene, Level01, Settings, Onboarding)

**Goal:** zero leaked listeners, zero stale state on Play Again, zero mid-transition callbacks, deterministic shutdown.

### 5.1 🔴 Pointerdown listener leaks (Agent 3 #1, #2, #11, #12)
- [src/scenes/Level01Scene.ts:267](src/scenes/Level01Scene.ts:267) — `input.on('pointerdown', …)` registered without matching `off`. Track the bound handler on the instance and remove in shutdown.
- [src/scenes/LevelScene.ts:269](src/scenes/LevelScene.ts:269) — identical pattern; identical fix.
- [src/scenes/MenuScene.ts:410](src/scenes/MenuScene.ts:410), [:542](src/scenes/MenuScene.ts:542), [:602](src/scenes/MenuScene.ts:602), [:899-903](src/scenes/MenuScene.ts:899) — overlay buttons. Use `.once('pointerup', …)` for all overlay buttons (overlay closes on tap), or unregister in `_closeChooseLevelOverlay()`.
- [src/scenes/Level01SceneShapeRenderer.ts:66](src/scenes/Level01SceneShapeRenderer.ts:66) — replaced shapes leak the prior tapZone listener.

### 5.2 🔴 Tween & timer leaks
- [src/scenes/MenuScene.ts:364-371](src/scenes/MenuScene.ts:364) — SHUTDOWN only stops tweens it tracked in `ambientTweens`. Station-button hover tweens (~line 880-920) are not tracked. Use `this.tweens.killAll()` in shutdown OR add every `this.tweens.add(…)` to the tracked array.
- [src/scenes/PreloadScene.ts:133](src/scenes/PreloadScene.ts:133) — `loadingDotsEvent` removed on load-complete but the progress listener still fires after scene transition. Wrap in `if (!this.scene.isActive()) return`.
- [src/components/DragHandle.ts:111](src/components/DragHandle.ts:111) — `loadPulseTween` not stopped before `moveTo()` creates the next one.
- [src/components/Mascot.ts:141-148](src/components/Mascot.ts:141) — `idleTween` overwritten without stopping the previous one. Make `stopCurrent()` the unconditional first call inside `setState()`.
- [src/components/Mascot.ts:368](src/components/Mascot.ts:368) — `repeat: -1` sleep tween only stops via `setState`. Add explicit `tween.stop()` in scene shutdown.
- [src/components/Mascot.ts:405-414](src/components/Mascot.ts:405) — `zzzTimer` checks state inside the callback rather than gating creation. Move the gate before `time.delayedCall(…)`.
- [src/components/ProgressBar.ts:94-99](src/components/ProgressBar.ts:94) — star bounce tween untracked; gets killed only by `tweens.killAll()`. Either rely on that (and document) or store a reference.
- [src/scenes/LevelMapScene.ts:432](src/scenes/LevelMapScene.ts:432) — `events.on('update', tick)` for marching dashes; tick removed on shutdown but if any other update listener exists it leaks. Audit all `events.on('update', …)` and remove in `events.removeAllListeners('update')`.

### 5.3 🔴 Pointer capture leaks on cancel
- [src/scenes/interactions/PartitionInteraction.ts](src/scenes/interactions/PartitionInteraction.ts) (mount only — no `unmount()`, Agent 3 #15, #67) — DragHandle stores pointer listeners, but if `LevelScene` skips a question without calling `unmount`, the listener and any active capture leak. Implement `unmount()` and ensure LevelScene calls it before `loadQuestion(next)`.
- Audit all 11 interactions in [src/scenes/interactions/](src/scenes/interactions/) for this pattern; create a shared `Interaction` interface with required `mount/unmount` methods.

### 5.4 🟠 Double-submit guards (Agent 3 #19-23)
- [src/scenes/Level01Scene.ts:357-361](src/scenes/Level01Scene.ts:357) — `inputLocked` set after async work begins. Move the guard to the very top of `onSubmit`, before any awaits.
- [src/scenes/LevelScene.ts:429-491](src/scenes/LevelScene.ts:429) — recursive `onSubmit` paths via `interaction.commit()` callbacks. Add a `submissionToken` that's invalidated immediately on first call.
- [src/scenes/interactions/MakeInteraction.ts:111](src/scenes/interactions/MakeInteraction.ts:111) — confirm-fold button has no inputLocked guard. Add one.
- [src/scenes/interactions/IdentifyInteraction.ts](src/scenes/interactions/IdentifyInteraction.ts) — `select` callback can be re-entered. Add `_committed` flag.
- [src/scenes/MenuScene.ts:312-315](src/scenes/MenuScene.ts:312) — station tap can queue two `scene.start()` calls. Add `if (!this.scene.isActive()) return`.

### 5.5 🟠 Session state reset on init() (Agent 3 #24-28)
- [src/scenes/LevelScene.ts:134-149](src/scenes/LevelScene.ts:134) — `init` resets fields but not `activeInteraction`. Add `this.activeInteraction = null;`.
- [src/scenes/Level01Scene.ts:128-141](src/scenes/Level01Scene.ts:128) — `templatePool` not reset. Add `this.templatePool = [];`.
- [src/scenes/Level01Scene.ts](src/scenes/Level01Scene.ts) — `currentQuestionHintIds` not cleared per question. Reset at top of `loadQuestion()`.
- [src/scenes/LevelScene.ts](src/scenes/LevelScene.ts) — `currentRoundEvents` accumulates across questions. Reset per question/round.

### 5.6 🟠 Template pool overflow guards (Agent 3 #30, #31)
- [src/scenes/Level01SceneSelection.ts](src/scenes/Level01SceneSelection.ts) — guard `templatePool.length === 0` and either reshuffle or close session via the existing `completeSession()` path.
- [src/scenes/LevelScene.ts:290-293](src/scenes/LevelScene.ts:290) — `loadTemplatesForLevel()` may return `[]` when offline; guard before mounting interaction.

### 5.7 🟠 BootScene first-run robustness (Agent 3 #32)
- [src/scenes/BootScene.ts:103-131](src/scenes/BootScene.ts:103) — `lastStudentId` resolution is solid, but the testHooks button click race is not guarded. Wrap `advanceToPreload` in `try { /* set _advanced atomically */ } finally { /* …only on success */ }`.

### 5.8 🟠 Reduced-motion gates on update-driven animations (Agent 3 #33-35)
- [src/scenes/MenuScene.ts:363-365](src/scenes/MenuScene.ts:363) `dashG` offset animation runs each frame without `checkReduceMotion()`. Gate the `events.on('update', …)` registration.
- [src/components/FeedbackOverlay.ts:169-202](src/components/FeedbackOverlay.ts:169) `burstStarParticles` — track emitter handles and `destroy()` them in scene shutdown.
- [src/components/Mascot.ts:155-186](src/components/Mascot.ts:155) `celebrate` — re-check `checkReduceMotion()` *immediately before* each `tweens.chain(…)` call (avoids partial chains if user toggles preference mid-animation).

### 5.9 🟠 Mascot stalls (Agent 3 #44, #45)
- [src/components/Mascot.ts:96-122](src/components/Mascot.ts:96) — every state's `onComplete` must end in `setState('idle')`. Add an explicit timeout wrapper: `setState('idle')` after `duration + 100 ms` regardless, so an interrupted tween does not lock the mascot.

### 5.10 🟠 Scene shutdown completeness (Agent 3 #59-61)
- [src/scenes/LevelScene.ts:788-804](src/scenes/LevelScene.ts:788) `destroy` — append `this.events.removeAllListeners();`.
- [src/scenes/MenuScene.ts](src/scenes/MenuScene.ts) — no explicit `destroy()` method. Add one that mirrors `LevelScene.destroy()`.
- Verify every scene's shutdown calls `this.tweens.killAll()`, `this.time.removeAllEvents()`, `this.input.removeAllListeners()`, and any custom emitter cleanup.

**Gate:** scene-lifecycle tests pass · `a11y-auditor` subagent clean · manual repeat-of-Play-Again test (10 cycles) leaks 0 listeners (DevTools heap snapshot diff).

---

## Phase 6 — Interaction Layer (11 archetypes)

**Goal:** every archetype implements `mount`/`unmount`, every drag handles `pointercancel`, every submit is idempotent.

### 6.1 🔴 Add `unmount()` to every interaction
Define a shared interface in [src/scenes/interactions/types.ts](src/scenes/interactions/types.ts):

```ts
export interface Interaction {
  mount(scene: Phaser.Scene, opts: MountOpts): void;
  unmount(): void;       // idempotent — destroys GameObjects, removes listeners, releases pointer captures
  commit(): void;        // idempotent — second call is a no-op
}
```

Then audit each of the 11 files in [src/scenes/interactions/](src/scenes/interactions/) for compliance:

- partition · identify · label · make · compare · benchmark · order · snap_match · equal_or_not · placement · explain_your_order

### 6.2 🟠 Pointer capture hygiene on every drag
- For each interaction with drag (Partition, Make, Order, SnapMatch, Placement), add `pointercancel` handler that releases capture. Test by rapidly dragging then minimizing the window (which fires pointercancel in some browsers).

### 6.3 🟠 Register all interactions in A11yLayer (Agent 3 #43)
- [src/scenes/interactions/CompareInteraction.ts:120-150](src/scenes/interactions/CompareInteraction.ts:120) — `<`, `=`, `>` buttons currently use raw `setInteractive`. Switch to `A11yLayer.mountAction(…)` so keyboard users can complete the task.

**Gate:** new `interaction-contract.test.ts` asserts every interaction implements the interface and survives a mount→unmount→mount cycle without leaks.

---

## Phase 7 — Components

**Goal:** zero DOM orphans, zero unbounded calls, predictable cleanup.

### 7.1 🟠 A11yLayer DOM cleanup (Agent 3 #49, #50)
- [src/components/A11yLayer.ts:129-138](src/components/A11yLayer.ts:129) `pushLayer` — append `scene.events.once('shutdown', () => A11yLayer.popLayer())` so transitions clean their layer.
- Add a test that mounts then forcibly destroys a scene and asserts `document.querySelectorAll('[data-a11y]')` returns the parent layer count.

### 7.2 🟠 HintLadder docstring vs behavior (Agent 3 #46)
- [src/components/HintLadder.ts:44-49](src/components/HintLadder.ts:44) — `next()` clamps correctly but the docstring says "returns last tier if exhausted" (subtle). Either document the clamp explicitly *or* return `null` past tier 3 and update callers. Pick one and unit-test it.

### 7.3 🟠 FeedbackOverlay positioning & input gating (Agent 3 #47, #48)
- [src/components/FeedbackOverlay.ts:120](src/components/FeedbackOverlay.ts:120) — `setX(0)` may render off-screen if container has been positioned. Use `setPosition(scene.cameras.main.centerX, scene.cameras.main.centerY)`.
- [src/components/FeedbackOverlay.ts:124-125](src/components/FeedbackOverlay.ts:124) — wrap SFX calls in `if (this.scene.isActive())`; cancel pending audio on `hide()`.
- Add `this.scene.input.enabled = false` while overlay visible; restore on hide.
- [src/components/FeedbackOverlay.ts:249-257](src/components/FeedbackOverlay.ts:249) `destroy` — assert all tracked emitters destroyed; loop and `emitter.destroy()` if any remain.

### 7.4 🟠 ProgressBar tween tracking
- [src/components/ProgressBar.ts:94-99](src/components/ProgressBar.ts:94) — either rely on `scene.tweens.killAll()` in scene shutdown (and document) or store the bounce tween reference and stop it in `destroy()`.

**Gate:** component-suite tests pass · DOM-orphan check in JSDOM after teardown returns 0.

---

## Phase 8 — Accessibility (WCAG 2.1 AA)

**Goal:** every interactive object is announced, every visible target ≥ 44×44 CSS px, every animation respects reduced motion, every color pair ≥ 4.5:1.

### 8.1 🔴 Color contrast on the default palette (Agent 4 #13)
- [src/scenes/utils/colors.ts](src/scenes/utils/colors.ts) — primary `#2F6FED` on `#FFFFFF` ≈ 3.5:1 (fails AA for normal text; passes for large text). Audit every text node using primary on white. Either shift primary darker (~#1E54CE achieves ~5:1) **or** restrict primary-on-white to 24 pt+ text and use the darker variant elsewhere.
- Add a unit test in [tests/unit/a11y/contrast.test.ts](tests/unit/a11y/contrast.test.ts) that loops the palette pairs documented in `docs/00-foundation/ui-design-principles.md` and asserts WCAG AA for all text-on-background combos.

### 8.2 🔴 Missing aria-labels on interactive Phaser objects (Agent 3 #40-43)
- [src/scenes/MenuScene.ts:237](src/scenes/MenuScene.ts:237) scrim `setInteractive()` without label.
- [src/scenes/MenuScene.ts:406-410](src/scenes/MenuScene.ts:406) "Choose Level" pill — no A11yLayer registration.
- [src/scenes/LevelMapScene.ts:467](src/scenes/LevelMapScene.ts:467) LevelCard "Next Level" button.
- [src/scenes/interactions/CompareInteraction.ts:120-150](src/scenes/interactions/CompareInteraction.ts:120) (covered in 6.3).

Use `A11yLayer.mountAction()` consistently; audit by grepping for `setInteractive(` and asserting each call has an A11yLayer companion.

### 8.3 🟠 Hit-area sizes (Agent 3 #36-38)
- [src/scenes/MenuScene.ts:406-410](src/scenes/MenuScene.ts:406) — pill button hit area defaults to text bbox; explicitly set `Phaser.Geom.Rectangle(0,0,Math.max(width,44),Math.max(height,44))`.
- [src/scenes/MenuScene.ts:899-903](src/scenes/MenuScene.ts:899) — station button container needs explicit `setInteractive(hitArea, …)` with min 44×44.
- [src/scenes/LevelMapScene.ts:150-180](src/scenes/LevelMapScene.ts:150) — audit LevelCard interactive children.

Add an automated check in [tests/a11y/wcag.spec.ts](tests/a11y/wcag.spec.ts) that walks the Phaser scene tree and reports any interactive object whose hit-area is <44×44 logical px (after Phaser scale conversion).

### 8.4 🟠 AccessibilityAnnouncer coverage (Agent 4 #15)
- Verify announcer fires on SessionCompleteOverlay open and Mascot encouragement events. Currently announces on question load, hint, correct, wrong (Agent 4 confirmed); SessionComplete and Mascot states need an audit.

### 8.5 🟢 Reduced-motion consistency (Agent 4 #11)
Currently two patterns coexist: direct `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and the `checkReduceMotion()` helper. Standardize on the helper. Affected files: [src/scenes/interactions/BenchmarkInteraction.ts:134](src/scenes/interactions/BenchmarkInteraction.ts:134), [CompareInteraction.ts:207](src/scenes/interactions/CompareInteraction.ts:207), [EqualOrNotInteraction.ts:108](src/scenes/interactions/EqualOrNotInteraction.ts:108).

**Gate:** `npm run test:a11y` passes · contrast unit test passes · `a11y-auditor` subagent clean.

---

## Phase 9 — Audio

### 9.1 🟠 SFXService destroy + AudioContext close (Agent 4 #2, #3)
- [src/audio/SFXService.ts:40](src/audio/SFXService.ts:40) — `void ctx.resume()` swallows errors. Add `.catch(err => log.warn('audio.resume.failed', { err }))`.
- [src/audio/SFXService.ts:24-65](src/audio/SFXService.ts:24) — add `destroy(): void` that calls `await this.ctx?.close()` and nulls the reference. Wire it to game shutdown.

### 9.2 🟢 TTS error logging
- [src/audio/TTSService.ts:90-96](src/audio/TTSService.ts:90) — `stop()` swallows errors. Log in dev mode for visibility.

**Gate:** `tests/unit/audio.test.ts` extended to cover destroy().

---

## Phase 10 — i18n & Copy

### 10.1 🟠 Hardcoded English in scenes (Agent 3 #54-58, Agent 4 #1)
| File:line | Current literal | Proposed key |
|---|---|---|
| [src/lib/network.ts:16](src/lib/network.ts:16) | "You are offline — progress is saved on this device." | `system.offline.banner` |
| [src/scenes/MenuScene.ts:397](src/scenes/MenuScene.ts:397) | "🗺 Choose Level" | `menu.choose_level` |
| [src/scenes/LevelMapScene.ts:305](src/scenes/LevelMapScene.ts:305) | "Finish this one first!" | `map.locked_level_toast` |
| [src/scenes/Level01Scene.ts:178-189](src/scenes/Level01Scene.ts:178) | "Could not start session.\nPlease reload the page." | `error.session_start_failed` |
| [src/scenes/MenuScene.ts:169](src/scenes/MenuScene.ts:169) | "Welcome to Questerix Fractions…" | `menu.welcome.announce` |
| [src/scenes/Level01Scene.ts:235,332-336](src/scenes/Level01Scene.ts:235) | "Ready? Let's go! 🚀" / "Last one! You've got this!" | `mascot.start.encourage` / `mascot.last_question` |

Register all keys in [src/lib/i18n/keys/](src/lib/i18n/keys/).

### 10.2 🟢 catalog.get already throws on missing keys ✅
- Confirmed: [src/lib/i18n/catalog.ts:90-95](src/lib/i18n/catalog.ts:90) is fail-loud.

**Gate:** `tests/unit/i18n/*` extended for the new keys · grep for hardcoded English in `src/scenes` and `src/components` returns 0.

---

## Phase 11 — Observability & Security

### 11.1 🔴 Stack-trace UUID masking (Agent 4 #5)
- [src/lib/observability/logger.ts:90](src/lib/observability/logger.ts:90) — stored stacks may contain student IDs in URLs. Pseudonymize before persist:
  ```ts
  stack = stack?.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[uuid]');
  ```

### 11.2 🟠 Pseudonymize duplication (Agent 4 #6)
- [src/lib/observability/syncService.ts:10-18](src/lib/observability/syncService.ts:10) and [src/lib/observability/errorReporter.ts](src/lib/observability/errorReporter.ts) both implement FNV-1a with subtly different fallback handling. Export from `errorReporter.ts` and reuse.

### 11.3 🟠 Telemetry endpoint URL validation (Agent 4 #7)
- [src/lib/observability/syncService.ts:83-90](src/lib/observability/syncService.ts:83) — parse `VITE_TELEMETRY_URL` once at init via `new URL(value)`; reject with a startup warning if malformed. Avoids per-flush `fetch` errors.

### 11.4 🟠 Sentry DSN PII-key gap (Agent 4 #4)
- [src/lib/observability/errorReporter.ts:27-38](src/lib/observability/errorReporter.ts:27) — add `'sentry_dsn'` to PII_KEYS so a misrouted breadcrumb cannot leak the DSN to Sentry itself.

### 11.5 🟠 withSpan resilience (Agent 4 #8)
- [src/lib/observability/withSpan.ts:34-42](src/lib/observability/withSpan.ts:34) — wrap `tracerService.startSpan()` in try/catch with no-op fallback so a tracer SDK regression cannot crash gameplay.

### 11.6 🟠 Error banner truncation & overflow (Agent 4 #11, #12)
- [src/main.ts:29](src/main.ts:29) — already uses `textContent` (safe). Add length cap (`error.message.slice(0, 200) + …`) to avoid leaking long URLs that may contain query params.
- Add `max-height: 70vh; overflow: auto` to the container so overflow doesn't extend past viewport.

### 11.7 🟢 Curriculum loader URL allowlist (Agent 4 #10)
- [src/curriculum/loader.ts:240](src/curriculum/loader.ts:240) — current path is hardcoded so SSRF risk is theoretical, but harden by enforcing `new URL(url, window.location.origin).origin === window.location.origin`.

### 11.8 🟢 Build-time gate redundancy
- [src/lib/observability/tracer.ts:37-41](src/lib/observability/tracer.ts:37) — checked twice. Remove the second check or annotate both.

**Gate:** `tests/unit/observability/*` extended for new behaviors · simulated logger exercise verifies UUIDs masked · CSP review of `public/_headers` re-confirmed clean.

---

## Phase 12 — Curriculum Pipeline Integrity

### 12.1 🟠 Bundle drift detection
- Add `scripts/check-curriculum-sync.mjs` that computes sha256 of `public/curriculum/v1.json` and `src/curriculum/bundle.json` and exits non-zero on mismatch.
- Wire into `.husky/pre-commit` and `.github/workflows/ci.yml`. Wire to `curriculum-byte-parity` subagent.

### 12.2 🟠 Loader silent-truncation observability (Agent 2 #11)
- [src/curriculum/loader.ts:240-298](src/curriculum/loader.ts:240) — when network fails and bundle differs in `contentVersion`, emit a warning event so future telemetry surfaces it. When row-level validation drops items, log `{loaded, droppedRows, droppedReasons}`.

### 12.3 🟠 Seed corruption guards (Agent 2 #11)
- [src/curriculum/seed.ts:197-204](src/curriculum/seed.ts:197) — assert every template has a derived `levelGroup` before `bulkPut`; otherwise the indexed query in repositories silently misses rows.

### 12.4 🟢 L03 equal_or_not shapeType fix (deferred from PLANS/PLAN.md)
- 8 templates missing `shapeType`. Re-run pipeline with hand-authored fix or extend the validator to derive shape from `payload.shape`.

**Gate:** `npm run validate:curriculum` clean · `curriculum-byte-parity` subagent passes.

---

## Phase 13 — Performance & Bundle

### 13.1 🟢 Lazy-import OpenTelemetry (Agent 5 #44)
Currently OTel is always bundled. Move to dynamic import gated on `import.meta.env.VITE_OTLP_URL`:
```ts
if (import.meta.env.VITE_OTLP_URL) {
  const { initTracer } = await import('./tracer');
  await initTracer({ url: import.meta.env.VITE_OTLP_URL });
}
```
Estimated saving: ~8 KB gz (already small, but on the critical path today).

### 13.2 🟢 Add a per-chunk budget (Agent 5 #26)
[scripts/measure-bundle.mjs](scripts/measure-bundle.mjs) currently sums all chunks. Add per-chunk thresholds:
- phaser ≤ 380 KB gz (current 350)
- scenes ≤ 100 KB gz (current 85)
- observability ≤ 12 KB gz (current 8.6)
Fail CI on individual chunk overruns even if the total stays under 1 MB.

### 13.3 🟢 Brotli measurement (Agent 5 #26)
Many CDNs serve Brotli when supported. Add a parallel brotli measurement to `measure-bundle.mjs` so we can track real-world delivery sizes.

### 13.4 🟢 Source-map upload (Agent 5 #22)
[vite.config.ts:134](vite.config.ts:134) generates `sourcemap: 'hidden'`. Add Sentry/OTel source-map upload gated on the same env var that activates the SDK; without it, crash stacks are minified.

### 13.5 🟢 Replace process.env checks with import.meta.env (Agent 5 #50)
- [src/lib/cognitiveLoad.ts:9](src/lib/cognitiveLoad.ts:9) — `if (typeof process !== 'undefined' && process.env && process.env['NODE_ENV'] === 'production')`. Switch to `if (import.meta.env.PROD)`.
- Grep for similar patterns and migrate.

**Gate:** `npm run measure-bundle` ≤ 1 MB gz total + per-chunk budget pass · `bundle-watcher` subagent clean.

---

## Phase 14 — PWA & Service Worker

### 14.1 🟠 Manifest source-of-truth deduplication (Agent 5 #27)
[public/manifest.json](public/manifest.json) and the inline manifest in [vite.config.ts:61-83](vite.config.ts:61) are duplicates. The vite-plugin-pwa version wins in PWA install but the public file is served at `/manifest.json`. They drift silently. Either:
- Delete `public/manifest.json` and let vite-plugin-pwa write it, **or**
- Read `public/manifest.json` in vite.config.ts and pass it to the plugin.

### 14.2 🟢 Manifest completeness (Agent 5 #28-30)
- Add `"categories": ["education"]`.
- Add `"screenshots": [...]` with at least one mobile (540×720) and one tablet (1024×768) screenshot under `public/screenshots/`.
- Reconsider `"orientation": "portrait"` — children rotate devices; consider `"any"` or `"portrait-primary"`.

### 14.3 🟢 SW update banner & manual refresh (Agent 5 #32, #33)
- [public/registerSW.js:9](public/registerSW.js:9) — 60-min update poll is reasonable; add a `registration.update()` button in [src/scenes/SettingsScene.ts](src/scenes/SettingsScene.ts) so users can refresh on demand.
- On `register()` failure (line 22), surface a toast via `network.ts` showing "Offline mode unavailable" so users have a mental model.

**Gate:** Lighthouse PWA audit ≥ 95 · install prompt works on Android Chrome.

---

## Phase 15 — Test Coverage

### 15.1 🔴 Re-enable settings.spec.ts (Agent 5 #1, #2)
- [tests/e2e/settings.spec.ts:12](tests/e2e/settings.spec.ts:12) `describe.skip` and inner `test.skip` mask coverage. Diagnose the flake (likely a navigation race), fix, re-enable.

### 15.2 🟠 Backfill component unit tests (Agent 5 #3)
175 source files vs 65 test files = 37% file-coverage. Priority gaps:
- 16 files in [src/components/](src/components/) — only 3 have dedicated unit tests (ProgressBar, sceneTransition, UpdateBanner).
- ~30 files in [src/lib/](src/lib/) — ~10 have tests.
- 3 files in [src/audio/](src/audio/) — 1 test.

Plan: add a minimal "happy path + 1 edge case" test for each. Where Phaser stubs are needed, reuse [tests/setup.ts:30](tests/setup.ts:30).

### 15.3 🟠 Strengthen property-based tests (Agent 5 #8)
- [tests/unit/validators/partition.property.test.ts](tests/unit/validators/partition.property.test.ts) and the other two `*.property.test.ts` files only cover happy paths. Add boundary properties: empty input, all-zero areas, NaN/Infinity rejection, single partition edge case.

### 15.4 🟠 Make hints integration test unconditional (Agent 5 #4)
- [tests/integration/hints_seed.test.ts:18](tests/integration/hints_seed.test.ts:18) `describe.skipIf(!hintsExist)` masks regressions when hints.json is missing in CI. Either fail loudly when hints.json is missing or split into "smoke (always)" + "full (skipif)".

### 15.5 🟠 Multi-device CI matrix (Agent 5 #35)
- [.github/workflows/ci.yml:128-153](.github/workflows/ci.yml:128) runs only Chromium. Schedule a weekly matrix that exercises iPhone SE/12, Pixel 5, iPad Mini.

### 15.6 🟠 Coverage thresholds expansion (Agent 5 #10)
- [vitest.config.ts](vitest.config.ts) thresholds cover `src/engine`, `src/validators`, `src/persistence`. Add conservative gates (40 %) for `src/components`, `src/lib`, `src/curriculum`.

### 15.7 🟢 Document testHelpers (Agent 5 #7)
- Add unit tests for pure logic in [tests/e2e/test-helpers.ts](tests/e2e/test-helpers.ts) (waitFor predicates, parsing helpers).

**Gate:** `npm run test:unit` 702 → ~900 tests · file-coverage 37 → ≥ 70 % · skipped tests = 0.

---

## Phase 16 — God-File Refactor

Continuation of `PLANS/PLAN.md` § "Backlog — God-object refactor". Each sub-phase: refactor file under budget, then commit. **Strictly serial** (Phase 3 god-file pattern from CLAUDE.md).

### 16.1 LevelScene 806 → ≤ 600 LOC (Phase 4.2 in PLAN.md)
- Extract: chrome (header/menu/back button), hint flow controller, progression math (BKT update + router invocation).
- Targets: `src/lib/levelSceneChrome.ts` (already exists), new `src/lib/levelSceneProgression.ts`.

### 16.2 MenuScene 940 → ≤ 600 LOC (Phase 4.3)
- Extract: station rendering, streak display, R13 Dexie progressionStat migration.
- Targets: `src/scenes/menu/MenuStations.ts`, `src/scenes/menu/StreakBadge.ts`.

### 16.3 Mascot 775 → ≤ 300 LOC (Phase 4.4)
- Extract: speech-bubble, idle-escalation timer, sleep/Zzz lifecycle.
- Targets: `src/components/mascot/SpeechBubble.ts`, `src/components/mascot/IdleScheduler.ts`, `src/components/mascot/SleepFx.ts`.
- Resolve the 2 `any` casts in [src/components/Mascot.ts](src/components/Mascot.ts) during the extraction.

### 16.4 SessionCompleteOverlay 540 → ≤ 300 LOC (Phase 4.7)
- Extract: animation, scoring math.

### 16.5 LevelVignette 993 → ≤ 300 LOC
- Currently disables `max-lines` via `eslint-disable` at file head ([src/components/LevelVignette.ts:1](src/components/LevelVignette.ts:1)). Split into LevelVignetteCard, LevelVignetteAnimation, LevelVignetteTheme. Remove the disable line at the end.

### 16.6 SettingsScene 602 → ≤ 600 LOC (Phase 4.5)
- Tiny over-budget; extract export/restore handlers (~1 % refactor).

### 16.7 Level01Scene status check
- 639 LOC — over the 600 budget after the Phase 4.1 refactor (598 → 639 due to subsequent additions). Re-extract or adjust the budget with rationale.

**Gate per sub-phase:** typecheck + lint + tests green AND target file under budget BEFORE moving to the next.

---

## Phase 17 — Tooling, CI, Build

### 17.1 🟠 Pre-commit auto-fix CLAUDE.md drift (Agent 5 #40)
- [.husky/pre-commit](.husky/pre-commit) — when `npm run sync:claude-md` detects drift, auto-write the regenerated file and re-stage instead of erroring out (the script is idempotent).

### 17.2 🟠 Pre-push branch slug max length (Agent 5 #41)
- [.husky/pre-push:13](.husky/pre-push:13) — regex enforces date prefix but no length cap. Some CI systems truncate at 63/255 chars. Add `[ ${#BRANCH} -le 60 ] || exit 1` after the regex.

### 17.3 🟠 Typecheck split out of test job (Agent 5 #38)
- [.github/workflows/ci.yml](.github/workflows/ci.yml) — `typecheck` runs inside the 20-min test job. Promote to its own ~2-min job in parallel; faster feedback when tsc explodes.

### 17.4 🟠 Workflow generation enforcement (Agent 5 #39)
- Add a CODEOWNERS rule routing `.github/workflows/*.yml` to require a `gen:workflows` regenerated bundle (post-merge check).

### 17.5 🟢 Bundle budget single source of truth (Agent 5 #47)
- Extract `BUDGET_BYTES = 1_048_576` to a shared `scripts/config.mjs` consumed by both [scripts/measure-bundle.mjs](scripts/measure-bundle.mjs) and the CI gate.

### 17.6 🟢 Pre-push tier escalation (Agent 5 #48)
- [scripts/preflight-router.mjs:52](scripts/preflight-router.mjs:52) — `test:unit:changed` is fast but on `main`/release tags should escalate to full `test:unit`.

### 17.7 🟢 Document `lint:ci` vs `lint` (Agent 5 #36)
- [package.json:25](package.json:25) — clarify why CI uses a separate `lint:ci` script.

### 17.8 🟢 Document `residual-lint.mjs` (Agent 5 #49)
- Add header comment explaining what it validates.

**Gate:** weekly CI multi-device job green · pre-commit auto-fix demonstrated · per-chunk budget enforced.

---

## Cross-cutting checks before each phase merge

After every phase, run all of:

```bash
npm run typecheck                              # 0 errors
npm run lint                                   # 0 warnings
npm run test:unit                              # all pass
npm run test:integration                       # all pass
npm run test:e2e                               # all pass (Chromium gate; weekly multi-device)
npm run test:a11y                              # all pass
npm run measure-bundle                         # ≤ 1 MB gz total + per-chunk
npm run validate:curriculum                    # valid
node scripts/check-curriculum-sync.mjs         # bundle files byte-identical
```

And, per-phase, fire the relevant subagent:

| Phase | Subagent |
|---|---|
| 1, 2 | `c1-c10-auditor`, `engine-determinism-auditor` |
| 3 | `validator-parity-checker` |
| 4 | `c1-c10-auditor` |
| 5, 6, 7, 8 | `a11y-auditor` |
| 12 | `curriculum-byte-parity` |
| 13 | `bundle-watcher` |

---

## Branch & commit strategy

- Branch base: `fix/2026-05-03-full-spectrum-hardening`.
- Each phase = one sub-branch off that base, e.g. `fix/2026-05-03-fsh-phase-2-engine`.
- Each sub-phase within a god-file refactor (Phase 16.1 … 16.7) = one branch, strictly serial.
- Commit style: `fix(phase-N.M): <descriptor> [PLANS/claude.full.md]`.
- Push-and-merge default applies (CLAUDE.md): each phase squash-merges to main when its gates are green.

---

## Risk register

| Risk | Phase | Mitigation |
|---|---|---|
| Migration v9 already shipped — changing UUID strategy is itself a migration | 4.2 | Add v10 that backfills `migratedFromId` from heuristic ordering; do NOT touch v9 |
| Lazy-importing OTel adds boot async hop | 13.1 | Measure LCP delta in Lighthouse; revert if >50 ms regression |
| Re-enabling settings.spec.ts may surface real flake | 15.1 | Triage in isolation before merging |
| God-file refactors touch saturated files; merge conflicts likely | 16 | Strictly serial; gate each sub-phase before next starts |
| Tightening backup envelope to `.strict()` may reject existing user backups | 4.4 | Ship reader that accepts both legacy (passthrough) and new (strict) for one release; sunset legacy after 30 days |
| Removing duplicate import in `main.ts` is trivial but `[no-duplicate-imports]` doesn't catch it | 1.2 | Add a custom ESLint rule or a grep-based residual-lint check |

---

## Out of scope (deferred to post-MVP)

These appear in the audit but are explicitly out of scope per `PLANS/PLAN.md` "Deferred" or constraint locks:

- Sunset of `Level01Scene.ts` (D-27 Path A) — needs side-by-side parity test + 2-week soak.
- `SessionService` pivot — ~30 h, only if Sunset is impractical.
- Audio pipeline (OpenAI pre-render) — ships post-MVP; Web Speech is the placeholder.
- Multi-language support (C-anything beyond English) — parking lot per `constraints.md`.
- Teacher / parent / admin surface — banned by C2.

---

## Estimated effort

| Phase | Hours | Priority |
|---|---|---|
| 1. TypeScript & Lint | 4–6 | 🟠 |
| 2. Engine | 6–8 | 🔴 |
| 3. Validators + Parity | 8–10 | 🔴 |
| 4. Persistence | 8–10 | 🔴 |
| 5. Scene Lifecycle | 10–14 | 🔴 |
| 6. Interactions | 6–8 | 🔴 |
| 7. Components | 4–6 | 🟠 |
| 8. Accessibility | 6–8 | 🔴 |
| 9. Audio | 1–2 | 🟠 |
| 10. i18n | 2–3 | 🟠 |
| 11. Observability + Security | 4–6 | 🟠 |
| 12. Curriculum Pipeline | 2–3 | 🟠 |
| 13. Performance | 3–4 | 🟢 |
| 14. PWA | 2–3 | 🟢 |
| 15. Test Coverage | 12–16 | 🟠 |
| 16. God-File Refactor | 16–24 | 🟠 |
| 17. Tooling & CI | 4–6 | 🟢 |
| **Total** | **~98–137 h** | |

---

## Definition of done — "Perfect App"

- ✅ `npm run typecheck` 0 errors with stricter tsconfig (`noPropertyAccessFromIndexSignature` enabled)
- ✅ `npm run lint` 0 warnings, 0 errors, with new floating-promises and engine-import-restriction rules
- ✅ `npm run test:unit` ≥ 900 tests, all pass, file-coverage ≥ 70 %, 0 skipped
- ✅ `npm run test:integration` all pass
- ✅ `npm run test:e2e` Chromium green; weekly multi-device matrix green
- ✅ `npm run test:a11y` axe-core + custom 44×44 hit-area + contrast-pair tests all pass
- ✅ `npm run measure-bundle` ≤ 1 MB gz total + per-chunk budgets pass; brotli measured
- ✅ `npm run validate:curriculum` valid; `check-curriculum-sync.mjs` byte-identical
- ✅ Lighthouse PWA ≥ 95, Performance ≥ 90 (mobile), Accessibility = 100, Best Practices ≥ 95, SEO ≥ 95
- ✅ All 6 subagents pass on a clean PR (`c1-c10-auditor`, `bundle-watcher`, `validator-parity-checker`, `a11y-auditor`, `engine-determinism-auditor`, `curriculum-byte-parity`)
- ✅ All god files under documented LOC budget; LevelVignette `eslint-disable max-lines` removed
- ✅ Zero pointer-down listener leaks measured by 10× Play-Again heap snapshot diff
- ✅ Zero localStorage keys outside C5 + the documented onboarding migration completion
- ✅ Backup round-trip survives strict envelope rejection on malformed input

---

## Appendix A — Finding Index (231 evidence-backed defects)

The phases above synthesize 231 defects identified by five parallel deep-audit agents on 2026-05-03:

- **Engine + validators** — 42 findings (Agent A — token usage 114k)
- **Persistence + Dexie** — 30 findings (Agent B — token usage 119k)
- **Scenes + interactions** — 67 findings (Agent C — token usage 126k)
- **Audio + i18n + observability + security** — 30+ findings (Agent D — token usage 124k)
- **Tests + build + tooling** — 52 findings (Agent E — token usage 117k)
- **Independent reads** (ESLint baseline, bundle measurement, type config, manifest, main.ts duplicate import, real LOC counts) — 10 findings

Each "Agent N #M" reference in the phase body resolves to a specific finding. The full transcripts live in `.claude/sessions/` (when retro-archived).

---

## Appendix B — File-Path Quick Reference

Most-touched files in this plan, in order of edit volume:

1. [src/scenes/LevelScene.ts](src/scenes/LevelScene.ts) — Phases 1.3, 5.1, 5.4, 5.5, 5.10, 16.1
2. [src/scenes/MenuScene.ts](src/scenes/MenuScene.ts) — Phases 5.1, 5.2, 5.4, 5.8, 8.2, 8.3, 10.1, 16.2
3. [src/components/Mascot.ts](src/components/Mascot.ts) — Phases 1.3, 5.2, 5.8, 5.9, 16.3
4. [src/scenes/Level01Scene.ts](src/scenes/Level01Scene.ts) — Phases 5.1, 5.4, 5.5, 5.6, 10.1, 16.7
5. [src/persistence/db.ts](src/persistence/db.ts) — Phases 1.1, 4.2, 4.3, 4.7
6. [src/engine/bkt.ts](src/engine/bkt.ts) — Phase 2.1
7. [src/engine/router.ts](src/engine/router.ts) — Phase 2.2
8. [src/engine/misconceptionRules.ts](src/engine/misconceptionRules.ts) — Phases 2.3, 2.6, 3.5
9. [src/components/A11yLayer.ts](src/components/A11yLayer.ts) — Phase 7.1
10. [src/components/FeedbackOverlay.ts](src/components/FeedbackOverlay.ts) — Phases 5.8, 7.3
11. [pipeline/validators_py.py](pipeline/validators_py.py) — Phase 3.4 (6 parity gaps)
12. [src/scenes/interactions/](src/scenes/interactions/) — Phase 6 (all 11 files)

---

## Document History

| Date | Revision | Notes |
|---|---|---|
| 2026-05-03 | v1.0 | Skeleton (generic 14-phase plan) |
| 2026-05-03 | **v2.0** | **Evidence-backed: 231 findings from 5 parallel deep-audit agents + independent baseline measurements; 17 phases; real file:line citations; real bundle/test/lint baseline; god-file LOC truth; risk register; subagent gating** |
