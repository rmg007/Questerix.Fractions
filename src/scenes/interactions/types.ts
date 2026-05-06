/**
 * Shared Interaction interface — every archetype interaction implements this.
 * per activity-archetypes.md §1–§10 (interaction contracts)
 */

import type * as Phaser from 'phaser';
import type { ArchetypeId, QuestionTemplate } from '@/types';

export interface InteractionContext {
  scene: Phaser.Scene;
  template: QuestionTemplate;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  onCommit: (payload: unknown) => void;
  pushEvent: (event: import('@/types').ProgressionEvent) => void;
}

export interface Interaction {
  archetype: ArchetypeId;
  mount(ctx: InteractionContext): void;
  unmount(): void;
  /** Tier 2 hint: draw a contextual visual overlay atop the interaction canvas. */
  showVisualOverlay?(): void;
  /**
   * T8: Called after the first wrong answer on a partition question.
   * Draws a faint ghost guide line at 50% of the shape to help the child
   * understand where "the middle" is.
   */
  showGhostGuide?(): void;
  /**
   * T13: Called when a correct partition answer is confirmed.
   * Fills the two halves with color and shows fraction labels.
   */
  showCorrectFeedback?(): void;

  /**
   * Plays an archetype-specific worked-example animation.
   * Resolves when complete (either full animation or reduced-motion instant).
   * per PLANS/2026-05-04-worked-example-flow.md §Phase 1
   */
  playWorkedExample?(): Promise<void>;

  /**
   * Restores the interaction to its initial input-ready state without
   * re-mounting (preserves scene state the student observed during the demo).
   * Must programmatically set keyboard focus on the first input element.
   * per PLANS/2026-05-04-worked-example-flow.md §Phase 1
   */
  reset?(): void;
}
