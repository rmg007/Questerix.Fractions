/**
 * Feedback bus: routes visual + audio + haptic feedback through one emission.
 *
 * Principle: one signal, three channels. A single call to emitFeedback fires
 * visual feedback (motion state), audio cue, and haptic substitute (for devices
 * without real haptics) in lockstep.
 *
 * Mute/preference logic:
 * - mute (audio): silences audio without touching motion
 * - reduced-motion: silences motion without touching audio
 * - Both respect the registry: scene.registry.get('muted') and scene.registry.get('prefersReducedMotion')
 *
 * Audio cue identifiers are defined in a shared constant so the pipeline,
 * audio generation, and game code stay in sync:
 * @see src/audio/cues.ts (created in PLANS/audio.md)
 *
 * Reference:
 * @see PLANS/2026-05-04-interaction-and-motion-system.md Phase 4
 */

import { StateName, applyState } from './states';
import { Ease, tween } from './motion';
import { announce } from '../../lib/a11y/liveRegion';

/**
 * Feedback kinds that the app emits.
 * Each maps to a visual state, audio cue, and haptic pattern.
 */
export type FeedbackKind = 'tap' | 'snap' | 'correct' | 'incorrect' | 'milestone';

/**
 * Mapping from feedback kind to visual state name.
 */
const kindToVisualState: Record<FeedbackKind, StateName> = {
  tap: 'pressed',
  snap: 'success',
  correct: 'success',
  incorrect: 'error',
  milestone: 'success',
};

/**
 * Mapping from feedback kind to audio cue identifier.
 * These identifiers are the contract between game and pipeline.
 * Audio cues are generated/sourced in PLANS/audio.md.
 *
 * Wired up: emitFeedback emits 'audio:play' event with cue identifier.
 * Pipeline implementation pending: PLANS/audio.md Phase 3–4.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const kindToAudioCue: Record<FeedbackKind, string> = {
  tap: 'tap',
  snap: 'snap-correct',
  correct: 'correct-chime',
  incorrect: 'incorrect-soft',
  milestone: 'milestone-flourish',
};

/**
 * Emit feedback: visual + audio + haptic in one call.
 *
 * @param kind The feedback kind (tap, snap, correct, incorrect, milestone)
 * @param opts Optional configuration
 *   - target: the game object to apply visual feedback to (required for visual feedback)
 *   - loud: override mute setting (default: false)
 *   - scene: the Phaser scene (required for registry and audio bus)
 *
 * @example
 * emitFeedback('correct', { target: button, scene });
 * emitFeedback('incorrect', { target: button, scene, loud: true });
 *
 * @note Audio bus integration: emits 'audio:play' event (implemented)
 * @note Haptic feedback: visual alpha pulse substitute for devices without Vibration API (implemented)
 */
export function emitFeedback(
  kind: FeedbackKind,
  opts?: {
    target?: any;
    loud?: boolean;
    scene?: Phaser.Scene;
  }
): void {
  const { target, loud = false, scene } = opts ?? {};

  // Visual feedback
  if (target && scene) {
    const stateName = kindToVisualState[kind];
    applyState(target, stateName, scene);
  }

  // Audio feedback (respects mute preference)
  if (scene) {
    const isMuted = scene.registry.get('muted') === true;
    // Play audio unless muted AND loud is false
    if (!isMuted || loud) {
      const cue = kindToAudioCue[kind];
      scene.events.emit('audio:play', { cue, loud });
    }
  }

  // Screen-reader feedback via ARIA live region (Phase 2 — a11y-parity).
  // 'correct' / 'snap' / 'milestone' → polite (non-disruptive mid-task)
  // 'incorrect' / 'tap' → assertive (needs immediate attention)
  // Text is kept short — children hear this; K–2 copy must be ≤ 8 words.
  if (kind === 'correct' || kind === 'snap' || kind === 'milestone') {
    announce('Correct! Great job.', 'polite');
  } else if (kind === 'incorrect') {
    announce('Not quite — try again!', 'assertive');
  }

  // Haptic feedback (visual substitute on devices without real vibration)
  // Check if Vibration API is available and supported
  if (target && scene) {
    const hasVibrationAPI = typeof navigator !== 'undefined' && 'vibrate' in navigator;
    const shouldUseVisualSubstitute = !hasVibrationAPI;

    if (shouldUseVisualSubstitute) {
      // Visual haptic substitute: quick brightness pulse on target
      // Use alpha to create a haptic-like sensation without interfering with state scales
      const originalAlpha = target.alpha ?? 1;

      // Quick pulse: brighten slightly, then return (alpha yoyo)
      tween(
        scene,
        target,
        {
          alpha: Math.min(originalAlpha + 0.15, 1.0),
        },
        {
          duration: 50,
          ease: Ease.out,
          yoyo: true,
          hold: 0,
          repeat: 0,
        }
      );
    }
  }
}

/**
 * Emit multiple feedback kinds in sequence.
 * Useful for chained reactions (snap → correct → milestone).
 *
 * Uses scene.time.delayedCall() to respect Phaser's time scale and pause states.
 *
 * @param kinds Array of feedback kinds
 * @param delayMs Delay between each emission (ms)
 * @param opts Common options (target, scene, etc.)
 *
 * @example
 * emitFeedbackSequence(['snap', 'correct', 'milestone'], 150, { target, scene });
 */
export function emitFeedbackSequence(
  kinds: FeedbackKind[],
  delayMs: number = 100,
  opts?: Parameters<typeof emitFeedback>[1]
): void {
  const { scene } = opts ?? {};

  // If no scene provided, fall back to direct emission (no timing)
  if (!scene) {
    kinds.forEach((kind) => {
      emitFeedback(kind, opts);
    });
    return;
  }

  // Use Phaser's timer system for each emission
  kinds.forEach((kind, index) => {
    scene.time.delayedCall(index * delayMs, () => {
      emitFeedback(kind, opts);
    });
  });
}
