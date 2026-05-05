/**
 * Motion tokens: durations, easings, and distances.
 *
 * All motion in the app flows through these tokens. This ensures:
 * - Consistent timing across the experience (K–2 friendly pace)
 * - Reduced-motion compliance by default (Duration.instant in reduced-motion mode)
 * - Single source of truth for tween parameters
 *
 * Calibration rationale: K–2 children parse motion at ~30% slower than adults
 * (Guernsey et al., 2007). Maximum safe delay: 600 ms before input-feedback
 * link breaks.
 *
 * Reference: @see docs/30-architecture/motion-tokens.md
 */

export const Duration = {
  /** Instant (used in reduced-motion mode) */
  instant: 0,

  /** Press flash, focus ring fade (very fast feedback) */
  micro: 80,

  /** Button hover, small scale tweens (quick feedback) */
  short: 160,

  /** Overlay open, panel slide, snap-to-target (default UI motion) */
  base: 240,

  /** Scene transitions, mascot enter (significant motion) */
  long: 400,

  /** Mastery upgrade, level-complete burst (celebratory) */
  ceremony: 600,
} as const;

/**
 * Easing functions. All map to Phaser's built-in easing names.
 * - out: default for "thing arriving"
 * - in: default for "thing leaving"
 * - inOut: continuous repositioning, never first-time arrivals
 * - spring: success confirms, snap-correct (never snap-incorrect)
 * - bounce: gentle attention pulses; never on errors
 */
export const Ease = {
  /** Default for "thing arriving" — most UI events */
  out: 'Cubic.easeOut',

  /** Default for "thing leaving" */
  in: 'Cubic.easeIn',

  /** Continuous repositioning, never first-time arrivals */
  inOut: 'Cubic.easeInOut',

  /** Success confirms, snap-correct (not snap-incorrect) */
  spring: 'Back.easeOut',

  /** Gentle attention pulses; never on errors */
  bounce: 'Sine.easeInOut',
} as const;

/**
 * Distance offsets in pixels. Used for scale tweens, shakes, etc.
 */
export const Distance = {
  /** Scale offset on press (1.04 → 1.0) */
  press: 1,

  /** Lift on hover */
  hover: 2,

  /** Wrong-answer shake amplitude (3 cycles) */
  shake: 6,
} as const;

/**
 * Tween wrapper that enforces reduced-motion compliance.
 *
 * @param scene The Phaser scene (has registry.get('prefersReducedMotion'))
 * @param target The object(s) to tween
 * @param props Tween properties (x, y, scale, alpha, etc.)
 * @param opts Duration, ease, and other Phaser.Tweens.TweenConfig options
 * @returns The created tween
 *
 * @example
 * tween(scene, button, { scale: 0.96 }, { duration: Duration.short })
 *
 * Honors:
 * - Reduced-motion preference: if set, duration becomes Duration.instant
 * - Default duration: Duration.base if not specified
 * - Default easing: Ease.out if not specified
 */
export function tween(
  scene: Phaser.Scene,
  target: any,
  props: Record<string, any>,
  opts: Partial<Phaser.Types.Tweens.TweenBuilderConfig> = {}
) {
  const prefersReducedMotion = scene.registry?.get('prefersReducedMotion') === true;
  const { duration, ease, ...remainingOpts } = opts;

  return scene.tweens.add({
    targets: target,
    duration: prefersReducedMotion ? Duration.instant : (duration ?? Duration.base),
    ease: ease ?? Ease.out,
    ...props,
    ...remainingOpts,
  });
}
