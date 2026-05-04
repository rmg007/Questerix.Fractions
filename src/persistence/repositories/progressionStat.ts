/**
 * ProgressionStat repository — upsert via composite key [studentId+activityId].
 * Tracks where in the level ladder each student is per activity.
 * per persistence-spec.md §4, data-schema.md §3.7
 */

import Dexie from 'dexie';
import { db, withQuotaGuard } from '../db';
import { log } from '../../lib/log';
import type { ProgressionStat, StudentId, ActivityId } from '../../types';

export const progressionStatRepo = {
  async get(studentId: StudentId, activityId: ActivityId): Promise<ProgressionStat | undefined> {
    try {
      return await db.progressionStat.get([studentId, activityId]);
    } catch (err) {
      return undefined;
    }
  },

  async upsert(stat: ProgressionStat): Promise<void> {
    const result = await withQuotaGuard(() => db.progressionStat.put(stat));
    if (result === null) {
      log.warn('DB', 'quota_exceeded', { table: 'progressionStat' });
    }
  },

  async getAllForStudent(studentId: StudentId): Promise<ProgressionStat[]> {
    try {
      return await db.progressionStat
        .where('[studentId+lastSessionAt]')
        .between([studentId, Dexie.minKey], [studentId, Dexie.maxKey])
        .reverse()
        .toArray();
    } catch (err) {
      return [];
    }
  },

  async delete(studentId: StudentId, activityId: ActivityId): Promise<void> {
    try {
      await db.progressionStat.delete([studentId, activityId]);
    } catch (err) {
      // idempotent
    }
  },
};
