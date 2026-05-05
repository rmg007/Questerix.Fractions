/**
 * DB integrity probe — reads one row from each critical Dexie store and
 * verifies expected shape. Called at boot time (BootScene._bootAsync) before
 * transitioning to PreloadScene.
 *
 * Per crash-and-recovery plan Phase 2 §1.
 * Per C1 — no external HTTP calls; purely local IndexedDB operations.
 * Per persistence/CLAUDE.md — no Phaser imports.
 */

import { db } from './db';

export type IntegrityResult = 'ok' | { corrupt: true; reason: string };

/**
 * Probe each critical dynamic store for structural integrity.
 * Returns 'ok' if every store is accessible and any existing rows pass shape
 * checks. Returns a corrupt descriptor on the first failure found.
 *
 * The probe is intentionally lightweight: it reads at most one row from each
 * store. A fully empty DB (fresh install) always returns 'ok'.
 */
export async function probe(): Promise<IntegrityResult> {
  try {
    // ── students ─────────────────────────────────────────────────────────
    const student = await db.students.limit(1).first();
    if (student !== undefined) {
      if (typeof student.id !== 'string' || student.id.length === 0) {
        return { corrupt: true, reason: 'students: row missing id' };
      }
    }

    // ── sessions ─────────────────────────────────────────────────────────
    const session = await db.sessions.limit(1).first();
    if (session !== undefined) {
      if (typeof session.id !== 'string' || typeof session.studentId !== 'string') {
        return { corrupt: true, reason: 'sessions: row missing id or studentId' };
      }
    }

    // ── attempts ─────────────────────────────────────────────────────────
    const attempt = await db.attempts.limit(1).first();
    if (attempt !== undefined) {
      if (typeof attempt.id !== 'string' || typeof attempt.sessionId !== 'string') {
        return { corrupt: true, reason: 'attempts: row missing id or sessionId' };
      }
    }

    // ── skillMastery ──────────────────────────────────────────────────────
    const mastery = await db.skillMastery.limit(1).first();
    if (mastery !== undefined) {
      if (typeof mastery.studentId !== 'string' || typeof mastery.skillId !== 'string') {
        return { corrupt: true, reason: 'skillMastery: row missing studentId or skillId' };
      }
    }

    // ── deviceMeta ────────────────────────────────────────────────────────
    const meta = await db.deviceMeta.limit(1).first();
    if (meta !== undefined) {
      if (typeof meta.installId !== 'string' || meta.installId.length === 0) {
        return { corrupt: true, reason: 'deviceMeta: row missing installId' };
      }
    }

    return 'ok';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? 'unknown');
    return { corrupt: true, reason: `probe exception: ${msg}` };
  }
}

/**
 * Delete the Dexie database entirely (nuclear option, "Start fresh" path).
 * Preserves `lastUsedStudentId` in localStorage per C5.
 *
 * Callers should reload the page after this to reinitialise Dexie cleanly.
 */
export async function deleteDatabase(): Promise<void> {
  await db.delete();
}
