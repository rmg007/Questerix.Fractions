/**
 * Worked-example flow — shared interfaces and constants.
 *
 * These types are archetype-internal contracts; they live next to the
 * interaction implementations rather than in src/types/ (which is reserved
 * for cross-cutting branded IDs and DB entity shapes).
 *
 * per PLANS/2026-05-04-worked-example-flow.md §Phase 1
 */

import type { QuestionTemplate } from '@/types';

// ── Threshold constant ────────────────────────────────────────────────────────

/**
 * Number of wrong attempts after which the "Show me how" CTA is offered,
 * provided the Tier 3 hint has also been exhausted.
 * per PLANS/2026-05-04-worked-example-flow.md §Goals
 */
export const WORKED_EXAMPLE_ATTEMPT_THRESHOLD = 5;

// ── Payload ───────────────────────────────────────────────────────────────────

/**
 * Describes the context passed to a worked-example animation.
 * Each archetype decides which fields it needs; all fields are optional
 * because stubs receive whatever the caller can supply.
 */
export interface WorkedExamplePayload {
  question: QuestionTemplate;
  answer: unknown;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ── State ─────────────────────────────────────────────────────────────────────

/**
 * Runtime state snapshot for the worked-example CTA.
 *
 * NOTE: per-archetype durations (1.0–2.0 s) live in each archetype's
 * implementation — do NOT add a `duration` field here. That would mislead
 * future agents into assuming a single shared duration.
 */
export interface WorkedExampleState {
  /** True while the demo animation is in progress. */
  isPlaying: boolean;
}
