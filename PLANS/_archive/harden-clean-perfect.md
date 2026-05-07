# Plan: Harden, Clean & Perfect Questerix Fractions

## Context
The app boots, seeded, and smoke-tests pass across all 5 device profiles. However, three audit passes (test coverage, runtime robustness, UX/a11y/perf) identified critical data-integrity bugs, stale SKIP comments blocking 11+ e2e tests, and a handful of UX/polish gaps. This plan makes the app production-ready by fixing these in priority order.

---

## Phase 1 — Critical Data-Integrity Bugs

### 1.1 Mutex for `seedIfEmpty()` — race condition on fast reload
**File:** `src/curriculum/seed.ts`
- Add an in-memory singleton Promise guard so concurrent calls share the same run:
  ```ts
  let _seeding: Promise<SeedResult> | null = null;
  export function seedIfEmpty(): Promise<SeedResult> {
    if (!_seeding) _seeding = _doSeed().finally(() => { _seeding = null; });
    return _seeding;
  }
  ```
- Rename the body of the existing function to `_doSeed`.

### 1.2 Fix hint `attemptId` — FK never linked
**File:** `src/scenes/Level01Scene.ts` around lines 915–929 & 1057
- Move `hintEventRepo.record(...)` calls OUT of `showHintForTierAndRecord()`.
- Instead, collect hint *descriptors* (`{ hintId, tier, shownAt, pointCost }`) in `currentQuestionHintIds` array.
- After `attemptRepo.record()` returns the real `attemptId`, bulk-write hint events with the correct FK in `recordAttempt()`.
- Simplifies flow: hints are displayed immediately (no async wait), events persisted atomically alongside the attempt.

### 1.3 Await hint recording (eliminate fire-and-forget void)
**File:** `src/scenes/Level01Scene.ts` lines 873, 940
- `onHintRequest()` calls `void this.showHintForTierAndRecord(tier)` — change to `void` only for the display path, but the persistence sub-call happens inside `recordAttempt()` (see 1.2). Eliminates orphaned records entirely.

### 1.4 Session creation retry / volatile-mode signal
**File:** `src/scenes/Level01Scene.ts` `openSession()` ~line 314
- On failure, retry once with 500 ms delay.
- If still fails, set `this.sessionId = null` AND log a visible console.warn so the student can still play (volatile mode is already supported).
- No UI change required — existing `if (!this.sessionId) return` guard in `recordAttempt()` handles it gracefully.

### 1.5 Fix `QuestionTemplate` type-cast bypass
**File:** `src/persistence/repositories/questionTemplate.ts` ~line 38
- Replace `as unknown as QuestionTemplate[]` with explicit field omit:
  ```ts
  const sanitized = stored.map(({ levelGroup: _lg, ...rest }) => rest);
  await db.questionTemplates.bulkPut(sanitized);
  ```

### 1.6 Wrap `deviceMeta.updatePreferences()` in a Dexie transaction
**File:** `src/persistence/repositories/deviceMeta.ts` `updatePreferences()` ~line 64
- Wrap get + update in `db.transaction('rw', db.deviceMeta, async () => { ... })` to make it atomic.

---

## Phase 2 — Unblock E2E & Accessibility Tests

The stale `// SKIP:` comments in test files say testids are "not yet implemented" but they ARE in place (BootScene, Level01Scene, FeedbackOverlay, ProgressBar). The missing pieces are only in **MenuScene** and **SettingsScene**.

### 2.1 Add missing TestHook sentinels to MenuScene
**File:** `src/scenes/MenuScene.ts`
- Mount `menu-scene` sentinel in `create()` after `TestHooks.unmountAll()`.
- Mount `level-card-L1` through `level-card-L9` interactive buttons over each level card (one `mountInteractive` per card, wired to the existing `onLevelSelect` handler).
- Mount `settings-btn` interactive button over the settings gear.

### 2.2 Add missing TestHook sentinels to SettingsScene
**File:** `src/scenes/SettingsScene.ts`
- Mount `settings-scene`, `settings-export-btn`, `settings-reset-btn`, `settings-back-btn` sentinels.

### 2.3 Remove stale SKIP comments and enable tests
**Files:** `tests/e2e/level01.spec.ts`, `tests/e2e/settings.spec.ts`, `tests/a11y/wcag.spec.ts`
- Delete the `// SKIP:` block comments — tests become active.
- Run full `npx playwright test` to confirm all pass (they should now that testids are in place and feedback timing is fixed).

---

## Phase 3 — Unit Test Gaps

### 3.1 Unit tests for `engine/selection.ts`
**New file:** `tests/unit/engine/selection.test.ts`
- Test ZPD window filtering (0.4–0.85 mastery range).
- Test recency de-prioritisation.
- Test fallback when no templates fall in ZPD window.

### 3.2 Unit tests for `validators/utils.ts`
**New file:** `tests/unit/validators/utils.test.ts`
- Cover all exported helper functions.

---

## Phase 4 — UX & PWA Polish

### 4.1 iOS PWA meta tags
**File:** `index.html`
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

### 4.2 Phaser canvas `maxZoom` for desktop
**File:** `src/main.ts` Phaser scale config
- Add `max: 2` to the scale config so wide-screen desktops don't get a 3× blown-up canvas with massive margins.

### 4.3 Suppress `window.__LOG` in staging/prod
**File:** `src/lib/log.ts`
- The `window.__LOG` helper is already gated on `import.meta.env.DEV`; add a comment confirming intentional dev-only exposure. No code change needed—just verify the guard.

---

## Verification

```bash
# 1. Unit tests (must remain all-green)
npm run test:unit

# 2. Integration tests
npm run test:integration

# 3. TypeCheck + lint
npm run typecheck && npm run lint

# 4. Full e2e (smoke + level01 + settings + a11y)
npx playwright test

# 5. Build passes
npm run build
```

Expected: 174+ unit tests pass, all 5 smoke device profiles pass, level01 (2 tests × 5 devices = 10), settings (N × 5), and wcag (4 × 5) all green.

---

## Files Touched

| File | Phase |
|------|-------|
| `src/curriculum/seed.ts` | 1.1 |
| `src/scenes/Level01Scene.ts` | 1.2, 1.3, 1.4 |
| `src/persistence/repositories/questionTemplate.ts` | 1.5 |
| `src/persistence/repositories/deviceMeta.ts` | 1.6 |
| `src/scenes/MenuScene.ts` | 2.1 |
| `src/scenes/SettingsScene.ts` | 2.2 |
| `tests/e2e/level01.spec.ts` | 2.3 |
| `tests/e2e/settings.spec.ts` | 2.3 |
| `tests/a11y/wcag.spec.ts` | 2.3 |
| `tests/unit/engine/selection.test.ts` *(new)* | 3.1 |
| `tests/unit/validators/utils.test.ts` *(new)* | 3.2 |
| `index.html` | 4.1 |
| `src/main.ts` | 4.2 |
