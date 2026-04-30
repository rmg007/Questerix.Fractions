/**
 * Misconception repository — static curriculum store.
 * per persistence-spec.md §4, data-schema.md §2.8
 */

import { db } from '../db';
import type { Misconception, MisconceptionId } from '../../types';

export const misconceptionRepo = {
  async get(id: MisconceptionId): Promise<Misconception | undefined> {
    try {
      return await db.misconceptions.get(id);
    } catch (err) {
      return undefined;
    }
  },

  async getAll(): Promise<Misconception[]> {
    try {
      return await db.misconceptions.toArray();
    } catch (err) {
      return [];
    }
  },

  async bulkPut(misconceptions: Misconception[]): Promise<void> {
    await db.misconceptions.bulkPut(misconceptions);
  },

  async clear(): Promise<void> {
    await db.misconceptions.clear();
  },
};

