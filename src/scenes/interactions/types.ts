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
}
