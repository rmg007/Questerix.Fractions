/**
 * LevelUnlock repository — tracks which levels each student has unlocked.
 * Migrated from localStorage to Dexie for C5 compliance.
 * per harden-and-polish.md §5.1 (R13)
 */

import { db } from '../db';

export interface LevelUnlockRow {
  studentId: string;
  levels: number[];
}

export const levelUnlockRepo = {
  async getUnlocked(studentId: string | null): Promise<Set<number>> {
    const unlocked = new Set<number>([1]);
    if (!studentId) return unlocked;
    try {
      const row = await db.levelUnlocks.get(studentId);
      if (row) {
        for (const n of row.levels) unlocked.add(n);
      }
    } catch {
      // default to level 1 only
    }
    return unlocked;
  },

  async unlock(studentId: string | null, levelNumber: number): Promise<void> {
    if (!studentId) return;
    const next = levelNumber + 1;
    if (next > 9) return;
    try {
      const existing = await db.levelUnlocks.get(studentId);
      const levels = existing ? [...existing.levels] : [];
      if (!levels.includes(next)) {
        levels.push(next);
        await db.levelUnlocks.put({ studentId, levels });
      }
    } catch {
      // swallow — non-critical for gameplay
    }
  },

  /**
   * One-time migration: drain any leftover localStorage unlockedLevels keys
   * into Dexie, then remove them.
   */
  async migrateFromLocalStorage(): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key === 'unlockedLevels' || key.startsWith('unlockedLevels:')) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const arr = JSON.parse(raw);
          if (!Array.isArray(arr)) continue;
          const levels = arr.filter((n): n is number => typeof n === 'number');
          const studentId = key.includes(':') ? key.split(':')[1] : '__default__';
          const existing = await db.levelUnlocks.get(studentId);
          const merged = new Set(existing?.levels ?? []);
          for (const n of levels) merged.add(n);
          await db.levelUnlocks.put({ studentId, levels: [...merged] });
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch {
      // migration is best-effort
    }
  },
};
