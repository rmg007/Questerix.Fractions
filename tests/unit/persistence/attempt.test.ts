/**
 * Unit tests for attemptRepo.
 * Uses fake-indexeddb (imported in tests/setup.ts) for a real Dexie instance in Node.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/persistence/db';
import { attemptRepo } from '../../../src/persistence/repositories/attempt';
import {
  StudentId,
  SessionId,
  AttemptId,
  QuestionTemplateId,
  ActivityId,
} from '../../../src/types/branded';
import type { Attempt } from '../../../src/types';

// ── Test fixtures ─────────────────────────────────────────────────────────

const studentId = StudentId('student-uuid-001');
const sessionId = SessionId('session-uuid-001');
const otherSessionId = SessionId('session-uuid-002');
const questionTemplateId = QuestionTemplateId('q:partition:L1:0001');

/** Builds a minimal valid Attempt (without id — record() assigns it). */
function makeAttempt(overrides: Partial<Omit<Attempt, 'id'>> = {}): Omit<Attempt, 'id'> {
  return {
    sessionId,
    studentId,
    questionTemplateId,
    archetype: 'partition' as Attempt['archetype'],
    roundNumber: 1,
    attemptNumber: 1,
    startedAt: Date.now() - 5000,
    submittedAt: Date.now(),
    responseMs: 5000,
    studentAnswerRaw: { parts: 2, shaded: 1 },
    correctAnswerRaw: { parts: 2, shaded: 1 },
    outcome: 'EXACT',
    errorMagnitude: null,
    pointsEarned: 10,
    hintsUsedIds: [],
    hintsUsed: [],
    flaggedMisconceptionIds: [],
    validatorPayload: {},
    syncState: 'local',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('attemptRepo', () => {
  beforeEach(async () => {
    await db.attempts.clear();
  });

  describe('record()', () => {
    it('adds a row and returns the attempt with an auto-increment id', async () => {
      const result = await attemptRepo.record(makeAttempt());

      expect(result).toBeDefined();
      expect(typeof result.id).toBe('string');
      // id is the stringified auto-increment number — should be numeric
      expect(Number(result.id)).toBeGreaterThan(0);
      expect(result.sessionId).toBe(sessionId);
      expect(result.studentId).toBe(studentId);
      expect(result.outcome).toBe('EXACT');
      expect(result.syncState).toBe('local');
    });

    it('assigns incrementing ids for successive records', async () => {
      const a1 = await attemptRepo.record(makeAttempt({ roundNumber: 1 }));
      const a2 = await attemptRepo.record(makeAttempt({ roundNumber: 2 }));

      expect(Number(a1.id)).toBeLessThan(Number(a2.id));
    });

    it('persists the row so get() can retrieve it', async () => {
      const inserted = await attemptRepo.record(makeAttempt());
      const fetched = await attemptRepo.get(inserted.id as AttemptId);

      expect(fetched).toBeDefined();
      expect(fetched?.id).toBe(inserted.id);
      expect(fetched?.outcome).toBe('EXACT');
    });

    it('handles missing optional fields gracefully (roundEvents, payload, skillIds)', async () => {
      // Omitting all optional fields — should not throw
      const result = await attemptRepo.record(makeAttempt());

      expect(result).toBeDefined();
      // Optional fields are absent or undefined — not required
      expect(result.roundEvents).toBeUndefined();
      expect(result.payload).toBeUndefined();
      expect(result.skillIds).toBeUndefined();
    });

    it('stores syncState as "local"', async () => {
      const result = await attemptRepo.record(makeAttempt({ syncState: 'synced' }));
      // record() forces syncState to 'local' regardless of input
      expect(result.syncState).toBe('local');
    });
  });

  describe('listForSession()', () => {
    it('returns only attempts for the given sessionId', async () => {
      await attemptRepo.record(makeAttempt({ sessionId, roundNumber: 1 }));
      await attemptRepo.record(makeAttempt({ sessionId, roundNumber: 2 }));
      await attemptRepo.record(makeAttempt({ sessionId: otherSessionId, roundNumber: 3 }));

      const results = await attemptRepo.listForSession(sessionId);

      expect(results).toHaveLength(2);
      results.forEach((a) => expect(a.sessionId).toBe(sessionId));
    });

    it('returns an empty array when no attempts exist for the session', async () => {
      const results = await attemptRepo.listForSession(SessionId('nonexistent'));
      expect(results).toEqual([]);
    });

    it('returns all attempts across multiple sessions when queried separately', async () => {
      await attemptRepo.record(makeAttempt({ sessionId }));
      await attemptRepo.record(makeAttempt({ sessionId: otherSessionId }));

      const s1 = await attemptRepo.listForSession(sessionId);
      const s2 = await attemptRepo.listForSession(otherSessionId);

      expect(s1).toHaveLength(1);
      expect(s2).toHaveLength(1);
    });
  });

  describe('get()', () => {
    it('returns undefined for an unknown id', async () => {
      const result = await attemptRepo.get(AttemptId('9999'));
      expect(result).toBeUndefined();
    });
  });

  describe('listForStudent()', () => {
    it('returns all attempts for a student across sessions', async () => {
      const otherId = StudentId('other-student');
      await attemptRepo.record(makeAttempt({ studentId, sessionId }));
      await attemptRepo.record(makeAttempt({ studentId, sessionId: otherSessionId }));
      await attemptRepo.record(makeAttempt({ studentId: otherId, sessionId }));

      const results = await attemptRepo.listForStudent(studentId);

      expect(results).toHaveLength(2);
      results.forEach((a) => expect(a.studentId).toBe(studentId));
    });
  });

  describe('countForStudent()', () => {
    it('returns 0 when student has no attempts', async () => {
      const count = await attemptRepo.countForStudent(StudentId('nobody'));
      expect(count).toBe(0);
    });

    it('counts correctly after several records', async () => {
      await attemptRepo.record(makeAttempt({ roundNumber: 1 }));
      await attemptRepo.record(makeAttempt({ roundNumber: 2 }));
      await attemptRepo.record(makeAttempt({ roundNumber: 3 }));

      const count = await attemptRepo.countForStudent(studentId);
      expect(count).toBe(3);
    });
  });

  describe('listForStudentTemplate()', () => {
    it('returns only attempts matching both studentId and questionTemplateId', async () => {
      const otherQtId = QuestionTemplateId('q:partition:L1:0002');
      const actId = ActivityId('magnitude_scales');
      await attemptRepo.record(makeAttempt({ questionTemplateId }));
      await attemptRepo.record(makeAttempt({ questionTemplateId: otherQtId }));

      const results = await attemptRepo.listForStudentTemplate(studentId, questionTemplateId);

      expect(results).toHaveLength(1);
      expect(results[0].questionTemplateId).toBe(questionTemplateId);

      // Suppress unused variable warning
      void actId;
    });
  });
});
