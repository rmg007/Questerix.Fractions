/**
 * studentRepo unit tests — multi-student CRUD + cap enforcement.
 * per multi-student-and-first-run plan §Phase 1
 * Uses fake-indexeddb (imported in tests/setup.ts) so tests run in Node.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/persistence/db';
import { studentRepo, MAX_PROFILES } from '@/persistence/repositories/studentRepo';
import { StudentId } from '@/types/branded';

// ── Helpers ────────────────────────────────────────────────────────────────

async function seedStudents(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    const id = StudentId(`seed-${i}`);
    await db.students.add({
      id,
      displayName: `Player ${i + 1}`,
      avatarConfig: {},
      gradeLevel: 1,
      createdAt: Date.now() + i,
      lastActiveAt: Date.now() + i,
      localOnly: true,
      syncState: 'local',
    });
  }
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await db.students.clear();
});

// ── list() ─────────────────────────────────────────────────────────────────

describe('studentRepo.list()', () => {
  it('returns empty array when no students exist', async () => {
    const result = await studentRepo.list();
    expect(result).toEqual([]);
  });

  it('returns all students sorted by createdAt ascending', async () => {
    await seedStudents(3);
    const result = await studentRepo.list();
    expect(result).toHaveLength(3);
    // Sorted by createdAt ascending (orderBy)
    expect(result[0]?.displayName).toBe('Player 1');
    expect(result[2]?.displayName).toBe('Player 3');
  });

  it('caps at MAX_PROFILES even if DB has more rows (edge case)', async () => {
    // Bypass the cap to seed extra rows directly
    for (let i = 0; i < 6; i++) {
      await db.students.add({
        id: StudentId(`extra-${i}`),
        displayName: `Extra ${i}`,
        avatarConfig: {},
        gradeLevel: 1,
        createdAt: Date.now() + i,
        lastActiveAt: Date.now() + i,
        localOnly: true,
        syncState: 'local',
      });
    }
    const result = await studentRepo.list();
    expect(result.length).toBeLessThanOrEqual(MAX_PROFILES);
  });
});

// ── get() ──────────────────────────────────────────────────────────────────

describe('studentRepo.get()', () => {
  it('returns the student when it exists', async () => {
    const id = StudentId('get-test-1');
    await db.students.add({
      id,
      displayName: 'Alice',
      avatarConfig: {},
      gradeLevel: 1,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      localOnly: true,
      syncState: 'local',
    });
    const result = await studentRepo.get(id);
    expect(result?.displayName).toBe('Alice');
  });

  it('returns undefined for a missing ID', async () => {
    const result = await studentRepo.get(StudentId('nonexistent'));
    expect(result).toBeUndefined();
  });
});

// ── create() ───────────────────────────────────────────────────────────────

describe('studentRepo.create()', () => {
  it('creates a new student with default name when none provided', async () => {
    const result = await studentRepo.create({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.displayName).toBe('Player');
    expect(result.value.syncState).toBe('local');
    expect(result.value.createdAt).toBeTypeOf('number');
    expect(result.value.id).toBeTruthy();
  });

  it('creates a student with the provided displayName', async () => {
    const result = await studentRepo.create({ displayName: 'Bob' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.displayName).toBe('Bob');
  });

  it('trims whitespace from displayName', async () => {
    const result = await studentRepo.create({ displayName: '  Carol  ' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.displayName).toBe('Carol');
  });

  it('assigns avatar from options', async () => {
    const result = await studentRepo.create({ displayName: 'Dave', avatar: 'rocket' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.avatar).toBe('rocket');
  });

  it('returns at_capacity when MAX_PROFILES already exist', async () => {
    await seedStudents(MAX_PROFILES);
    const result = await studentRepo.create({ displayName: 'Overflow' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('at_capacity');
  });

  it('allows exactly MAX_PROFILES students to be created', async () => {
    for (let i = 0; i < MAX_PROFILES; i++) {
      const r = await studentRepo.create({ displayName: `Player ${i + 1}` });
      expect(r.ok).toBe(true);
    }
    const count = await db.students.count();
    expect(count).toBe(MAX_PROFILES);
  });
});

// ── rename() ───────────────────────────────────────────────────────────────

describe('studentRepo.rename()', () => {
  it('renames an existing student', async () => {
    const created = await studentRepo.create({ displayName: 'Eve' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await studentRepo.rename(created.value.id, 'Evelyn');
    expect(result.ok).toBe(true);

    const fetched = await studentRepo.get(created.value.id);
    expect(fetched?.displayName).toBe('Evelyn');
  });

  it('returns not_found for a missing ID', async () => {
    const result = await studentRepo.rename(StudentId('ghost'), 'Ghost');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not_found');
  });

  it('trims whitespace from new name', async () => {
    const created = await studentRepo.create({ displayName: 'Frank' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await studentRepo.rename(created.value.id, '  Frank Jr  ');
    const fetched = await studentRepo.get(created.value.id);
    expect(fetched?.displayName).toBe('Frank Jr');
  });
});

// ── remove() ───────────────────────────────────────────────────────────────

describe('studentRepo.remove()', () => {
  it('removes a student when more than one exists', async () => {
    const r1 = await studentRepo.create({ displayName: 'Grace' });
    const r2 = await studentRepo.create({ displayName: 'Heidi' });
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;

    const removeResult = await studentRepo.remove(r1.value.id);
    expect(removeResult.ok).toBe(true);

    const remaining = await studentRepo.list();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.displayName).toBe('Heidi');
  });

  it('returns last_profile when removing the only student', async () => {
    const created = await studentRepo.create({ displayName: 'Ivan' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await studentRepo.remove(created.value.id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('last_profile');
  });
});

// ── setAvatar() ────────────────────────────────────────────────────────────

describe('studentRepo.setAvatar()', () => {
  it('sets the avatar for an existing student', async () => {
    const created = await studentRepo.create({ displayName: 'Julia' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await studentRepo.setAvatar(created.value.id, 'owl');
    expect(result.ok).toBe(true);

    const fetched = await studentRepo.get(created.value.id);
    expect(fetched?.avatar).toBe('owl');
  });

  it('returns not_found for a missing ID', async () => {
    const result = await studentRepo.setAvatar(StudentId('ghost'), 'fox');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not_found');
  });
});

// ── createRaw() ────────────────────────────────────────────────────────────

describe('studentRepo.createRaw()', () => {
  it('creates a student with explicit fields', async () => {
    const id = StudentId('raw-test-1');
    const result = await studentRepo.createRaw({
      id,
      displayName: 'Karl',
      avatarConfig: {},
      gradeLevel: 1,
      lastActiveAt: Date.now(),
      localOnly: true,
    });
    expect(result?.id).toBe(id);
    expect(result?.displayName).toBe('Karl');
    expect(result?.syncState).toBe('local');
  });
});
