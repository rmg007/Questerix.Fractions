/**
 * HintLadder — state machine for the 3-tier hint escalation ladder.
 * Emits which tier to show based on how many wrong attempts have occurred.
 * per interaction-model.md §4 (Hint Escalation Ladder)
 * per data-schema.md §2.9 — HintTier values: verbal | visual_overlay | worked_example
 *
 * Phase 3 (misconception-and-hint-system plan): accepts optional per-question
 * `hints` data from the curriculum bundle so that tier 1/2 text can be
 * misconception-aware. When no hint data is supplied (or the tier has no
 * entry), callers fall back to the existing i18n catalog strings.
 */

import type { HintTier } from '@/types';
import type { QuestionHints } from '@/types';

/** Which tiers are available for a given difficulty tier. per interaction-model.md §4.2 */
const TIER_BUDGETS: Record<'easy' | 'medium' | 'hard', HintTier[]> = {
  easy: ['verbal', 'visual_overlay', 'worked_example'],
  medium: ['verbal', 'visual_overlay'],
  hard: ['verbal'],
};

export interface HintLadderState {
  /** Index into the available tiers array (0-based). -1 = no hint shown yet. */
  currentIndex: number;
  /** The currently visible tier, or null if no hint has been requested. */
  activeTier: HintTier | null;
  /** True once all available tiers have been exhausted. */
  exhausted: boolean;
}

/**
 * HintLadder manages hint escalation for a single question attempt.
 * Instantiate fresh per question.
 *
 * Usage:
 *   const ladder = new HintLadder('easy');
 *   const tier = ladder.next(); // 'verbal'
 *   const tier2 = ladder.next(); // 'visual_overlay'
 *
 * With misconception-aware hints (Phase 3):
 *   const ladder = new HintLadder('easy', questionTemplate.hints);
 *   // After advancing:
 *   const text = ladder.hintText('MC-WHB-01'); // returns overridden text or default
 */
export class HintLadder {
  private readonly tiers: HintTier[];
  private index: number = -1;
  private readonly hintData: QuestionHints | undefined;

  /**
   * @param difficulty  Difficulty tier that controls which hint tiers are available.
   * @param hintData    Optional per-question hint data from the curriculum bundle.
   *                    When provided, `hintText()` returns misconception-aware text.
   *                    When omitted, `hintText()` returns null (caller falls back
   *                    to i18n catalog).
   */
  constructor(difficulty: 'easy' | 'medium' | 'hard' = 'easy', hintData?: QuestionHints) {
    this.tiers = TIER_BUDGETS[difficulty];
    this.hintData = hintData;
  }

  /**
   * Advances to the next tier and returns it. Once all tiers are exhausted,
   * repeated calls return the last tier. Callers should check `state.exhausted`
   * to detect when no new tiers remain.
   */
  next(): HintTier {
    if (this.index < this.tiers.length - 1) {
      this.index++;
    }
    // Exhausted — re-show Tier 3 per interaction-model.md §4.1
    return this.tiers[this.index]!;
  }

  /** Current state snapshot. */
  get state(): HintLadderState {
    return {
      currentIndex: this.index,
      activeTier: this.index >= 0 ? (this.tiers[this.index] ?? null) : null,
      exhausted: this.index >= this.tiers.length - 1 && this.index >= 0,
    };
  }

  /** True if at least one hint has been revealed. */
  get hasStarted(): boolean {
    return this.index >= 0;
  }

  /** Total tiers available for this difficulty. */
  get tierCount(): number {
    return this.tiers.length;
  }

  /** Reset to initial state (new question). */
  reset(): void {
    this.index = -1;
  }

  /**
   * Returns hint description for a given wrong-attempt count.
   * Auto-escalates: first wrong → verbal, second → visual_overlay, third → worked_example.
   * per interaction-model.md §5.4 (3 consecutive wrong triggers auto-escalation prompt)
   */
  tierForAttemptCount(wrongCount: number): HintTier | null {
    if (wrongCount <= 0) return null;
    const idx = Math.min(wrongCount - 1, this.tiers.length - 1);
    return this.tiers[idx] ?? null;
  }

  /**
   * Returns the hint text for the currently active tier, optionally using
   * a misconception-specific override when `activeMisconceptionId` is provided.
   *
   * Resolution order:
   *   1. `hintData[currentTier].byMisconception[activeMisconceptionId]` (if both present)
   *   2. `hintData[currentTier].default` (fallback within the question's hint block)
   *   3. `null` — caller should fall back to the i18n catalog string
   *
   * Returns `null` when no hint data was supplied at construction time, or
   * when no hint is active yet (index < 0), or when the current tier is
   * `worked_example` (which is always asset-based, not a text string).
   *
   * @param activeMisconceptionId  Optional MC-* code for the currently detected
   *                               misconception (e.g. `'MC-WHB-01'`). Pass
   *                               `undefined` to get the default text only.
   */
  hintText(activeMisconceptionId?: string): string | null {
    if (!this.hintData || this.index < 0) return null;
    const tier = this.tiers[this.index];
    if (!tier || tier === 'worked_example') return null;

    const tierKey = tier === 'verbal' ? 'tier1' : 'tier2';
    const tierBlock = this.hintData[tierKey];
    if (!tierBlock) return null;

    // Try misconception-specific override first.
    if (activeMisconceptionId) {
      const override = tierBlock.byMisconception[activeMisconceptionId];
      if (typeof override === 'string' && override.length > 0) return override;
    }

    return tierBlock.default.length > 0 ? tierBlock.default : null;
  }
}
