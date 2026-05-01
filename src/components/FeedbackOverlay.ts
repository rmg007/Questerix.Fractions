/**
 * FeedbackOverlay — bottom-sheet feedback panel that slides up from below the canvas.
 *
 * Layout: full-width rounded panel anchored to the bottom of the screen.
 * Correct: solid green, 1400ms display.  Incorrect: solid red, 1600ms + shake.
 * Close:   solid amber, 1200ms.
 *
 * per interaction-model.md §2 (feedback timing), §6.1 (success), §5.2 (failure)
 * per design-language.md §6.1 (snap pulse 180–240ms), §2.3 (semantic tokens)
 *
 * Plain class (not a Phaser Container) to avoid name conflicts.
 */

import * as Phaser from 'phaser';
import { TITLE_FONT, BODY_FONT, NAVY } from '../scenes/utils/levelTheme';
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
  /** Depth to render above all other game objects. */
  depth?: number;
}

// ── Timing ────────────────────────────────────────────────────────────────────
const SLIDE_MS = 280;
const DISPLAY_MS: Record<FeedbackKind, number> = {
  correct: 1400,
  incorrect: 1600,
  close: 1200,
};
const FADE_MS = 140;

// ── Panel dimensions ──────────────────────────────────────────────────────────
const PANEL_H = 220;
const CORNER_R = 24;

// ── Colors ────────────────────────────────────────────────────────────────────
const COLOR_CORRECT = 0x22c55e; // green-500
const COLOR_INCORRECT = 0xef4444; // red-500
const COLOR_CLOSE = 0xf59e0b; // amber-500

const KIND_CONFIG: Record<
  FeedbackKind,
  { color: number; textHex: string; text: string; icon: string }
> = {
  correct: {
    color: COLOR_CORRECT,
    textHex: '#ffffff',
    text: 'Correct! 🌟',
    icon: '✓',
  },
  incorrect: {
    color: COLOR_INCORRECT,
    textHex: '#ffffff',
    text: 'Not quite — try again!',
    icon: '✗',
  },
  close: {
    color: COLOR_CLOSE,
    textHex: '#1e3a8a',
    text: 'Almost! Adjust a little.',
    icon: '~',
  },
};

/** Emitted when the overlay has fully dismissed. */
export const FEEDBACK_DISMISSED_EVENT = 'feedback-dismissed';

export class FeedbackOverlay {
  private panel: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private iconGO: Phaser.GameObjects.Text;
  private dismissTimer: Phaser.Time.TimerEvent | null = null;
  private readonly scene: Phaser.Scene;
  private readonly cx: number;
  private readonly showY: number;   // center Y when panel is fully visible
  private readonly hideY: number;   // center Y when panel is off-screen below
  private readonly panelW: number;
  private readonly depth: number;
  private activeParticleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private panelColor: number = COLOR_CORRECT;

  /** Subscribe to dismiss events. */
  readonly events: Phaser.Events.EventEmitter;

  constructor(config: FeedbackOverlayConfig) {
    const { scene, width = 800, height = 1280, depth = 100 } = config;

    this.scene = scene;
    this.depth = depth;
    this.events = new Phaser.Events.EventEmitter();
    this.panelW = width;
    this.cx = width / 2;

    // Panel sits at bottom of canvas. Center Y when shown = height - PANEL_H/2.
    this.showY = height - PANEL_H / 2;
    this.hideY = height + PANEL_H / 2 + 10;

    // ── Panel graphics ────────────────────────────────────────────────────────
    this.panel = scene.add.graphics().setDepth(depth).setVisible(false);

    // ── Icon — top area of the panel ─────────────────────────────────────────
    this.iconGO = scene.add
      .text(this.cx, this.hideY - 65, '✓', {
        fontSize: '64px',
        fontFamily: TITLE_FONT,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setVisible(false);

    // ── Label — below icon ────────────────────────────────────────────────────
    this.label = scene.add
      .text(this.cx, this.hideY + 10, '', {
        fontSize: '28px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setVisible(false);
  }

  /**
   * Show feedback for the given kind. Slides up from the bottom, auto-dismisses.
   * per interaction-model.md §2 — visual feedback must start within 300ms of submit.
   */
  show(kind: FeedbackKind, onDismiss?: () => void, text?: string): void {
    const cfg = KIND_CONFIG[kind];
    const reduceMotion = checkReduceMotion();

    const labelText = text && text.trim().length > 0 ? text : cfg.text;
    this.panelColor = cfg.color;

    // ── Configure text content ────────────────────────────────────────────────
    this.iconGO
      .setText(cfg.icon)
      .setColor(cfg.textHex)
      .setY(this.hideY - 65)
      .setAlpha(1)
      .setVisible(true);

    this.label
      .setText(labelText)
      .setColor(cfg.textHex)
      .setY(this.hideY + 10)
      .setAlpha(1)
      .setVisible(true);

    this.redrawPanel(this.hideY, 1);
    this.panel.setVisible(true);

    this.dismissTimer?.remove(false);

    // ── Sound effect ──────────────────────────────────────────────────────────
    if (kind === 'correct') {
      sfx.playCorrect();
    } else if (kind === 'incorrect') {
      sfx.playIncorrect();
    }

    // ── Test hooks ────────────────────────────────────────────────────────────
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
      { width: '200px', height: '60px', top: '85%', left: '50%' }
    );

    const dismiss = () => {
      if (reduceMotion) {
        this.hide();
      } else {
        this.scene.tweens.add({
          targets: [this.iconGO, this.label],
          alpha: 0,
          duration: FADE_MS,
          ease: 'Cubic.easeIn',
        });
        this.scene.tweens.add({
          targets: this.panel,
          alpha: 0,
          duration: FADE_MS,
          ease: 'Cubic.easeIn',
          onComplete: () => this.hide(),
        });
      }
      TestHooks.unmount('feedback-overlay');
      TestHooks.unmount('feedback-next-btn');
      this.events.emit(FEEDBACK_DISMISSED_EVENT);
      onDismiss?.();
    };

    if (reduceMotion) {
      // Instant show at final position, no animation
      this.repositionToShow();
      this.dismissTimer = this.scene.time.delayedCall(DISPLAY_MS[kind], dismiss);
      return;
    }

    // ── Slide up ──────────────────────────────────────────────────────────────
    this.scene.tweens.add({
      targets: this.panel,
      duration: SLIDE_MS,
      ease: 'Back.easeOut',
      onUpdate: (_tween: Phaser.Tweens.Tween, _target: unknown, _key: string, _current: number) => {
        const progress = _tween.progress;
        const panelY = this.hideY + (this.showY - this.hideY) * progress;
        this.redrawPanel(panelY, 1);
      },
      onComplete: () => {
        this.redrawPanel(this.showY, 1);
      },
    });

    this.scene.tweens.add({
      targets: [this.iconGO, this.label],
      props: {
        y: {
          from: undefined, // current y (hideY offsets)
          to: (target: Phaser.GameObjects.Text) =>
            target === this.iconGO ? this.showY - 65 : this.showY + 10,
        },
      },
      duration: SLIDE_MS,
      ease: 'Back.easeOut',
      onComplete: () => {
        // ── Post-slide entry animations ───────────────────────────────────────
        if (kind === 'correct') {
          this.animateBounceIcon();
          this.burstStarParticles();
        } else if (kind === 'incorrect') {
          this.animateShake();
        } else if (kind === 'close') {
          this.animatePulse();
        }

        // Start the display timer after slide completes
        this.dismissTimer = this.scene.time.delayedCall(DISPLAY_MS[kind], dismiss);
      },
    });
  }

  // ── Entry animations ────────────────────────────────────────────────────────

  /** Correct: icon pops (scale 1.0 → 1.3 → 1.0, ~300ms). */
  private animateBounceIcon(): void {
    this.scene.tweens.add({
      targets: this.iconGO,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 150,
      ease: 'Back.easeOut',
      yoyo: true,
      repeat: 0,
    });
  }

  /** Incorrect: real left-right shake (±22px, 3 cycles, 80ms each). */
  private animateShake(): void {
    const amplitude = 22;
    const halfCycle = 80;
    const origX = this.cx;

    this.scene.tweens.chain({
      targets: [this.iconGO, this.label],
      tweens: [
        { x: origX + amplitude, duration: halfCycle, ease: 'Sine.easeInOut' },
        { x: origX - amplitude, duration: halfCycle, ease: 'Sine.easeInOut' },
        { x: origX + amplitude * 0.6, duration: halfCycle, ease: 'Sine.easeInOut' },
        { x: origX - amplitude * 0.6, duration: halfCycle, ease: 'Sine.easeInOut' },
        {
          x: origX,
          duration: halfCycle,
          ease: 'Sine.easeOut',
        },
      ],
    });

    // Shake the panel graphics too — update redrawPanel during shake
    const panelShake = { x: this.cx };
    this.scene.tweens.chain({
      targets: panelShake,
      tweens: [
        { x: this.cx + amplitude, duration: halfCycle, ease: 'Sine.easeInOut' },
        { x: this.cx - amplitude, duration: halfCycle, ease: 'Sine.easeInOut' },
        { x: this.cx + amplitude * 0.6, duration: halfCycle, ease: 'Sine.easeInOut' },
        { x: this.cx - amplitude * 0.6, duration: halfCycle, ease: 'Sine.easeInOut' },
        {
          x: this.cx,
          duration: halfCycle,
          ease: 'Sine.easeOut',
          onComplete: () => {
            this.redrawPanel(this.showY, 1);
          },
        },
      ],
      onUpdate: () => {
        // Offset the panel by the shake amount
        const offsetX = panelShake.x - this.cx;
        this.panel.setX(offsetX);
      },
    });
  }

  /** Close: gentle pulse scale 1.0→1.04→1.0 (~250ms). */
  private animatePulse(): void {
    this.scene.tweens.add({
      targets: [this.iconGO, this.label],
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 125,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 0,
    });
  }

  /** Correct: burst of 14 small stars drifting upward with alpha fade. */
  private burstStarParticles(): void {
    if (!this.scene.textures.exists('clr-accentA')) return;
    TestHooks.mountSentinel('sparkle-burst');

    const starColors = [0xfcd34d, 0xfbbf24, 0xf59e0b, 0xfde68a, 0xffffff];
    const maxParticles = 14;
    for (const tint of starColors) {
      const perColor = Math.ceil(maxParticles / starColors.length);
      const emitter = this.scene.add.particles(this.cx, this.showY - 65, 'clr-accentA', {
        lifespan: 700,
        speed: { min: 40, max: 160 },
        scale: { start: 5, end: 1 },
        alpha: { start: 1, end: 0 },
        tint,
        angle: { min: -180, max: 0 },
        gravityY: 0,
        quantity: perColor,
        emitting: false,
      });
      emitter.setDepth(this.depth + 5);
      emitter.explode(perColor);
      this.activeParticleEmitters.push(emitter);
      this.scene.time.delayedCall(900, () => {
        const idx = this.activeParticleEmitters.indexOf(emitter);
        if (idx !== -1) {
          this.activeParticleEmitters.splice(idx, 1);
          emitter.destroy();
        }
      });
    }
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  /** Redraw the panel graphics at the given center-Y position. */
  private redrawPanel(centerY: number, alpha: number): void {
    this.panel.clear();
    this.panel.setAlpha(alpha);
    this.panel.setX(0);
    this.panel.fillStyle(this.panelColor, 1);
    this.panel.fillRoundedRect(0, centerY - PANEL_H / 2, this.panelW, PANEL_H, CORNER_R);
    // Subtle top border for depth
    this.panel.lineStyle(2, NAVY, 0.15);
    this.panel.strokeRoundedRect(0, centerY - PANEL_H / 2, this.panelW, PANEL_H, CORNER_R);
  }

  private repositionToShow(): void {
    this.redrawPanel(this.showY, 1);
    this.iconGO.setY(this.showY - 65);
    this.label.setY(this.showY + 10);
  }

  private hide(): void {
    this.panel.setVisible(false).setAlpha(1).setX(0);
    this.panel.clear();
    this.iconGO.setVisible(false).setAlpha(1).setScale(1).setY(this.hideY - 65).setX(this.cx);
    this.label.setVisible(false).setAlpha(1).setScale(1).setY(this.hideY + 10).setX(this.cx);
    for (const e of this.activeParticleEmitters) e.destroy();
    this.activeParticleEmitters = [];
    TestHooks.unmount('sparkle-burst');
  }

  destroy(): void {
    this.dismissTimer?.remove(false);
    this.events.destroy();
    this.panel.destroy();
    this.iconGO.destroy();
    this.label.destroy();
    for (const e of this.activeParticleEmitters) e.destroy();
    this.activeParticleEmitters = [];
  }
}
