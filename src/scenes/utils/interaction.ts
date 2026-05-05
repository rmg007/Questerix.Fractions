/**
 * Gesture grammar: shared thresholds and radii for all interactions.
 *
 * This module defines the K–2-friendly gesture mechanics that every
 * interaction archetype uses. Deviations are documented in:
 * @see docs/30-architecture/interaction-grammar.md
 *
 * Key principle: **release outside a valid region is never an error.**
 * Bounce back, no penalty, no attempt counter increment, no hint progression,
 * no audio "wrong" sting. K–2 children abandon apps that punish exploration.
 *
 * Timeouts are calibrated for K–2 motor skills:
 * - Tap: ≤ 250 ms from press to release (adult average: 150 ms)
 * - Long-press: 500 ms (adult average: 350 ms, but children are slower)
 * - Double-tap debounce: 300 ms (allows kids to re-tap intentionally)
 */

export const Gesture = {
  /**
   * Pointer drift before a tap becomes a drag.
   * If pointer moves more than this, the gesture is a drag, not a tap.
   */
  tapCancelRadiusPx: 8,

  /**
   * Maximum duration for a press to count as a "tap".
   * If held longer, escalates to long-press (500 ms) or drag.
   */
  tapMaxDurationMs: 250,

  /**
   * Duration before a held press triggers long-press action.
   * Calibrated for K–2 (adults typically use 350 ms).
   */
  longPressMs: 500,

  /**
   * Distance pointer must move before drag begins.
   * Prevents accidental drags from finger tremor or rest.
   */
  dragEngageThresholdPx: 6,

  /**
   * Snap-back animation duration when drag is released off-target.
   * Must be long enough for K–2 perception, short enough to feel responsive.
   */
  dragCancelRevertMs: 200,

  /**
   * Window for double-tap debounce.
   * K–2 children frequently double-tap; reject second pointerdown within this window.
   */
  doubleTapWindowMs: 300,

  /**
   * Magnetic snap range in partition, placement, snap_match, etc.
   * K–2 fine motor: snap radius ≥ 28 px is necessary for success.
   */
  snapRadiusPx: 28,

  /**
   * Ignore micro-movements from finger tremor or resting pressure.
   * Any movement smaller than this is treated as stationary.
   */
  fingerRestTolerancePx: 4,
} as const;
