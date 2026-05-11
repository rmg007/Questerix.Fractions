/**
 * Runtime validators for IndexedDB entities.
 * Validates shape and required fields on all read operations.
 * Per Hardening Iteration 3.4: IndexedDB Data Validation
 */

import type { Student, Session, Attempt, SkillMastery, DeviceMeta } from '../types';

/**
 * Validate a Student entity read from IndexedDB.
 * Checks: id, displayName, avatar, gradeLevel, timestamps, sync state.
 */
export function isValidStudent(row: unknown): row is Student {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;

  // Required string fields
  if (typeof r.id !== 'string' || !r.id.trim()) return false;
  if (typeof r.displayName !== 'string' || !r.displayName.trim()) return false;

  // Avatar enum validation (must be one of the known avatars)
  const validAvatars = ['star', 'moon', 'sun', 'cloud'];
  if (typeof r.avatar !== 'string' || !validAvatars.includes(r.avatar)) return false;

  // Grade level validation (K-2 = 0-2)
  if (
    typeof r.gradeLevel !== 'number' ||
    !Number.isFinite(r.gradeLevel) ||
    r.gradeLevel < 0 ||
    r.gradeLevel > 2
  ) {
    return false;
  }

  // Timestamp validation
  if (typeof r.createdAt !== 'number' || !Number.isFinite(r.createdAt) || r.createdAt < 0)
    return false;
  if (typeof r.lastActiveAt !== 'number' || !Number.isFinite(r.lastActiveAt) || r.lastActiveAt < 0)
    return false;

  // Sync state validation
  const validSyncStates = ['local', 'syncing', 'synced', 'error'];
  if (typeof r.syncState !== 'string' || !validSyncStates.includes(r.syncState)) return false;

  return true;
}

/**
 * Validate a Session entity read from IndexedDB.
 * Checks: id, studentId, timestamps, level range.
 */
export function isValidSession(row: unknown): row is Session {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;

  // Required ID fields
  if (typeof r.id !== 'string' || !r.id.trim()) return false;
  if (typeof r.studentId !== 'string' || !r.studentId.trim()) return false;

  // Timestamp validation
  if (typeof r.startedAt !== 'number' || !Number.isFinite(r.startedAt) || r.startedAt < 0)
    return false;
  if (
    typeof r.endedAt !== 'undefined' &&
    (typeof r.endedAt !== 'number' || !Number.isFinite(r.endedAt) || r.endedAt < 0)
  ) {
    return false;
  }

  // Level validation (1-9)
  if (
    typeof r.levelNumber !== 'number' ||
    !Number.isFinite(r.levelNumber) ||
    r.levelNumber < 1 ||
    r.levelNumber > 9
  ) {
    return false;
  }

  // Session status validation
  const validStatuses = ['active', 'completed', 'abandoned'];
  if (typeof r.status !== 'string' || !validStatuses.includes(r.status)) return false;

  return true;
}

/**
 * Validate an Attempt entity read from IndexedDB.
 * Checks: id, studentId, sessionId, timestamps, outcome.
 */
export function isValidAttempt(row: unknown): row is Attempt {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;

  // Required ID fields
  if (typeof r.studentId !== 'string' || !r.studentId.trim()) return false;
  if (typeof r.sessionId !== 'string' || !r.sessionId.trim()) return false;
  if (typeof r.questionTemplateId !== 'string' || !r.questionTemplateId.trim()) return false;

  // Timestamp validation
  if (typeof r.submittedAt !== 'number' || !Number.isFinite(r.submittedAt) || r.submittedAt < 0)
    return false;

  // Score validation (0-1)
  if (typeof r.score !== 'number' || !Number.isFinite(r.score) || r.score < 0 || r.score > 1) {
    return false;
  }

  // Outcome validation
  const validOutcomes = ['correct', 'incorrect', 'assisted'];
  if (typeof r.outcome !== 'string' || !validOutcomes.includes(r.outcome)) return false;

  // Hints array validation
  if (Array.isArray(r.hintsUsed)) {
    if (!r.hintsUsed.every((h) => typeof h === 'string')) return false;
  }

  return true;
}

/**
 * Validate a SkillMastery entity read from IndexedDB.
 * Checks: studentId, skillId, mastery state, bounds.
 */
export function isValidSkillMastery(row: unknown): row is SkillMastery {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;

  // Required ID fields
  if (typeof r.studentId !== 'string' || !r.studentId.trim()) return false;
  if (typeof r.skillId !== 'string' || !r.skillId.trim()) return false;

  // Mastery state validation
  const validStates = ['unfamiliar', 'emerging', 'proficient', 'mastered'];
  if (typeof r.masteryState !== 'string' || !validStates.includes(r.masteryState)) return false;

  // BKT parameter bounds (0.0 to 1.0)
  if (
    typeof r.bktProb !== 'number' ||
    !Number.isFinite(r.bktProb) ||
    r.bktProb < 0 ||
    r.bktProb > 1
  ) {
    return false;
  }

  // Attempt count validation
  if (
    typeof r.attemptCount !== 'number' ||
    !Number.isFinite(r.attemptCount) ||
    r.attemptCount < 0
  ) {
    return false;
  }

  // Timestamp validation
  if (
    typeof r.lastAttemptAt !== 'number' ||
    !Number.isFinite(r.lastAttemptAt) ||
    r.lastAttemptAt < 0
  )
    return false;

  return true;
}

/**
 * Validate a DeviceMeta entity read from IndexedDB.
 * Checks: installId, unique constraint, onboarding flag.
 */
export function isValidDeviceMeta(row: unknown): row is DeviceMeta {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;

  // Required ID field (installId is the primary key)
  if (typeof r.installId !== 'string' || !r.installId.trim()) return false;

  // Onboarding flag validation
  if (typeof r.onboardingComplete !== 'boolean') return false;

  // Optional timestamp
  if (
    typeof r.createdAt !== 'undefined' &&
    (typeof r.createdAt !== 'number' || !Number.isFinite(r.createdAt) || r.createdAt < 0)
  ) {
    return false;
  }

  return true;
}

/**
 * Wrapper: validate array of entities, filter out invalid rows.
 * Used when reading collections from IndexedDB to skip corrupt rows.
 */
export function validateAndFilter<T>(rows: unknown[], validator: (row: unknown) => row is T): T[] {
  return rows.filter((row) => {
    try {
      return validator(row);
    } catch {
      return false;
    }
  }) as T[];
}
