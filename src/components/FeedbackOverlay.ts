/**
 * FeedbackOverlay — renders correct/incorrect feedback in ≤800ms.
 * Shows a colored panel with icon/text, dismisses automatically.
 * per interaction-model.md §2 (feedback timing), §6.1 (success), §5.2 (failure)
 * per design-language.md §6.1 (snap pulse 180–240ms), §2.3 (semantic tokens)
 *
 * Entry animations: correct = bounce-in + star burst; incorrect = shake; close = pulse.
 * Reduced-motion: instant show, no animations.
 *
 * Plain class (not a Phaser Container) to avoid name conflicts.
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from '../scenes/utils/colors';
import { TestHooks } from '../scenes/utils/TestHooks';
import { sfx } from '../audio/SFXService';
import { checkReduceMotion } from '../lib/preferences';

export type FeedbackKind = 'correct' | 'incorrect' | 'close';

export interface FeedbackOverlayConfig {
  scene: Phaser.Scene;
  /** Canvas logical width (800 per design-language.md §8.2). */
  width?: number;
  /** Canvas logical height (1280 per design-language.md §8.2). */
  height?: number;
  /** How long to show feedback before auto-dismiss. Must be <800ms. per interaction-model.md §2 */
  displayMs?: number;
  /** Depth to render above all other game objects. */
  depth?: number;
}

const DISPLAY_MS = 600; // per interaction-model.md §2 — <800ms total
const FADE_MS = 120;

const KIND_CONFIG: Record<
  FeedbackKind,
  { bg: number; textColor: string; text: string; icon: string }
> = {
  correct: { bg: CLR.successSoft, textColor: HEX.success, text: 'Correct!', icon: '✓' },
  incorrect: { bg: CLR.errorSoft, textColor: HEX.error, text: 'Not quite — try again!', icon: '✗' },
  close: {
    bg: CLR.warning,
    textColor: HEX.neutral900,
    text: 'Almost! Adjust a little.',
    icon: '~',
  },
};

/** Emitted when the overlay has fully dismissed. */
export const FEEDBACK_DISMISSED_EVENT = 'feedback-dismissed';

export class FeedbackOverlay {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private iconGO: Phaser.GameObjects.Text;
  private dismissTimer: Phaser.Time.TimerEvent | null = null;
  private readonly scene: Phaser.Scene;
  private readonly cx: number;
  private readonly cy: number;
  private activeParticleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  /** Subscribe to dismiss events. */
  readonly events: Phaser.Events.EventEmitter;

  constructor(config: FeedbackOverlayConfig) {
    const { scene, width = 800, height = 1280, depth = 100 } = config;

    this.scene = scene;
    this.events = new Phaser.Events.EventEmitter();

    this.cx = width / 2;
    this.cy = height / 2;

    const cx = this.cx;
    const cy = this.cy;

    // Background panel — spans full width, 200px tall
    this.bg = scene.add
      .rectangle(cx, cy, width, 200, CLR.successSoft, 0.97)
      .setDepth(depth)
      .setVisible(false);

    // Icon
    this.iconGO = scene.add
      .text(cx - 220, cy, '✓', {
        fontSize: '48px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        color: HEX.success,
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setVisible(false);

    // Label — per interaction-model.md §5.1: never say "wrong"
    this.label = scene.add
      .text(cx + 20, cy, '', {
        fontSize: '28px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: HEX.neutral900,
      })
      .setOrigin(0, 0.5)
      .setDepth(depth + 1)
      .setVisible(false);
  }

  /**
   * Show feedback for the given kind. Auto-dismisses after displayMs.
   * per interaction-model.md §2 — visual feedback must start within 300ms of submit.
   */
  show(kind: FeedbackKind, onDismiss?: () => void, text?: string): void {
    const cfg = KIND_CONFIG[kind];
    const reduceMotion = checkReduceMotion();

    const labelText = text && text.trim().length > 0 ? text : cfg.text;

    this.bg.setFillStyle(cfg.bg, 0.97);
    this.iconGO.setText(cfg.icon).setColor(cfg.textColor).setVisible(true);
    this.label.setText(labelText).setVisible(true);
    this.bg.setVisible(true).setAlpha(1);
    this.iconGO.setAlpha(1);
    this.label.setAlpha(1);

    // Reset scale/position in case a previous tween left them non-unit
    this.bg.setScale(1);
    this.iconGO.setScale(1);
    this.label.setScale(1);
    this.bg.setX(this.cx);
    this.iconGO.setX(this.cx - 220);
    this.label.setX(this.cx + 20);

    this.dismissTimer?.remove(false);

    // ── Sound effect ─────────────────────────────────────────────────────────
    if (kind === 'correct') {
      sfx.playCorrect();
    }

    // ── Test hooks ─────────────────────────────────────────────────────────
    TestHooks.mountSentinel('feedback-overlay');
    TestHooks.setText('feedback-overlay', labelText);
    TestHooks.mountInteractive(
      'feedback-next-btn',
      () => {
        this.dismissTimer?.remove(false);
        this.dismissTimer = null;
        this.hide();
        TestHooks.unmount('feedback-overlay');
        TestHooks.unmount('feedback-next-btn');
        this.events.emit(FEEDBACK_DISMISSED_EVENT);
        onDismiss?.();
      },
      { width: '200px', height: '60px', top: '55%', left: '50%' }
    );

    const dismiss = () => {
      this.hide();
      TestHooks.unmount('feedback-overlay');
      TestHooks.unmount('feedback-next-btn');
      this.events.emit(FEEDBACK_DISMISSED_EVENT);
      onDismiss?.();
    };

    // ── Entry animations (skipped for prefers-reduced-motion) ────────────────
    if (!reduceMotion) {
      if (kind === 'correct') {
        this.animateBounceIn();
        this.burstStarParticles();
      } else if (kind === 'incorrect') {
        this.animateShake();
      } else if (kind === 'close') {
        this.animatePulse();
      }
    }

    if (reduceMotion) {
      this.dismissTimer = this.scene.time.delayedCall(DISPLAY_MS, dismiss);
    } else {
      this.dismissTimer = this.scene.time.delayedCall(DISPLAY_MS, () => {
        this.scene.tweens.add({
          targets: [this.bg, this.iconGO, this.label],
          alpha: 0,
          duration: FADE_MS,
          ease: 'Cubic.easeIn',
          onComplete: dismiss,
        });
      });
    }
  }

  // ── Entry animations ────────────────────────────────────────────────────

  /** Correct: panel scales in with pop (0.7 → 1.05 → 1.0, ~280ms, Back.easeOut). */
  private animateBounceIn(): void {
    this.bg.setScale(0.7);
    this.iconGO.setScale(0.7);
    this.label.setScale(0.7);

    // First pop: scale up to 1.05 with Back.easeOut (~160ms)
    this.scene.tweens.add({
      targets: [this.bg, this.iconGO, this.label],
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 160,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Second settle: scale down to 1.0 with Quad.easeOut (~120ms)
        this.scene.tweens.add({
          targets: [this.bg, this.iconGO, this.label],
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 120,
          ease: 'Quad.easeOut',
        });
      },
    });
  }

  /**
   * Incorrect: softer opacity + subtle scale pulse (200ms, Quad.easeOut).
   * Respects prefers-reduced-motion: only panel + color flash, no scale.
   */
  private animateShake(): void {
    // S3-T2: Softer feedback — opacity pulse + slight scale (no harsh shake)
    this.scene.tweens.add({
      targets: [this.bg, this.iconGO, this.label],
      alpha: 0.8,
      duration: 100,
      ease: 'Quad.easeOut',
      yoyo: true,
      repeat: 0,
      onComplete: () => {
        this.bg.setAlpha(1);
        this.iconGO.setAlpha(1);
        this.label.setAlpha(1);
      },
    });
  }

  /** Close: gentle pulse scale 1.0→1.05→1.0 (~250ms). */
  private animatePulse(): void {
    this.scene.tweens.add({
      targets: [this.bg, this.iconGO, this.label],
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 125,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 0,
    });
  }

  /** Correct: burst of 12-14 small stars drifting upward with alpha fade. */
  private burstStarParticles(): void {
    if (!this.scene.textures.exists('clr-accentA')) return;
    TestHooks.mountSentinel('sparkle-burst');

    // S3-T2: 12-14 particles in warm palette, drifting upward with alpha fade
    const starColors = [0xfcd34d, 0xfbbf24, 0xf59e0b, 0xfde68a, 0xffffff];
    let particleCount = 0;
    const maxParticles = 14;
    for (const tint of starColors) {
      // Emit ~3 per color to reach ~14-15 total
      const perColor = Math.ceil(maxParticles / starColors.length);
      const emitter = this.scene.add.particles(this.iconGO.x, this.iconGO.y, 'clr-accentA', {
        lifespan: 650, // extended fade time for upward drift
        speed: { min: 30, max: 140 },
        scale: { start: 5, end: 1 }, // smaller particles
        alpha: { start: 1, end: 0 }, // alpha fade (no gravity pulldown)
        tint,
        angle: { min: -180, max: 0 }, // upward range
        gravityY: 0, // no gravity — let them float up
        quantity: perColor,
        emitting: false,
      });
      emitter.setDepth(this.bg.depth + 5);
      emitter.explode(perColor);
      particleCount += perColor;
      this.activeParticleEmitters.push(emitter);
      this.scene.time.delayedCall(800, () => {
        const idx = this.activeParticleEmitters.indexOf(emitter);
        if (idx !== -1) {
          this.activeParticleEmitters.splice(idx, 1);
          emitter.destroy();
        }
      });
    }
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private hide(): void {
    this.bg.setVisible(false).setAlpha(1).setScale(1);
    this.iconGO.setVisible(false).setAlpha(1).setScale(1);
    this.label.setVisible(false).setAlpha(1).setScale(1);
    // Restore original x positions
    this.bg.setX(this.cx);
    this.iconGO.setX(this.cx - 220);
    this.label.setX(this.cx + 20);
    for (const e of this.activeParticleEmitters) e.destroy();
    this.activeParticleEmitters = [];
    TestHooks.unmount('sparkle-burst');
  }


  destroy(): void {
    this.dismissTimer?.remove(false);
    this.events.destroy();
    this.bg.destroy();
    this.iconGO.destroy();
    this.label.destroy();
    for (const e of this.activeParticleEmitters) e.destroy();
    this.activeParticleEmitters = [];
  }
}
