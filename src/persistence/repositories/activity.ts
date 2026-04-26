/**
 * Activity repository — static curriculum store.
 * per persistence-spec.md §4, data-schema.md §2.4
 */

import { db } from '../db';
import type { Activity, ActivityId, ArchetypeId } from '../../types';

export const activityRepo = {
  async get(id: ActivityId): Promise<Activity | undefined> {
    try {
      return await db.activities.get(id);
    } catch {
      return undefined;
    }
  },

  async getAll(): Promise<Activity[]> {
    try {
      return await db.activities.toArray();
    } catch {
      return [];
    }
  },

  async getByLevelGroup(levelGroup: '01-02' | '03-05' | '06-09'): Promise<Activity[]> {
    try {
      return await db.activities.where('levelGroup').equals(levelGroup).toArray();
    } catch {
      return [];
    }
  },

  async getByArchetype(archetype: ArchetypeId): Promise<Activity[]> {
    try {
      return await db.activities.where('archetype').equals(archetype).toArray();
    } catch {
      return [];
    }
  },

  async bulkPut(activities: Activity[]): Promise<void> {
    await db.activities.bulkPut(activities);
  },

  async clear(): Promise<void> {
    await db.activities.clear();
  },
};
