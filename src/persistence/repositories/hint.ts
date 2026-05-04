/**
 * Hint repository — static curriculum store.
 * Stores HintTemplate records keyed by id, queryable by questionTemplateId+order.
 * per persistence-spec.md §4, data-schema.md §2.9
 */

import { db } from '../db';
import type { HintTemplate, HintTemplateId, QuestionTemplateId } from '../../types';

export const hintRepo = {
  async get(id: HintTemplateId): Promise<HintTemplate | undefined> {
    try {
      return await db.hints.get(id);
    } catch (err) {
      return undefined;
    }
  },

  async getForQuestion(questionTemplateId: QuestionTemplateId): Promise<HintTemplate[]> {
    try {
      return await db.hints
        .where('[questionTemplateId+order]')
        .between([questionTemplateId, 1], [questionTemplateId, 3], true, true)
        .sortBy('order');
    } catch (err) {
      return [];
    }
  },

  async bulkPut(hints: HintTemplate[]): Promise<void> {
    await db.hints.bulkPut(hints);
  },

  async clear(): Promise<void> {
    await db.hints.clear();
  },
};
