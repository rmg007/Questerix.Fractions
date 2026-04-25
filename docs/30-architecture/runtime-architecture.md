---
title: Runtime Architecture
status: draft
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
constraint_refs: [C1, C2, C4, C5, C9]
related: [stack.md, data-schema.md, persistence-spec.md, ../20-mechanic/activity-archetypes.md, ../20-mechanic/interaction-model.md]
---

# Runtime Architecture

How the pieces named in `stack.md` are arranged in memory while the app runs. This is the *control flow*; `data-schema.md` is the *data shape*; `persistence-spec.md` is the *durability story*.

A reader of this document should be able to trace a single student tap from input event → validator → IndexedDB write → BKT update → UI re-render, with each layer named and its boundaries clear.

---

## 1. Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Browser Window                                 │
│                                                                         │
│  ┌────────────────────────┐   ┌──────────────────────────────────┐      │
│  │   HTML / Tailwind UI   │   │       Phaser 4 Game Canvas       │      │
│  │  (menus, modals,       │   │                                  │      │
│  │   settings, level pick)│   │  ┌────────────────────────────┐  │      │
│  └────────────┬───────────┘   │  │      Active Scene          │  │      │
│               │               │  │ (Boot → Menu → Activity)   │  │      │
│               │               │  └─────────────┬──────────────┘  │      │
│               │               │                │                 │      │
│               │               │  ┌─────────────▼──────────────┐  │      │
│               │               │  │   Systems Registry         │  │      │
│               │               │  │ (Drag, Slot, Effects, UI,  │  │      │
│               │               │  │  Target, Palette, BG)      │  │      │
│               │               │  └─────────────┬──────────────┘  │      │
│               │               │                │                 │      │
│               │               └────────────────┼─────────────────┘      │
│               │                                │                        │
│  ┌────────────▼────────────────────────────────▼────────────────────┐   │
│  │              Application Services Layer (TypeScript)              │   │
│  │                                                                   │   │
│  │  ┌───────────────┐  ┌────────────┐  ┌──────────────────────────┐  │   │
│  │  │ Curriculum    │  │ Validators │  │  Progression Engine      │  │   │
│  │  │ Loader        │  │ Registry   │  │  (BKT + level gating)    │  │   │
│  │  └───────┬───────┘  └─────┬──────┘  └────────────┬─────────────┘  │   │
│  │          │                │                      │                │   │
│  │          └────────────────┴──────────────────────┤                │   │
│  │                                                  │                │   │
│  │  ┌──────────────────────────────────────────────▼──────────────┐  │   │
│  │  │         Persistence Layer (Dexie wrapper)                   │  │   │
│  │  │  - 9 static stores (curriculum, replaced on contentVersion) │  │   │
│  │  │  - 8 dynamic stores (student progress, never wiped)         │  │   │
│  │  └──────────────────────────────────────────────┬──────────────┘  │   │
│  └─────────────────────────────────────────────────┼─────────────────┘   │
│                                                    │                     │
│                                                    ▼                     │
│                                  ┌──────────────────────────────┐        │
│                                  │      IndexedDB (browser)     │        │
│                                  └──────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

The diagram has four horizontal layers:

1. **Presentation** — HTML/Tailwind for chrome; Phaser canvas for the game
2. **Scenes + Systems** — Phaser-internal modular runtime (matches existing `src/scenes/` and `src/systems/` structure)
3. **Application services** — Curriculum loader, validator registry, progression engine, persistence wrapper
4. **Storage** — IndexedDB via Dexie (per `persistence-spec.md`)

---

## 2. Phaser Scene Inventory (MVP)

The prototype today has `MenuScene` and `FractionScene` (per `src/scenes/`). The MVP architecture expands this to:

| Scene | Purpose | Roughly equivalent to existing |
|-------|---------|-------------------------------|
| `BootScene` | Asset preload, Dexie init, version reconciliation | (new — replaces inline boot in `main.ts`) |
| `StudentSelectScene` | Student profile picker / creator | (new) |
| `MenuScene` | Level / activity picker | `src/scenes/MenuScene.ts` |
| `ActivityScene` | Generic per-activity host. Receives `(activityId, levelNumber)` and dispatches to the correct mechanic system | Generalization of `src/scenes/FractionScene.ts` |
| `SessionEndScene` | End-of-session summary card (per `interaction-model.md §6.2`) | (new) |
| `LevelCompleteScene` | Level-mastery celebration (per `interaction-model.md §6.3`) | (new) |
| `SettingsScene` | Preferences (audio, motion, contrast) | (new) — opened as modal overlay |

`ActivityScene` is the workhorse. Its `init` method takes the activity slug + level number; it loads the relevant `Activity`, `ActivityLevel`, and `QuestionTemplate` records via the Curriculum Loader; it registers the matching mechanic systems for the activity's `mechanic` field (per `data-schema.md §2.4`).

Per **C2 (no teacher/parent surface)**, no scene serves a non-student persona. There is no admin panel, no analytics dashboard.

---

## 3. Systems Registry (Phaser-internal)

The existing prototype already implements a systems registry pattern (see `src/scenes/FractionScene.ts` lines 35–43). The MVP extends this convention:

| System | Responsibility |
|--------|----------------|
| `BackgroundSystem` | Render the activity background (per `design-language.md` neutrals) |
| `TargetSystem` | The "whole" shape being acted on (rectangle, circle, etc.) |
| `SlotSystem` | Drop targets within the activity (regions, number-line ticks, zones) |
| `PaletteSystem` | Tray of draggable items (fraction cards, label tiles, dividers) |
| `DragSystem` | Implements the universal drag vocabulary from `interaction-model.md §1.1` and the snap engine from §3 |
| `EffectsSystem` | Snap pulses, shakes, success/failure animations (per `interaction-model.md`) |
| `UISystem` | Prompt text, hint button, audio replay button, score |
| `MechanicSystem` | One per archetype (Partition, Identify, Compare, etc.) — implements the validator hookup and writes Attempt records |

A scene's `create()` method instantiates the systems it needs (the existing `systems: Record<string, GameSystem>` registry pattern stays intact). Systems communicate via the scene's `events` emitter rather than direct references — consistent with the prototype's existing `'piece-snapped'` event handling in `FractionScene.ts`.

The neon-flavored `BackgroundSystem` and `EffectsSystem` from the prototype must be re-skinned per `design-language.md` (no glow, no particle storms) — that's a refactor task, not a new build.

---

## 4. Application Services

### 4.1 Curriculum Loader

A pure-TypeScript service that wraps Dexie reads of static stores:

```
class CurriculumLoader {
  async getActivity(activityId): Promise<Activity>
  async getLevel(activityId, levelNumber): Promise<ActivityLevel>
  async getQuestionsForLevel(activityLevelId, scaffoldLevel): Promise<QuestionTemplate[]>
  async getHints(questionTemplateId): Promise<Hint[]>
  async getFractions(fractionIds): Promise<FractionBankItem[]>
}
```

The loader is constructed once at app boot and cached on the Phaser game instance.

### 4.2 Validator Registry

A `Map<validatorId, ValidatorFn>` populated at app start. Each `QuestionTemplate.validatorId` (per `data-schema.md §2.7`) is a key into this registry. The pseudocode in `activity-archetypes.md §2–10` defines the function contract; concrete implementations live in `src/validators/`.

```
type ValidatorFn = (payload: unknown, studentAnswer: unknown) => ValidationResult

interface ValidationResult {
  outcome: "EXACT" | "CLOSE" | "WRONG" | "ASSISTED" | "ABANDONED"
  errorMagnitude?: number
  flaggedMisconceptionIds?: string[]
  reason?: string
}
```

Validators are pure and synchronous. They never read from IndexedDB (they take `payload` as input). This makes them trivially unit-testable with Vitest.

### 4.3 Progression Engine

The session-level decision-maker. After each `Attempt`, the engine:

1. Updates `SkillMastery` for each affected skill (BKT recompute)
2. Detects misconceptions (matches against `payload.misconceptionTraps`)
3. Updates `ProgressionStat` for the activity
4. Emits a `scaffoldRecommendation` ("advance" / "stay" / "regress") tied to the current `Session`

BKT formulas live in `src/progression/bkt.ts`. They are pure functions over the prior `SkillMastery` row + the new attempt outcome.

The advancement gate (per `level-01.md §7`) is checked at session end:
- All gating skills `MASTERED`?
- Minimum attempts met?
- Tier-3 accuracy threshold met?

If yes → next session for this student starts at L+1.

Per **C2**, the progression engine has no remote arbiter. All decisions are local.

### 4.4 Persistence Layer (Dexie wrapper)

Thin wrapper around the Dexie schema declared in `persistence-spec.md §4`. Exposes:

```
class PersistenceLayer {
  // Static reads (curriculum)
  curriculum: CurriculumLoader
  
  // Dynamic reads/writes (student progress)
  students: StudentRepo
  sessions: SessionRepo
  attempts: AttemptRepo
  hintEvents: HintEventRepo
  misconceptionFlags: MisconceptionFlagRepo
  skillMastery: SkillMasteryRepo
  progressionStat: ProgressionStatRepo
  deviceMeta: DeviceMetaRepo
}
```

Each repo wraps Dexie with typed query helpers. No queries leak Dexie types upward — everything is plain TypeScript objects matching `data-schema.md`.

Per **C5**, the only localStorage usage is a `lastUsedStudentId` pointer the `BootScene` reads to fast-resume.

---

## 5. Boot Sequence

Matches `persistence-spec.md §5`. The MVP's concrete boot sequence:

```
1. index.html loads → Vite emits main.ts
2. main.ts:
   a. Logger.log('Application Initializing...')
   b. validateConfig() — fails fast on missing levels
   c. Tailwind stylesheet attached
3. BootScene.preload():
   a. Open Dexie connection (db = new QuesterixDB())
   b. Read deviceMeta singleton; create if absent
   c. Compare deviceMeta.contentVersion to APP_CONTENT_VERSION
       - If differ: wipe static stores, re-seed from /assets/curriculum/v{n}.json
   d. Preload the small set of audio + font assets
   e. Register service worker (no-op, satisfies PWA install criteria)
4. BootScene.create():
   a. Read localStorage.lastUsedStudentId (only allowed localStorage key, per C5)
   b. If present + matching student exists → scene.start('MenuScene', { studentId })
   c. Else → scene.start('StudentSelectScene')
5. StudentSelectScene → user picks profile → writes lastUsedStudentId → MenuScene
6. MenuScene → user picks level → ActivityScene
7. ActivityScene:
   a. Load Activity, ActivityLevel, QuestionTemplate set via CurriculumLoader
   b. Open new Session row in Dexie (Session.startedAt = now())
   c. Instantiate the systems registry for this mechanic
   d. Begin first question
```

After the user's first successful attempt (engagement signal), the app calls `navigator.storage.persist()` per `persistence-spec.md §3.2`. The result is recorded in `DeviceMeta.preferences`.

---

## 6. End-to-End Lifecycle: One Question

Tracing a single student attempt through the architecture:

```
┌──────────────────────────────────────────────────────────────────┐
│ Student taps an answer button (e.g., "Equal" in equal_or_not)    │
└──────────────────────────────────┬───────────────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ Phaser pointer event fires inside MechanicSystem (EqualOrNot)    │
│ Reads: studentAnswer = true                                      │
└──────────────────────────────────┬───────────────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ ValidatorRegistry.get("validator.equal_or_not.areaTolerance")    │
│   .call(payload, studentAnswer)                                  │
│ Returns: { outcome: "EXACT" }                                    │
└──────────────────────────────────┬───────────────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ AttemptRepo.create({                                             │
│   sessionId, questionTemplateId, studentAnswerRaw: true,         │
│   correctAnswerRaw: true, outcome: "EXACT",                      │
│   responseMs: now - startedAt, ...                               │
│ })  → IndexedDB write                                            │
└──────────────────────────────────┬───────────────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ ProgressionEngine.onAttemptSubmitted(attempt)                    │
│   - Updates SkillMastery rows for SK-01 (BKT step)               │
│   - Updates Session.totalAttempts, correctAttempts                │
│   - Updates ProgressionStat                                      │
│   - Returns: { scaffoldRecommendation: "stay" }                  │
└──────────────────────────────────┬───────────────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ EffectsSystem plays success animation (per design-language.md)   │
│ UISystem updates score; loads next question                      │
└──────────────────────────────────────────────────────────────────┘
```

Total wall-clock: well under the 1-second feedback budget from `interaction-model.md §2`.

---

## 7. Data Read/Write Map

Where each part of the data model is touched at runtime:

### 7.1 Static stores (read-only after seed)

| Store | Read by |
|-------|---------|
| `curriculumPacks` | BootScene (version check) |
| `standards` | (informational; not read at runtime) |
| `skills` | ProgressionEngine (BKT priors) |
| `activities` | MenuScene, ActivityScene |
| `activityLevels` | ActivityScene |
| `fractionBank` | All MechanicSystems, Validators (via payload references) |
| `questionTemplates` | ActivityScene |
| `misconceptions` | ProgressionEngine (lookup on detection) |
| `hints` | UISystem (when student requests hint) |

### 7.2 Dynamic stores (read + write)

| Store | Read by | Written by |
|-------|---------|-----------|
| `students` | BootScene, StudentSelectScene | StudentSelectScene |
| `sessions` | ActivityScene, SessionEndScene | ActivityScene (on start, on close) |
| `attempts` | ProgressionEngine, SessionEndScene | MechanicSystem (on submit) |
| `hintEvents` | (analytics only — local) | UISystem (on hint tap) |
| `misconceptionFlags` | ProgressionEngine | ProgressionEngine (on detection) |
| `skillMastery` | ProgressionEngine | ProgressionEngine (after each attempt) |
| `progressionStat` | MenuScene, ProgressionEngine | ProgressionEngine (after each session close) |
| `deviceMeta` | BootScene, SettingsScene | BootScene (init), SettingsScene (preference change) |

Per `data-schema.md §3`, every dynamic write carries `syncState: "local"`. The 2029 sync worker is not built; the field exists for forward-compat.

---

## 8. Lifecycle Summary

A student's complete session, top to bottom:

| Step | Scene / System | Side effects |
|------|----------------|--------------|
| 1. App launch | `BootScene` | Dexie open, deviceMeta read, content version reconciled |
| 2. Student picks profile | `StudentSelectScene` | `localStorage.lastUsedStudentId` updated |
| 3. Level pick | `MenuScene` | reads `ProgressionStat` to mark unlocked levels |
| 4. Scene load | `ActivityScene.init` | Activity + Level + Templates loaded; new `Session` row written |
| 5. First question shown | `ActivityScene.create` → `MechanicSystem` | `Attempt.startedAt` set on first interaction |
| 6. Each attempt submitted | `MechanicSystem` → Validator → `ProgressionEngine` | `Attempt`, `SkillMastery`, `ProgressionStat` written |
| 7. Hint requested | `UISystem` → `Hint` lookup | `HintEvent` written |
| 8. Misconception detected | `ProgressionEngine` | `MisconceptionFlag` upserted |
| 9. Session close (timer / user exit) | `SessionEndScene` | `Session.endedAt`, `accuracy`, `avgResponseMs`, `scaffoldRecommendation` written |
| 10. Mastery recompute | `ProgressionEngine.checkMastery(studentId, levelNumber)` | `SkillMastery.state` flipped to `MASTERED` if criteria met |
| 11. Next-level recommendation | `MenuScene` reads updated `ProgressionStat` and `SkillMastery` | Student is auto-routed to L+1 (if advanced) or returns to MenuScene |

Per **C9 (sessions are short)**, step 9 fires after 10–15 minutes whether or not the level is mastered. A "completed session" requires only 5 attempts; full mastery typically takes 3–5 sessions across 2–3 days.

---

## 9. Threading and Concurrency

The MVP runs entirely on the main thread:

- Phaser's render loop (60 fps target)
- Validator calls (synchronous, < 1 ms each)
- Dexie writes (async, but `await`-ed off the input handler)
- BKT updates (synchronous, < 5 ms)

No Web Workers. No background sync. No deferred queues. The simplest concurrency model that supports the use case.

If profiling ever shows a Dexie write blocking a frame, the mitigation is to enqueue and write in the next event-loop tick — not to introduce a Worker. (Per `stack.md §6`.)

---

## 10. Failure Modes

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Dexie open fails (rare; quota / corrupt DB) | `BootScene` catch | Show "We couldn't load your progress" modal with "Restore from backup" CTA |
| Static seed fails (corrupt curriculum JSON) | Schema validation in `CurriculumLoader` | Refuse to boot; show error; user must reload (the bundled JSON is shipped, so this is an authoring-time bug) |
| Validator throws (defensive fallback) | Try/catch around validator call | Mark attempt as `outcome: "ABANDONED"`, log error, show generic "Try again" prompt |
| Phaser canvas fails to initialize | `main.ts` window error handler | Show static fallback HTML message (no game) |
| `navigator.storage.persist()` denied | Recorded in `DeviceMeta.preferences` | After 5 sessions, auto-prompt JSON backup (per `persistence-spec.md §9`) |

---

## 11. What This Document Does NOT Cover

- **Specific TypeScript file paths** for new modules (the layer names here suggest directories under `src/`, but the actual file tree is decided during implementation, not in this spec).
- **BKT formulas in math.** Lives in a future `src/progression/bkt.ts` doc / code comment.
- **Service-worker contents.** No-op for MVP per `persistence-spec.md §3.1`.
- **The 2029 sync worker.** Forward-compat hooks exist (`syncState`, `remoteId`); the actual worker is post-MVP.

---

## 12. Cross-References

- Stack chosen: `stack.md`
- Data shapes read/written: `data-schema.md`
- Durability + backup: `persistence-spec.md`
- Per-mechanic system contracts: `../20-mechanic/activity-archetypes.md`
- Universal input behavior: `../20-mechanic/interaction-model.md`
- Constraint authority: `../00-foundation/constraints.md` (C1, C2, C4, C5, C9)
