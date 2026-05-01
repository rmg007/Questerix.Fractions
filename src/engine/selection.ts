/**
 * Question selection algorithm — picks the best next question from candidates.
 * Pure function. No Dexie, no Phaser. No host-global side effects.
 *
 * Zone of Proximal Development (ZPD) window: 0.4 < P_known < 0.85
 * Recency filter: exclude the last 5 template IDs seen.
 *
 * Determinism: callers MUST supply an `Rng` port (see src/engine/ports.ts).
 * Production wires `MathRandomRng` from src/lib/adapters; tests pass a seeded
 * RNG so tiebreaks are reproducible. Direct `Math.random()` calls inside
 * src/engine/** are blocked by ESLint (no-restricted-syntax).
 */

import type { QuestionTemplate, QuestionTemplateId, SkillId, SkillMastery } from '@/types';
import type { Rng } from './ports';

// ── ZPD constants ─────────────────────────────────────────────────────────

/** Lower bound of the ZPD window: below this, skill is not yet engaged. */
const ZPD_LOW = 0.4;

/** Upper bound of the ZPD window: at or above this, skill is mastered. */
const ZPD_HIGH = 0.85;

/** Number of most-recent templates to exclude from selection (informational; recentTemplateIds is passed in by the caller). */
export const RECENCY_WINDOW = 5;

// ── Types ─────────────────────────────────────────────────────────────────

export interface SelectionArgs {
  candidates: QuestionTemplate[];
  studentMastery: Map<SkillId, SkillMastery>;
  /** IDs of templates shown recently (caller maintains this set). */
  recentTemplateIds: Set<QuestionTemplateId>;
  /** If true, prefer skills below ZPD_LOW over already-mastered ones. */
  preferUnmastered?: boolean;
  /**
   * Random source for tiebreak selection. Required — pass `MathRandomRng` from
   * src/lib/adapters in production, or a seeded RNG in tests for determinism.
   */
  rng: Rng;
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * Select the next question template for the student.
 *
 * Selection priority (highest to lowest):
 *   1. Not in recentTemplateIds (last RECENCY_WINDOW items)
 *   2. At least one skill in ZPD window (0.4 < P_known < 0.85)
 *   3. If preferUnmastered=true, fallback to P_known <= 0.4 skills
 *   4. Any remaining candidate (avoids stall on edge-case small pools)
 *
 * Tiebreak is random within each tier — seeded by the caller-supplied `rng`.
 */
export function selectNextQuestion(args: SelectionArgs): QuestionTemplate | null {
  const { candidates, studentMastery, recentTemplateIds, preferUnmastered = false, rng } = args;

  if (candidates.length === 0) return null;

  // Filter out recently seen templates
  const fresh = candidates.filter((q) => !recentTemplateIds.has(q.id));

  // Work with fresh pool if non-empty; fall back to full set to avoid stall
  const pool = fresh.length > 0 ? fresh : candidates;

  // Score each question by best-matching skill tier
  const zpd = pool.filter((q) => hasSkillInZPD(q, studentMastery));
  if (zpd.length > 0) return pickRandom(zpd, rng);

  if (preferUnmastered) {
    const unmastered = pool.filter((q) => hasSkillBelowZPD(q, studentMastery));
    if (unmastered.length > 0) return pickRandom(unmastered, rng);
  }

  return pickRandom(pool, rng);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getMastery(skillId: SkillId, mastery: Map<SkillId, SkillMastery>): number {
  return mastery.get(skillId)?.masteryEstimate ?? 0;
}

function hasSkillInZPD(q: QuestionTemplate, mastery: Map<SkillId, SkillMastery>): boolean {
  return q.skillIds.some((sid) => {
    const p = getMastery(sid, mastery);
    return p >= ZPD_LOW && p < ZPD_HIGH;
  });
}

function hasSkillBelowZPD(q: QuestionTemplate, mastery: Map<SkillId, SkillMastery>): boolean {
  return q.skillIds.some((sid) => getMastery(sid, mastery) <= ZPD_LOW);
}

function pickRandom<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng.random() * arr.length)]!;
}
