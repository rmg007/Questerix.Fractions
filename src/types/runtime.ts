/**
 * Dynamic entities — written at runtime (student progress).
 * All carry syncState for the 2029 client→server boundary.
 * per data-schema.md §3
 */

import type { ArchetypeId } from './archetype';
import type {
  StudentId,
  SessionId,
  AttemptId,
  ActivityId,
  QuestionTemplateId,
  SkillId,
  MisconceptionId,
} from './branded';
import type { HintTier } from './hint';

/**
 * Three-state sync machine.
 * During MVP only 'local' is ever written.
 * The 2029 sync worker flips to 'queued' → 'synced'.
 * per data-schema.md §3 (preamble) and §5
 */
export type SyncState = 'local' | 'queued' | 'synced';

// ── §3.1 Student ───────────────────────────────────────────────────────────

/** per data-schema.md §3.1 */
export interface Student {
  id: StudentId;
  displayName: string;
  avatarConfig: Record<string, string>;
  gradeLevel: 0 | 1 | 2;
  /** Epoch ms. */
  createdAt: number;
  /** Epoch ms. */
  lastActiveAt: number;
  /** Always true during MVP. */
  localOnly: boolean;
  /** Populated post-2029 if cloud-synced. per data-schema.md §3.1 */
  remoteId?: string;
  syncState: SyncState;
}

// ── §3.2 Session ───────────────────────────────────────────────────────────

/** per data-schema.md §3.2 */
export interface Session {
  id: SessionId;
  studentId: StudentId;
  activityId: ActivityId;
  /** 1–9 */
  levelNumber: number;
  /** 1–5 */
  scaffoldLevel: 1 | 2 | 3 | 4 | 5;
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms; null while in progress. */
  endedAt: number | null;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number | null;
  avgResponseMs: number | null;
  xpEarned: number;
  scaffoldRecommendation: 'advance' | 'stay' | 'regress' | null;
  /**
   * Highest level reached during this session (may differ from levelNumber
   * if the engine auto-routed). per data-schema.md §3.2 (audit §5 fix)
   */
  endLevel: number;
  device: {
    type: string;
    viewport: { width: number; height: number };
  };
  syncState: SyncState;
}

// ── §3.3 Attempt ───────────────────────────────────────────────────────────

/**
 * Individual interaction event during a question round.
 * Captured for strategic analysis (e.g. MC-STRAT-01).
 * per data-schema.md §3.3 (L9 update)
 */
export interface ProgressionEvent {
  /** 'pickUp' (lifted card), 'place' (dropped into slot), 'swap' (two slots), 'clear' (returned to tray) */
  type: 'pickUp' | 'place' | 'swap' | 'clear';
  /** ID of the fraction card or slot */
  targetId: string;
  /** Index in the ordering tray/slots (0-indexed) */
  trayIndex?: number;
  /** Epoch ms. */
  timestamp: number;
}

/**
 * Attempt outcome codes.
 * 'EXACT'/'CLOSE'/'WRONG' come from the validator.
 * 'ASSISTED' = answered correctly only after Tier 3 hint demo.
 * 'ABANDONED' = student navigated away without submitting.
 * per data-schema.md §3.3
 */
export type AttemptOutcome = 'EXACT' | 'CLOSE' | 'WRONG' | 'ASSISTED' | 'ABANDONED';

/** per data-schema.md §3.3 — append-only */
export interface Attempt {
  id: AttemptId;
  sessionId: SessionId;
  /** Denormalised for fast per-student queries. */
  studentId: StudentId;
  questionTemplateId: QuestionTemplateId;
  /** Denormalised so attempt rows are self-describing. */
  archetype: ArchetypeId;
  roundNumber: number;
  /** 1–4 retry index for this question. */
  attemptNumber: 1 | 2 | 3 | 4;
  /** Epoch ms — when question was displayed. */
  startedAt: number;
  /** Epoch ms — when answer was submitted. */
  submittedAt: number;
  /** Computed time-to-answer in ms. */
  responseMs: number;
  /** Raw answer; shape mirrors archetype payload. */
  studentAnswerRaw: unknown;
  /** Snapshot of correct answer for replay. */
  correctAnswerRaw: unknown;
  outcome: AttemptOutcome;
  errorMagnitude: number | null;
  pointsEarned: number;
  /** IDs of HintEvent rows used during this attempt (Dexie auto-increment numbers). */
  hintsUsedIds: number[];
  /** HintTier array for quick per-attempt hint analysis. */
  hintsUsed: HintTier[];
  flaggedMisconceptionIds: MisconceptionId[];
  /** Full validator result payload for debugging/replay. */
  validatorPayload: unknown;
  /**
   * Sequence of interaction events (drags, drops, swaps).
   * Required for strategy detection (SK-33 / MC-STRAT-01).
   * per level-09.md §5 and data-schema.md §3.3
   */
  roundEvents?: ProgressionEvent[];
  syncState: SyncState;
  // ── Extended fields used by misconception detectors ───────────────────────
  /** Archetype-specific question payload (e.g. shapeType, rotation, targetPartitions). */
  payload?: Record<string, unknown>;
  /** Skill IDs associated with this attempt for knowledge-component analysis. */
  skillIds?: string[];
  /** Time-on-task in ms (computed from startedAt/submittedAt in some contexts). */
  durationMS?: number;
  /** Number of hints requested during this attempt. */
  hintCount?: number;
  /** Prompt context supplied to the student (vocabulary, label, etc.). */
  prompt?: { text?: string };
}

// ── §3.4 HintEvent ─────────────────────────────────────────────────────────

/** per data-schema.md §3.4 */
export interface HintEvent {
  /** Auto-incremented by Dexie (++id); matches hintEvents table key type number. */
  id: number;
  attemptId: AttemptId;
  /** References HintTemplate.id */
  hintId: string;
  /** HintTier for quick analysis without join. */
  tier: HintTier;
  /** Epoch ms. */
  shownAt: number;
  acceptedByStudent: boolean;
  pointCostApplied: number;
  syncState: SyncState;
}

// ── §3.5 MisconceptionFlag ─────────────────────────────────────────────────

/** per data-schema.md §3.5 */
export interface MisconceptionFlag {
  id: string;
  studentId: StudentId;
  misconceptionId: MisconceptionId;
  /** Epoch ms. */
  firstObservedAt: number;
  /** Epoch ms. */
  lastObservedAt: number;
  observationCount: number;
  /** null = active; set when remediated. Epoch ms. */
  resolvedAt: number | null;
  /** Last N supporting attempt IDs. */
  evidenceAttemptIds: AttemptId[];
  syncState: SyncState;
}

// ── §3.6 SkillMastery ──────────────────────────────────────────────────────

export type MasteryState = 'NOT_STARTED' | 'LEARNING' | 'APPROACHING' | 'MASTERED' | 'DECAYED';

/**
 * One row per (studentId, skillId) composite key.
 * IndexedDB primary key: [studentId+skillId]. per data-schema.md §3.6
 */
export interface SkillMastery {
  studentId: StudentId;
  skillId: SkillId;
  /** Composite key for Dexie compound primary key. per data-schema.md §6 */
  compositeKey: [StudentId, SkillId];
  /** BKT posterior P(mastery). 0.0–1.0 */
  masteryEstimate: number;
  state: MasteryState;
  consecutiveCorrectUnassisted: number;
  totalAttempts: number;
  correctAttempts: number;
  /** Epoch ms. */
  lastAttemptAt: number;
  /** Epoch ms; null until mastery first reached. */
  masteredAt: number | null;
  /** Epoch ms; null unless mastery has since decayed. */
  decayedAt: number | null;
  syncState: SyncState;
}

// ── §3.7 ProgressionStat ───────────────────────────────────────────────────

/**
 * One row per (studentId, activityId) composite key.
 * IndexedDB primary key: [studentId+activityId]. per data-schema.md §3.7
 */
export interface ProgressionStat {
  studentId: StudentId;
  activityId: ActivityId;
  currentLevel: number;
  highestLevelReached: number;
  sessionsAtCurrentLevel: number;
  totalSessions: number;
  totalXp: number;
  /** Epoch ms. */
  lastSessionAt: number;
  consecutiveRegressEvents: number;
  syncState: SyncState;
}

// ── §3.7a LevelProgression ────────────────────────────────────────────────
/**
 * Per-student level unlock/completion tracking (replaces localStorage).
 * Single row per student tracking which levels are unlocked and completed.
 * per C5 and P4 Dexie migration.
 */
export interface LevelProgression {
  studentId: StudentId;
  /** Array of unlocked level numbers (1–9). */
  unlockedLevels: number[];
  /** Array of completed level numbers (1–9). */
  completedLevels: number[];
  /** Epoch ms; updated whenever unlocked/completed changes. */
  lastUpdatedAt: number;
  syncState: SyncState;
}

// ── §3.8 DeviceMeta ────────────────────────────────────────────────────────

/** per data-schema.md §3.8 (audit §5 fix) */
export interface DevicePreferences {
  audio: boolean;
  /** Master volume level, 0–1. Default 0.8. */
  volume: number;
  reduceMotion: boolean;
  highContrast: boolean;
  ttsLocale: string;
  largeTouchTargets: boolean;
  /**
   * Whether the user has opted in to telemetry (default false).
   * per observability-spec.md §2.1
   */
  telemetryConsent: boolean;
  /**
   * Whether IndexedDB persistence was granted via navigator.storage.persist().
   * per data-schema.md §3.8 and persistence-spec.md §3.2 (audit §5 fix)
   */
  persistGranted: boolean;
}

/** Singleton per device. per data-schema.md §3.8 */
export interface DeviceMeta {
  installId: string;
  schemaVersion: number;
  contentVersion: string;
  preferences: DevicePreferences;
  /** Epoch ms; null if never exported. */
  lastBackupAt: number | null;
  /**
   * Epoch ms; set when restoreFromFile completes; null if never restored.
   * per data-schema.md §3.8 and persistence-spec.md §6 (audit §5 fix)
   */
  lastRestoredAt: number | null;
  /** Always 0 during MVP. */
  pendingSyncCount: number;
  syncState: SyncState;
}

// ── Bookmark ───────────────────────────────────────────────────────────────

/** Placeholder for sustainable resume. Stores where a student left off. */
export interface Bookmark {
  id: string;
  studentId: StudentId;
  activityId: ActivityId;
  levelNumber: number;
  /** Epoch ms. */
  savedAt: number;
  syncState: SyncState;
}

// ── SessionTelemetry ───────────────────────────────────────────────────────

/** Aggregate session stats. Derived from Attempt rows at session close. */
export interface SessionTelemetry {
  sessionId: SessionId;
  studentId: StudentId;
  totalAttempts: number;
  correctAttempts: number;
  assistedAttempts: number;
  abandonedAttempts: number;
  totalHintsUsed: number;
  hintsByTier: Record<HintTier, number>;
  avgResponseMs: number;
  /** Epoch ms of the longest response. */
  maxResponseMs: number;
  /** Epoch ms. */
  computedAt: number;
  syncState: SyncState;
}
// ── TelemetryEvent ──────────────────────────────────────────────────────────

/**
 * Severity levels for telemetry events.
 * per observability-spec.md §3.1
 */
export type TelemetrySeverity = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Durable telemetry event for offline buffering.
 * per observability-spec.md §3.2
 */
export interface TelemetryEvent {
  /** Auto-incrementing ID for local storage. */
  id?: number;
  /** ISO date string for global ordering. */
  timestamp: string;
  /** Event name, e.g. 'app_start', 'scene_transition', 'db_error'. */
  event: string;
  severity: TelemetrySeverity;
  /** Arbitrary context properties. */
  properties: Record<string, unknown>;
  /** Optional student context. */
  studentId?: StudentId;
  /** Optional session context. */
  sessionId?: SessionId;
  /** Error stack trace if applicable. */
  stack?: string;
  /** Application version (VITE_GIT_SHA). */
  version: string;
  syncState: SyncState;
}
