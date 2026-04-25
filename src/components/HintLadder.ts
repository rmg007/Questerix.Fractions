/**
 * HintLadder — state machine for the 3-tier hint escalation ladder.
 * Emits which tier to show based on how many wrong attempts have occurred.
 * per interaction-model.md §4 (Hint Escalation Ladder)
 * per data-schema.md §2.9 — HintTier values: verbal | visual_overlay | worked_example
 */

import type { HintTier } from '@/types';

/** Which tiers are available for a given difficulty tier. per interaction-model.md §4.2 */
const TIER_BUDGETS: Record<'easy' | 'medium' | 'hard', HintTier[]> = {
  easy:   ['verbal', 'visual_overlay', 'worked_example'],
  medium: ['verbal', 'visual_overlay'],
  hard:   ['verbal'],
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
 */
export class HintLadder {
  private readonly tiers: HintTier[];
  private index: number = -1;

  constructor(difficulty: 'easy' | 'medium' | 'hard' = 'easy') {
    this.tiers = TIER_BUDGETS[difficulty];
  }

  /** Returns the next tier to show, or the last tier if already exhausted. */
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
      activeTier:   this.index >= 0 ? (this.tiers[this.index] ?? null) : null,
      exhausted:    this.index >= this.tiers.length - 1 && this.index >= 0,
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
}
