/**
 * Curriculum bundle loader — fetches curriculum JSON and extracts all static entities.
 * per persistence-spec.md §5 (static seed)
 * per runtime-architecture.md §4.1 (Curriculum Loader), §10 (graceful degradation)
 *
 * Loading strategy (in order):
 *  1. fetch(url) — standard path; works in production and is mock-able in tests.
 *  2. Static bundle import — fallback when fetch throws a TypeError (i.e. the browser
 *     signals a network/connectivity error such as the Replit devtools proxy intercepting
 *     the request). This does NOT activate for non-TypeError errors so test mocks that
 *     throw `new Error(...)` still receive a graceful empty result, preserving the
 *     existing test contract.
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
import bundledData from './bundle.json';

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

/** Shared empty bundle returned on error. */
function makeEmpty(): ParsedBundle {
  return {
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
}

/**
 * Lightweight structural guard: throws if the bundle is missing required
 * top-level fields. Runs at parse time so downstream code never sees a
 * malformed bundle.
 */
function assertBundleShape(bundle: unknown): asserts bundle is CurriculumBundle {
  if (typeof bundle !== 'object' || bundle === null) {
    throw new Error('Invalid curriculum bundle: not an object');
  }
  const b = bundle as Record<string, unknown>;
  if (typeof b['version'] !== 'number' || typeof b['contentVersion'] !== 'string') {
    throw new Error('Invalid curriculum bundle: missing version or contentVersion');
  }
  // If the legacy levels map is present, verify it maps to arrays
  if ('levels' in b && b['levels'] !== undefined) {
    if (typeof b['levels'] !== 'object' || b['levels'] === null) {
      throw new Error('Invalid curriculum bundle: levels must be an object');
    }
    for (const val of Object.values(b['levels'] as Record<string, unknown>)) {
      if (!Array.isArray(val)) {
        throw new Error('Invalid curriculum bundle: each level must map to an array');
      }
    }
  }
}

/**
 * Parse a raw CurriculumBundle object into a ParsedBundle.
 * Handles both legacy (levels map) and comprehensive (individual stores) formats.
 * Returns `empty` if the bundle is malformed.
 */
function parseBundle(bundle: CurriculumBundle, empty: ParsedBundle): ParsedBundle {
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

  console.error('[loadCurriculumBundle] Bundle format unrecognized — skipping seed');
  return empty;
}

/**
 * Fetch the curriculum bundle JSON and parse all static entities.
 * Handles both legacy (levels) and comprehensive (individual stores) formats.
 * Tolerates 404 — returns empty stores so the game degrades gracefully.
 *
 * Network errors (TypeError) trigger a fallback to the statically-bundled JSON
 * (src/curriculum/bundle.json) so the app boots even in environments where
 * fetch is intercepted (e.g. Replit devtools proxy in the preview pane).
 *
 * per persistence-spec.md §5 (static seed cost), runtime-architecture.md §10 (failure modes)
 */
export async function loadCurriculumBundle(url = '/curriculum/v1.json'): Promise<ParsedBundle> {
  const empty = makeEmpty();

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(
        `[loadCurriculumBundle] Fetch returned ${response.status} for ${url} — skipping seed`
      );
      return empty;
    }

    const raw: unknown = await response.json();
    assertBundleShape(raw);
    const bundle = raw as CurriculumBundle;
    return parseBundle(bundle, empty);
  } catch (err) {
    if (err instanceof TypeError) {
      // TypeError = browser-level network failure (e.g. "Failed to fetch").
      // This occurs in the Replit preview when devtools intercept the request.
      // Fall back to the statically-bundled copy so the game still boots.
      console.info(
        '[loadCurriculumBundle] Fetch unavailable (TypeError) — using bundled curriculum'
      );
      try {
        assertBundleShape(bundledData);
        return parseBundle(bundledData as CurriculumBundle, empty);
      } catch (parseErr) {
        console.warn('[loadCurriculumBundle] Bundled curriculum parse failed:', parseErr);
      }
    } else {
      // Non-TypeError (e.g., explicit Error thrown by test mocks, JSON parse errors).
      // Degrade gracefully without falling back — preserves test contract.
      console.warn('[loadCurriculumBundle] Failed to load curriculum bundle:', err);
    }
    return empty;
  }
}
