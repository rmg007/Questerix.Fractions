/**
 * Dexie database declaration for Questerix Fractions.
 * per persistence-spec.md §4 (schema), §3.2 (persistence grant), §5 (bootstrap)
 */

import Dexie, { type Table } from 'dexie';
import type {
  Student,
  Session,
  Attempt,
  HintEvent,
  SkillMastery,
  DeviceMeta,
  Bookmark,
  SessionTelemetry,
  QuestionTemplate,
  CurriculumPack,
  StandardsItem,
  Skill,
  Activity,
  ActivityLevel,
  FractionBank,
  Misconception,
  HintTemplate,
  MisconceptionFlag,
  ProgressionStat,
  LevelProgression,
  StreakRecord,
  TelemetryEvent,
} from '../types';
import { observabilityMiddleware } from './middleware';

// ── DB class ───────────────────────────────────────────────────────────────

export class QuesterixDB extends Dexie {
  // Static stores (curriculum) — per persistence-spec.md §4
  curriculumPacks!: Table<CurriculumPack, string>;
  standards!: Table<StandardsItem, string>;
  skills!: Table<Skill, string>;
  activities!: Table<Activity, string>;
  activityLevels!: Table<ActivityLevel, string>;
  fractionBank!: Table<FractionBank, string>;
  questionTemplates!: Table<QuestionTemplate, string>;
  misconceptions!: Table<Misconception, string>;
  hints!: Table<HintTemplate, string>;

  // Dynamic stores (student progress) — per persistence-spec.md §4
  students!: Table<Student, string>;
  sessions!: Table<Session, string>;
  attempts!: Table<Attempt, number>;
  skillMastery!: Table<SkillMastery, [string, string]>;
  deviceMeta!: Table<DeviceMeta, string>;
  bookmarks!: Table<Bookmark, string>;
  sessionTelemetry!: Table<SessionTelemetry, string>;
  hintEvents!: Table<HintEvent, number>;
  misconceptionFlags!: Table<MisconceptionFlag, string>;
  progressionStat!: Table<ProgressionStat, [string, string]>;
  levelProgression!: Table<LevelProgression, string>;
  streakRecord!: Table<StreakRecord, string>;
  telemetryEvents!: Table<TelemetryEvent, number>;

  constructor() {
    super('questerix-fractions');

    // Schema version 1 — initial release. per persistence-spec.md §4
    this.version(1).stores({
      students: 'id, displayName, createdAt',
      sessions: 'id, studentId, startedAt, [studentId+startedAt]',
      attempts:
        '++id, sessionId, studentId, questionTemplateId, submittedAt, [studentId+submittedAt], [studentId+questionTemplateId]',
      skillMastery: '[studentId+skillId], studentId, skillId, lastAttemptAt',
      deviceMeta: '&installId',
      bookmarks: 'id, studentId',
      sessionTelemetry: 'sessionId, studentId',
      hintEvents: '++id, attemptId',
    });

    // Schema version 2 — adds questionTemplates static store. per persistence-spec.md §4
    this.version(2).stores({
      students: 'id, displayName, createdAt',
      sessions: 'id, studentId, startedAt, [studentId+startedAt]',
      attempts:
        '++id, sessionId, studentId, questionTemplateId, submittedAt, [studentId+submittedAt], [studentId+questionTemplateId]',
      skillMastery: '[studentId+skillId], studentId, skillId, lastAttemptAt',
      deviceMeta: '&installId',
      bookmarks: 'id, studentId',
      sessionTelemetry: 'sessionId, studentId',
      hintEvents: '++id, attemptId',
      questionTemplates: 'id, archetype, [archetype+difficultyTier], levelGroup',
    });

    // Schema version 3 — adds full curriculum pack and new dynamic stores. per data-schema.md §6
    this.version(3).stores({
      // Static curriculum stores
      curriculumPacks: 'id',
      standards: 'id',
      skills: 'id, gradeLevel',
      activities: 'id, levelGroup, archetype',
      activityLevels: 'id, [activityId+levelNumber]',
      fractionBank: 'id, denominatorFamily, benchmark',
      questionTemplates: 'id, archetype, [archetype+difficultyTier], levelGroup',
      misconceptions: 'id',
      hints: 'id, [questionTemplateId+order]',
      // Dynamic stores (carry from v1/v2)
      students: 'id, displayName, createdAt',
      sessions: 'id, studentId, startedAt, [studentId+startedAt]',
      attempts:
        '++id, sessionId, studentId, questionTemplateId, submittedAt, [studentId+submittedAt], [studentId+questionTemplateId]',
      skillMastery: '[studentId+skillId], studentId, skillId, lastAttemptAt',
      deviceMeta: '&installId',
      bookmarks: 'id, studentId',
      sessionTelemetry: 'sessionId, studentId',
      hintEvents: '++id, attemptId',
      // New dynamic stores
      misconceptionFlags: 'id, [studentId+misconceptionId], [studentId+resolvedAt]',
      progressionStat: '[studentId+activityId], [studentId+lastSessionAt]',
    });

    // Schema version 4 — adds [archetype+submittedAt] compound index on attempts for BKT/
    // misconception queries over recent sessions (G-DB1), and validatorId index on
    // questionTemplates for validator-pipeline lookups (G-DB2). per architecture-review §G-DB1/G-DB2.
    this.version(4).stores({
      // Static curriculum stores (unchanged)
      curriculumPacks: 'id',
      standards: 'id',
      skills: 'id, gradeLevel',
      activities: 'id, levelGroup, archetype',
      activityLevels: 'id, [activityId+levelNumber]',
      fractionBank: 'id, denominatorFamily, benchmark',
      // G-DB2: add validatorId index for validator-pipeline queries
      questionTemplates: 'id, archetype, [archetype+difficultyTier], levelGroup, validatorId',
      misconceptions: 'id',
      hints: 'id, [questionTemplateId+order]',
      // Dynamic stores (carry from v3)
      students: 'id, displayName, createdAt',
      sessions: 'id, studentId, startedAt, [studentId+startedAt]',
      // G-DB1: add [archetype+submittedAt] for efficient BKT / misconception range queries
      attempts:
        '++id, sessionId, studentId, questionTemplateId, submittedAt, [studentId+submittedAt], [studentId+questionTemplateId], [archetype+submittedAt]',
      skillMastery: '[studentId+skillId], studentId, skillId, lastAttemptAt',
      deviceMeta: '&installId',
      bookmarks: 'id, studentId',
      sessionTelemetry: 'sessionId, studentId',
      hintEvents: '++id, attemptId',
      misconceptionFlags: 'id, [studentId+misconceptionId], [studentId+resolvedAt]',
      progressionStat: '[studentId+activityId], [studentId+lastSessionAt]',
    });

    // Schema version 5 — adds telemetryEvents store for durable offline buffering.
    // per observability-spec.md §3.2
    this.version(5).stores({
      // Static curriculum stores (carried from v4)
      curriculumPacks: 'id',
      standards: 'id',
      skills: 'id, gradeLevel',
      activities: 'id, levelGroup, archetype',
      activityLevels: 'id, [activityId+levelNumber]',
      fractionBank: 'id, denominatorFamily, benchmark',
      questionTemplates: 'id, archetype, [archetype+difficultyTier], levelGroup, validatorId',
      misconceptions: 'id',
      hints: 'id, [questionTemplateId+order]',
      // Dynamic stores (carried from v4)
      students: 'id, displayName, createdAt',
      sessions: 'id, studentId, startedAt, [studentId+startedAt]',
      attempts:
        '++id, sessionId, studentId, questionTemplateId, submittedAt, [studentId+submittedAt], [studentId+questionTemplateId], [archetype+submittedAt]',
      skillMastery: '[studentId+skillId], studentId, skillId, lastAttemptAt',
      deviceMeta: '&installId',
      bookmarks: 'id, studentId',
      sessionTelemetry: 'sessionId, studentId',
      hintEvents: '++id, attemptId',
      misconceptionFlags: 'id, [studentId+misconceptionId], [studentId+resolvedAt]',
      progressionStat: '[studentId+activityId], [studentId+lastSessionAt]',
      // New store for v5
      telemetryEvents: '++id, timestamp, event, severity, syncState',
    });

    // Schema version 6 — adds levelProgression store to replace localStorage keys.
    // per C5 constraint and P4 (Dexie migration). Keypath is &studentId (primary key).
    this.version(6).stores({
      // Static curriculum stores (carried from v5)
      curriculumPacks: 'id',
      standards: 'id',
      skills: 'id, gradeLevel',
      activities: 'id, levelGroup, archetype',
      activityLevels: 'id, [activityId+levelNumber]',
      fractionBank: 'id, denominatorFamily, benchmark',
      questionTemplates: 'id, archetype, [archetype+difficultyTier], levelGroup, validatorId',
      misconceptions: 'id',
      hints: 'id, [questionTemplateId+order]',
      // Dynamic stores (carried from v5)
      students: 'id, displayName, createdAt',
      sessions: 'id, studentId, startedAt, [studentId+startedAt]',
      attempts:
        '++id, sessionId, studentId, questionTemplateId, submittedAt, [studentId+submittedAt], [studentId+questionTemplateId], [archetype+submittedAt]',
      skillMastery: '[studentId+skillId], studentId, skillId, lastAttemptAt',
      deviceMeta: '&installId',
      bookmarks: 'id, studentId',
      sessionTelemetry: 'sessionId, studentId',
      hintEvents: '++id, attemptId',
      misconceptionFlags: 'id, [studentId+misconceptionId], [studentId+resolvedAt]',
      progressionStat: '[studentId+activityId], [studentId+lastSessionAt]',
      telemetryEvents: '++id, timestamp, event, severity, syncState',
      // New store for v6 — replace localStorage unlockedLevels/completedLevels
      levelProgression: '&studentId',
    });

    // Schema version 7 — adds streakRecord store + DeviceMeta.onboardingComplete
    // field. Migrates the `questerix.streak:${studentId}` and
    // `questerix.onboardingSeen` localStorage keys into IndexedDB (C5 closeout).
    this.version(7)
      .stores({
        // Carry all v6 stores forward unchanged
        curriculumPacks: 'id',
        standards: 'id',
        skills: 'id, gradeLevel',
        activities: 'id, levelGroup, archetype',
        activityLevels: 'id, [activityId+levelNumber]',
        fractionBank: 'id, denominatorFamily, benchmark',
        questionTemplates: 'id, archetype, [archetype+difficultyTier], levelGroup, validatorId',
        misconceptions: 'id',
        hints: 'id, [questionTemplateId+order]',
        students: 'id, displayName, createdAt',
        sessions: 'id, studentId, startedAt, [studentId+startedAt]',
        attempts:
          '++id, sessionId, studentId, questionTemplateId, submittedAt, [studentId+submittedAt], [studentId+questionTemplateId], [archetype+submittedAt]',
        skillMastery: '[studentId+skillId], studentId, skillId, lastAttemptAt',
        deviceMeta: '&installId',
        bookmarks: 'id, studentId',
        sessionTelemetry: 'sessionId, studentId',
        hintEvents: '++id, attemptId',
        misconceptionFlags: 'id, [studentId+misconceptionId], [studentId+resolvedAt]',
        progressionStat: '[studentId+activityId], [studentId+lastSessionAt]',
        telemetryEvents: '++id, timestamp, event, severity, syncState',
        levelProgression: '&studentId',
        // New store for v7
        streakRecord: '&studentId',
      })
      .upgrade(async (tx) => {
        // 1) Migrate `questerix.streak:${studentId}` → streakRecord rows.
        // 2) Migrate `questerix.onboardingSeen` → deviceMeta.onboardingComplete.
        // localStorage may not be available (SSR, sandbox); guard accordingly.
        try {
          if (typeof localStorage === 'undefined') return;

          // Streak migration
          const streakPrefix = 'questerix.streak:';
          const streakKeys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(streakPrefix)) streakKeys.push(k);
          }
          for (const key of streakKeys) {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            try {
              const parsed = JSON.parse(raw) as { count?: number; lastDate?: string };
              const studentIdRaw = key.slice(streakPrefix.length);
              if (
                studentIdRaw &&
                studentIdRaw !== 'anon' &&
                typeof parsed.count === 'number' &&
                typeof parsed.lastDate === 'string'
              ) {
                await tx.table('streakRecord').put({
                  studentId: studentIdRaw,
                  count: parsed.count,
                  lastDate: parsed.lastDate,
                });
              }
            } catch {
              // malformed JSON — skip and proceed
            }
            localStorage.removeItem(key);
          }

          // Onboarding migration
          const onboardingFlag = localStorage.getItem('questerix.onboardingSeen');
          if (onboardingFlag === '1') {
            await tx
              .table('deviceMeta')
              .toCollection()
              .modify((row: DeviceMeta) => {
                row.onboardingComplete = true;
              });
            localStorage.removeItem('questerix.onboardingSeen');
          }
        } catch {
          // Migration is best-effort; failures must not block the schema upgrade.
        }
      });
  }
}

export const db = new QuesterixDB();
db.use(observabilityMiddleware);

// ── Persistence grant helper ───────────────────────────────────────────────

/** sessionStorage key used to suppress repeated persistence warnings across page reloads. */
const PERSIST_WARN_KEY = 'qf.persistWarnShown';

/**
 * Request durable IndexedDB storage to survive iOS Safari ITP eviction.
 * per persistence-spec.md §3.2
 * Returns false if the API is unavailable or the request is denied.
 * Logs a warning in DEV if persistence not granted — at most once per browser session
 * (uses sessionStorage so the flag survives page reloads in the same tab).
 */
export async function ensurePersistenceGranted(): Promise<boolean> {
  const isDev = import.meta.env.DEV;

  // Check if we've already warned in this browser session (survives page reloads).
  const alreadyWarned = (() => {
    try {
      return sessionStorage.getItem(PERSIST_WARN_KEY) === '1';
    } catch (err) {
      return false;
    }
  })();

  const markWarned = () => {
    try {
      sessionStorage.setItem(PERSIST_WARN_KEY, '1');
    } catch (err) {
      // sessionStorage unavailable — ignore
    }
  };

  if (!('storage' in navigator) || !('persist' in navigator.storage)) {
    if (isDev && !alreadyWarned) {
      markWarned();
      console.warn('StorageManager API unavailable — data may be evicted by browser policy');
    }
    return false;
  }
  try {
    if (await navigator.storage.persisted()) return true;
    const granted = await navigator.storage.persist();
    if (!granted && isDev && !alreadyWarned) {
      markWarned();
      console.warn('Persistent storage not granted — data may be evicted');
    }
    return granted;
  } catch (err) {
    if (isDev && !alreadyWarned) {
      markWarned();
      console.warn('StorageManager.persist() failed:', err);
    }
    return false;
  }
}
