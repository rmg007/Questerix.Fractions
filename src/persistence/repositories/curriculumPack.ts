/**
 * CurriculumPack repository — singleton static store.
 * Replaced wholesale on contentVersion bump. per persistence-spec.md §5, data-schema.md §2.1
 */

import { db } from '../db';
import type { CurriculumPack } from '../../types';

export const curriculumPackRepo = {
  async get(id: string): Promise<CurriculumPack | undefined> {
    try {
      return await db.curriculumPacks.get(id);
    } catch (err) {
      return undefined;
    }
  },

  async getCurrent(): Promise<CurriculumPack | undefined> {
    try {
      return await db.curriculumPacks.toCollection().first();
    } catch (err) {
      return undefined;
    }
  },

  async put(pack: CurriculumPack): Promise<void> {
    await db.curriculumPacks.put(pack);
  },

  async clear(): Promise<void> {
    await db.curriculumPacks.clear();
  },
};
