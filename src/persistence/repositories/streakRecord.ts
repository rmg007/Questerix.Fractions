/**
 * StreakRecord repository — daily-play streak tracker per student.
 * Replaces the `questerix.streak:${studentId}` localStorage key (C5 closeout, v7).
 *
 * Streak rules (preserved from src/lib/streak.ts):
 *   - Same calendar day → keep current count
 *   - Next consecutive calendar day → increment
 *   - Gap > 1 day → reset to 1
 *
 * `studentId` is the primary key.
 */

import { db } from '../db';
import type { StudentId } from '../../types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const streakRecordRepo = {
  /**
   * Returns the current streak count for a student, or 0 if no record.
   * Errors are swallowed — telemetry is best-effort.
   */
  async getCount(studentId: StudentId): Promise<number> {
    try {
      const row = await db.streakRecord.get(studentId);
      return row?.count ?? 0;
    } catch {
      return 0;
    }
  },

  /**
   * Increment / reset / hold the streak for a student per the streak rules.
   * Returns the new count. Errors are swallowed and yield 0.
   */
  async update(studentId: StudentId): Promise<number> {
    try {
      const today = todayISO();
      const existing = await db.streakRecord.get(studentId);

      let newCount = 1;
      if (existing) {
        if (existing.lastDate === today) {
          // Already played today — keep existing count
          newCount = existing.count;
        } else if (existing.lastDate === yesterdayISO()) {
          // Consecutive day — increment
          newCount = existing.count + 1;
        }
        // else: gap > 1 day; newCount stays 1
      }

      await db.streakRecord.put({ studentId, count: newCount, lastDate: today });
      return newCount;
    } catch {
      return 0;
    }
  },
};
