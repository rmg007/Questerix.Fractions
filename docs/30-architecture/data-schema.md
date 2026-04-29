---
title: Data Schema
status: draft
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
constraint_refs: [C1, C5]
related: [persistence-spec.md, ../10-curriculum/scope-and-sequence.md]
---

# Data Schema

Defines every entity stored or carried by the app. Two universes:

- **Static data** ships in the app bundle (the curriculum). Read-only at runtime, replaced wholesale on app update.
- **Dynamic data** is written at runtime (student progress). Persists across sessions, survives app updates, migrates with versioning.

Foreign keys are **strings** (slugs or UUIDs), never autoincrement integers. This makes records portable across devices and survivable across the eventual 2029 client→server boundary.

---

## 1. Entity Relationships

```
                    ┌──────────────────┐
                    │  CurriculumPack  │  (1 root, versioned)
                    └────────┬─────────┘
                             │ contains
        ┌────────────────────┼────────────────────────┐
        ▼                    ▼                        ▼
   ┌─────────┐         ┌──────────┐            ┌──────────────┐
   │Standard │         │  Skill   │            │Misconception │
   │ (CCSS)  │◄tagged─►│  (SK-*)  │◄diagnoses──│   (MC-*)     │
   └─────────┘         └────┬─────┘            └──────┬───────┘
                            │ targets                 │
                            ▼                         │
                    ┌────────────────┐                │
                    │   Activity     │                │
                    │ (slug-based)   │                │
                    └────────┬───────┘                │
                             │ has many               │
                             ▼                        │
                    ┌────────────────┐                │
                    │ ActivityLevel  │                │
                    │ (1-9 per app)  │                │
                    └────────┬───────┘                │
                             │ references             │
                             ▼                        │
                    ┌────────────────┐                │
                    │QuestionTemplate│ ◄──flagged─────┘
                    │ (typed payload)│
                    └────────┬───────┘
                             │ uses
                             ▼
                    ┌────────────────┐
                    │  FractionBank  │
                    │ (atomic frac)  │
                    └────────────────┘

═══════════════════════ runtime boundary ═══════════════════════

   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ Student │─1:N─►│ Session │─1:N─►│ Attempt │
   └────┬────┘      └────┬────┘      └────┬────┘
        │ 1:N            │ 1:N            │ 1:N
        ▼                ▼                ▼
   ┌────────────┐   ┌──────────┐   ┌──────────────┐
   │SkillMastery│   │HintEvent │   │MisconceptionFlag│
   │ (BKT state)│   │          │   │              │
   └────────────┘   └──────────┘   └──────────────┘
        │
        ▼
   ┌─────────────────┐    ┌────────────┐
   │ ProgressionStat │    │ DeviceMeta │
   └─────────────────┘    └────────────┘
```

---

## 2. Static Entities (ship in app bundle)

### 2.1 CurriculumPack

Top-level container. One pack per app release.

| Field            | Type                               | Purpose                                      |
| ---------------- | ---------------------------------- | -------------------------------------------- |
| `id`             | string                             | Pack slug, e.g. `"qx.fractions.k2"`          |
| `schemaVersion`  | number                             | Bumped on breaking shape change              |
| `contentVersion` | string                             | Semver of curriculum content, e.g. `"1.4.2"` |
| `gradeBand`      | `"K"` \| `"1"` \| `"2"` \| `"K-2"` | Targeted grade band                          |
| `publishedAt`    | string (ISO date)                  | When this pack was finalized                 |
| `locales`        | string[]                           | Supported locales, MVP ships `["en"]`        |

### 2.2 Standard

External standard reference (CCSS). Informational only — students never see this.

| Field        | Type                              | Purpose                |
| ------------ | --------------------------------- | ---------------------- |
| `id`         | string                            | E.g. `"CCSS.2.NF.2"`   |
| `framework`  | `"CCSS"` \| `"NCTM"` \| `"STATE"` | Source standard system |
| `code`       | string                            | Human-readable code    |
| `text`       | string                            | Standard description   |
| `gradeLevel` | `0 \| 1 \| 2`                     | Grade level (K=0)      |

### 2.3 Skill

A discrete fraction skill the student must develop. Tracked individually for mastery.

| Field           | Type                                 | Purpose                                              |
| --------------- | ------------------------------------ | ---------------------------------------------------- |
| `id`            | string                               | E.g. `"SK-03"`                                       |
| `name`          | string                               | Internal label, e.g. `"Same-denominator comparison"` |
| `description`   | string                               | Pedagogical purpose                                  |
| `gradeLevel`    | `0 \| 1 \| 2`                        | Earliest grade where skill is taught                 |
| `prerequisites` | string[]                             | Skill IDs that must precede                          |
| `standardIds`   | string[]                             | Standards this skill maps to                         |
| `bktParams`     | `{ pInit, pTransit, pSlip, pGuess }` | Bayesian Knowledge Tracing priors                    |

### 2.4 Activity

A self-contained game type (e.g. drag-to-snap, comparison battle, ordering tournament).

| Field        | Type                                | Purpose                                                                |
| ------------ | ----------------------------------- | ---------------------------------------------------------------------- |
| `id`         | string                              | Slug, e.g. `"magnitude_scales"`                                        |
| `title`      | string                              | Student-facing name                                                    |
| `gradeBand`  | (`"K"` \| `"1"` \| `"2"`)[]         | Grade(s) this activity addresses                                       |
| `levelGroup` | `"01-02"` \| `"03-05"` \| `"06-09"` | Which MVP level group                                                  |
| `skillIds`   | string[]                            | Skills this activity exercises                                         |
| `unlockRule` | UnlockRule \| null                  | Prerequisites; null = always unlocked                                  |
| `isCore`     | boolean                             | False for extension/optional activities                                |
| `archetype`  | `ArchetypeId`                       | Interaction type — one of the 10 canonical archetypes (audit §1.5 fix) |

### 2.5 ActivityLevel

A specific difficulty configuration within an activity. Each level has a distinct fraction pool, scaffolding, and advancement gate.

| Field                 | Type                                        | Purpose                                   |
| --------------------- | ------------------------------------------- | ----------------------------------------- |
| `id`                  | string                                      | E.g. `"magnitude_scales:L1"`              |
| `activityId`          | string                                      | Parent activity                           |
| `levelNumber`         | 1–9                                         | Maps to overall MVP level number          |
| `scaffoldLevel`       | 1–5                                         | 1 = max scaffolding, 5 = none             |
| `fractionPoolIds`     | string[]                                    | FractionBank refs available at this level |
| `questionTemplateIds` | string[]                                    | Template refs for this level              |
| `difficultyConfig`    | DifficultyConfig                            | Timer, hints, tolerance, problem count    |
| `advanceCriteria`     | `{ minAccuracy, minProblems, maxAvgHints }` | Mastery gate to unlock next level         |

### 2.6 FractionBank

Every fraction the app can ever show. Precomputed values for fast comparison.

| Field               | Type                                                                                    | Purpose                           |
| ------------------- | --------------------------------------------------------------------------------------- | --------------------------------- |
| `id`                | string                                                                                  | E.g. `"frac:3/4"`                 |
| `numerator`         | number                                                                                  | Top                               |
| `denominator`       | number                                                                                  | Bottom                            |
| `decimalValue`      | number                                                                                  | Precomputed for sort/distance ops |
| `benchmark`         | `"zero"` \| `"almost_zero"` \| `"almost_half"` \| `"half"` \| `"almost_one"` \| `"one"` | Closest benchmark category        |
| `denominatorFamily` | `"halves"` \| `"thirds"` \| `"fourths"` \| `"sixths"` \| `"eighths"`                    | Used by C8 progression rules      |
| `visualAssets`      | `{ barUrl, circleUrl, setUrl }`                                                         | Pre-rendered visual assets if any |

### 2.7 QuestionTemplate

A single question definition. The `payload` shape varies by `archetype`.

> **Note (audit §1.5 fix):** Earlier drafts split the interaction type into two separate fields — `Activity.mechanic` and `QuestionTemplate.type` (also called `QuestionType`). They are now one field: `archetype: ArchetypeId`. The canonical 10 values are: `partition` | `identify` | `label` | `make` | `compare` | `benchmark` | `order` | `snap_match` | `equal_or_not` | `placement`.

| Field                | Type                               | Purpose                                             |
| -------------------- | ---------------------------------- | --------------------------------------------------- |
| `id`                 | string                             | E.g. `"q:ms:L1:0001"`                               |
| `archetype`          | `ArchetypeId`                      | One of the 10 canonical archetypes (see note above) |
| `prompt`             | `{ text, ttsKey, localeStrings? }` | Display text + TTS key                              |
| `payload`            | union of typed payloads            | Question-type-specific data                         |
| `correctAnswer`      | unknown                            | Shape varies by type                                |
| `validatorId`        | string                             | References a code-side validator function           |
| `skillIds`           | string[]                           | Skills this question exercises                      |
| `misconceptionTraps` | string[]                           | Misconception IDs detectable from this question     |
| `difficultyTier`     | `"easy"` \| `"medium"` \| `"hard"` | Within-level difficulty band                        |

### 2.8 Misconception

Common student errors. Used to flag learning gaps and route to remediation.

| Field                     | Type                   | Purpose                                       |
| ------------------------- | ---------------------- | --------------------------------------------- |
| `id`                      | string                 | E.g. `"MC-01"` (whole-number bias)            |
| `name`                    | string                 | Short label                                   |
| `description`             | string                 | What this misconception looks like            |
| `detectionPattern`        | `{ signalType, rule }` | How the app detects it from attempts          |
| `interventionActivityIds` | string[]               | Suggested remediation activities              |
| `gradeLevel`              | (`0 \| 1 \| 2`)[]      | Grade(s) where this misconception is observed |

### 2.9 Hint

Pre-defined hints for question templates. Escalating support when student struggles.

| Field                | Type                                                   | Purpose                                                                                                |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `id`                 | string                                                 | E.g. `"hint:ms:0042:1"`                                                                                |
| `questionTemplateId` | string                                                 | Parent question                                                                                        |
| `type`               | `"verbal"` \| `"visual_overlay"` \| `"worked_example"` | Hint modality — maps 1:1 to the 3-tier escalation ladder in `interaction-model.md §4` (audit §2.1 fix) |
| `order`              | 1–3                                                    | Escalation tier                                                                                        |
| `content`            | `{ text?, assetUrl?, ttsKey? }`                        | What to show                                                                                           |
| `pointCost`          | number                                                 | Score deduction when used                                                                              |

---

## 3. Dynamic Entities (written at runtime)

Every dynamic entity carries a `syncState: "local" | "queued" | "synced"` field, even though the only legal value during MVP is `"local"`. The field exists so the 2029 sync worker has nothing to migrate — it just flips states.

### 3.1 Student

| Field          | Type                   | Purpose                             |
| -------------- | ---------------------- | ----------------------------------- |
| `id`           | string                 | UUIDv4, generated client-side       |
| `displayName`  | string                 | Self-set or default                 |
| `avatarConfig` | Record<string, string> | Visual customization                |
| `gradeLevel`   | `0 \| 1 \| 2`          | Self-reported or inferred           |
| `createdAt`    | number (epoch ms)      | Profile creation timestamp          |
| `lastActiveAt` | number (epoch ms)      | Last session start                  |
| `localOnly`    | boolean                | Always `true` during MVP            |
| `remoteId?`    | string                 | Populated post-2029 if cloud-synced |

### 3.2 Session

A continuous play period for one activity at one level.

| Field                    | Type                                           | Purpose                                                                                                              |
| ------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `id`                     | string                                         | UUID, prefixed with activityId for debugging                                                                         |
| `studentId`              | string                                         | Player                                                                                                               |
| `activityId`             | string                                         | Activity slug                                                                                                        |
| `levelNumber`            | 1–9                                            | Level played                                                                                                         |
| `scaffoldLevel`          | 1–5                                            | Scaffolding active during session                                                                                    |
| `startedAt`              | number                                         | Session start                                                                                                        |
| `endedAt?`               | number                                         | null while in progress                                                                                               |
| `totalAttempts`          | number                                         | Denormalized count                                                                                                   |
| `correctAttempts`        | number                                         | Denormalized count                                                                                                   |
| `accuracy`               | number \| null                                 | Computed at session close                                                                                            |
| `avgResponseMs`          | number \| null                                 | Computed at session close                                                                                            |
| `xpEarned`               | number                                         | Score for the session                                                                                                |
| `scaffoldRecommendation` | `"advance"` \| `"stay"` \| `"regress"` \| null | Engine recommendation for next session                                                                               |
| `endLevel`               | integer                                        | The highest level reached during this session (may differ from startLevel if the engine auto-routed). (audit §5 fix) |
| `device`                 | `{ type, viewport }`                           | Device profile                                                                                                       |
| `syncState`              | SyncState                                      | Always `"local"` in MVP                                                                                              |

### 3.3 Attempt

One student answer to one question instance. Append-only.

| Field                     | Type                                                                 | Purpose                                |
| ------------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| `id`                      | string                                                               | UUID                                   |
| `sessionId`               | string                                                               | Parent session                         |
| `studentId`               | string                                                               | Player (denormalized for fast queries) |
| `questionTemplateId`      | string                                                               | Question shown                         |
| `roundNumber`             | number                                                               | Round index within session             |
| `attemptNumber`           | 1–4                                                                  | Retry index for this question          |
| `startedAt`               | number                                                               | When question shown                    |
| `submittedAt`             | number                                                               | When answer submitted                  |
| `responseMs`              | number                                                               | Computed time-to-answer                |
| `studentAnswerRaw`        | unknown                                                              | Mirrors payload type                   |
| `correctAnswerRaw`        | unknown                                                              | Snapshot for replay                    |
| `outcome`                 | `"EXACT"` \| `"CLOSE"` \| `"WRONG"` \| `"ASSISTED"` \| `"ABANDONED"` | Result                                 |
| `errorMagnitude`          | number \| null                                                       | E.g., placement off by 0.125           |
| `pointsEarned`            | number                                                               | Score awarded                          |
| `hintsUsedIds`            | string[]                                                             | HintEvent refs                         |
| `flaggedMisconceptionIds` | string[]                                                             | Misconceptions detected                |
| `syncState`               | SyncState                                                            | Always `"local"` in MVP                |

### 3.4 HintEvent

Records when a student requests/accepts a hint.

| Field               | Type    | Purpose                      |
| ------------------- | ------- | ---------------------------- |
| `id`                | string  | UUID                         |
| `attemptId`         | string  | Parent attempt               |
| `hintId`            | string  | Hint shown                   |
| `shownAt`           | number  | When displayed               |
| `acceptedByStudent` | boolean | Whether student kept it open |
| `pointCostApplied`  | number  | Penalty applied              |

### 3.5 MisconceptionFlag

A confirmed misconception observed across multiple attempts.

| Field                | Type           | Purpose                            |
| -------------------- | -------------- | ---------------------------------- |
| `id`                 | string         | UUID                               |
| `studentId`          | string         | Player                             |
| `misconceptionId`    | string         | Type of misconception              |
| `firstObservedAt`    | number         | First detection timestamp          |
| `lastObservedAt`     | number         | Most recent detection              |
| `observationCount`   | number         | How many times observed            |
| `resolvedAt`         | number \| null | null = active, set when remediated |
| `evidenceAttemptIds` | string[]       | Last N supporting attempts         |

### 3.6 SkillMastery

One row per `(studentId, skillId)`. Tracks BKT mastery state.

| Field                          | Type                                                                              | Purpose                                   |
| ------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------- |
| `studentId`                    | string                                                                            | Player                                    |
| `skillId`                      | string                                                                            | Skill being tracked                       |
| `masteryEstimate`              | number (0.0–1.0)                                                                  | BKT posterior                             |
| `state`                        | `"NOT_STARTED"` \| `"LEARNING"` \| `"APPROACHING"` \| `"MASTERED"` \| `"DECAYED"` | Discrete state machine                    |
| `consecutiveCorrectUnassisted` | number                                                                            | Streak without hints                      |
| `totalAttempts`                | number                                                                            | Lifetime count                            |
| `correctAttempts`              | number                                                                            | Lifetime count                            |
| `lastAttemptAt`                | number                                                                            | Most recent attempt                       |
| `masteredAt`                   | number \| null                                                                    | When mastery first reached                |
| `decayedAt`                    | number \| null                                                                    | When mastery dropped (no recent practice) |

### 3.7 ProgressionStat

One row per `(studentId, activityId)`. Tracks where in the level ladder the student is.

| Field                      | Type   | Purpose                                                  |
| -------------------------- | ------ | -------------------------------------------------------- |
| `studentId`                | string | Player                                                   |
| `activityId`               | string | Activity                                                 |
| `currentLevel`             | number | Level student is on                                      |
| `highestLevelReached`      | number | Furthest the student got                                 |
| `sessionsAtCurrentLevel`   | number | Repetition count                                         |
| `totalSessions`            | number | Lifetime session count                                   |
| `totalXp`                  | number | Lifetime score                                           |
| `lastSessionAt`            | number | Most recent session                                      |
| `consecutiveRegressEvents` | number | How many times engine has regressed (signal of struggle) |

### 3.8 DeviceMeta

Singleton per device. App-wide settings + sync metadata.

| Field              | Type                                                                                           | Purpose                                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `installId`        | string                                                                                         | UUID per install                                                                                                                                                    |
| `schemaVersion`    | number                                                                                         | Current DB schema version on this device                                                                                                                            |
| `contentVersion`   | string                                                                                         | Currently loaded curriculum pack                                                                                                                                    |
| `preferences`      | `{ audio, reduceMotion, highContrast, ttsLocale, largeTouchTargets, persistGranted: boolean }` | User settings; `persistGranted` records whether IndexedDB persistence was granted via `navigator.storage.persist()` (see `persistence-spec.md §3.2`) (audit §5 fix) |
| `lastBackupAt`     | number \| null                                                                                 | Most recent JSON export                                                                                                                                             |
| `lastRestoredAt`   | number \| null                                                                                 | Timestamp set when `restoreFromFile` completes successfully; null if never restored (see `persistence-spec.md §6`) (audit §5 fix)                                   |
| `pendingSyncCount` | number                                                                                         | Always 0 during MVP                                                                                                                                                 |

> **EXCEPTION TO C5:** `lastUsedStudentId` (a non-sensitive UI hint) is stored in localStorage rather than IndexedDB to survive Dexie initialization races. See `constraints.md C5 (note 1)` for the full carve-out. (audit §5 fix)

---

## 4. Concrete Example: Maya completes one attempt

**Scenario:** Maya picks up the `1/2` card on Magnitude Scales Level 1, drops it at decimal 0.625 (wrong), retries and lands on 0.5 (exact). No hints used.

**Records written:**

```json
// Session opened
{
  "id": "sess_ms_2026-04-23T14:02_8a3f",
  "studentId": "stu_8a3f",
  "activityId": "magnitude_scales",
  "levelNumber": 1,
  "scaffoldLevel": 1,
  "startedAt": 1714053720000,
  "endedAt": null,
  "totalAttempts": 0,
  "correctAttempts": 0,
  "syncState": "local"
}

// Attempt 1: WRONG
{
  "id": "att_01HW...",
  "sessionId": "sess_ms_2026-04-23T14:02_8a3f",
  "questionTemplateId": "q:ms:L1:0001",
  "roundNumber": 1,
  "attemptNumber": 1,
  "studentAnswerRaw": { "placedDecimal": 0.625, "snapPositionX": 610 },
  "correctAnswerRaw": 0.5,
  "outcome": "WRONG",
  "errorMagnitude": 0.125,
  "responseMs": 6200,
  "pointsEarned": 0,
  "hintsUsedIds": [],
  "syncState": "local"
}

// Attempt 2: EXACT
{
  "id": "att_01HX...",
  "sessionId": "sess_ms_2026-04-23T14:02_8a3f",
  "questionTemplateId": "q:ms:L1:0001",
  "roundNumber": 1,
  "attemptNumber": 2,
  "studentAnswerRaw": { "placedDecimal": 0.5, "snapPositionX": 500 },
  "correctAnswerRaw": 0.5,
  "outcome": "EXACT",
  "errorMagnitude": 0.0,
  "responseMs": 3400,
  "pointsEarned": 60,
  "syncState": "local"
}

// SkillMastery upserts (BKT recomputed)
{ "studentId": "stu_8a3f", "skillId": "SK-02", "masteryEstimate": 0.34, "state": "LEARNING", ... }

// ProgressionStat updated
{ "studentId": "stu_8a3f", "activityId": "magnitude_scales", "currentLevel": 1, "totalSessions": 1, "totalXp": 60, ... }
```

---

## 5. Versioning Strategy

1. **Single source of truth: `schemaVersion`**, set on `CurriculumPack` and `DeviceMeta`. Bumped only on breaking shape changes.
2. **Migration registry** (TypeScript code, not data): `migrations/{from}_to_{to}.ts` exports a pure function `(oldDb) => newDb`. App boot runs all interim migrations sequentially in one `IndexedDB versionchange` transaction.
3. **Additive over breaking.** New fields are optional with defaults. Renames are double-write for one release, then read-only-fallback for one more, then removed.
4. **Static is replaceable, dynamic is sacred.** Static stores can be torn down and re-seeded when `contentVersion` changes; dynamic stores migrate in place. Foreign keys from dynamic→static are slug-based, so renumbering levels does not orphan history.
5. **2029 backend forward-compat.** `syncState` and optional `remoteId` exist on every dynamic entity from day 1. The 2029 sync worker reads `syncState === "local"` records, POSTs them, and flips state to `"synced"`. No shape transformation required.

---

## 6. IndexedDB Object Store Mapping

One Dexie table per entity. Indexes only on fields needed for runtime queries.

| Store                | Primary Key              | Indexes                                             |
| -------------------- | ------------------------ | --------------------------------------------------- |
| `curriculumPacks`    | `id`                     | —                                                   |
| `standards`          | `id`                     | —                                                   |
| `skills`             | `id`                     | `gradeLevel`                                        |
| `activities`         | `id`                     | `levelGroup`, `archetype`                           |
| `activityLevels`     | `id`                     | `activityId+levelNumber`                            |
| `fractionBank`       | `id`                     | `denominatorFamily`, `benchmark`                    |
| `questionTemplates`  | `id`                     | `archetype`, `[skillIds*+difficultyTier]`           |
| `misconceptions`     | `id`                     | —                                                   |
| `hints`              | `id`                     | `questionTemplateId+order`                          |
| `students`           | `id`                     | `lastActiveAt`                                      |
| `sessions`           | `id`                     | `studentId+startedAt`, `activityId+startedAt`       |
| `attempts`           | `id`                     | `sessionId`, `studentId+submittedAt`, `[skillIds*]` |
| `hintEvents`         | `id`                     | `attemptId`                                         |
| `misconceptionFlags` | `id`                     | `studentId+misconceptionId`, `studentId+resolvedAt` |
| `skillMastery`       | `[studentId+skillId]`    | `studentId+state`                                   |
| `progressionStat`    | `[studentId+activityId]` | `studentId+lastSessionAt`                           |
| `deviceMeta`         | `installId`              | — (singleton)                                       |

Detailed Dexie schema declarations live in `persistence-spec.md`.
