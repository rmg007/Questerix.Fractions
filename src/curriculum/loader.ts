/**
 * Curriculum bundle loader — fetches curriculum JSON and extracts all static entities.
 * per persistence-spec.md §5 (static seed)
 * per runtime-architecture.md §4.1 (Curriculum Loader), §10 (graceful degradation)
 */

import type {
  CurriculumPack,
  StandardsItem,
  Skill,
  Activity,
  ActivityLevel,
  FractionBank,
  QuestionTemplate,
  Misconception,
  HintTemplate,
} from '@/types';

export interface CurriculumBundle {
  version: number;
  contentVersion: string;
  generatedAt: string;
  // Legacy format — QuestionTemplates organized by level
  levels?: Record<string, QuestionTemplate[]>;
  // Comprehensive format — all static entities
  curriculumPacks?: CurriculumPack[];
  standards?: StandardsItem[];
  skills?: Skill[];
  activities?: Activity[];
  activityLevels?: ActivityLevel[];
  fractionBank?: FractionBank[];
  questionTemplates?: QuestionTemplate[];
  misconceptions?: Misconception[];
  hints?: HintTemplate[];
}

export interface ParsedBundle {
  contentVersion: string;
  curriculumPacks: CurriculumPack[];
  standards: StandardsItem[];
  skills: Skill[];
  activities: Activity[];
  activityLevels: ActivityLevel[];
  fractionBank: FractionBank[];
  questionTemplates: QuestionTemplate[];
  misconceptions: Misconception[];
  hints: HintTemplate[];
}

/**
 * Fetch the curriculum bundle JSON and parse all static entities.
 * Handles both legacy (levels) and comprehensive (individual stores) formats.
 * Tolerates 404 — returns empty stores so the game degrades gracefully.
 * per persistence-spec.md §5 (static seed cost), runtime-architecture.md §10 (failure modes)
 */
export async function loadCurriculumBundle(url = '/curriculum/v1.json'): Promise<ParsedBundle> {
  const empty: ParsedBundle = {
    contentVersion: '0.0.0',
    curriculumPacks: [],
    standards: [],
    skills: [],
    activities: [],
    activityLevels: [],
    fractionBank: [],
    questionTemplates: [],
    misconceptions: [],
    hints: [],
  };

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[loadCurriculumBundle] Fetch returned ${response.status} for ${url} — skipping seed`);
      return empty;
    }

    const bundle: CurriculumBundle = (await response.json()) as CurriculumBundle;

    // Basic shape validation — guard against malformed bundles
    if (typeof bundle.version !== 'number' || typeof bundle.contentVersion !== 'string') {
      console.error('[loadCurriculumBundle] Bundle missing version/contentVersion — skipping seed');
      return empty;
    }

    // Parse comprehensive format (preferred)
    if (bundle.questionTemplates || bundle.skills) {
      return {
        contentVersion: bundle.contentVersion,
        curriculumPacks: bundle.curriculumPacks ?? [],
        standards: bundle.standards ?? [],
        skills: bundle.skills ?? [],
        activities: bundle.activities ?? [],
        activityLevels: bundle.activityLevels ?? [],
        fractionBank: bundle.fractionBank ?? [],
        questionTemplates: bundle.questionTemplates ?? [],
        misconceptions: bundle.misconceptions ?? [],
        hints: bundle.hints ?? [],
      };
    }

    // Parse legacy format (levels: {level -> QuestionTemplate[]})
    if (bundle.levels && typeof bundle.levels === 'object') {
      const questionTemplates = Object.values(bundle.levels).flat();
      return {
        contentVersion: bundle.contentVersion,
        curriculumPacks: [],
        standards: [],
        skills: [],
        activities: [],
        activityLevels: [],
        fractionBank: [],
        questionTemplates,
        misconceptions: [],
        hints: [],
      };
    }

    // Unrecognized format
    console.error('[loadCurriculumBundle] Bundle format unrecognized — skipping seed');
    return empty;
  } catch (err) {
    // Network failure or JSON parse error — degrade gracefully
    console.warn('[loadCurriculumBundle] Failed to load curriculum bundle:', err);
    return empty;
  }
}
