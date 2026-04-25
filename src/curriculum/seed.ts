/**
 * Curriculum seed — bulk-inserts QuestionTemplates into Dexie on first boot.
 * per persistence-spec.md §5 (bootstrap sequence step 4)
 * per runtime-architecture.md §5 (BootScene step 3c — static seed)
 */

import { loadCurriculumBundle } from './loader';
import { questionTemplateRepo } from '../persistence/repositories/questionTemplate';

export interface SeedResult {
  seeded: number;
  alreadySeeded: boolean;
}

/**
 * Seed the questionTemplates table if it is empty.
 * Safe to call on every boot — idempotent.
 * Never throws: failure returns { seeded: 0, alreadySeeded: false }.
 */
export async function seedIfEmpty(): Promise<SeedResult> {
  try {
    // 1. Check existing count. per persistence-spec.md §5 step 4.
    const existing = await questionTemplateRepo.count();
    if (existing > 0) {
      return { seeded: existing, alreadySeeded: true };
    }

    // 2. Fetch the curriculum bundle from public/
    const templates = await loadCurriculumBundle();
    if (templates.length === 0) {
      // Bundle missing or empty — game runs with synthetic content fallback
      return { seeded: 0, alreadySeeded: false };
    }

    // 3. Bulk upsert — append-only style per persistence-spec.md §4
    await questionTemplateRepo.bulkPut(templates);

    console.info(`[seedIfEmpty] Seeded ${templates.length} question templates`);
    return { seeded: templates.length, alreadySeeded: false };
  } catch (err) {
    // Never crash the game over a missing curriculum. per runtime-architecture.md §10.
    console.error('[seedIfEmpty] Seed failed — game will use synthetic fallback:', err);
    return { seeded: 0, alreadySeeded: false };
  }
}
