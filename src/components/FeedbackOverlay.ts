/**
 * FeedbackOverlay — renders correct/incorrect feedback in ≤800ms.
 * Shows a colored panel with icon/text, dismisses automatically.
 * per interaction-model.md §2 (feedback timing), §6.1 (success), §5.2 (failure)
 * per design-language.md §6.1 (snap pulse 180–240ms), §2.3 (semantic tokens)
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

  /** Subscribe to dismiss events. */
  readonly events: Phaser.Events.EventEmitter;

  constructor(config: FeedbackOverlayConfig) {
    const { scene, width = 800, height = 1280, depth = 100 } = config;

    this.scene = scene;
    this.events = new Phaser.Events.EventEmitter();

    const cx = width / 2;
    const cy = height / 2;

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
  show(kind: FeedbackKind, onDismiss?: () => void): void {
    const cfg = KIND_CONFIG[kind];
    const reduceMotion = this.checkReduceMotion();

    this.bg.setFillStyle(cfg.bg, 0.97);
    this.iconGO.setText(cfg.icon).setColor(cfg.textColor).setVisible(true);
    this.label.setText(cfg.text).setVisible(true);
    this.bg.setVisible(true).setAlpha(1);
    this.iconGO.setAlpha(1);
    this.label.setAlpha(1);

    this.dismissTimer?.remove(false);

    // ── Test hooks ─────────────────────────────────────────────────────────
    TestHooks.mountSentinel('feedback-overlay');
    // feedback-next-btn: interactive button; clicking it immediately dismisses overlay
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

    if (reduceMotion) {
      // per design-language.md §6.4 — instant state change
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

  private hide(): void {
    this.bg.setVisible(false).setAlpha(1);
    this.iconGO.setVisible(false).setAlpha(1);
    this.label.setVisible(false).setAlpha(1);
  }

  private checkReduceMotion(): boolean {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  destroy(): void {
    this.dismissTimer?.remove(false);
    this.events.destroy();
    this.bg.destroy();
    this.iconGO.destroy();
    this.label.destroy();
  }
}
