/**
 * Curriculum bundle loader — fetches /curriculum/v1.json and flattens to QuestionTemplate[].
 * per runtime-architecture.md §4.1 (Curriculum Loader)
 * per persistence-spec.md §5 §3 (static seed, graceful degradation)
 */

import type { QuestionTemplate } from '@/types';

export interface CurriculumBundle {
  version: number;
  generatedAt: string;
  levels: Record<string, QuestionTemplate[]>;
}

/**
 * Fetch the curriculum bundle JSON and return a flat array of QuestionTemplates.
 * Tolerates 404 — returns [] so the game degrades gracefully (no crash).
 * per persistence-spec.md §5 (static seed cost), runtime-architecture.md §10 (failure modes)
 */
export async function loadCurriculumBundle(
  url = '/curriculum/v1.json',
): Promise<QuestionTemplate[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      // 404 is expected when running before build:curriculum. per task spec.
      console.warn(`[loadCurriculumBundle] Fetch returned ${response.status} for ${url} — skipping seed`);
      return [];
    }
    const bundle: CurriculumBundle = (await response.json()) as CurriculumBundle;

    // Basic shape validation — guard against malformed bundles
    if (
      typeof bundle.version !== 'number' ||
      typeof bundle.levels !== 'object' ||
      bundle.levels === null
    ) {
      console.error('[loadCurriculumBundle] Bundle shape invalid — skipping seed');
      return [];
    }

    // Flatten levels record into a single array
    return Object.values(bundle.levels).flat();
  } catch (err) {
    // Network failure or JSON parse error — degrade gracefully
    console.warn('[loadCurriculumBundle] Failed to load curriculum bundle:', err);
    return [];
  }
}
