/**
 * Question selection algorithm — picks the best next question from candidates.
 * Pure function. No Dexie, no Phaser.
 *
 * Zone of Proximal Development (ZPD) window: 0.4 < P_known < 0.85
 * Recency filter: exclude the last 5 template IDs seen.
 */

import type { QuestionTemplate, QuestionTemplateId, SkillId, SkillMastery } from '@/types';

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
 * Tiebreak is random within each tier.
 */
export function selectNextQuestion(args: SelectionArgs): QuestionTemplate | null {
  const { candidates, studentMastery, recentTemplateIds, preferUnmastered = false } = args;

  if (candidates.length === 0) return null;

  // Filter out recently seen templates
  const fresh = candidates.filter((q) => !recentTemplateIds.has(q.id));

  // Work with fresh pool if non-empty; fall back to full set to avoid stall
  const pool = fresh.length > 0 ? fresh : candidates;

  // Score each question by best-matching skill tier
  const zpd = pool.filter((q) => hasSkillInZPD(q, studentMastery));
  if (zpd.length > 0) return pickRandom(zpd);

  if (preferUnmastered) {
    const unmastered = pool.filter((q) => hasSkillBelowZPD(q, studentMastery));
    if (unmastered.length > 0) return pickRandom(unmastered);
  }

  return pickRandom(pool);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getMastery(skillId: SkillId, mastery: Map<SkillId, SkillMastery>): number {
  return mastery.get(skillId)?.masteryEstimate ?? 0;
}

function hasSkillInZPD(
  q: QuestionTemplate,
  mastery: Map<SkillId, SkillMastery>,
): boolean {
  return q.skillIds.some((sid) => {
    const p = getMastery(sid, mastery);
    return p > ZPD_LOW && p < ZPD_HIGH;
  });
}

function hasSkillBelowZPD(
  q: QuestionTemplate,
  mastery: Map<SkillId, SkillMastery>,
): boolean {
  return q.skillIds.some((sid) => getMastery(sid, mastery) <= ZPD_LOW);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
