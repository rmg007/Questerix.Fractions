/**
 * HintEvent repository — append-only with post-submission attempt linking.
 * per persistence-spec.md §4, data-schema.md §3.4
 * Note: table uses ++id (auto-increment number); HintEvent.id is number, not string.
 */

import { db } from '../db';
import type { HintEvent, AttemptId } from '../../types';

export const hintEventRepo = {
  async record(event: Omit<HintEvent, 'id'>): Promise<HintEvent> {
    const toWrite = { ...event, syncState: 'local' as const };
    const key = await db.hintEvents.add(toWrite as HintEvent);
    return { ...toWrite, id: key as number };
  },

  /** Link a batch of hint events to an attempt after the attempt is persisted. */
  async linkToAttempt(ids: number[], attemptId: AttemptId): Promise<void> {
    await db.transaction('rw', db.hintEvents, async () => {
      for (const id of ids) {
        await db.hintEvents.update(id, { attemptId });
      }
    });
  },

  async listForAttempt(attemptId: AttemptId): Promise<HintEvent[]> {
    try {
      return await db.hintEvents.where('attemptId').equals(attemptId).toArray();
    } catch {
      return [];
    }
  },
};
