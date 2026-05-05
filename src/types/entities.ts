/**
 * Static entities — ship in the app bundle (curriculum data).
 * Read-only at runtime; replaced wholesale on app update.
 * per data-schema.md §2
 */

import type { ArchetypeId } from './archetype';
import type {
  SkillId,
  MisconceptionId,
  ActivityId,
  QuestionTemplateId,
  ValidatorId,
} from './branded';
import type { HintTemplate } from './hint';

// ── §2.1 CurriculumPack ────────────────────────────────────────────────────

export interface CurriculumPack {
  id: string;
  schemaVersion: number;
  contentVersion: string;
  gradeBand: 'K' | '1' | '2' | 'K-2';
  publishedAt: string; // ISO date string
  locales: string[];
}

// ── §2.2 Standard (CCSS crosswalk) ────────────────────────────────────────

export interface StandardsItem {
  /** e.g. 'CCSS.2.NF.2' */
  id: string;
  framework: 'CCSS' | 'NCTM' | 'STATE';
  code: string;
  text: string;
  gradeLevel: 0 | 1 | 2;
}

// ── §2.3 Skill ─────────────────────────────────────────────────────────────

export interface BktParams {
  /** P(L0) — initial probability of knowing the skill */
  pInit: number;
  /** P(T) — probability of transitioning from unknown to known */
  pTransit: number;
  /** P(S) — probability of slipping (know but answer wrong) */
  pSlip: number;
  /** P(G) — probability of guessing (don't know but answer right) */
  pGuess: number;
}

/** per data-schema.md §2.3 — links to skills.md registry */
export interface Skill {
  id: SkillId;
  name: string;
  description: string;
  gradeLevel: 0 | 1 | 2;
  /** SkillIds that must precede this skill. */
  prerequisites: SkillId[];
  standardIds: string[];
  bktParams: BktParams;
}

// ── §2.4 Activity ──────────────────────────────────────────────────────────

export interface UnlockRule {
  /** Skill mastery thresholds required to unlock this activity. */
  requiredSkillIds: SkillId[];
  minMasteryEstimate: number;
}

/** per data-schema.md §2.4 */
export interface Activity {
  id: ActivityId;
  title: string;
  gradeBand: Array<'K' | '1' | '2'>;
  /** MVP level group. per data-schema.md §2.4 */
  levelGroup: '01-02' | '03-05' | '06-09';
  skillIds: SkillId[];
  unlockRule: UnlockRule | null;
  isCore: boolean;
  /** One of the 10 canonical archetypes. per data-schema.md §2.4 (audit §1.5 fix) */
  archetype: ArchetypeId;
}

// ── §2.5 ActivityLevel ─────────────────────────────────────────────────────

export interface DifficultyConfig {
  /** Seconds allowed; null means untimed. */
  timerSeconds: number | null;
  hintsAllowed: boolean;
  /** Acceptable error margin for tolerance-based validators. */
  tolerance: number;
  problemCount: number;
}

/** per data-schema.md §2.5 */
export interface ActivityLevel {
  /** e.g. 'magnitude_scales:L1' */
  id: string;
  activityId: ActivityId;
  /** 1–9 */
  levelNumber: number;
  /** 1 = max scaffolding, 5 = none */
  scaffoldLevel: 1 | 2 | 3 | 4 | 5;
  fractionPoolIds: string[];
  questionTemplateIds: QuestionTemplateId[];
  difficultyConfig: DifficultyConfig;
  advanceCriteria: {
    minAccuracy: number;
    minProblems: number;
    maxAvgHints: number;
  };
}

// ── §2.6 FractionBank ──────────────────────────────────────────────────────

/** per data-schema.md §2.6 */
export interface FractionBank {
  /** e.g. 'frac:3/4' */
  id: string;
  numerator: number;
  denominator: number;
  /** Precomputed for sort/distance ops. */
  decimalValue: number;
  benchmark: 'zero' | 'almost_zero' | 'almost_half' | 'half' | 'almost_one' | 'one';
  denominatorFamily: 'halves' | 'thirds' | 'fourths' | 'sixths' | 'eighths';
  visualAssets: {
    barUrl?: string;
    circleUrl?: string;
    setUrl?: string;
  };
}

// ── §2.7 QuestionTemplate ──────────────────────────────────────────────────

export interface QuestionPrompt {
  text: string;
  ttsKey: string;
  localeStrings?: Record<string, string>;
}

/**
 * Per-tier hint text for a question, optionally keyed by misconception ID.
 *
 * When the hint ladder escalates to a given tier, the runtime first checks
 * whether the currently-flagged misconception has a specific override string
 * in `byMisconception`. If no override is found, or no misconception is
 * active, the `default` string is used.
 *
 * Phase 3 (misconception-and-hint-system plan): this block is optional on
 * `QuestionTemplate`. When absent, the HintLadder falls back to the i18n
 * catalog strings (existing behavior).
 */
export interface QuestionHintTier {
  /** Fallback text shown when no active misconception matches. */
  default: string;
  /**
   * Misconception-specific overrides. Key is an MC-* code (e.g. "MC-WHB-01");
   * value is the hint text to show when that misconception is active.
   */
  byMisconception: Partial<Record<string, string>>;
}

/**
 * Optional per-question hints block. Carries text for tier 1 (verbal) and
 * tier 2 (visual_overlay). Tier 3 (worked_example) is always derived from
 * a reference to a worked-example asset — not a plain text string.
 */
export interface QuestionHints {
  tier1: QuestionHintTier;
  tier2: QuestionHintTier;
  /** Tier 3 is worked-example only; stores an optional asset/template ref. */
  tier3?: { workedExampleRef: string | null };
}

/**
 * per data-schema.md §2.7
 * id format: 'q:<archetype-short>:L{N}:NNNN' e.g. 'q:ms:L1:0001'
 * archetype replaces old type/mechanic fields (audit §1.5 fix)
 */
export interface QuestionTemplate {
  id: QuestionTemplateId;
  /** One of the 10 canonical archetypes. (audit §1.5 fix) */
  archetype: ArchetypeId;
  prompt: QuestionPrompt;
  /** Shape varies per archetype — typed at the validator layer. */
  payload: unknown;
  correctAnswer: unknown;
  validatorId: ValidatorId;
  skillIds: SkillId[];
  misconceptionTraps: MisconceptionId[];
  difficultyTier: 'easy' | 'medium' | 'hard';
  /** Indexed field computed during curriculum seeding: '01-02' | '03-05' | '06-09'. */
  levelGroup?: string;
  /**
   * Optional per-question hint text. When present, HintLadder uses these
   * strings (falling back to byMisconception overrides when an MC is active).
   * When absent, the existing i18n catalog strings are used.
   * per Phase 3 of the misconception-and-hint-system plan.
   */
  hints?: QuestionHints;
}

// ── §2.8 Misconception ─────────────────────────────────────────────────────

/** per data-schema.md §2.8 */
export interface Misconception {
  id: MisconceptionId;
  name: string;
  description: string;
  detectionPattern: {
    signalType: string;
    rule: string;
  };
  interventionActivityIds: ActivityId[];
  gradeLevel: Array<0 | 1 | 2>;
}

// ── §2.9 HintTemplate re-export ────────────────────────────────────────────

// HintTemplate is defined in hint.ts; re-exported via index.ts for ergonomics.
export type { HintTemplate };

// ── ValidatorSpec ──────────────────────────────────────────────────────────

/**
 * Registration metadata persisted in the curriculum bundle.
 * Validator functions live in src/validators/ and are looked up by id at runtime.
 * id format: 'validator.<archetype>.<variant>'
 * per activity-archetypes.md §11 (Validator Registry, audit §2.2 fix)
 */
export interface ValidatorSpec {
  /** e.g. 'validator.partition.equalAreas' */
  id: ValidatorId;
  archetype: ArchetypeId;
  variant: string;
  /** Human-readable description of the correctness check. */
  description: string;
}
