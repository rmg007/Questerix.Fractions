/**
 * Backup envelope Zod schemas — defensive boundary at restoreFromFile().
 *
 * Phase 7.4 / harden R29: per-row validation for every dynamic-entity table
 * accepted by `restoreFromFile`. A maliciously or accidentally crafted backup
 * file must not be allowed to corrupt the local Dexie store.
 *
 * Failure mode: any malformed envelope or row aborts the entire restore (the
 * caller's `db.transaction` is responsible for the actual rollback). Schemas
 * are permissive about unknown extra fields (`.passthrough()`) so a future
 * additive change to the entity shape does not invalidate older backups.
 */

import { z } from 'zod';

// ── Shared primitives ──────────────────────────────────────────────────────

const syncStateSchema = z.enum(['local', 'queued', 'synced']);

// ── Per-table row schemas ──────────────────────────────────────────────────
// Required fields mirror the entity types in src/types/runtime.ts. All schemas
// `.passthrough()` so additive entity changes don't break older backups.

const studentSchema = z
  .object({
    id: z.string().min(1).max(256),
    displayName: z.string().max(1024),
    avatarConfig: z.record(z.string().max(256), z.string().max(256)),
    gradeLevel: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    createdAt: z.number(),
    lastActiveAt: z.number(),
    localOnly: z.boolean(),
    syncState: syncStateSchema,
  })
  .passthrough();

const sessionSchema = z
  .object({
    id: z.string().min(1).max(256),
    studentId: z.string().min(1).max(256),
    activityId: z.string().min(1).max(256),
    levelNumber: z.number(),
    scaffoldLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    startedAt: z.number(),
    endedAt: z.number().nullable(),
    totalAttempts: z.number(),
    correctAttempts: z.number(),
    accuracy: z.number().nullable(),
    avgResponseMs: z.number().nullable(),
    xpEarned: z.number(),
    syncState: syncStateSchema,
  })
  .passthrough();

const attemptSchema = z
  .object({
    id: z.number(),
    sessionId: z.string().min(1).max(256),
    studentId: z.string().min(1).max(256),
    questionTemplateId: z.string().min(1).max(256),
    archetype: z.string().min(1).max(256),
    roundNumber: z.number(),
    attemptNumber: z.number(),
    startedAt: z.number(),
    submittedAt: z.number(),
    responseMs: z.number(),
    outcome: z.enum(['EXACT', 'CLOSE', 'WRONG', 'ASSISTED', 'ABANDONED']),
    pointsEarned: z.number(),
    syncState: syncStateSchema,
  })
  .passthrough();

const skillMasterySchema = z
  .object({
    studentId: z.string().min(1).max(256),
    skillId: z.string().min(1).max(256),
    compositeKey: z.tuple([z.string().max(256), z.string().max(256)]),
    masteryEstimate: z.number(),
    state: z.enum(['NOT_STARTED', 'LEARNING', 'APPROACHING', 'MASTERED', 'DECAYED']),
    consecutiveCorrectUnassisted: z.number(),
    totalAttempts: z.number(),
    correctAttempts: z.number(),
    lastAttemptAt: z.number(),
    syncState: syncStateSchema,
  })
  .passthrough();

const deviceMetaSchema = z
  .object({
    installId: z.string().min(1).max(256),
    schemaVersion: z.number(),
    contentVersion: z.string().max(256),
    pendingSyncCount: z.number(),
    syncState: syncStateSchema,
  })
  .passthrough();

const bookmarkSchema = z
  .object({
    id: z.string().min(1).max(256),
    studentId: z.string().min(1).max(256),
    activityId: z.string().min(1).max(256),
    levelNumber: z.number(),
    savedAt: z.number(),
    syncState: syncStateSchema,
  })
  .passthrough();

const sessionTelemetrySchema = z
  .object({
    sessionId: z.string().min(1).max(256),
    studentId: z.string().min(1).max(256),
    totalAttempts: z.number(),
    correctAttempts: z.number(),
    syncState: syncStateSchema,
  })
  .passthrough();

const hintEventSchema = z
  .object({
    attemptId: z.string().min(1).max(256),
    hintId: z.string().min(1).max(256),
    tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    shownAt: z.number(),
    acceptedByStudent: z.boolean(),
    pointCostApplied: z.number(),
    syncState: syncStateSchema,
  })
  .passthrough();

const misconceptionFlagSchema = z
  .object({
    id: z.string().min(1).max(256),
    studentId: z.string().min(1).max(256),
    misconceptionId: z.string().min(1).max(256),
    firstObservedAt: z.number(),
    lastObservedAt: z.number(),
    observationCount: z.number(),
    resolvedAt: z.number().nullable(),
    syncState: syncStateSchema,
  })
  .passthrough();

const progressionStatSchema = z
  .object({
    studentId: z.string().min(1).max(256),
    activityId: z.string().min(1).max(256),
    currentLevel: z.number(),
    highestLevelReached: z.number(),
    totalSessions: z.number(),
    totalXp: z.number(),
    syncState: syncStateSchema,
  })
  .passthrough();

// ── Backup envelope ────────────────────────────────────────────────────────

/**
 * Top-level shape of `questerix-<date>.json` backup files. Only the fields
 * referenced by `restoreFromFile` are required; tables default to empty
 * arrays so partial backups still parse cleanly.
 */
export const backupEnvelopeSchema = z
  .object({
    version: z.number(),
    exportedAt: z.number(),
    tables: z
      .object({
        students: z.array(studentSchema).default([]),
        sessions: z.array(sessionSchema).default([]),
        attempts: z.array(attemptSchema).default([]),
        skillMastery: z.array(skillMasterySchema).default([]),
        deviceMeta: z.array(deviceMetaSchema).default([]),
        bookmarks: z.array(bookmarkSchema).default([]),
        sessionTelemetry: z.array(sessionTelemetrySchema).default([]),
        hintEvents: z.array(hintEventSchema).default([]),
        misconceptionFlags: z.array(misconceptionFlagSchema).default([]),
        progressionStat: z.array(progressionStatSchema).default([]),
      })
      .passthrough(),
  })
  .passthrough();

export type BackupEnvelopeInput = z.infer<typeof backupEnvelopeSchema>;

/**
 * Validate the parsed envelope. Returns a discriminated union mirroring
 * `safeParseQuestionTemplate` for caller ergonomics.
 */
export function safeParseBackupEnvelope(
  raw: unknown
): { ok: true; value: BackupEnvelopeInput } | { ok: false; issues: z.ZodIssue[]; message: string } {
  const parsed = backupEnvelopeSchema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }
  return {
    ok: false,
    issues: parsed.error.issues,
    message: parsed.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; '),
  };
}
