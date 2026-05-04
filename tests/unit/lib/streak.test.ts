/**
 * Unit tests for streak — daily play-streak helpers (per-student async wrapper).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreakHelper } from '@/lib/streak';
import type { StudentId } from '@/types/branded';

describe('StreakHelper', () => {
  let helper: StreakHelper;

  beforeEach(() => {
    helper = new StreakHelper();
  });

  it('increments streak for a student', async () => {
    const studentId = 'student-1' as StudentId;

    const newStreak = await helper.incrementStreak(studentId);

    expect(newStreak).toBeGreaterThan(0);
  });

  it('returns same value on duplicate increment (idempotent within session)', async () => {
    const studentId = 'student-2' as StudentId;

    const streak1 = await helper.incrementStreak(studentId);
    const streak2 = await helper.incrementStreak(studentId);

    // Within the same session, should return cached value
    expect(streak2).toBe(streak1);
  });

  it('resets streak on miss', async () => {
    const studentId = 'student-3' as StudentId;

    await helper.incrementStreak(studentId);
    const reset = await helper.resetStreak(studentId);

    expect(reset).toBe(0);
  });

  it('gets current streak without modification', async () => {
    const studentId = 'student-4' as StudentId;

    await helper.incrementStreak(studentId);
    const current = await helper.getStreak(studentId);

    expect(current).toBeGreaterThan(0);
  });

  it('handles concurrent requests gracefully', async () => {
    const studentId1 = 'student-5' as StudentId;
    const studentId2 = 'student-6' as StudentId;

    const results = await Promise.all([
      helper.incrementStreak(studentId1),
      helper.incrementStreak(studentId2),
      helper.getStreak(studentId1),
      helper.getStreak(studentId2),
    ]);

    expect(results.length).toBe(4);
    expect(results[0]).toBeGreaterThan(0);
    expect(results[1]).toBeGreaterThan(0);
  });

  it('handles missing student record gracefully', async () => {
    const studentId = 'unknown-student' as StudentId;

    const streak = await helper.getStreak(studentId);

    // Should default to 0 for unknown student
    expect(streak).toBe(0);
  });
});
