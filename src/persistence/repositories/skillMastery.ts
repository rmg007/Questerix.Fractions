/**
 * SkillMastery repository — upsert via composite key [studentId+skillId].
 * Used by the BKT engine to read/write mastery estimates.
 * per persistence-spec.md §4
 */

import { db } from '../db';
import type { SkillMastery, StudentId, SkillId } from '../../types';

export const skillMasteryRepo = {
  async get(studentId: StudentId, skillId: SkillId): Promise<SkillMastery | undefined> {
    try {
      return await db.skillMastery.get([studentId, skillId]);
    } catch (err) {
      return undefined;
    }
  },

  /**
   * Insert or fully replace the mastery row for this (studentId, skillId) pair.
   * Caller must supply the full SkillMastery shape; BKT engine owns the merge.
   */
  async upsert(mastery: SkillMastery): Promise<void> {
    try {
      await db.skillMastery.put(mastery);
    } catch (err) {
      // swallow write errors; BKT will retry on next attempt
    }
  },

  async getAllForStudent(studentId: StudentId): Promise<SkillMastery[]> {
    try {
      return await db.skillMastery.where('studentId').equals(studentId).toArray();
    } catch (err) {
      return [];
    }
  },

  async delete(studentId: StudentId, skillId: SkillId): Promise<void> {
    try {
      await db.skillMastery.delete([studentId, skillId]);
    } catch (err) {
      // idempotent
    }
  },
};
