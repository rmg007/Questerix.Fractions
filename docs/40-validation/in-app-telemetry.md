---
title: In-App Telemetry
status: draft
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
constraint_refs: [C1, C2, C5, C10]
related:
  [
    playtest-protocol.md,
    learning-hypotheses.md,
    ../30-architecture/data-schema.md,
    ../30-architecture/persistence-spec.md,
  ]
---

# In-App Telemetry

What the app records during a playtest session, and how that data is exported for analysis.

The MVP records **everything client-side**. Per **C1** there is no backend; per **C2** there is no teacher dashboard; per **C5** important data is in IndexedDB. Telemetry is "ambient" — the same writes the app would do anyway during normal play, exported via a single button.

---

## 1. Design Principles

1. **Reuse the data schema.** No telemetry-specific tables. We export the same `Session`, `Attempt`, `HintEvent`, `MisconceptionFlag`, `SkillMastery`, and `ProgressionStat` records the app already writes for normal gameplay (see `30-architecture/data-schema.md`).
2. **Append-only.** Records are never edited or deleted. A wrong answer is preserved; a retry creates a new record.
3. **No remote logging.** Per C1, nothing is `fetch`-ed to a server. The export is a manual, button-triggered JSON download, kept by the observer.
4. **No PII.** Display name only. No email, no school, no real name, no birthday.
5. **Consent-gated.** The "Backup My Progress" / "Export for Playtest" buttons are visible at all times. Nothing about telemetry is hidden.

---

## 2. What Gets Recorded

The same writes the runtime engine does normally. Reproduced here from `data-schema.md` with the playtest lens applied.

### 2.1 Session — One row per session

| Field                                          | Playtest use                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `id`                                           | Join key for attempts                                                         |
| `studentId`                                    | Pseudonym-based UUID                                                          |
| `activityId`                                   | Which activity slug                                                           |
| `levelNumber`                                  | Which MVP level                                                               |
| `scaffoldLevel`                                | Hint and snap settings during this session                                    |
| `startedAt`                                    | Session start timestamp                                                       |
| `endedAt`                                      | Session end timestamp (null while active)                                     |
| `totalAttempts`, `correctAttempts`, `accuracy` | Denormalized session aggregates                                               |
| `avgResponseMs`                                | Response time signal                                                          |
| `xpEarned`                                     | Score; not directly used in analysis                                          |
| `scaffoldRecommendation`                       | Engine's advance/stay/regress signal                                          |
| `endLevel`                                     | Level at session close (may differ from start if engine advanced mid-session) |
| `device.type`, `device.viewport`               | iPad vs. Chromebook split for analysis                                        |
| `syncState`                                    | Always `"local"` per C1                                                       |

### 2.2 Attempt — One row per student answer (append-only)

| Field                                    | Playtest use                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `id`                                     | Unique attempt key                                                                   |
| `sessionId`                              | Which session                                                                        |
| `questionTemplateId`                     | Which question                                                                       |
| `roundNumber`, `attemptNumber`           | Retry tracking                                                                       |
| `startedAt`, `submittedAt`, `responseMs` | Timing analysis (e.g., long pauses)                                                  |
| `studentAnswerRaw`                       | What the student actually did (placement coords, partition lines, comparison choice) |
| `correctAnswerRaw`                       | Snapshot of expected answer                                                          |
| `outcome`                                | EXACT / CLOSE / WRONG / ASSISTED / ABANDONED                                         |
| `errorMagnitude`                         | Numeric error (e.g., placement off by 0.125)                                         |
| `pointsEarned`                           | Score awarded                                                                        |
| `hintsUsedIds`                           | Which hints were shown for this attempt                                              |
| `flaggedMisconceptionIds`                | Misconceptions detected from this attempt                                            |
| `syncState`                              | Always `"local"`                                                                     |

### 2.3 HintEvent — One row per hint shown

| Field               | Playtest use                                            |
| ------------------- | ------------------------------------------------------- |
| `id`                | Unique key                                              |
| `attemptId`         | Which attempt requested the hint                        |
| `hintId`            | Which hint shown                                        |
| `shownAt`           | Timestamp                                               |
| `acceptedByStudent` | Did the student keep the hint open or dismiss instantly |
| `pointCostApplied`  | Score deduction                                         |

Hint patterns are central to H-07 (hint reduction over sessions).

### 2.4 MisconceptionFlag — One row per detected pattern

| Field                               | Playtest use                                  |
| ----------------------------------- | --------------------------------------------- |
| `studentId`, `misconceptionId`      | Which student showed which misconception      |
| `firstObservedAt`, `lastObservedAt` | Time bounds                                   |
| `observationCount`                  | How many times confirmed                      |
| `resolvedAt`                        | When (if ever) the student passed remediation |
| `evidenceAttemptIds`                | The attempts that triggered detection         |

Central to H-05 (no negative interaction).

### 2.5 SkillMastery — One row per (student, skill)

| Field                                                              | Playtest use                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------- |
| `masteryEstimate`                                                  | BKT posterior 0–1                                         |
| `state`                                                            | NOT_STARTED / LEARNING / APPROACHING / MASTERED / DECAYED |
| `consecutiveCorrectUnassisted`, `totalAttempts`, `correctAttempts` | Practice volume                                           |
| `lastAttemptAt`, `masteredAt`, `decayedAt`                         | Time bounds                                               |

Central to H-06 (mastery state predicts paper performance).

### 2.6 ProgressionStat — One row per (student, activity)

| Field                                     | Playtest use             |
| ----------------------------------------- | ------------------------ |
| `currentLevel`, `highestLevelReached`     | Where the student got to |
| `sessionsAtCurrentLevel`, `totalSessions` | Repetition signal        |
| `consecutiveRegressEvents`                | Struggle signal          |
| `totalXp`                                 | Score                    |

### 2.7 DeviceMeta — Singleton per device

Captures `installId`, `schemaVersion`, `contentVersion`, and user `preferences`. Used to confirm all playtesters are on the same content version when comparing.

---

## 3. What Is NOT Recorded

Explicitly out of scope for the MVP:

| Not recorded                                                        | Why                                                            |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| Mouse/touch position over time (continuous)                         | Privacy; not needed for hypotheses; would 100x the data volume |
| Mouse/touch movement traces between events                          | Same                                                           |
| Screen recording / video                                            | Privacy; consent-gated audio/video is OUT OF SCOPE for MVP     |
| Audio recording                                                     | Same                                                           |
| Webcam / facial expression                                          | Same                                                           |
| Keystroke timing                                                    | Privacy and not relevant for K–2 (very little keyboard input)  |
| Scroll position / viewport movements                                | Not relevant to fraction tasks                                 |
| Real name, email, school, district, class code                      | C2 — no admin / teacher / parent surface                       |
| IP address / geolocation                                            | C1 — no backend, no server log                                 |
| OS / browser / device fingerprint beyond `device.type` and viewport | Not relevant                                                   |
| External activity (other tabs, other apps)                          | Privacy; impossible from a sandboxed web app anyway            |

If a future research collaboration wants any of these, that requires a formal IRB process and a different consent form. **Out of scope for the MVP playtest.**

---

## 4. Mapping Hypotheses to Telemetry

| Hypothesis                     | Primary telemetry source                                                      | Aggregation                                  |
| ------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------- |
| H-01 (identification teaches)  | `Attempt` filtered by `activityId in [identify_*]`                            | Accuracy by session, by skill                |
| H-02 (partitioning teaches)    | `Attempt` filtered by `activityId in [partition_*]`                           | Accuracy + median errorMagnitude per session |
| H-03 (comparison transfers)    | `Attempt` filtered by `activityId in [compare_*, ordering_*, benchmark_sort]` | Tier-3 accuracy by session                   |
| H-04 (retention across days)   | `Attempt` grouped by `(studentId, skillId, day)`                              | Day-end accuracy vs. next-day-start accuracy |
| H-05 (no negative interaction) | `MisconceptionFlag.firstObservedAt` after Session 1                           | Count of new flags per student               |
| H-06 (mastery predicts paper)  | `SkillMastery.state` at end of Session 3                                      | Cross-tabulated with paper-test scores       |
| H-07 (hint reduction)          | `HintEvent` per `Attempt` over time                                           | Hints/attempt at session 1 vs. session N     |

---

## 5. Export Format

### 5.1 The Backup Button

The app's settings screen has a single button: **"Backup My Progress"**. Clicking it:

1. Reads all dynamic-store records for the current `studentId`.
2. Serializes them to a single JSON object.
3. Triggers a browser download named `questerix-backup-<displayName>-<timestamp>.json`.

The same button is the playtest export. There is no separate "playtest export" button — keeping export single-purpose is intentional (privacy + simplicity).

### 5.2 JSON Shape

```jsonc
{
  "schemaVersion": 1,
  "contentVersion": "1.0.0",
  "exportedAt": 1714053720000,
  "student": {
    "id": "stu_8a3f-...",
    "displayName": "Maya",
    "gradeLevel": 1,
    "createdAt": 1713000000000,
    "lastActiveAt": 1714053720000,
  },
  "sessions": [
    /* Session records */
  ],
  "attempts": [
    /* Attempt records (append-only, all of them) */
  ],
  "hintEvents": [
    /* HintEvent records */
  ],
  "misconceptionFlags": [
    /* MisconceptionFlag records */
  ],
  "skillMastery": [
    /* SkillMastery records */
  ],
  "progressionStat": [
    /* ProgressionStat records */
  ],
  "deviceMeta": {
    /* DeviceMeta singleton */
  },
}
```

Static-content stores (`curriculumPacks`, `skills`, `activities`, etc.) are **not** included in the export — they are reproducible from the app bundle by `contentVersion`. Including them would 10x the file size for no benefit.

### 5.3 File Size Estimate

For a 3-session playtest:

- ~3 sessions × 25 attempts/session = 75 Attempt records.
- ~75 attempts × 1 HintEvent average = 75 HintEvent records (often fewer).
- ~10 SkillMastery rows.
- ~3 ProgressionStat rows.
- ~5 MisconceptionFlag rows (highly variable).

Estimated payload: **20–60 KB JSON per student**. Trivial to email or zip.

---

## 6. Privacy Posture

### 6.1 What Is Identifiable

- `displayName` — chosen by the child or parent. Should be a pseudonym during playtest (per `playtest-protocol.md §4.1`).
- `Student.id` — random UUID generated client-side. Not traceable to a person without the paper pseudonym map.
- `Attempt.studentAnswerRaw` — answers may sometimes contain free-text in future activities, but for the MVP all answers are numeric/coordinate/index, not text.

### 6.2 What Is Not Identifiable

Everything else is anonymous by construction. There is no email, no contact info, no IP address, no device fingerprint beyond viewport size and device type ("tablet" / "desktop" / "phone").

### 6.3 Storage on the Tester's Device

Data lives in IndexedDB until either:

- The user clicks **"Reset all my data"** (a separate button, also in settings).
- The OS evicts IndexedDB due to storage pressure (the app calls `navigator.storage.persist()` on first launch to reduce this risk per C5 + persistence-spec).

The app never auto-deletes data. The observer is responsible for clearing data after the playtest ends if the family asks for it.

### 6.4 Storage of Exports by the Observer

Exports are stored in `validation-data/<pseudonym>/` on the developer's own machine. The folder is **not** committed to git. A `.gitignore` rule excludes the entire `validation-data/` directory from the repo.

---

## 7. Telemetry Quality Checks

Before analysis, run a sanity script (`validation-data/scripts/check.py`, TBD) that verifies for each export:

1. `sessions.length` matches expected (3 for a complete cohort participant).
2. Every `Attempt.sessionId` resolves to a `Session.id` in the same file.
3. `Session.totalAttempts` matches the actual count of `Attempts` with matching `sessionId`.
4. `accuracy` is computed correctly: `correctAttempts / totalAttempts`.
5. No `Attempt.studentAnswerRaw === undefined` (a marker of a UI bug).
6. `contentVersion` matches across all sessions.

Failures here indicate a runtime bug worth fixing before more cohort data is collected.

---

## 8. Open Questions

1. **Anonymization beyond display name.** Should the export tool replace `displayName` with a generic placeholder before download? Probably yes for the next iteration; for MVP we trust the observer to rename the file.
2. **Multiple students per device.** If two siblings share a device, the app should prompt for `Student.id` switching. This affects `DeviceMeta.installId` semantics. Not blocking MVP.
3. **Schema migration during a playtest.** If `schemaVersion` changes mid-playtest (e.g., the app updates), the export from before the migration may need a one-time conversion. Mitigation: freeze the app binary during the playtest cycle.

---

## 9. Summary

| Question                                       | Answer                                            |
| ---------------------------------------------- | ------------------------------------------------- |
| Where does telemetry live?                     | IndexedDB on the tester's device.                 |
| How is it exported?                            | One button → JSON file download.                  |
| Is anything sent to a server?                  | No (C1).                                          |
| Is PII recorded?                               | Display name only.                                |
| Are mouse/screen/audio/video recorded?         | No.                                               |
| Is the data the same as runtime gameplay data? | Yes — telemetry is just the gameplay write log.   |
| What format is the export?                     | JSON with the entity types from `data-schema.md`. |
| What's the typical export size?                | 20–60 KB per student per 3-session playtest.      |

Last reviewed: 2026-04-24.
