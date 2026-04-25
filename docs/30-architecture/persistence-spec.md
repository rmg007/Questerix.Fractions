---
title: Persistence Spec
status: draft
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
constraint_refs: [C1, C5, C7]
related: [data-schema.md, ../00-foundation/constraints.md]
---

# Persistence Spec

How data is stored on the device. Defines the storage stack, durability strategy, and backup mechanism. Does **not** repeat what's in `data-schema.md` — this is the *how*, that is the *what*.

---

## 1. The Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **API surface** | Dexie.js (v4) | Fluent typed queries, declarative migrations, ~22 KB gzipped |
| **Storage backend** | IndexedDB (browser-native) | 50+ MB capacity, structured records, async, universally supported |
| **Persistence guarantee** | Installable PWA + `navigator.storage.persist()` | Survives Safari ITP 7-day eviction |
| **Backup format** | JSON export to file (Dexie export-import addon) | User-controlled disaster recovery |
| **What we don't use** | localStorage, sessionStorage, OPFS, SQLite WASM, PGLite | See rejected alternatives below |

---

## 2. Why Not Other Options

| Rejected | Reason |
|----------|--------|
| **localStorage** | 5 MB cap, strings only, no transactions, evicted by iOS Safari ITP after 7 days unused. Cannot hold our schema. |
| **OPFS (Origin Private File System) raw** | Would force us to reinvent indexing/queries. Useful only as a SQLite VFS backend. |
| **SQLite WASM (wa-sqlite, sql.js, official)** | 400 KB–1 MB bundle for capabilities (joins, window functions) we do not need. Sync access handles require Worker context, complicating Phaser main-thread integration. |
| **PGLite (Postgres in WASM)** | ~3 MB bundle. Massive overkill for single-user offline. Reconsider if 2029 brings advanced offline analytics. |
| **Raw IndexedDB** | Callback soup, transaction auto-close on awaited non-IDB promises, manual migrations. Too painful in TypeScript. |

The 22 KB Dexie.js cost is trivial against a Phaser 4 bundle (~900 KB) and buys typed queries, migrations, and excellent debugging.

---

## 3. The iOS Safari ITP Problem

Apple's Intelligent Tracking Prevention (ITP) **evicts IndexedDB stores after 7 days of non-use** unless the site is installed as a PWA *and* has been granted persistent storage.

Realistic scenario without mitigation:
- Day 0: Maya plays for 15 minutes, Dexie writes session data
- Day 1–7: Maya doesn't open the app (school break, weekend stretches)
- Day 8: Maya reopens — all her progress is gone

This is a known WebKit behavior, not a Dexie limitation. Mitigation has two parts:

### 3.1 Install as PWA

The app must be installable to the home screen. This requires:

- A valid Web App Manifest (`manifest.webmanifest` referenced from `index.html`)
- Manifest fields: `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color`, `background_color`, `icons[]` with at least 192px and 512px PNGs
- HTTPS in production (free via Vercel/Netlify/Cloudflare)
- A service worker registered (can be minimal — even a no-op service worker satisfies the install prompt requirement on iOS)

When iOS users tap "Add to Home Screen" from Safari's Share menu, the app becomes installed. ITP eviction rules relax for installed PWAs.

### 3.2 Request Persistent Storage

On first session, after the user has shown intent to keep using the app (e.g., completed first level), the app calls:

```ts
if (navigator.storage && navigator.storage.persist) {
  const granted = await navigator.storage.persist();
  // granted: boolean — record in DeviceMeta.preferences
}
```

When granted, the browser commits to not evicting our storage automatically. Browsers vary in when they grant: Chrome grants based on engagement signals, Safari requires the install + interaction combo, Firefox prompts the user.

### 3.3 Backup as a Safety Net

Even with PWA + persist(), data can still be lost:
- User uninstalls the PWA
- User clears site data manually
- OS storage pressure forces eviction in extreme cases
- Device is replaced (phone upgrade, lost device)

The mitigation is a user-controlled JSON export. See §6.

---

## 4. Dexie Schema Declaration (sketch)

This is a *spec sketch*, not the source code. The actual TypeScript implementation lives in `src/persistence/db.ts` (to be written, not now).

```ts
import Dexie, { Table } from 'dexie';
// Type imports come from the schema in data-schema.md

class QuesterixDB extends Dexie {
  // Static stores (curriculum, replaced on contentVersion bump)
  curriculumPacks!: Table<CurriculumPack, string>;
  standards!: Table<Standard, string>;
  skills!: Table<Skill, string>;
  activities!: Table<Activity, string>;
  activityLevels!: Table<ActivityLevel, string>;
  fractionBank!: Table<FractionBankItem, string>;
  questionTemplates!: Table<QuestionTemplate, string>;
  misconceptions!: Table<Misconception, string>;
  hints!: Table<Hint, string>;

  // Dynamic stores (student progress, persists across content updates)
  students!: Table<Student, string>;
  sessions!: Table<Session, string>;
  attempts!: Table<Attempt, string>;
  hintEvents!: Table<HintEvent, string>;
  misconceptionFlags!: Table<MisconceptionFlag, string>;
  skillMastery!: Table<SkillMastery, [string, string]>;
  progressionStat!: Table<ProgressionStat, [string, string]>;
  deviceMeta!: Table<DeviceMeta, string>;

  constructor() {
    super('questerix-fractions');

    // Schema version 1 — initial release
    this.version(1).stores({
      curriculumPacks: 'id',
      standards: 'id',
      skills: 'id, gradeLevel',
      activities: 'id, levelGroup, mechanic',
      activityLevels: 'id, [activityId+levelNumber]',
      fractionBank: 'id, denominatorFamily, benchmark',
      questionTemplates: 'id, type, *skillIds',
      misconceptions: 'id',
      hints: 'id, [questionTemplateId+order]',
      students: 'id, lastActiveAt',
      sessions: 'id, [studentId+startedAt], [activityId+startedAt]',
      attempts: 'id, sessionId, [studentId+submittedAt], *flaggedMisconceptionIds',
      hintEvents: 'id, attemptId',
      misconceptionFlags: 'id, [studentId+misconceptionId], [studentId+resolvedAt]',
      skillMastery: '[studentId+skillId], [studentId+state]',
      progressionStat: '[studentId+activityId], [studentId+lastSessionAt]',
      deviceMeta: 'installId',
    });

    // Future versions: this.version(2).stores({ ... }).upgrade(tx => { ... });
  }
}

export const db = new QuesterixDB();
```

Index syntax notes:
- `*field` = multiEntry index for array fields
- `[a+b]` = compound index
- First field is the primary key

---

## 5. Bootstrap Sequence

On every app load:

1. **Open Dexie connection.** Schema migrations run automatically inside the `versionchange` transaction.
2. **Read `deviceMeta`.** If absent (first launch), create a singleton with `installId = uuidv4()` and current `schemaVersion` / `contentVersion`.
3. **Compare `deviceMeta.contentVersion` to `APP_CONTENT_VERSION`** baked into the build. If they differ, **wipe static stores and re-seed** from the bundled curriculum JSON.
4. **Static seed.** Load `assets/curriculum/v{n}.json` (a single bundled file containing all static entities), `bulkPut` into each static store inside one transaction.
5. **Request persistent storage** (if not previously granted) once the user shows engagement (first attempt submitted).
6. **Resume student session** — read most-recent `Student` and route to last activity/level.

Static seed cost: ~250 ms for a curriculum pack of ~2 MB JSON on a 2020-era phone. Acceptable for a one-time-per-update operation.

---

## 6. Backup and Restore (User-Controlled)

The app surfaces a "Backup my progress" button that uses `dexie-export-import`:

```ts
import { exportDB, importDB } from 'dexie-export-import';

async function backupToFile(): Promise<void> {
  const blob = await exportDB(db, { prettyJson: false });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `questerix-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  await db.deviceMeta.update(installId, { lastBackupAt: Date.now() });
}

async function restoreFromFile(file: File): Promise<void> {
  await importDB(file, { overwriteValues: true });
  // Bump lastRestoredAt on DeviceMeta so the app knows a restore occurred (audit §5 fix)
  const meta = await db.deviceMeta.toCollection().first();
  if (meta) {
    await db.deviceMeta.update(meta.installId, { lastRestoredAt: Date.now() });
  }
}
```

Restore strategy: when a user re-imports a backup, we do **not** merge with existing local data. We **replace**. The UI must make this clear ("This will overwrite your current progress"). Merge is a 2029 problem when sync exists.

The export only includes dynamic stores by default (configurable). Static curriculum is regenerated from the app build.

---

## 7. Storage Budget

Realistic per-user storage after 6 months of active use:

| Store | Records | Per-record bytes | Total |
|-------|---------|------------------|-------|
| Static curriculum (one copy) | ~2,500 | ~600 | ~1.5 MB |
| `students` | 1–3 | ~500 | <2 KB |
| `sessions` | ~150 | ~600 | ~90 KB |
| `attempts` | ~3,000 | ~700 | ~2 MB |
| `hintEvents` | ~500 | ~200 | ~100 KB |
| `misconceptionFlags` | ~30 | ~400 | ~12 KB |
| `skillMastery` | ~50 | ~300 | ~15 KB |
| `progressionStat` | ~10 | ~300 | ~3 KB |
| **Total** | | | **~3.7 MB** |

Well within IndexedDB's 50 MB+ default quota on every supported browser. No archival/pruning logic required for MVP.

---

## 8. What We Will NOT Build (MVP)

- **Sync to a server.** Out of scope per C1. The `syncState` field exists in the schema but only `"local"` is ever set during MVP.
- **Conflict resolution.** Single device per student during MVP. Multi-device merge is post-2029.
- **Encryption at rest.** IndexedDB is sandboxed per-origin. No account secrets stored. Phase 1 PII is just a display name. Encrypting student data on a single shared family device adds complexity without proportional benefit. Reconsider when accounts and identifying info are added in 2029.
- **Compression.** JSON entities under ~700 bytes don't benefit from compression. If storage budget grows past 10 MB, revisit with `lz-string`.
- **Background sync.** No service worker sync, no background fetch.

---

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| iOS Safari evicts IndexedDB before user installs PWA | Medium | High (lose progress) | Surface install prompt on Day 1; don't treat first session as durable |
| User declines `persist()` request | Low | High | Auto-prompt JSON backup after 5 sessions if persist not granted |
| Schema migration corrupts data | Low | Critical | All migrations run in `versionchange` transaction; tested with snapshot fixtures before each release |
| Quota exceeded (very heavy user) | Very Low | Medium | Surface storage estimate via `navigator.storage.estimate()` in settings; offer "clear old sessions" option |
| User clears browser data | Medium | High | Backup button; in-app "Last backup was X days ago" reminder if >30 days |

---

## 10. 2029 Migration Forward-Compat

When the backend exists:

1. A `SyncWorker` reads dynamic store records where `syncState === "local"` in batches of 50
2. POSTs them to the matching PostgreSQL table; the schema mirrors the Dexie shape 1:1 (slug PKs become natural keys)
3. On 200 OK, flips `syncState` to `"synced"`
4. On conflict (record changed server-side), applies last-write-wins (timestamp comparison) — full conflict resolution defined in 2029-era spec

No record shape changes. No breaking re-encoding. The `syncState` field being on every dynamic record from day 1 is the entire forward-compat strategy.
