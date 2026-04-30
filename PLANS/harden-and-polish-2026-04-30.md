# Plan: Harden, Clean & Perfect — Questerix Fractions

**Status:** Awaiting approval (deep v4 — six parallel audit passes + observability expansion)
**Last updated:** 2026-04-28

---

## Context

The app boots, all 174 unit tests pass, and the 5-device smoke test is green after today's two-line fix to feedback timing. Six parallel deep audits (data integrity, type safety, accessibility, resilience, security/privacy, ops) surfaced **48 distinct issues across 9 risk dimensions**. This plan groups them into 9 phases, ordered by user-impact severity (data loss → type-safety crash → a11y blocker → privacy violation → quality-of-life). Every fix has an exact `file:line` reference and a concrete remediation.

**Scope boundary:** No new features. No framework changes. Bug fixes, type cleanup, accessibility compliance, and PWA/operations polish only.

---

## Risk Inventory (at-a-glance)

| # | Severity | Phase | Item | File:Line |
|---|---|---|---|---|
| R1 | CRITICAL | 1.1 | `seedIfEmpty()` no concurrency guard | `src/curriculum/seed.ts:54` |
| R2 | CRITICAL | 1.2 | `wipeStaticStores()` outside seed transaction | `src/curriculum/seed.ts:73` |
| R3 | CRITICAL | 1.3 | `HintEvent.attemptId = ''` placeholder, never linked | `src/scenes/Level01Scene.ts:919, 1057`; `src/scenes/LevelScene.ts:690` |
| R4 | CRITICAL | 1.4 | `HintEvent.id` typed string but Dexie `++id` stores number | `src/persistence/repositories/hintEvent.ts:14`; `src/persistence/db.ts:~68` |
| R5 | CRITICAL | 1.5 | `validatorRegistry.get(... as never)` swallows undefined | `src/scenes/Level01Scene.ts:752` |
| R6 | CRITICAL | 1.6 | Session creation silent collapse → 30 min of data lost | `src/scenes/Level01Scene.ts:314–379, 1022` |
| R7 | CRITICAL | 1.7 | `Level01Scene.preDestroy()` doesn't destroy 4 components | `src/scenes/Level01Scene.ts:1331–1338` |
| R8 | CRITICAL | 3.1 | No global `window.error` handler (only `unhandledrejection`) | `src/main.ts:6–13` |
| R9 | CRITICAL | 3.2 | Per-write `QuotaExceededError` not handled at call sites | `src/persistence/repositories/*.ts` |
| R10 | CRITICAL | 3.3 | iOS Safari TTS: missing `onvoiceschanged` listener | `src/audio/TTSService.ts:23–38` |
| R11 | CRITICAL | 4.1 | FeedbackOverlay text/bg fails WCAG 1.4.3 (correct=2.52:1, incorrect=3.21:1) | `src/components/FeedbackOverlay.ts:35–42` |
| R12 | CRITICAL | 4.2 | SkipLink targets `#qf-canvas` (unfocusable), not first DOM button | `src/components/SkipLink.ts:46` |
| R13 | CRITICAL | 5.1 | localStorage C5 violation: `unlockedLevels:${studentId}` | `src/scenes/MenuScene.ts:348–384` |
| R14 | HIGH | 1.8 | `deriveLevelGroup()` duplicated → can diverge | `src/curriculum/seed.ts:24–36` + `src/persistence/repositories/questionTemplate.ts:19–26` |
| R15 | HIGH | 1.9 | `QuestionTemplate` `as unknown as` hides field mismatch | `src/persistence/repositories/questionTemplate.ts:38`; `src/curriculum/seed.ts:202` |
| R16 | HIGH | 1.10 | `deviceMeta.updatePreferences()` read-modify-write race | `src/persistence/repositories/deviceMeta.ts:64–81` |
| R17 | HIGH | 1.11 | Dexie schema versions 2–4 missing `upgrade()` re-index hooks | `src/persistence/db.ts:82–140` |
| R18 | HIGH | 3.4 | Validator errors silently render generic "Not quite" | `src/scenes/Level01Scene.ts:766` |
| R19 | HIGH | 3.5 | Curriculum bundle templates lack per-row validation (missing `payload`/`prompt` crashes loadQuestion) | `src/curriculum/loader.ts:80–121` |
| R20 | HIGH | 3.6 | Mid-session site-data clear creates orphaned student/session refs | `src/scenes/Level01Scene.ts`, `src/scenes/MenuScene.ts` |
| R21 | HIGH | 4.3 | PreferenceToggle has no `:focus` outline | `src/components/PreferenceToggle.ts:102–120` |
| R22 | HIGH | 4.4 | Continue/Hint button text contrast < 4.5:1 | `src/scenes/utils/levelTheme.ts:24–51` |
| R23 | HIGH | 4.5 | Locked level concept text 1.65:1 (illegible) | `src/components/LevelCard.ts:90` |
| R24 | HIGH | 4.6 | State changes silent: level unlock, settings save, reset confirm | `src/scenes/MenuScene.ts`, `src/scenes/SettingsScene.ts` |
| R25 | HIGH | 4.7 | MenuScene tab order skips level cards entirely | `src/scenes/MenuScene.ts:119–139` |
| R26 | HIGH | 4.8 | Reset Device failure has no UI feedback | `src/scenes/SettingsScene.ts:97, 254–262` |
| R27 | HIGH | 5.2 | localStorage `LOG` key violates C5 allowlist | `src/lib/log.ts:40, 113, 118, 122` |
| R28 | HIGH | 5.3 | Curriculum bundle JSON not schema-validated (no Zod) | `src/curriculum/loader.ts:80–121` |
| R29 | HIGH | 5.4 | Backup restore inserts unvalidated rows directly into Dexie | `src/persistence/backup.ts:125–210` |
| R30 | HIGH | 6.1 | `settings-btn` testid missing → blocks 6 e2e tests | `src/scenes/MenuScene.ts:214–231` |
| R31 | HIGH | 6.2 | `level-card-L2..L5, L8, L9` testids missing | `src/scenes/MenuScene.ts:142–166` |
| R32 | HIGH | 6.3 | Stale `// SKIP:` comments in 3 spec files | `tests/e2e/level01.spec.ts`, `settings.spec.ts`, `tests/a11y/wcag.spec.ts` |
| R33 | HIGH | 9.1 | No content-migration policy (orphaned attempts on v1.1.0) | (no doc exists) |
| R34 | MEDIUM | 7.1 | No offline indicator (`navigator.onLine`) | (none) |
| R35 | MEDIUM | 7.2 | SW `autoUpdate` could disrupt mid-session | `vite.config.ts:18–68` |
| R36 | MEDIUM | 7.3 | Ambient animations ignore `prefers-reduced-motion` | `src/scenes/MenuScene.ts:93, 300–301` |
| R37 | MEDIUM | 7.4 | A11yLayer cleanup uses `innerHTML = ''` | `src/components/A11yLayer.ts:201` |
| R38 | MEDIUM | 8.1 | `checkReduceMotion()` reimplemented in 8 places | (multiple) |
| R39 | MEDIUM | 8.2 | Three exports in `src/validators/utils.ts` are never imported | `lerp` (l.18), `manhattanDistance` (l.23), `polygonArea` (l.31) |
| R40 | MEDIUM | 8.3 | Tests missing: `selection.ts` (engine), `validators/utils.ts` | (no test files) |
| R41 | MEDIUM | 8.4 | `tsconfig.json` `noUncheckedIndexedAccess` deferred | `tsconfig.json` |
| R42 | MEDIUM | 9.2 | No `<link rel=preload>` for critical fonts | `index.html` |
| R43 | MEDIUM | 9.3 | iOS PWA meta tags missing | `index.html` |
| R44 | MEDIUM | 9.4 | Phaser `maxZoom` not capped → desktop margins | `src/main.ts:45–57` |
| R45 | LOW | 9.5 | No build SHA shown in app UI | (none) |
| R46 | LOW | 9.6 | No flaky-test retries in Playwright | `playwright.config.ts` |
| R47 | LOW | 9.7 | 7 stale PLANS phase-completion files | `PLANS/phase-*.md` |
| R48 | LOW | 9.8 | No parent-facing FAQ doc | (none) |
| R49 | HIGH | 10.1 | Production silent — zero logs reach support; only WARN/ERROR | `src/lib/log.ts:47` |
| R50 | HIGH | 10.2 | Critical paths have NO log calls (TTS, A11yLayer, SkipLink, PreferenceToggle, FeedbackOverlay, ProgressBar, HintLadder, DragHandle, backup, loader) | (codebase-wide) |
| R51 | HIGH | 10.3 | Existing log.warn/error sites lack structured context (no studentId/sessionId/traceId) | (codebase-wide) |
| R52 | HIGH | 10.4 | No correlation/trace IDs across scene → repo → DB → engine | (none) |
| R53 | MEDIUM | 10.5 | No in-app log viewer for parent-supervised support sessions | (none) |
| R54 | MEDIUM | 10.6 | No ring buffer of last N events to attach to bug reports / backups | (none) |
| R55 | MEDIUM | 10.7 | Log categories incomplete (no `LIFECYCLE`, `NET`, `PWA`, `A11Y`, `TTS`, `STORAGE`, `MIGRATE`, `ERROR_BOUNDARY`) | `src/lib/log.ts` |
| R56 | MEDIUM | 10.8 | No timing/perf marks (scene transitions, validator latency, DB query duration) | (none) |

---

## Phase 1 — Critical Data Integrity (R1–R7, R14–R17)

### 1.1 Mutex around `seedIfEmpty()` — R1

**Where:** `src/curriculum/seed.ts:54`
**Why:** Two concurrent calls (rapid reload, multi-tab boot) both wipe + reseed; partial data possible.
**How:**
```ts
let _seeding: Promise<SeedResult> | null = null;
export function seedIfEmpty(): Promise<SeedResult> {
  if (!_seeding) _seeding = _doSeed().finally(() => { _seeding = null; });
  return _seeding;
}
// Rename current body to _doSeed()
```

### 1.2 Atomic wipe + seed — R2

**Where:** `src/curriculum/seed.ts:73, 131–146, 162–214`
**Why:** `wipeStaticStores()` runs before the seed transaction. A partial wipe + failed seed leaves an empty static store and the app boots into synthetic mode silently.
**How:** Move `wipeStaticStores()` *inside* the existing Dexie `'rw'` transaction so wipe + bulkPut commit atomically.

### 1.3 Hint `attemptId` linkage rewrite — R3

**Where:** `src/scenes/Level01Scene.ts:873, 919, 940, 1057`; `src/scenes/LevelScene.ts:690`
**Why:** `'' as unknown as AttemptId` placeholder is never replaced. Every hint event row is permanently orphaned; `listForAttempt()` returns nothing.
**How:**
1. Add field on the scene: `private currentHintsPending: Array<{ hintId: string; tier: HintTier; shownAt: number; pointCost: number }> = [];`
2. In `showHintForTierAndRecord()` (line 884), STOP calling `hintEventRepo.record()`. Push the descriptor into `currentHintsPending`.
3. In `recordAttempt()` (after line 1062, where the real `attemptId` exists), `Promise.all(this.currentHintsPending.map(d => hintEventRepo.record({ ...d, attemptId, ... })))` then clear the array.
4. Remove `void` prefix at lines 873, 940 — display is now sync, persistence is owned by `recordAttempt()`.
5. Apply identical refactor to `LevelScene.ts:690`.

### 1.4 Fix `HintEvent.id` type/storage mismatch — R4

**Where:** `src/persistence/repositories/hintEvent.ts:14`; `src/persistence/db.ts:~68` (schema `hintEvents: '++id, attemptId'`)
**Why:** Dexie `++id` returns a number; the repo casts it to a string via `String(insertedKey)`. The `HintEvent` type is `id: string`. A future lookup by stored-string id fails because Dexie uses the numeric key.
**How:** Switch to nanoid string IDs (consistent with all other repos).
- DB schema: change `hintEvents: '++id, attemptId'` → `hintEvents: 'id, attemptId'`.
- Repo `record()`: generate `id: nanoid()` before `db.hintEvents.add(...)`.
- Add Dexie `version(N+1).upgrade()` that re-keys existing rows to nanoid (or, since we're MVP, accept that existing dev DB rows for hintEvents are wiped on next bump — gated on R17).

### 1.5 Remove `as never` cast hiding undefined — R5

**Where:** `src/scenes/Level01Scene.ts:752`
**Why:** `validatorRegistry.get(this.currentQuestion.id as never)` returns `undefined` when the ID is unregistered, but the `as never` makes TypeScript think it can't be undefined. The follow-up `if (reg)` works, but the inline type assertion `as { fn: ... }` is unverified.
**How:** Define and export a proper type in `src/validators/registry.ts`:
```ts
export interface ValidatorEntry { fn: (input: unknown, payload: unknown) => ValidatorResult; }
```
Then at call site:
```ts
const reg = validatorRegistry.get(this.currentQuestion.id);
if (reg) result = reg.fn(input, payload);
```

### 1.6 Session creation retry + volatile flag — R6

**Where:** `src/scenes/Level01Scene.ts:314–379, 1022` (and same pattern in `LevelScene.ts`)
**Why:** If `sessionRepo.create()` throws, `this.sessionId = null` and every subsequent `recordAttempt()` returns early. Student plays 5 questions, zero data persisted.
**How:**
1. In the catch block (~line 376), retry once after 500 ms.
2. If both fail, set `this.volatileMode = true` and emit one `console.warn` so dev tools surface it.
3. The existing guard at line 1022 already handles `null` sessionId — no functional UI change needed; the retry just shrinks the loss window.

### 1.7 Destroy custom components in `preDestroy()` — R7

**Where:** `src/scenes/Level01Scene.ts:1331–1338`
**Why:** `feedbackOverlay`, `progressBar`, `hintLadder`, and `dragHandle` hold timers, event listeners, and DOM nodes. `Phaser.Scene.preDestroy` does not call destroy methods on plain-object members.
**How:**
```ts
preDestroy(): void {
  log.scene('destroy');
  this.feedbackOverlay?.destroy();    // already has destroy() per FeedbackOverlay.ts:169
  this.progressBar?.destroy();
  this.hintLadder?.reset?.();          // verify destroy method, or just reset
  this.dragHandle?.destroy();          // already has destroy() per DragHandle.ts:208
  this.tapZone?.destroy();
  this.tapZone = null;
  AccessibilityAnnouncer.destroy();
  TestHooks.unmountAll();
  A11yLayer.unmountAll();
}
```
Verify each component has a `destroy()` (most do). Add one where missing.

### 1.8 Extract `deriveLevelGroup()` to one canonical module — R14

**Where:** Duplicated at `src/curriculum/seed.ts:24–36` and `src/persistence/repositories/questionTemplate.ts:19–26`.
**Why:** Identical logic in two files; easy to silently diverge on a fix.
**How:** Create `src/curriculum/levelGroup.ts` exporting `deriveLevelGroup(id: string): '01-02' | '03-05' | '06-09'`. Import in both call sites. Add a unit test (Phase 8.3).

### 1.9 Strip `levelGroup` explicitly instead of `as unknown as` — R15

**Where:** `src/persistence/repositories/questionTemplate.ts:38`; `src/curriculum/seed.ts:202`
**Why:** Type-cast bypass hides field-mismatch bugs.
**How:**
```ts
const sanitized = stored.map(({ levelGroup: _lg, ...rest }) => rest);
await db.questionTemplates.bulkPut(sanitized);
```

### 1.10 Wrap `deviceMeta.updatePreferences()` in a Dexie transaction — R16

**Where:** `src/persistence/repositories/deviceMeta.ts:64–81`
**Why:** Read → modify → write across three async steps races when two callers (BootScene + Level01Scene) update different fields concurrently.
**How:**
```ts
await db.transaction('rw', db.deviceMeta, async () => {
  const existing = (await db.deviceMeta.get(DEVICE_ID)) ?? DEFAULT_META;
  const merged = deepMerge(existing.preferences, prefPatch);
  await db.deviceMeta.put({ ...existing, preferences: merged });
});
```

### 1.11 Add `upgrade()` hooks to schema versions 2–4 — R17

**Where:** `src/persistence/db.ts:82–140`
**Why:** New compound indices like `[archetype+submittedAt]` (v4) aren't built for rows inserted under v3. Index queries on upgraded DBs return incomplete results.
**How:** For each version that adds an index, add a no-op `.modify()` that forces re-indexing:
```ts
.version(4)
  .stores({ ... })
  .upgrade(tx => Promise.all([
    tx.table('attempts').toCollection().modify(() => {}),
    tx.table('questionTemplates').toCollection().modify(() => {}),
  ]));
```

---

## Phase 2 — Critical Type-Safety & Architecture (R5, R7, R14, R15 cross-references; this phase enables enforcement)

### 2.1 Enable `noUncheckedIndexedAccess` in `tsconfig.json` — R41

**Why:** Currently disabled (deferred). The codebase has many `arr[0]!` non-null assertions that are validated by surrounding logic but not by the type system. Turning this on flushes out genuinely-unsafe array accesses.
**How:**
1. Flip the flag in `tsconfig.json`.
2. Run `npm run typecheck`. Inventory the resulting errors (likely 30–80).
3. For each: either add an explicit guard, or document the invariant with a non-null assertion AND a `// invariant: ...` comment.
4. Land in a single PR after Phase 1 is in.

### 2.2 Extract one `checkReduceMotion()` — R38

**Where:** 8 reimplementations across `src/lib/preferences.ts:41`, `src/components/{FeedbackOverlay,ProgressBar,DragHandle}.ts`, `src/scenes/{Level01Scene,LevelScene,MenuScene,PreloadScene}.ts`.
**Why:** Drift risk; the `lib/preferences.ts` version is the only one that consults the cached preference (which `SettingsScene` writes), but it's never imported.
**How:** Keep the canonical version in `src/lib/preferences.ts`, add an SSR guard (`typeof window === 'undefined'`), and replace every per-file reimplementation with `import { checkReduceMotion } from '@/lib/preferences'`.

### 2.3 Audit & tighten remaining type assertions

**Why:** After 1.5, 1.9, and 2.1 land, the only `as unknown as` left should be `loader.ts:157` (intentional bundled-fallback) and `lib/log.ts:111` (intentional `window.__LOG`). Inventory and gate with comments.
**How:** Grep `as unknown as`, `as any`, `as never`. For each surviving instance, add a `// type-bridge: <reason>` comment.

### 2.4 Standardize repo CRUD names (longer-term, optional)

**Why:** 23 repos use `create` / `record` / `save` / `put` interchangeably; `getAll` / `getFor*` / `list*` interchangeably. Cognitive load and onboarding friction.
**How:** Document a CRUD contract in `docs/30-architecture/persistence.md`:
- `create(record)` → for entities
- `get(id)` → single
- `list*(filter)` → multiple
- `update(id, patch)` / `upsert(record)` → patch vs full
- `delete(id)` → remove

Then progressively rename. **NON-blocking** for this plan — track as follow-up.

---

## Phase 3 — Critical Resilience & Error Handling (R8–R10, R18–R20)

### 3.1 Add window-level synchronous error handler — R8

**Where:** `src/main.ts:6–13`
**Why:** Currently only `unhandledrejection` is caught. A synchronous throw inside Phaser's scene callbacks (e.g., a stale GameObject reference) freezes the canvas with no recovery.
**How:**
```ts
window.addEventListener('error', (event) => {
  console.error('[main] Uncaught error:', event.error);
  showFatalErrorUI(event.error?.message ?? 'Unknown error');
});
```
And implement `showFatalErrorUI()` as a pure-DOM modal with a Refresh button (no Phaser dependency, since Phaser may be the thing that crashed).

### 3.2 Per-write `QuotaExceededError` handling — R9

**Where:** All `db.*.add()`, `bulkPut()`, `update()`, `put()` calls in `src/persistence/repositories/*.ts`
**Why:** Safari Private mode + iOS Safari ITP eviction can throw quota errors mid-session. Currently `unhandledrejection` swallows these into console — gameplay continues but no data is saved.
**How:**
1. Add a shared `withQuotaGuard<T>(op: () => Promise<T>): Promise<T | null>` in `src/persistence/db.ts` that catches `QuotaExceededError` (and its DOMException variants), sets a module-level `volatileMode = true`, and returns null.
2. Wrap critical writes (attemptRepo.record, sessionRepo.create, hintEventRepo.record).
3. Expose `isVolatile()` via a getter; surface a Settings warning chip when true.

### 3.3 iOS Safari TTS `onvoiceschanged` — R10

**Where:** `src/audio/TTSService.ts:23–38`
**Why:** `speechSynthesis.getVoices()` returns `[]` on first call in iOS Safari; voices populate asynchronously.
**How:**
```ts
constructor() {
  this.synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
  this._voices = [];
  if (this.synth) {
    const refresh = () => { this._voices = this.synth!.getVoices(); };
    refresh();
    this.synth.addEventListener?.('voiceschanged', refresh);
  }
}
// In speak(): use this._voices instead of getVoices()
```

### 3.4 Surface validator errors visibly — R18

**Where:** `src/scenes/Level01Scene.ts:766`
**Why:** A thrown validator currently produces `feedback: 'validator_error'` — which is silently swallowed by FeedbackOverlay's KIND_CONFIG mapping. Student sees "Not quite" with no explanation.
**How:** Add `console.error('[Level01Scene] Validator threw:', err)` and `log.error('VALID', 'crash', { err: String(err), templateId })`. Optionally render a small "Something went wrong with this question — try the next one" badge instead of standard incorrect feedback. Keep `outcome: 'incorrect'` so progression is unaffected.

### 3.5 Per-template validation in curriculum loader — R19

**Where:** `src/curriculum/loader.ts:80–121` (`parseBundle`)
**Why:** A malformed template (missing `payload` or `prompt`) crashes `loadQuestion()` at `Level01Scene.ts:498` reading undefined.payload.
**How:** Inside `parseBundle()`, filter:
```ts
const validTemplates = bundle.templates.filter(t => {
  if (!t?.id || !t?.payload || !t?.prompt?.text) {
    console.warn(`[loader] Skipping malformed template: ${t?.id ?? '<no id>'}`);
    return false;
  }
  return true;
});
```

### 3.6 Verify student/session on resume — R20

**Where:** `src/scenes/Level01Scene.ts` (init/openSession), `src/scenes/MenuScene.ts` (resume button handler)
**Why:** If site data is cleared mid-session in another tab, the in-memory studentId/sessionId become orphans. Subsequent attempt writes have no FK target.
**How:** On scene start, verify both rows exist:
```ts
const student = await studentRepo.get(this.studentId);
if (!student) { this.scene.start('BootScene'); return; }
if (this.sessionId) {
  const sess = await sessionRepo.get(this.sessionId);
  if (!sess || sess.endedAt) { this.sessionId = null; await this.openSession(); }
}
```

---

## Phase 4 — Critical Accessibility (WCAG AA Blockers) (R11, R12, R21–R26)

### 4.1 FeedbackOverlay color contrast — R11 ⛔ BLOCKER

**Where:** `src/components/FeedbackOverlay.ts:35–42`
**Why:** Correct=2.52:1, incorrect=3.21:1 (WCAG AA requires 4.5:1 for body text).
**How:** Replace KIND_CONFIG entries:
- `correct`: `{ bg: '#A8E6C8', textColor: '#0D5A2E', text: 'Correct!', icon: '✓' }` — 7.35:1 ✓
- `incorrect`: `{ bg: '#FFCCD6', textColor: '#660017', text: 'Not quite — try again!', icon: '✗' }` — 8.42:1 ✓
- `close`: keep current (6.78:1 already passes).
- The high-contrast palette already exists (`src/scenes/utils/colors-high-contrast.ts`); use it.

### 4.2 SkipLink target — R12 ⛔ BLOCKER

**Where:** `src/components/SkipLink.ts:46`
**Why:** `href = '#qf-canvas'` jumps focus to a `tabindex=-1` canvas, which cannot accept keyboard input. Skip link defeats its own purpose.
**How:** Either point `href` to the first DOM A11yLayer button (e.g., `#a11y-play`), or in the focus handler programmatically focus it:
```ts
link.addEventListener('click', e => {
  e.preventDefault();
  const first = document.querySelector<HTMLElement>('[data-a11y-id]');
  requestAnimationFrame(() => first?.focus());
});
```

### 4.3 PreferenceToggle `:focus` outline — R21

**Where:** `src/components/PreferenceToggle.ts:102–120`
**Why:** Native `<button>` with no focus styles + custom switch UI = invisible focus for keyboard users (WCAG 2.4.7).
**How:** Add inline focus style or a CSS rule:
```ts
this.btn.addEventListener('focus', () => { this.btn.style.outline = '3px solid #2F6FED'; });
this.btn.addEventListener('blur',  () => { this.btn.style.outline = 'none'; });
```

### 4.4 Continue & Hint button text contrast — R22

**Where:** `src/scenes/utils/levelTheme.ts:24–51` (button color tokens)
**Why:** Continue=1.92:1 (white on emerald-400). Hint button=4.07:1 (navy on blue-400). Both fail body-text 4.5:1.
**How:** Switch to deeper greens/blues:
- Continue: emerald-500 `#10B981` bg + white text → 4.04:1 ⚠ (still fails for text). Use emerald-700 `#047857` + white → 6.41:1 ✓
- Hint: blue-500 `#3B82F6` + white → 5.81:1 ✓

### 4.5 Locked level concept text — R23

**Where:** `src/components/LevelCard.ts:90`
**Why:** neutral-300 `#C5CAD3` on white = 1.65:1.
**How:** Use neutral-600 `#5B6478` (5.20:1 ✓) for locked-state copy. Keep visual lock icon for affordance.

### 4.6 Announce state changes — R24

**Where:** `src/scenes/MenuScene.ts` (after level unlock), `src/scenes/SettingsScene.ts` (after toggle / export / reset)
**Why:** WCAG 4.1.3 Status Messages — non-visual users miss every state change.
**How:** Sprinkle `AccessibilityAnnouncer.announce(...)` calls:
- Level unlock: `"Level ${n} unlocked!"`
- Preference toggled: `"${label} ${on ? 'enabled' : 'disabled'}"`
- Export ok: `"Backup downloaded"`
- Reset confirm: `"Resetting device. Please wait."`
- Reset failure: `"Reset failed. ${err.message}"` (handles R26 too)

### 4.7 MenuScene tab order includes levels — R25

**Where:** `src/scenes/MenuScene.ts:119–139`
**Why:** Level cards live in Phaser canvas only; A11yLayer only exposes Play / Continue / Settings / ChooseLevel. Keyboard users cannot reach individual levels.
**How:** Add A11yLayer DOM buttons for each unlocked level: `A11yLayer.mountAction('a11y-level-1', 'Level 1: Halves', () => this._startLevel(1))`. Mount/remount when unlock state changes.

### 4.8 Reset Device error UI — R26

**Where:** `src/scenes/SettingsScene.ts:97, 254–262`
**Why:** If `db.delete()` throws, user gets no feedback and may believe data was wiped when it wasn't.
**How:** Wrap in try/catch; on error, render a status banner ("Reset failed — please try again") and call `AccessibilityAnnouncer.announce(...)` (covered by R24).

### 4.9 Wrap ambient animations in reduced-motion guard — R36

**Where:** `src/scenes/MenuScene.ts:93, 300–301` (marching dashes, gear rotation)
**How:**
```ts
if (!checkReduceMotion()) {
  this.ambientTweens.push(this.tweens.add({ ... }));
}
```
(Uses the consolidated helper from 2.2.)

### 4.10 Announce drag alternatives on Level01 load

**Where:** `src/scenes/Level01Scene.ts:550–553` (after question announcement)
**How:** First question only:
```ts
A11yLayer.announce('Use arrow keys to move the line, then press Enter to place it.');
```

---

## Phase 5 — Critical Privacy & Security (R13, R27–R29)

### 5.1 Move `unlockedLevels` out of localStorage — R13 ⛔ CONSTRAINT VIOLATION

**Where:** `src/scenes/MenuScene.ts:348–384`
**Why:** Constraint **C5** says only `lastUsedStudentId` is allowed in localStorage. The current code writes `unlockedLevels:${studentId}` keys per-student.
**How:**
1. Add a `progressionStat` row (or extend `studentRepo`) with field `unlockedLevels: Set<number>`.
2. Replace localStorage reads/writes in MenuScene with `progressionStatRepo.getUnlocked(studentId)` and `setUnlocked(studentId, n)`.
3. One-time migration on boot: read any leftover `unlockedLevels:*` keys, write to IndexedDB, then `localStorage.removeItem`.

### 5.2 Move `LOG` filter out of localStorage — R27

**Where:** `src/lib/log.ts:40, 113, 118, 122`
**Why:** Same C5 violation. Debug filter is dev-only convenience, doesn't need to persist across sessions.
**How:** Use `sessionStorage` (cleared on tab close) or read URL param `?log=...` only.

### 5.3 Schema-validate the curriculum bundle — R28

**Where:** `src/curriculum/loader.ts:80–121` (`parseBundle`)
**Why:** Currently a shallow check on `version` and `contentVersion` only. A malformed bundle (incl. potentially malicious if a CDN is ever compromised) can corrupt the DB.
**How:** Add a Zod (preferred — small ~12 KB gz, no deps) or hand-rolled type-guard schema for `CurriculumBundle`. Reject the bundle on validation failure and fall back to bundled `bundle.json`.

### 5.4 Schema-validate backup files on restore — R29

**Where:** `src/persistence/backup.ts:125–210`
**Why:** Restored rows are passed straight to Dexie `.add()`. Malformed backups (intentional or accidental) can corrupt or partially-write the DB.
**How:** Same approach as 5.3 — Zod or hand-rolled guards per row, skip-with-log on invalid rows. Don't abort the whole restore; report counts (`restored: 234, skipped: 5`).

### 5.5 Defense-in-depth: replace `innerHTML = ''` — R37

**Where:** `src/components/A11yLayer.ts:201`
**Why:** Today the content is self-generated, but `innerHTML` accumulates technical debt; future hint-text from curriculum could reach this path.
**How:**
```ts
while (container.firstChild) container.removeChild(container.firstChild);
```

---

## Phase 6 — E2E & Accessibility Test Unblock (R30–R32)

### 6.1 Add `settings-btn` testid to MenuScene — R30

**Where:** `src/scenes/MenuScene.ts` after the existing TestHooks block (around line 166)
**How:**
```ts
TestHooks.mountInteractive(
  'settings-btn',
  () => { this.scene.launch('SettingsScene'); },
  { width: '60px', height: '60px', top: toViewport(SET_Y) + '%', left: '50%' }
);
```

### 6.2 Add `level-card-L2..L9` testids — R31

**Where:** Same area in MenuScene as R30. The pattern already exists for L1, L6, L7.
**How:** Loop:
```ts
for (const n of [2, 3, 4, 5, 8, 9]) {
  TestHooks.mountInteractive(
    `level-card-L${n}`,
    () => this._startLevel(n),
    { width: '200px', height: '140px', top: '...', left: '...' }
  );
}
```
(Position values determined by the existing 3×3 grid layout in `_renderLevelGrid()`.)

### 6.3 Remove stale SKIP comments — R32

**Files:**
- `tests/e2e/level01.spec.ts:5–8`
- `tests/e2e/settings.spec.ts:4–8`
- `tests/a11y/wcag.spec.ts:4–8` (if present)

After 6.1 + 6.2, run `npx playwright test`. Expected: smoke ×5 (already passing), level01 ×10, settings ×10, wcag ×20.

### 6.4 Bump `test-helpers.ts` feedback timeout

**Where:** `tests/e2e/test-helpers.ts:37`
**How:** `toBeVisible({ timeout: 2000 })` — matches the safety margin used in spec files.

---

## Phase 7 — Test Coverage Gaps (R40)

### 7.1 `tests/unit/engine/selection.test.ts` (new)

Cover `src/engine/selection.ts`:
- ZPD-window inclusion (mastery in [0.4, 0.85])
- Below-ZPD fallback (`preferUnmastered=true`)
- Recency window excludes last 5 templates
- `null` return on empty pool
- Cold-start (no mastery map) routes to below-ZPD bucket
- Random tiebreak: distinct return across N calls (statistical)

### 7.2 `tests/unit/validators/utils.test.ts` (new)

Cover all 7 exports of `src/validators/utils.ts` — incl. `lerp`, `manhattanDistance`, `polygonArea` (currently dead exports — R39). The test makes them justified rather than deletable. Cover edge cases: empty arrays, target=0 in `isWithinTolerance`, identity/reverse permutations in `kendallTauDistance`.

### 7.3 `tests/unit/curriculum/levelGroup.test.ts` (new — after 1.8)

Cover the extracted `deriveLevelGroup()`:
- L1, L2 → `'01-02'`
- L3, L5 → `'03-05'`
- L6, L9 → `'06-09'`
- Malformed input → `'01-02'` fallback + warning

### 7.4 Synthetic playtest invariants (extension — optional)

**Where:** `tests/synthetic/playtest.spec.ts`
**Why:** Already does 100 sessions × 5 attempts. We can add invariant assertions cheaply.
**How:** After each session ends, query DB and assert:
- `session.endedAt !== null`
- All `attempt.hintsUsedIds` exist in `hintEvents` table (no orphans)
- `progressionStat.unlockedLevels` is non-decreasing

---

## Phase 8 — Code Quality & Cleanup (R37, R38, R39)

### 8.1 Remove dead exports OR cover with tests — R39

**Where:** `src/validators/utils.ts` lines 18 (`lerp`), 23 (`manhattanDistance`), 31 (`polygonArea`)
**Why:** Currently unused. Either delete or justify with tests (Phase 7.2 does the latter — preferred since they're cheap utilities likely needed by future validators).

### 8.2 Verify all `as unknown as` post-Phase-1

After 1.5, 1.9, and 2.1, only `loader.ts:157` and `lib/log.ts:111` should remain. Confirm with `grep -rn 'as unknown as' src/`.

### 8.3 Document repo CRUD contract (deferred from 2.4)

Lightweight: write the contract in `docs/30-architecture/persistence.md`. Don't rename in this plan.

---

## Phase 9 — Performance, PWA & Operations (R33–R36, R42–R48)

### 9.1 Content migration policy doc — R33 ⛔ BLOCKER for v1.1.0

**Where:** New file `docs/30-architecture/content-migration.md`
**Why:** When v1.1.0 ships with new/removed templates, existing student `attempts` may reference removed `questionTemplateId`s. No policy exists.
**How:** Document:
1. Soft-deprecation: removed templates flagged `deprecated: true` rather than deleted; kept readable for replay.
2. Pre-deploy check (CI): scan latest curriculum vs. previous; warn on any template ID present in attempts but missing from new bundle.
3. Runtime fallback: if Level scene can't find a referenced template, show "Question unavailable in this version" and skip rather than crash.

### 9.2 Font preload — R42

**Where:** `index.html` `<head>` after line 15
**How:**
```html
<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/nunito-400.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/fredoka-one-400.woff2">
```
Estimated 100–200 ms LCP gain on slow 3G.

### 9.3 iOS PWA meta tags — R43

**Where:** `index.html` `<head>`
**How:**
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

### 9.4 Phaser `maxZoom` — R44

**Where:** `src/main.ts:45–57` scale config
**How:**
```ts
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 800,
  height: 1280,
  max: { width: 1600, height: 2560 },
}
```

### 9.5 Parallelize Phaser + scenes imports

**Where:** `src/main.ts:33, 39`
**How:**
```ts
const [phaser, scenesModule] = await Promise.all([
  import('phaser'),
  import('./scenes'),
]);
```
~50–100 ms shaved on slow networks.

### 9.6 Offline indicator — R34

**Where:** New util in `src/lib/network.ts`; mounted in MenuScene/Level01/Level scenes
**How:** `window.addEventListener('online'/'offline', ...)`. Render a small banner via A11yLayer + Phaser text. Announce status changes.

### 9.7 SW update prompt — R35

**Where:** `vite.config.ts:18–68`
**How:** Switch `registerType: 'autoUpdate'` → `'prompt'`. Add a workbox-window listener in `src/main.ts` that shows a "New version ready — Restart" toast when `controlling` event fires. Keeps in-flight session state intact.

### 9.8 Build SHA in Settings → About — R45

**Where:** `src/scenes/SettingsScene.ts`
**How:** Add a small text node: `\`Version 1.0.0 (${__BUILD_SHA__})\``. Useful for support/triage.

### 9.9 Playwright retries — R46

**Where:** `playwright.config.ts`
**How:** Add `retries: process.env.CI ? 1 : 0`.

### 9.10 Archive stale PLANS — R47

**How:** Move these to `PLANS/.archive/`:
- `phase-3-{checkpoint,implementation,technical-specs}.md`
- `phase-7-completion.md`
- `phase-12-2-materials-complete.md`
- `phase_0b1_completion_report.md`
- `PLANNING-SESSION-SUMMARY.md`

Keep `PLANS/INDEX.md` and add an "Archived" section.

### 9.11 Parent FAQ — R48

**Where:** New file `docs/40-validation/parent-faq.md`
**How:** 5–10 Q&A items: where data is stored (device only), how to delete (Settings → Reset), how to back up, no third-party sharing, accessibility features.

---

## Phase 10 — Observability & Comprehensive Logging (R49–R56)

**Goal:** make every meaningful state change, async hop, error path, and performance edge observable. Today the app is essentially a black box in production — when a child hits a bug, there is zero forensic trail. This phase adds dense, structured, correlatable logs WITHOUT shipping PII, while keeping production logs gated behind an explicit opt-in.

### 10.1 Production logging strategy redesign — R49

**Where:** `src/lib/log.ts:47` (`if (import.meta.env.PROD) return false;`)
**Why:** Today production silences ALL info-level logs. Even a parent on a supervised support call cannot turn on logs for a single session. WARN/ERROR escape but lack context.
**How:** Three-tier model:
1. **Always-on:** `WARN`, `ERROR`, `FATAL` always emit (structured, no PII).
2. **Opt-in via URL param:** `?log=Q,VALID,TTS` enables specific categories *for this page load only* in production. The flag is stored in `sessionStorage` (cleared on tab close), never `localStorage` (C5 compliance).
3. **Dev-only firehose:** `import.meta.env.DEV` keeps the existing default-on filter `'*'`.

Add a one-time banner on first opt-in in production: `[log] Verbose logging enabled for this session — close the tab to reset.`

### 10.2 Add log calls across silent modules — R50

**Where:** ~10 modules currently emit zero logs. Inventory + minimum log surface for each:

| Module | New log calls (info-level unless noted) |
|---|---|
| `src/audio/TTSService.ts` | `tts.speak_start`, `tts.voices_ready`, `tts.queued`, `tts.cancel`, `tts.warn(no_voices_after_3s)`, `tts.error(synth_failed)` |
| `src/components/A11yLayer.ts` | `a11y.mount(id, label)`, `a11y.unmount(id)`, `a11y.announce(text, priority)`, `a11y.unmount_all(count)` |
| `src/components/SkipLink.ts` | `a11y.skip_link.activate(target)`, `a11y.skip_link.miss(reason)` |
| `src/components/PreferenceToggle.ts` | `pref.toggle(label, oldValue, newValue, source)` |
| `src/components/FeedbackOverlay.ts` | `feedback.show(kind, displayMs)`, `feedback.dismiss(kind, dwellMs, reason)` *(reason: timer\|next-btn\|reduceMotion)* |
| `src/components/ProgressBar.ts` | `progress.update(prev, next, goal, animated)` |
| `src/components/HintLadder.ts` | `hint.next(tier, exhausted)`, `hint.reset()` |
| `src/components/DragHandle.ts` | `drag.keyboard(key, deltaPx)`, `drag.snap(target, distance)` *(commit/start already exist via Level01Scene)* |
| `src/persistence/backup.ts` | `backup.export_start(rowCounts)`, `backup.export_done(bytes, duration)`, `backup.restore_start(version)`, `backup.restore_skip(reason, table, id)`, `backup.restore_done({restored, skipped})` |
| `src/curriculum/loader.ts` | `loader.fetch_start(url)`, `loader.fetch_ok(bytes, duration)`, `loader.fetch_fail(reason, fallback)`, `loader.parse_ok(counts)`, `loader.parse_skip(reason, templateId)` |
| `src/persistence/db.ts` | `db.open(version)`, `db.upgrade(from, to, duration)`, `db.persist_request(granted)`, `db.quota_warn(usage, quota)` |

### 10.3 Structured context on every log call — R51

**Why:** `log.warn('SESS', 'open_error', { error: String(err) })` is fine — but most calls today only carry the message. To trace a bug across modules, every log must carry the same correlation IDs.
**How:** Add a module-level "ambient context" mechanism in `src/lib/log.ts`:
```ts
let _ctx: Record<string, unknown> = {};
export const log = {
  setContext(patch: Record<string, unknown>) { _ctx = { ...patch }; },
  patchContext(patch: Record<string, unknown>) { Object.assign(_ctx, patch); },
  // each emit() merges _ctx into the payload before console.*
  // ...
};
```
Set context at scene boundaries:
- `BootScene.create`: `log.setContext({ studentId, deviceId, buildSha: __BUILD_SHA__ })`
- `Level01Scene.openSession`: `log.patchContext({ sessionId, level: 1 })`
- `Level01Scene.loadQuestion`: `log.patchContext({ questionId, qIndex })`

After this, EVERY log line auto-includes the correlation IDs, no per-call boilerplate.

### 10.4 Trace IDs across async boundaries — R52

**Why:** A single `onSubmit` triggers ~6 async operations (validate → record attempt → BKT update → misconception detection → hint event flush → progress bar update). Today each one logs with its own framing; reconstructing a single attempt from logs is hard.
**How:** Generate a short `traceId` (8 chars, e.g., `nanoid(8)`) at the top of `onSubmit()` and pass it through `log.patchContext({ traceId })` for the duration of the call. Use `try/finally` to clear it. Result: every log line during a single attempt shares the same `traceId`.

Apply to: `Level01Scene.onSubmit`, `Level01Scene.recordAttempt`, `LevelScene.onSubmit`, `BootScene._bootAsync`, `seed.ts._doSeed`, `backup.restoreFromFile`.

### 10.5 In-app log viewer — R53

**Where:** New scene `src/scenes/DebugScene.ts`, gated on `?debug=1` URL param OR on tapping the build SHA badge in Settings 5 times (parent-supervised).
**Why:** Parents/teachers cannot open browser DevTools on a school iPad. An in-app viewer makes support sessions feasible without sending the device home.
**How:**
- Backed by the ring buffer (10.6).
- Renders the last 200 entries in a scrollable list.
- "Copy all" button writes JSON to clipboard.
- "Share" button uses `navigator.share()` if available (mobile-friendly).
- All entries scrubbed of any field that LOOKS like PII: anything matching `email|phone|name` regex on key OR value gets redacted to `[redacted]` before display.

### 10.6 Ring buffer of last N events — R54

**Where:** Add to `src/lib/log.ts`
**Why:** Even if production filters info-level logs from the console, we want a forensic tail that can be exported with a backup or shown in the Debug viewer.
**How:**
```ts
const RING_SIZE = 500;
const _ring: Array<{ ts: number; level: string; cat: string; msg: string; ctx: object }> = [];
function pushRing(entry) {
  _ring.push(entry);
  if (_ring.length > RING_SIZE) _ring.shift();
}
export function getRing() { return [..._ring]; }
```
Every `emit()` always pushes to the ring, regardless of filter. This is in-memory, cleared on tab close, no PII concern.

Backup envelope (`src/persistence/backup.ts`) optionally appends the ring (last 500 events) under a `_diagnostics` key when the user clicks an "Include diagnostics" checkbox before export. Off by default for privacy.

### 10.7 Expand log categories — R55

**Where:** `src/lib/log.ts`
**Why:** Current 11 categories miss several axes that this plan introduces.
**How:** Add: `LIFECYCLE` (scene init/destroy/visibility), `NET` (online/offline transitions), `PWA` (SW install/update/controlling), `A11Y` (announcements, skip-link, focus moves), `TTS` (synthesis events), `STORAGE` (quota, persist grant, evictions), `MIGRATE` (schema upgrades, content version mismatches), `ERR_BOUNDARY` (caught crashes from window.error/unhandledrejection — Phase 3.1).

Document the full taxonomy in `docs/30-architecture/observability.md` *(new file, see 10.10)*.

### 10.8 Performance marks — R56

**Where:** New helper in `src/lib/log.ts`, instrumented at hot paths.
**Why:** "The app feels slow" is unactionable. Concrete timings (`scene.MenuScene.create_ms=180`) are.
**How:**
```ts
log.perf = (label: string, durationMs: number, ctx?: object) => emit('PERF', 'info', label, { durationMs, ...ctx });

// Helper:
export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  try { return await fn(); }
  finally { log.perf(label, +(performance.now() - t0).toFixed(1)); }
}
```
Wrap the following:
- Each scene's `create()` (boot, preload, menu, level01, level, settings)
- `validatorRegistry.get(...).fn(...)` inside `onSubmit`
- `attemptRepo.record`, `sessionRepo.create`, `sessionRepo.close`
- `seedAllStores`, `wipeStaticStores`
- `loadCurriculumBundle` (separate marks for fetch vs. parse)
- BKT `updateMastery`
- Misconception `runAllDetectors`

Also use `performance.mark()` + `performance.measure()` so the marks appear in the browser DevTools Performance tab.

### 10.9 Log assertion helper for invariants

**Why:** Some "this can't happen" branches today silently swallow. Better: assert + log at fatal level.
**How:**
```ts
log.assert = (condition: unknown, message: string, ctx?: object) => {
  if (!condition) { log.error('ASSERT', message, ctx); /* in dev: throw */ if (DEV) throw new Error(message); }
};
```
Sprinkle at: `currentQuestion` non-null after `loadQuestion`, `sessionId` non-null after a successful `openSession` retry, etc.

### 10.10 Observability documentation

**Where:** New `docs/30-architecture/observability.md`
**Contents:**
- Full category taxonomy (final list after 10.7)
- Standard event names per module (e.g., `q.load`, `q.correct`, `q.wrong`, `feedback.show`, `feedback.dismiss`)
- Required context fields per category
- How to enable verbose logs in prod (`?log=*`)
- How to access the in-app Debug viewer
- How to export logs with a backup
- PII policy (what's redacted, what's allowed)

### 10.11 Tests for logging infrastructure

**Where:** New `tests/unit/lib/log.test.ts`
**Cover:**
- Filter parsing: `'*'`, `'Q,VALID'`, empty
- Context merging: `setContext` overwrites, `patchContext` merges
- Ring buffer: respects RING_SIZE, FIFO order
- Production gate: PROD=true + `?log=Q` enables Q only
- Production gate: PROD=true, no flag → silent for INFO, ERROR/WARN still emit
- PII redaction in Debug viewer renderer (10.5)

---

## Verification Matrix

| Gate | Command | Expected |
|---|---|---|
| Unit | `npm run test:unit` | 174 → 174+N (new tests in 7.1–7.3) all green |
| Integration | `npm run test:integration` | All green |
| Type | `npm run typecheck` | Zero errors *(after 2.1, may surface ~30–80; resolve before merge)* |
| Lint | `npm run lint` | Zero warnings |
| E2E (smoke) | `npx playwright test smoke.spec.ts` | 5/5 (already green) |
| E2E (level01) | `npx playwright test level01.spec.ts` | 10/10 *(after Phase 6)* |
| E2E (settings) | `npx playwright test settings.spec.ts` | 10/10 *(after Phase 6)* |
| A11y axe | `npx playwright test --grep a11y` | 0 violations *(after Phase 4)* |
| Touch ≥44px | (in axe-touch suite) | 0 violations |
| Synthetic | `npx playwright test --config playwright.synthetic.config.ts` | All sessions close, no orphan hints *(after Phase 1.3 + 7.4)* |
| Build | `npm run build` | Pass; bundle ≤ 1 MB gz |
| Postdeploy | `npm run postdeploy` | All 17 checks pass |
| Manual: contrast | DevTools axe / Lighthouse | All text ≥ 4.5:1, UI ≥ 3:1 |
| Manual: Safari Private | iOS device | Boots, plays, doesn't silently lose data (volatile-mode banner appears) |

---

## Sequencing & PR Strategy

To keep PRs reviewable and bisectable:

| PR | Phases | Risk |
|---|---|---|
| 1 | 1.1, 1.2, 1.8, 1.9 (seed correctness + dedup) | Low |
| 2 | 1.3, 1.4 (hint event FK + id type) | Medium — touches schema |
| 3 | 1.5, 1.6, 1.7 (Level01Scene type/lifecycle/session) | Medium |
| 4 | 1.10, 1.11 (deviceMeta tx + schema upgrade hooks) | Medium |
| 5 | 2.1 (`noUncheckedIndexedAccess`) | High — many call sites |
| 6 | 2.2, 2.3 (de-dup helpers, audit casts) | Low |
| 7 | 3.1–3.6 (resilience) | Medium |
| 8 | 4.1–4.10 (a11y blockers + announcements) | Low — additive |
| 9 | 5.1, 5.2 (C5 enforcement) | Medium — migration |
| 10 | 5.3, 5.4, 5.5 (validation + DOM hygiene) | Low |
| 11 | 6.1–6.4 (e2e unblock) | Low — test-only |
| 12 | 7.1–7.4 (new tests) | Low |
| 13 | 8.x (cleanup) | Low |
| 14 | 9.1 (migration policy) | Low — doc-only |
| 15 | 9.2–9.11 (PWA polish + ops) | Low |
| 16 | 10.1, 10.3, 10.4, 10.7, 10.9, 10.11 (logging infrastructure) | Low — additive |
| 17 | 10.2 (sprinkle log calls across silent modules) | Low |
| 18 | 10.5, 10.6, 10.8, 10.10 (Debug viewer + ring buffer + perf marks + docs) | Low |

Phases 1, 4, 5, 6 are critical-path; 7, 8, 9, 10 are quality-of-life.
Phase 10 lands AFTER phases 1 and 3 because the new context/correlation IDs need stable scene boundaries (R6, R7) to attach to.

---

## Files Touched Summary

**New files (11):**
- `src/curriculum/levelGroup.ts`
- `src/lib/network.ts`
- `src/scenes/DebugScene.ts` *(in-app log viewer, gated)*
- `tests/unit/engine/selection.test.ts`
- `tests/unit/validators/utils.test.ts`
- `tests/unit/curriculum/levelGroup.test.ts`
- `tests/unit/lib/log.test.ts` *(logging infrastructure)*
- `docs/30-architecture/content-migration.md`
- `docs/30-architecture/observability.md` *(log taxonomy, debug viewer, PII policy)*
- `docs/40-validation/parent-faq.md`
- `PLANS/.archive/` *(directory)*

**Source files modified (17 + log instrumentation):**
`src/curriculum/seed.ts`, `src/curriculum/loader.ts`, `src/persistence/db.ts`, `src/persistence/backup.ts`, `src/persistence/repositories/{questionTemplate,deviceMeta,hintEvent}.ts`, `src/scenes/{BootScene,MenuScene,Level01Scene,LevelScene,SettingsScene}.ts`, `src/components/{FeedbackOverlay,SkipLink,PreferenceToggle,A11yLayer,LevelCard,ProgressBar,HintLadder,DragHandle}.ts`, `src/scenes/utils/levelTheme.ts`, `src/audio/TTSService.ts`, `src/lib/{log,preferences}.ts`, `src/main.ts`, `src/validators/registry.ts`, `tsconfig.json`, `index.html`, `vite.config.ts`, `playwright.config.ts`

**Phase 10 instrumentation note:** every existing `log.warn` / `log.error` site receives a `setContext`/`patchContext` upgrade for correlation IDs. The `log` module itself (`src/lib/log.ts`) gains: ambient context API, ring buffer, `timed()` perf helper, `log.assert`, expanded categories, and the production opt-in via `?log=...&sessionStorage`.

**Test files modified (4):**
`tests/e2e/{level01,settings}.spec.ts`, `tests/a11y/wcag.spec.ts`, `tests/e2e/test-helpers.ts`, `tests/synthetic/playtest.spec.ts`

---

## Out of Scope (deliberately deferred)

- i18n framework (30+ hardcoded English strings) — track separately as a feature, not hardening.
- Repo CRUD rename refactor (Phase 2.4 only documents the contract; renames are a follow-up).
- Phaser tree-shaking / engine swap — premature; bundle is at 41% of budget.
- Backup file encryption (parent PIN) — convenience feature for shared devices; revisit post-validation.
- Anonymized research export — researchers can manually export from test devices for now.
- Pre-commit hooks (husky/lint-staged) — fine for solo/small team; revisit when contributor count grows.
