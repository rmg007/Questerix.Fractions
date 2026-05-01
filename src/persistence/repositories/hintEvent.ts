/**
 * HintEvent repository — append-only.
 * per persistence-spec.md §4, data-schema.md §3.4
 * Note: table uses ++id (auto-increment); id is cast to string for HintEvent compatibility.
 */

import { db } from '../db';
import { log } from '../../lib/log';
import type { HintEvent, AttemptId } from '../../types';

export const hintEventRepo = {
  async record(event: Omit<HintEvent, 'id'>): Promise<HintEvent | undefined> {
    const toWrite = { ...event, syncState: 'local' as const };
    try {
      const key = await db.hintEvents.add(toWrite as HintEvent);
      return { ...toWrite, id: String(key) };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        log.warn('DB', 'quota_exceeded', { table: 'hintEvents' });
        return undefined;
      }
      throw err;
    }
  },

  async listForAttempt(attemptId: AttemptId): Promise<HintEvent[]> {
    try {
      return await db.hintEvents.where('attemptId').equals(attemptId).toArray();
    } catch {
      return [];
    }
  },
};
