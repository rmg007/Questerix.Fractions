/**
 * Unit tests for sessionRepo.
 * Uses fake-indexeddb (imported in tests/setup.ts) for a real Dexie instance in Node.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/persistence/db';
import { sessionRepo } from '../../../src/persistence/repositories/session';
import { StudentId, SessionId, ActivityId } from '../../../src/types/branded';
import type { Session } from '../../../src/types';

// ── Test fixtures ─────────────────────────────────────────────────────────

const studentId = StudentId('student-uuid-001');
const activityId = ActivityId('magnitude_scales');

/** Build a minimal valid Session. */
function makeSession(overrides: Partial<Session> = {}): Session {
  const id = overrides.id ?? SessionId(`session-${crypto.randomUUID()}`);
  return {
    id,
    studentId,
    activityId,
    levelNumber: 1,
    scaffoldLevel: 3,
    startedAt: Date.now(),
    endedAt: null,
    totalAttempts: 0,
    correctAttempts: 0,
    accuracy: null,
    avgResponseMs: null,
    xpEarned: 0,
    scaffoldRecommendation: null,
    endLevel: 1,
    device: { type: 'desktop', viewport: { width: 1024, height: 768 } },
    syncState: 'local',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('sessionRepo', () => {
  beforeEach(async () => {
    await db.sessions.clear();
  });

  describe('create()', () => {
    it('persists the session and returns it unchanged', async () => {
      const session = makeSession();
      const result = await sessionRepo.create(session);

      expect(result).toEqual(session);
    });

    it('session is retrievable via get() after create()', async () => {
      const session = makeSession();
      await sessionRepo.create(session);

      const fetched = await sessionRepo.get(session.id);
      expect(fetched).toBeDefined();
      expect(fetched?.id).toBe(session.id);
      expect(fetched?.studentId).toBe(studentId);
    });

    it('creates session with endedAt null (open/active state)', async () => {
      const session = makeSession();
      await sessionRepo.create(session);

      const fetched = await sessionRepo.get(session.id);
      expect(fetched?.endedAt).toBeNull();
    });

    it('creates session with correct levelNumber and scaffoldLevel', async () => {
      const session = makeSession({ levelNumber: 3, scaffoldLevel: 2 });
      await sessionRepo.create(session);

      const fetched = await sessionRepo.get(session.id);
      expect(fetched?.levelNumber).toBe(3);
      expect(fetched?.scaffoldLevel).toBe(2);
    });
  });

  describe('close()', () => {
    it('updates endedAt and accuracy on the session', async () => {
      const session = makeSession();
      await sessionRepo.create(session);

      const endedAt = Date.now();
      const success = await sessionRepo.close(session.id, {
        endedAt,
        totalAttempts: 5,
        correctAttempts: 4,
        accuracy: 0.8,
        avgResponseMs: 2500,
        xpEarned: 40,
        scaffoldRecommendation: 'advance',
        endLevel: 1,
      });

      expect(success).toBe(true);

      const updated = await sessionRepo.get(session.id);
      expect(updated?.endedAt).toBe(endedAt);
      expect(updated?.accuracy).toBe(0.8);
      expect(updated?.totalAttempts).toBe(5);
      expect(updated?.correctAttempts).toBe(4);
      expect(updated?.xpEarned).toBe(40);
      expect(updated?.scaffoldRecommendation).toBe('advance');
    });

    it('returns false when closing a non-existent session id', async () => {
      const result = await sessionRepo.close(
        SessionId('does-not-exist'),
        {
          endedAt: Date.now(),
          totalAttempts: 0,
          correctAttempts: 0,
          accuracy: null,
          avgResponseMs: null,
          xpEarned: 0,
          scaffoldRecommendation: null,
          endLevel: 1,
        }
      );
      expect(result).toBe(false);
    });

    it('does not mutate other sessions when closing one', async () => {
      const s1 = makeSession();
      const s2 = makeSession();
      await sessionRepo.create(s1);
      await sessionRepo.create(s2);

      await sessionRepo.close(s1.id, {
        endedAt: Date.now(),
        totalAttempts: 3,
        correctAttempts: 3,
        accuracy: 1.0,
        avgResponseMs: 1000,
        xpEarned: 30,
        scaffoldRecommendation: 'advance',
        endLevel: 1,
      });

      const fetched2 = await sessionRepo.get(s2.id);
      expect(fetched2?.endedAt).toBeNull();
      expect(fetched2?.totalAttempts).toBe(0);
    });
  });

  describe('listForStudent()', () => {
    it('returns sessions for the given student in reverse chronological order', async () => {
      const s1 = makeSession({ startedAt: 1000 });
      const s2 = makeSession({ startedAt: 2000 });
      const s3 = makeSession({ startedAt: 3000 });
      await sessionRepo.create(s1);
      await sessionRepo.create(s2);
      await sessionRepo.create(s3);

      const results = await sessionRepo.listForStudent(studentId);

      expect(results).toHaveLength(3);
      // Dexie returns .reverse() — most recent first
      expect(results[0].startedAt).toBeGreaterThanOrEqual(results[1].startedAt);
    });

    it('excludes sessions belonging to other students', async () => {
      const otherId = StudentId('other-student');
      const s1 = makeSession({ studentId });
      const s2 = makeSession({ studentId: otherId });
      await sessionRepo.create(s1);
      await sessionRepo.create(s2);

      const results = await sessionRepo.listForStudent(studentId);

      expect(results).toHaveLength(1);
      expect(results[0].studentId).toBe(studentId);
    });

    it('returns an empty array for a student with no sessions', async () => {
      const results = await sessionRepo.listForStudent(StudentId('nobody'));
      expect(results).toEqual([]);
    });
  });

  describe('get()', () => {
    it('returns undefined for an unknown sessionId', async () => {
      const result = await sessionRepo.get(SessionId('nonexistent'));
      expect(result).toBeUndefined();
    });
  });

  describe('update()', () => {
    it('patches fields and returns true on success', async () => {
      const session = makeSession();
      await sessionRepo.create(session);

      const success = await sessionRepo.update(session.id, { xpEarned: 100 });
      expect(success).toBe(true);

      const fetched = await sessionRepo.get(session.id);
      expect(fetched?.xpEarned).toBe(100);
    });
  });
});
