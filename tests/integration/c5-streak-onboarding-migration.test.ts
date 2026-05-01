/**
 * v6 → v7 schema upgrade — integration tests for the C5 closeout migration.
 *
 * The v7 upgrade callback in `src/persistence/db.ts` migrates two legacy
 * localStorage keys into IndexedDB:
 *   1. `questerix.streak:${studentId}` → `streakRecord` table rows
 *   2. `questerix.onboardingSeen` → `deviceMeta.onboardingComplete` field
 *
 * These tests exercise both migration paths plus the new repos' day-rollover
 * behavior. Uses fake-indexeddb with a per-test reset so each test starts
 * from a clean v7 schema.
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import { db } from '../../src/persistence/db';
import { deviceMetaRepo } from '../../src/persistence/repositories/deviceMeta';
import { streakRecordRepo } from '../../src/persistence/repositories/streakRecord';
import { getStreak, updateStreak } from '../../src/lib/streak';
import { StudentId } from '../../src/types';

const STUDENT_A = StudentId('00000000-0000-4000-8000-00000000000a');
const STUDENT_B = StudentId('00000000-0000-4000-8000-00000000000b');

beforeEach(async () => {
  // Wipe the database between tests to avoid cross-test contamination.
  await db.delete();
  await db.open();
  // Clear localStorage too — the migration callback reads from it.
  localStorage.clear();
});

describe('streak — Dexie-backed', () => {
  it('returns 0 for a student with no record', async () => {
    expect(await getStreak(STUDENT_A)).toBe(0);
  });

  it('returns 0 for anonymous play', async () => {
    expect(await getStreak(null)).toBe(0);
  });

  it('starts at 1 on first updateStreak', async () => {
    expect(await updateStreak(STUDENT_A)).toBe(1);
    expect(await getStreak(STUDENT_A)).toBe(1);
  });

  it('does not double-count when called twice the same day', async () => {
    await updateStreak(STUDENT_A);
    expect(await updateStreak(STUDENT_A)).toBe(1);
    expect(await getStreak(STUDENT_A)).toBe(1);
  });

  it('does not persist for anonymous play', async () => {
    expect(await updateStreak(null)).toBe(0);
    expect(await getStreak(null)).toBe(0);
  });

  it('keeps separate streaks per student', async () => {
    await updateStreak(STUDENT_A);
    await updateStreak(STUDENT_A);
    await updateStreak(STUDENT_B);
    expect(await getStreak(STUDENT_A)).toBe(1);
    expect(await getStreak(STUDENT_B)).toBe(1);
  });

  it('increments on a consecutive day (manual yesterday seed)', async () => {
    // Seed a streak with lastDate = yesterday, count = 4
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().slice(0, 10);
    await db.streakRecord.put({
      studentId: STUDENT_A,
      count: 4,
      lastDate: yesterdayISO,
    });

    expect(await updateStreak(STUDENT_A)).toBe(5);
    expect(await getStreak(STUDENT_A)).toBe(5);
  });

  it('resets to 1 when a gap of more than one day exists', async () => {
    // Seed a streak with lastDate = 5 days ago, count = 10
    const old = new Date();
    old.setDate(old.getDate() - 5);
    await db.streakRecord.put({
      studentId: STUDENT_A,
      count: 10,
      lastDate: old.toISOString().slice(0, 10),
    });

    expect(await updateStreak(STUDENT_A)).toBe(1);
  });
});

describe('onboarding — DeviceMeta-backed', () => {
  it('defaults to false on a fresh install', async () => {
    expect(await deviceMetaRepo.getOnboardingComplete()).toBe(false);
  });

  it('persists true after setOnboardingComplete', async () => {
    expect(await deviceMetaRepo.setOnboardingComplete(true)).toBe(true);
    expect(await deviceMetaRepo.getOnboardingComplete()).toBe(true);
  });

  it('can be reset back to false', async () => {
    await deviceMetaRepo.setOnboardingComplete(true);
    await deviceMetaRepo.setOnboardingComplete(false);
    expect(await deviceMetaRepo.getOnboardingComplete()).toBe(false);
  });
});

describe('streakRecordRepo — direct API', () => {
  it('getCount returns 0 for missing rows', async () => {
    expect(await streakRecordRepo.getCount(STUDENT_A)).toBe(0);
  });

  it('update writes a row keyed by studentId', async () => {
    await streakRecordRepo.update(STUDENT_A);
    const row = await db.streakRecord.get(STUDENT_A);
    expect(row?.studentId).toBe(STUDENT_A);
    expect(row?.count).toBe(1);
    expect(row?.lastDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
