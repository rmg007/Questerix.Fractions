/**
 * LevelProgression repository — upsert via key studentId.
 * Tracks which levels are unlocked and completed per student (replaces localStorage).
 * per C5 constraint and R13 (Dexie dual-write migration).
 */

import { db } from '../db';
import type { LevelProgression, StudentId } from '../../types';

export const levelProgressionRepo = {
  /**
   * Get the level progression record for a student.
   * Returns undefined if no record exists (first-time student).
   */
  async get(studentId: StudentId): Promise<LevelProgression | undefined> {
    try {
      return await db.levelProgression.get(studentId);
    } catch {
      return undefined;
    }
  },

  /**
   * Upsert (insert or replace) a level progression record.
   * Caller should supply the full LevelProgression shape.
   */
  async upsert(progression: LevelProgression): Promise<void> {
    try {
      await db.levelProgression.put(progression);
    } catch {
      // Swallow write errors; caller will retry on next state change
    }
  },

  /**
   * Get or create a level progression record for a student.
   * On first call, initializes with level 1 unlocked and an empty completed set.
   */
  async getOrCreate(studentId: StudentId): Promise<LevelProgression> {
    const existing = await this.get(studentId);
    if (existing) return existing;

    // First-time student: level 1 is unlocked, nothing completed
    const initial: LevelProgression = {
      studentId,
      unlockedLevels: [1],
      completedLevels: [],
      lastUpdatedAt: Date.now(),
      syncState: 'local',
    };
    await this.upsert(initial);
    return initial;
  },

  /**
   * Mark a level as unlocked (idempotent).
   */
  async unlock(studentId: StudentId, levelNumber: number): Promise<void> {
    const prog = await this.getOrCreate(studentId);
    if (!prog.unlockedLevels.includes(levelNumber)) {
      prog.unlockedLevels.push(levelNumber);
      prog.unlockedLevels.sort((a: number, b: number) => a - b);
      prog.lastUpdatedAt = Date.now();
      await this.upsert(prog);
    }
  },

  /**
   * Mark a level as completed (idempotent).
   * Also unlocks the next level if it exists (levels 1–8).
   */
  async complete(studentId: StudentId, levelNumber: number): Promise<void> {
    const prog = await this.getOrCreate(studentId);

    // Mark as completed
    if (!prog.completedLevels.includes(levelNumber)) {
      prog.completedLevels.push(levelNumber);
      prog.completedLevels.sort((a: number, b: number) => a - b);
    }

    // Unlock the next level (if it exists — levels go 1–9)
    const nextLevel = levelNumber + 1;
    if (nextLevel <= 9 && !prog.unlockedLevels.includes(nextLevel)) {
      prog.unlockedLevels.push(nextLevel);
      prog.unlockedLevels.sort((a: number, b: number) => a - b);
    }

    prog.lastUpdatedAt = Date.now();
    await this.upsert(prog);
  },

  /**
   * Get the set of unlocked levels for a student.
   * Returns a Set for O(1) membership checks.
   */
  async getUnlockedLevels(studentId: StudentId): Promise<Set<number>> {
    const prog = await this.getOrCreate(studentId);
    return new Set(prog.unlockedLevels);
  },

  /**
   * Get the set of completed levels for a student.
   * Returns a Set for O(1) membership checks.
   */
  async getCompletedLevels(studentId: StudentId): Promise<Set<number>> {
    const prog = await this.getOrCreate(studentId);
    return new Set(prog.completedLevels);
  },

  /**
   * Delete the progression record for a student (idempotent).
   */
  async delete(studentId: StudentId): Promise<void> {
    try {
      await db.levelProgression.delete(studentId);
    } catch {
      // idempotent
    }
  },
};
