/**
 * Attempt repository — append-only.
 * per persistence-spec.md §4 "append-only attempt records"
 * Records are NEVER updated after insert — full audit trail.
 */

import Dexie from 'dexie';
import { db } from '../db';
import { log } from '../../lib/log';
import type { Attempt, AttemptId, StudentId, SessionId, QuestionTemplateId } from '../../types';

export const attemptRepo = {
  /**
   * Append a new attempt row. Returns the record with the auto-incremented id
   * cast back to AttemptId for type consistency.
   * per persistence-spec.md §4 — append-only
   */
  async record(attempt: Omit<Attempt, 'id'> & { id?: AttemptId }): Promise<Attempt | undefined> {
    const toWrite = { ...attempt, syncState: 'local' as const };
    try {
      const key = await db.attempts.add(toWrite as Attempt);
      return { ...toWrite, id: String(key) as AttemptId };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        log.warn('DB', 'quota_exceeded', { table: 'attempts' });
        return undefined;
      }
      throw err;
    }
  },

  async get(id: AttemptId): Promise<Attempt | undefined> {
    try {
      // auto-increment PK is stored as number in IndexedDB
      const numericId = Number(id);
      return await db.attempts.get(numericId);
    } catch {
      return undefined;
    }
  },

  async listForSession(sessionId: SessionId): Promise<Attempt[]> {
    try {
      return await db.attempts.where('sessionId').equals(sessionId).toArray();
    } catch {
      return [];
    }
  },

  async listForStudent(studentId: StudentId): Promise<Attempt[]> {
    try {
      return await db.attempts
        .where('[studentId+submittedAt]')
        .between([studentId, Dexie.minKey], [studentId, Dexie.maxKey])
        .toArray();
    } catch {
      return [];
    }
  },

  async countForStudent(studentId: StudentId): Promise<number> {
    try {
      return await db.attempts.where('studentId').equals(studentId).count();
    } catch {
      return 0;
    }
  },

  async listForStudentTemplate(
    studentId: StudentId,
    questionTemplateId: QuestionTemplateId
  ): Promise<Attempt[]> {
    try {
      return await db.attempts
        .where('[studentId+questionTemplateId]')
        .equals([studentId, questionTemplateId])
        .toArray();
    } catch {
      return [];
    }
  },

  async getByArchetype(
    archetype: string,
    _level: number,
    options?: { limit?: number }
  ): Promise<Attempt[]> {
    try {
      let results = await db.attempts
        .where('[archetype+submittedAt]')
        .between([archetype, Dexie.minKey], [archetype, Dexie.maxKey])
        .reverse()
        .toArray();

      if (options?.limit) {
        results = results.slice(0, options.limit);
      }
      return results;
    } catch {
      return [];
    }
  },
};
