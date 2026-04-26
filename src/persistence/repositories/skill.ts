/**
 * Skill repository — static curriculum store.
 * per persistence-spec.md §4, data-schema.md §2.3
 */

import { db } from '../db';
import type { Skill, SkillId } from '../../types';

export const skillRepo = {
  async get(id: SkillId): Promise<Skill | undefined> {
    try {
      return await db.skills.get(id);
    } catch {
      return undefined;
    }
  },

  async getAll(): Promise<Skill[]> {
    try {
      return await db.skills.toArray();
    } catch {
      return [];
    }
  },

  async getByGradeLevel(gradeLevel: 0 | 1 | 2): Promise<Skill[]> {
    try {
      return await db.skills.where('gradeLevel').equals(gradeLevel).toArray();
    } catch {
      return [];
    }
  },

  async bulkPut(skills: Skill[]): Promise<void> {
    await db.skills.bulkPut(skills);
  },

  async clear(): Promise<void> {
    await db.skills.clear();
  },
};
