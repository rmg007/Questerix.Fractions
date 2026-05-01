/**
 * QuestionTemplate repository — thin Dexie wrapper for static curriculum store.
 * per persistence-spec.md §4 (static stores), runtime-architecture.md §4.1
 */

import { db } from '../db';
import { deriveLevelGroup, type LevelGroup } from '../../curriculum/levelGroup';
import type { QuestionTemplate, QuestionTemplateId, ArchetypeId } from '../../types';

/**
 * Stored shape extends QuestionTemplate with a derived `levelGroup` field
 * used for Dexie compound queries. per persistence-spec.md §4 (index: levelGroup)
 */
export interface StoredQuestionTemplate extends QuestionTemplate {
  /** Derived from id format 'q:<arch>:L{N}:NNNN' — maps to Activity.levelGroup */
  levelGroup: LevelGroup;
}

export const questionTemplateRepo = {
  /**
   * Append-only upsert using primary key.
   * per persistence-spec.md §4 — static stores replaced on contentVersion bump.
   */
  async bulkPut(templates: QuestionTemplate[]): Promise<void> {
    const stored: StoredQuestionTemplate[] = templates.map((t) => ({
      ...t,
      levelGroup: deriveLevelGroup(t.id),
    }));
    // Explicitly strip levelGroup before persisting to match DB schema.
    // levelGroup is derived on read; not part of QuestionTemplate's base type.
    const sanitized = stored.map(({ levelGroup: _lg, ...rest }) => rest);
    await db.questionTemplates.bulkPut(sanitized);
  },

  /**
   * Return all templates whose ID matches 'q:*:L{level}:*'.
   * per runtime-architecture.md §4.1 (CurriculumLoader.getQuestionsForLevel)
   */
  async getByLevel(level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9): Promise<QuestionTemplate[]> {
    const prefix = `:L${level}:`;
    // IndexedDB doesn't support substring search; filter in JS after a levelGroup pre-filter.
    const group: LevelGroup = deriveLevelGroup(`q:x:L${level}:0001`);
    const candidates = await db.questionTemplates.where('levelGroup').equals(group).toArray();
    return candidates.filter((t) => t.id.includes(prefix));
  },

  /**
   * Return templates filtered by archetype, difficultyTier, and levelGroup.
   * per runtime-architecture.md §4.1 (question-selection)
   */
  async getByArchetypeAndTier(
    archetype: ArchetypeId,
    tier: 'easy' | 'medium' | 'hard',
    levelGroup: StoredQuestionTemplate['levelGroup']
  ): Promise<QuestionTemplate[]> {
    return db.questionTemplates
      .where('[archetype+difficultyTier]')
      .equals([archetype, tier])
      .filter((t) => (t as StoredQuestionTemplate).levelGroup === levelGroup)
      .toArray();
  },

  /** Row count — 0 signals first boot / seed needed. per seed.ts */
  async count(): Promise<number> {
    return db.questionTemplates.count();
  },

  async get(id: QuestionTemplateId): Promise<QuestionTemplate | undefined> {
    return db.questionTemplates.get(id);
  },
};
