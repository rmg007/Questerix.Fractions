/**
 * Unit tests for skillMasteryRepo.
 * Uses fake-indexeddb (imported in tests/setup.ts) for a real Dexie instance in Node.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/persistence/db';
import { skillMasteryRepo } from '../../../src/persistence/repositories/skillMastery';
import { StudentId, SkillId } from '../../../src/types/branded';
import type { SkillMastery } from '../../../src/types';

// ── Test fixtures ─────────────────────────────────────────────────────────

const studentId = StudentId('student-uuid-001');
const skillId = SkillId('SK-01');
const otherSkillId = SkillId('SK-02');

function makeSkillMastery(overrides: Partial<SkillMastery> = {}): SkillMastery {
  return {
    studentId,
    skillId,
    compositeKey: [studentId, skillId],
    masteryEstimate: 0.5,
    state: 'LEARNING',
    consecutiveCorrectUnassisted: 0,
    totalAttempts: 1,
    correctAttempts: 1,
    lastAttemptAt: Date.now(),
    masteredAt: null,
    decayedAt: null,
    syncState: 'local',
    ...overrides,
    // Ensure compositeKey is consistent with studentId/skillId if overriding either
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('skillMasteryRepo', () => {
  beforeEach(async () => {
    await db.skillMastery.clear();
  });

  describe('get()', () => {
    it('returns undefined for an unknown (studentId, skillId) pair', async () => {
      const result = await skillMasteryRepo.get(StudentId('nobody'), SkillId('SK-99'));
      expect(result).toBeUndefined();
    });

    it('returns undefined when the student exists but skill does not', async () => {
      await skillMasteryRepo.upsert(makeSkillMastery({ skillId, compositeKey: [studentId, skillId] }));

      const result = await skillMasteryRepo.get(studentId, SkillId('SK-99'));
      expect(result).toBeUndefined();
    });

    it('returns the mastery row after it has been upserted', async () => {
      const mastery = makeSkillMastery();
      await skillMasteryRepo.upsert(mastery);

      const result = await skillMasteryRepo.get(studentId, skillId);
      expect(result).toBeDefined();
      expect(result?.masteryEstimate).toBe(0.5);
      expect(result?.state).toBe('LEARNING');
    });
  });

  describe('upsert()', () => {
    it('creates a new row if one does not exist', async () => {
      const mastery = makeSkillMastery({ masteryEstimate: 0.3 });
      await skillMasteryRepo.upsert(mastery);

      const result = await skillMasteryRepo.get(studentId, skillId);
      expect(result).toBeDefined();
      expect(result?.masteryEstimate).toBe(0.3);
    });

    it('updates the existing row on a second call (put semantics)', async () => {
      const initial = makeSkillMastery({ masteryEstimate: 0.3, state: 'LEARNING' });
      await skillMasteryRepo.upsert(initial);

      const updated = makeSkillMastery({
        masteryEstimate: 0.85,
        state: 'MASTERED',
        consecutiveCorrectUnassisted: 3,
        totalAttempts: 4,
        correctAttempts: 4,
      });
      await skillMasteryRepo.upsert(updated);

      const result = await skillMasteryRepo.get(studentId, skillId);
      expect(result?.masteryEstimate).toBe(0.85);
      expect(result?.state).toBe('MASTERED');
      expect(result?.consecutiveCorrectUnassisted).toBe(3);
    });

    it('does not create duplicate rows — table size stays at 1 after two upserts for same key', async () => {
      await skillMasteryRepo.upsert(makeSkillMastery({ masteryEstimate: 0.3 }));
      await skillMasteryRepo.upsert(makeSkillMastery({ masteryEstimate: 0.6 }));

      const allRows = await db.skillMastery.toArray();
      expect(allRows).toHaveLength(1);
      expect(allRows[0].masteryEstimate).toBe(0.6);
    });

    it('stores separate rows for different skills of the same student', async () => {
      await skillMasteryRepo.upsert(makeSkillMastery({
        skillId,
        compositeKey: [studentId, skillId],
        masteryEstimate: 0.4,
      }));
      await skillMasteryRepo.upsert(makeSkillMastery({
        skillId: otherSkillId,
        compositeKey: [studentId, otherSkillId],
        masteryEstimate: 0.7,
      }));

      const r1 = await skillMasteryRepo.get(studentId, skillId);
      const r2 = await skillMasteryRepo.get(studentId, otherSkillId);

      expect(r1?.masteryEstimate).toBe(0.4);
      expect(r2?.masteryEstimate).toBe(0.7);
    });
  });

  describe('getAllForStudent()', () => {
    it('returns all mastery rows for the given student', async () => {
      await skillMasteryRepo.upsert(makeSkillMastery({
        skillId,
        compositeKey: [studentId, skillId],
      }));
      await skillMasteryRepo.upsert(makeSkillMastery({
        skillId: otherSkillId,
        compositeKey: [studentId, otherSkillId],
      }));

      const results = await skillMasteryRepo.getAllForStudent(studentId);
      expect(results).toHaveLength(2);
      results.forEach((r) => expect(r.studentId).toBe(studentId));
    });

    it('returns an empty array when no mastery rows exist for the student', async () => {
      const results = await skillMasteryRepo.getAllForStudent(StudentId('nobody'));
      expect(results).toEqual([]);
    });
  });

  describe('delete()', () => {
    it('removes the row so get() returns undefined afterwards', async () => {
      await skillMasteryRepo.upsert(makeSkillMastery());
      await skillMasteryRepo.delete(studentId, skillId);

      const result = await skillMasteryRepo.get(studentId, skillId);
      expect(result).toBeUndefined();
    });

    it('is idempotent — deleting a non-existent row does not throw', async () => {
      await expect(skillMasteryRepo.delete(StudentId('nobody'), SkillId('SK-99'))).resolves.toBeUndefined();
    });
  });
});
