/**
 * HintEvent repository — append-only.
 * per persistence-spec.md §4, data-schema.md §3.4
 * Note: table uses ++id (auto-increment); id is cast to string for HintEvent compatibility.
 */

import { db } from '../db';
import type { HintEvent, AttemptId } from '../../types';

export const hintEventRepo = {
  async record(event: Omit<HintEvent, 'id'>): Promise<HintEvent> {
    const toWrite = { ...event, syncState: 'local' as const };
    const key = await db.hintEvents.add(toWrite as HintEvent);
    return { ...toWrite, id: String(key) };
  },

  async listForAttempt(attemptId: AttemptId): Promise<HintEvent[]> {
    try {
      return await db.hintEvents.where('attemptId').equals(attemptId).toArray();
    } catch (err) {
      return [];
    }
  },

  async update(id: string, patch: Partial<HintEvent>): Promise<void> {
    const key = parseInt(id, 10);
    if (isNaN(key)) return;
    await db.hintEvents.update(key, patch);
  },
};
