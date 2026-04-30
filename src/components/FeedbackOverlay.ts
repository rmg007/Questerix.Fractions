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
    const reduceMotion = this.checkReduceMotion();

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

  /** Correct: panel scales in from 0.7 using Back.easeOut (~200ms). */
  private animateBounceIn(): void {
    this.bg.setScale(0.7);
    this.iconGO.setScale(0.7);
    this.label.setScale(0.7);

    this.scene.tweens.add({
      targets: [this.bg, this.iconGO, this.label],
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Incorrect: left-right shake ~4px, 3 cycles, ~250ms.
   * Tweens .x of all three objects together using yoyo repeat.
   */
  private animateShake(): void {
    const SHAKE_PX = 4;
    const targets = [
      { obj: this.bg, baseX: this.cx },
      { obj: this.iconGO, baseX: this.cx - 220 },
      { obj: this.label, baseX: this.cx + 20 },
    ];

    for (const { obj, baseX } of targets) {
      obj.setX(baseX - SHAKE_PX);
      this.scene.tweens.add({
        targets: obj,
        x: baseX + SHAKE_PX,
        duration: 42,
        ease: 'Linear',
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          obj.setX(baseX);
        },
      });
    }
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

  /** Correct: short burst of yellow/gold star particles from icon position. */
  private burstStarParticles(): void {
    if (!this.scene.textures.exists('clr-accentA')) return;
    TestHooks.mountSentinel('sparkle-burst');

    const starColors = [0xfcd34d, 0xfbbf24, 0xf59e0b, 0xfde68a, 0xffffff];
    for (const tint of starColors) {
      const emitter = this.scene.add.particles(this.iconGO.x, this.iconGO.y, 'clr-accentA', {
        lifespan: 550,
        speed: { min: 40, max: 160 },
        scale: { start: 7, end: 0 },
        alpha: { start: 1, end: 0 },
        tint,
        angle: { min: -160, max: -20 },
        gravityY: 200,
        quantity: 3,
        emitting: false,
      });
      emitter.setDepth(this.bg.depth + 5);
      emitter.explode(3);
      this.activeParticleEmitters.push(emitter);
      this.scene.time.delayedCall(700, () => {
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

  private checkReduceMotion(): boolean {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
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

