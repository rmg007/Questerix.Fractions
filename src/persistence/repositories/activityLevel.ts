/**
 * ActivityLevel repository — static curriculum store.
 * per persistence-spec.md §4, data-schema.md §2.5
 */

import { db } from '../db';
import type { ActivityLevel, ActivityId } from '../../types';

export const activityLevelRepo = {
  async get(id: string): Promise<ActivityLevel | undefined> {
    try {
      return await db.activityLevels.get(id);
    } catch (err) {
      return undefined;
    }
  },

  async getForActivity(activityId: ActivityId): Promise<ActivityLevel[]> {
    try {
      // Compound index [activityId+levelNumber]; fetch all levels for this activity
      return await db.activityLevels
        .where('[activityId+levelNumber]')
        .between([activityId, 1], [activityId, 9], true, true)
        .sortBy('levelNumber');
    } catch (err) {
      return [];
    }
  },

  async getLevel(activityId: ActivityId, levelNumber: number): Promise<ActivityLevel | undefined> {
    try {
      const rows = await db.activityLevels
        .where('[activityId+levelNumber]')
        .equals([activityId, levelNumber])
        .toArray();
      return rows[0];
    } catch (err) {
      return undefined;
    }
  },

  async bulkPut(levels: ActivityLevel[]): Promise<void> {
    await db.activityLevels.bulkPut(levels);
  },

  async clear(): Promise<void> {
    await db.activityLevels.clear();
  },
};
