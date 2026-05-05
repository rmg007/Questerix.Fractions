/**
 * Visual state language: every UI state defined once.
 *
 * This module defines the appearance of buttons and draggables in
 * all possible states: idle, hover, pressed, focused, disabled, loading,
 * success, error. Every interactive component uses applyState to transition
 * between these states.
 *
 * Consistency principle: same state = same appearance across all components.
 * Deviations break the visual contract and are documented in:
 * @see docs/30-architecture/state-language.md
 *
 * Reference:
 * @see docs/30-architecture/motion-tokens.md for Duration and Ease
 * @see docs/30-architecture/design-language.md for color tokens
 */

import { Duration, Ease, Distance, tween } from './motion';

export type StateName = keyof typeof State;

/**
 * State definition for a single visual state.
 */
export interface StateDefinition {
  /** Scale multiplier (1.0 = 100%) */
  scale?: number;

  /** Alpha multiplier (1.0 = 100% opaque) */
  alpha?: number;

  /** Tint color shift (offset from 0, -0.04 = darker) */
  tintShift?: number;

  /** Focus ring properties */
  ring?: {
    width: number;
    color: number; // 0xRRGGBB
    offset: number; // px from edge
  };

  /** Is this state interactive? */
  interactive?: boolean;

  /** Show loading spinner? */
  spinner?: boolean;

  /** Shake parameters (for error state) */
  shake?: {
    amplitude: number;
    cycles: number;
  };

  /** Motion parameters for this state transition */
  motion?: {
    durationMs: number;
    ease: string;
  };
}

/**
 * Visual states for all interactive elements.
 *
 * Every state transition motion respects prefersReducedMotion via the
 * motion.ts wrapper. Reduced-motion mode uses Duration.instant.
 */
export const State = {
  /**
   * Default state: resting, ready for interaction.
   */
  idle: {
    scale: 1.0,
    alpha: 1.0,
    tintShift: 0,
    interactive: true,
  } as StateDefinition,

  /**
   * Mouse/touch hover: visual hint that element is interactive.
   * Applied on pointerover for mouse, held throughout drag for touch.
   */
  hover: {
    scale: 1.02,
    alpha: 1.0,
    tintShift: -0.04, // slightly darker
    interactive: true,
  } as StateDefinition,

  /**
   * Pressed: immediate visual feedback on pointerdown.
   * Must be ≥ 100 ms even if pointerup fires faster (K–2 perception requirement).
   */
  pressed: {
    scale: 0.96,
    alpha: 1.0,
    tintShift: -0.08, // darker
    interactive: true,
    motion: {
      durationMs: Duration.short,
      ease: Ease.out,
    },
  } as StateDefinition,

  /**
   * Focused: keyboard navigation indicator.
   * Visible focus ring on every focusable element.
   */
  focused: {
    interactive: true,
    ring: {
      width: 3,
      color: 0x4a90e2, // bright blue (update with actual token)
      offset: 4,
    },
  } as StateDefinition,

  /**
   * Disabled: element cannot be interacted with.
   */
  disabled: {
    scale: 1.0,
    alpha: 0.45,
    interactive: false,
  } as StateDefinition,

  /**
   * Loading: waiting for async operation.
   * Shows spinner, slightly dimmed.
   */
  loading: {
    scale: 1.0,
    alpha: 0.85,
    spinner: true,
    interactive: false,
  } as StateDefinition,

  /**
   * Success: correct answer, milestone reached.
   * Spring easing for celebratory feel.
   */
  success: {
    scale: 1.04,
    alpha: 1.0,
    tintShift: 0,
    interactive: false,
    motion: {
      durationMs: Duration.short,
      ease: Ease.spring,
    },
  } as StateDefinition,

  /**
   * Error: incorrect answer, validation failure.
   * Shake animation for attention.
   */
  error: {
    scale: 1.0,
    alpha: 1.0,
    interactive: false,
    shake: {
      amplitude: Distance.shake,
      cycles: 3,
    },
    motion: {
      durationMs: Duration.short,
      ease: Ease.out,
    },
  } as StateDefinition,
} as const;

/**
 * Apply a visual state to a game object.
 *
 * This is the canonical way to change state. It ensures:
 * - Consistent visuals across components
 * - Reduced-motion compliance
 * - One-source-of-truth for state appearance
 *
 * @param target The game object to style
 * @param stateName The state to apply
 * @param scene The Phaser scene (for tweens and registry)
 *
 * @example
 * applyState(button, 'pressed', scene);
 * applyState(button, 'success', scene);
 *
 * @todo Implement tween application, spinner management, ring rendering
 */
export function applyState(
  target: any,
  stateName: StateName,
  scene: Phaser.Scene
): void {
  const def = State[stateName];

  if (def.scale !== undefined && target.setScale) {
    target.setScale(def.scale);
  }

  if (def.alpha !== undefined && target.setAlpha) {
    target.setAlpha(def.alpha);
  }

  if (def.interactive !== undefined && target.setInteractive) {
    target.setInteractive(def.interactive);
  }

  // Apply tint shift (scale by ~2)
  if (def.tintShift !== undefined && def.tintShift !== 0 && target.setTint) {
    // Scale tintShift by 2 to convert from normalized (-0.04) to color value (-0.08)
    const scaledShift = def.tintShift * 2;
    // Tint is a 24-bit color; we apply the shift to all channels
    const baseTint = 0xffffff; // white as base
    const shiftAmount = Math.round(scaledShift * 255);
    const tintValue = baseTint + (shiftAmount << 16) + (shiftAmount << 8) + shiftAmount;
    target.setTint(tintValue);
  } else if (def.tintShift === 0 && target.clearTint) {
    // Reset to no tint
    target.clearTint();
  }

  // Apply shake animation if present
  if (def.shake) {
    const { amplitude, cycles } = def.shake;
    const originalX = target.x;
    const originalY = target.y;
    const cycleDurationMs = 50;

    // Chain shake cycles with proper timing: each cycle starts after the previous ends
    for (let i = 0; i < cycles; i++) {
      const isEvenCycle = i % 2 === 0;
      const shakeX = isEvenCycle ? originalX + amplitude : originalX - amplitude;
      const shakeY = originalY; // shake only on X axis
      const delayMs = i * cycleDurationMs; // Sequential timing

      tween(scene, target, { x: shakeX, y: shakeY }, {
        duration: cycleDurationMs,
        ease: Ease.out,
        delay: delayMs,
      });
    }

    // Return to original position after all cycles complete
    const totalShakeTimeMs = cycles * cycleDurationMs;
    tween(scene, target, { x: originalX, y: originalY }, {
      duration: cycleDurationMs,
      ease: Ease.out,
      delay: totalShakeTimeMs,
    });
  }

  // Apply focus ring if present
  if (def.ring) {
    const { width, color, offset } = def.ring;
    // Clean up any existing focus ring to prevent memory leaks
    if (target._focusRing) {
      target._focusRing.destroy();
      target._focusRing = undefined;
    }
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.lineStyle(width, color, 1);

    // Draw rectangle outline around target
    const bounds = target.getBounds?.();
    if (bounds) {
      graphics.strokeRect(
        bounds.x - offset,
        bounds.y - offset,
        bounds.width + offset * 2,
        bounds.height + offset * 2
      );
    } else {
      // Fallback if getBounds not available
      graphics.strokeRect(
        target.x - (target.width ?? 0) / 2 - offset,
        target.y - (target.height ?? 0) / 2 - offset,
        (target.width ?? 0) + offset * 2,
        (target.height ?? 0) + offset * 2
      );
    }

    graphics.setDepth(999);
    target._focusRing = graphics; // Store reference for cleanup
  }

  // Apply spinner if present
  if (def.spinner) {
    // Clean up any existing spinner to prevent memory leaks
    if (target._spinner) {
      target._spinner.destroy();
      target._spinner = undefined;
    }
    const spinner = scene.add.container(target.x, target.y);
    const spinnerGraphic = scene.make.graphics({ x: 0, y: 0 }, false);
    spinnerGraphic.fillStyle(0xffffff, 0.8);
    spinnerGraphic.fillCircle(0, 0, 4);
    spinner.add(spinnerGraphic);
    spinner.setDepth(1000);

    // Rotate the spinner continuously
    tween(scene, spinner, { rotation: Math.PI * 2 }, {
      duration: 1000,
      ease: Ease.out,
      loop: -1, // infinite loop
    });

    target._spinner = spinner; // Store reference for cleanup
  }

  // Apply motion/transition if present
  if (def.motion) {
    const { durationMs, ease } = def.motion;

    // Build tween properties based on defined state values
    const tweenProps: Record<string, any> = {};

    if (def.scale !== undefined) {
      tweenProps.scale = def.scale;
    }

    if (def.alpha !== undefined) {
      tweenProps.alpha = def.alpha;
    }

    // Only apply tween if we have properties to animate
    if (Object.keys(tweenProps).length > 0) {
      tween(scene, target, tweenProps, {
        duration: durationMs,
        ease,
      });
    }
  }
}
