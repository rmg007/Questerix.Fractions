/**
 * streak.ts — daily play-streak helpers.
 * Backed by the `streakRecord` Dexie table (per C5; v7 schema). All localStorage
 * usage was migrated in 2026-05-01 — this module is now a thin async wrapper
 * over `streakRecordRepo`.
 *
 * Storage format: one row per student keyed by `studentId`, with `count` and
 * `lastDate` (ISO YYYY-MM-DD). Anonymous play (`studentId === null`) returns 0
 * and does not persist — streak is a per-student concept.
 */

import { streakRecordRepo } from '../persistence/repositories/streakRecord';
import type { StudentId } from '../types/branded';

function asStudentId(studentId: string | null): StudentId | null {
  if (!studentId) return null;
  return studentId as StudentId;
}

/**
 * Returns the current streak count (0 if never played or anonymous).
 */
export async function getStreak(studentId: string | null): Promise<number> {
  const id = asStudentId(studentId);
  if (!id) return 0;
  return streakRecordRepo.getCount(id);
}

/**
 * Call when a session closes. Increments if played today (no-op) or yesterday
 * (consecutive), resets to 1 if gap > 1 day. Returns the new count.
 *
 * Anonymous play does not persist — returns 0.
 */
export async function updateStreak(studentId: string | null): Promise<number> {
  const id = asStudentId(studentId);
  if (!id) return 0;
  return streakRecordRepo.update(id);
}
