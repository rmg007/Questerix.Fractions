/**
 * Adaptive level router — decides which level to serve next.
 * Pure function. No Dexie, no Phaser.
 *
 * Rules per runtime-architecture.md §11 (routing):
 *   - Do NOT route during calibration (Q19 fix, per learning-hypotheses.md H-04)
 *   - Route UP only when all prerequisite skills for current level hit P_known >= 0.85
 *   - Route DOWN (one step max) when last 5 attempts were < 40% correct
 *   - Otherwise stay
 *
 * Level bounds: 1–9 (per data-schema.md §2.5).
 */

import type { LevelId, SkillId, SkillMastery } from '@/types';
import { MASTERY_THRESHOLD } from './bkt';

// ── Constants ─────────────────────────────────────────────────────────────

/** Minimum fraction of correct answers in the recent window to avoid regression. */
const REGRESS_ACCURACY_THRESHOLD = 0.4;

/** Size of the rolling window used to detect a failure streak. */
const REGRESS_WINDOW_SIZE = 5;

const MIN_LEVEL = 1 as LevelId;
const MAX_LEVEL = 9 as LevelId;

// ── Types ─────────────────────────────────────────────────────────────────

export interface RouterArgs {
  currentLevel: LevelId;
  masteries: Map<SkillId, SkillMastery>;
  /** True when all prerequisite skills for current level are mastered. */
  prereqsMet: boolean;
  /** True while a calibration round is active (Q19 fix). */
  inCalibration: boolean;
  /**
   * Ordered outcomes of the most recent attempts (true = correct).
   * Caller is responsible for trimming to the REGRESS_WINDOW_SIZE.
   */
  recentOutcomes?: boolean[];
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * Decide the level for the next question.
 *
 * // per runtime-architecture.md §11
 * // Q19 fix — calibration freeze prevents H-04 data pollution
 */
export function decideNextLevel(args: RouterArgs): LevelId {
  const {
    currentLevel,
    prereqsMet,
    inCalibration,
    recentOutcomes = [],
  } = args;

  // Rule 1: Never route during calibration (Q19 fix)
  // per learning-hypotheses.md H-04 — retention measurement requires
  // the first 5 attempts to stay on the prior-session skill.
  if (inCalibration) {
    return currentLevel;
  }

  // Rule 2: Route DOWN if recent accuracy is below threshold
  if (shouldRegress(recentOutcomes)) {
    const downLevel = (currentLevel - 1) as LevelId;
    return downLevel >= MIN_LEVEL ? downLevel : MIN_LEVEL;
  }

  // Rule 3: Route UP when all prereqs are met (all gating skills mastered)
  // per runtime-architecture.md §11 — prereqs checked by caller
  if (prereqsMet && allCurrentSkillsMastered(args.masteries)) {
    const upLevel = (currentLevel + 1) as LevelId;
    return upLevel <= MAX_LEVEL ? upLevel : MAX_LEVEL;
  }

  // Rule 4: Stay
  return currentLevel;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * True when the last REGRESS_WINDOW_SIZE attempts had < REGRESS_ACCURACY_THRESHOLD correct.
 * Requires at least REGRESS_WINDOW_SIZE attempts to fire (no early regression on first attempt).
 */
function shouldRegress(recentOutcomes: boolean[]): boolean {
  if (recentOutcomes.length < REGRESS_WINDOW_SIZE) return false;
  const window = recentOutcomes.slice(-REGRESS_WINDOW_SIZE);
  const correctCount = window.filter(Boolean).length;
  return correctCount / REGRESS_WINDOW_SIZE < REGRESS_ACCURACY_THRESHOLD;
}

/**
 * True when every skill in the mastery map has reached the mastery threshold.
 * An empty map returns false (no skills means prereqs are not established).
 */
function allCurrentSkillsMastered(masteries: Map<SkillId, SkillMastery>): boolean {
  if (masteries.size === 0) return false;
  for (const mastery of masteries.values()) {
    if (mastery.masteryEstimate < MASTERY_THRESHOLD) return false;
  }
  return true;
}
