/**
 * Session repository — thin Dexie wrapper.
 * per persistence-spec.md §4 (dynamic stores)
 */

import Dexie from 'dexie';
import { db } from '../db';
import type { Session, SessionId, StudentId } from '../../types';

export const sessionRepo = {
  async create(record: Session): Promise<Session> {
    await db.sessions.add(record);
    return record;
  },

  async get(id: SessionId): Promise<Session | undefined> {
    try {
      return await db.sessions.get(id);
    } catch {
      return undefined;
    }
  },

  async listForStudent(studentId: StudentId): Promise<Session[]> {
    try {
      return await db.sessions
        .where('[studentId+startedAt]')
        .between([studentId, Dexie.minKey], [studentId, Dexie.maxKey])
        .reverse()
        .toArray();
    } catch {
      return [];
    }
  },

  async update(id: SessionId, patch: Partial<Omit<Session, 'id'>>): Promise<boolean> {
    try {
      const updated = await db.sessions.update(id, patch);
      return updated > 0;
    } catch {
      return false;
    }
  },

  async close(
    id: SessionId,
    summary: Pick<Session, 'endedAt' | 'totalAttempts' | 'correctAttempts' | 'accuracy' | 'avgResponseMs' | 'xpEarned' | 'scaffoldRecommendation' | 'endLevel'>,
  ): Promise<boolean> {
    return sessionRepo.update(id, summary);
  },
};
