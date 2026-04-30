/**
 * Motion language — five named motion roles per ux-elevation.md §5.
 *
 * Every animation in the app belongs to exactly one role; mixing roles is
 * forbidden. This module exposes the canonical easing + duration defaults
 * for each role plus a reduced-motion-aware resolver.
 *
 * Roles:
 *   Affordance    — "this is interactive" (idle/hover pulse)
 *   Anticipation  — half-beat before an event (button press-down)
 *   Action        — the event itself (transitions, panel appearances)
 *   Reaction      — Quest's response and celebration (sparkles, fills)
 *   Reset         — the deliberate calm pause that follows a Reaction
 *
 * Reduced-motion (prefers-reduced-motion: reduce):
 *   Affordance → 0 ms (use static styling instead)
 *   Anticipation → 0 ms (event fires immediately)
 *   Action → 0 ms (instant cut)
 *   Reaction → state-change duration kept at 0 ms (the state still updates;
 *              the easing/scale is dropped by callers)
 *   Reset → 0 ms (immediate)
 *
 * The reduced-motion contract is "0 ms duration" — callers should *also*
 * skip secondary embellishments (overshoot, scale-pulse) when reduced
 * motion is on. See `withReducedMotion` for the resolver.
 */

export type MotionRole = 'affordance' | 'anticipation' | 'action' | 'reaction' | 'reset';

export interface MotionSpec {
  /** Phaser easing name (consumed by `scene.tweens.add({ ease })`). */
  ease: string;
  /** Default duration in ms when reduced motion is OFF. */
  duration: number;
  /** Optional duration range for callers that vary within a role. */
  durationRange?: readonly [number, number];
  /** Loop indefinitely (Affordance only by default). */
  loop?: boolean;
}

/** Canonical defaults per §5 motion-vocabulary table. */
export const MOTION: Readonly<Record<MotionRole, MotionSpec>> = {
  affordance: {
    ease: 'Sine.easeInOut',
    duration: 1600,
    loop: true,
  },
  anticipation: {
    ease: 'Quad.easeOut',
    duration: 90,
    durationRange: [60, 120],
  },
  action: {
    // §5: Cubic.easeInOut for transitions; Back.easeOut for appearances.
    // We default to the transition variant; callers can override the ease
    // per-tween for "appearance" use without leaving the role.
    ease: 'Cubic.easeInOut',
    duration: 300,
    durationRange: [220, 400],
  },
  reaction: {
    ease: 'Back.easeOut',
    duration: 320,
    durationRange: [280, 600],
  },
  reset: {
    ease: 'Linear',
    duration: 200,
  },
} as const;

/** Convenience: alternate easing for Action role's "appearance" variant. */
export const ACTION_APPEAR_EASE = 'Back.easeOut';

/** Convenience: alternate easing for Reaction role's "fade" variant. */
export const REACTION_FADE_EASE = 'Quad.easeOut';

/**
 * Detect the platform's reduced-motion preference once. Callers passing a
 * scene's preference cache (preferred) should override with that value.
 */
export { checkReduceMotion as prefersReducedMotion } from '../../lib/preferences';
import { checkReduceMotion } from '../../lib/preferences';

/**
 * Resolve a motion spec against the current reduced-motion preference.
 * When `reduced` is true, the returned spec has `duration: 0` and the loop
 * flag is cleared. Easing is preserved (callers may still want it as a
 * documentation-only field) but is functionally a no-op at 0 ms.
 *
 * Use the returned spec directly in `scene.tweens.add({ ...spec })`.
 */
export function resolve(role: MotionRole, reduced = checkReduceMotion()): MotionSpec {
  const spec = MOTION[role];
  if (reduced) {
    return { ease: spec.ease, duration: 0, loop: false };
  }
  return spec;
}

/** Whether a motion role is allowed to play at all under reduced motion. */
export function isReducedMotionPermitted(role: MotionRole, reduced: boolean): boolean {
  if (!reduced) return true;
  // Reaction state-change is permitted (callers must drop scale/burst).
  // All others are 0 ms / no-op.
  return role === 'reaction';
}
