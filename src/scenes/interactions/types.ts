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
}
