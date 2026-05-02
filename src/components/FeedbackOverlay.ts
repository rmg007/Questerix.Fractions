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
 * Visual constants and color/text catalog live in feedbackOverlayConfig.ts.
 */

import * as Phaser from 'phaser';
import { TITLE_FONT, BODY_FONT, NAVY } from '../scenes/utils/levelTheme';
import { TestHooks } from '../scenes/utils/TestHooks';
import { sfx } from '../audio/SFXService';
import { checkReduceMotion } from '../lib/preferences';
import * as anim from './FeedbackAnimations';
import {
  FeedbackKind,
  SLIDE_MS,
  FADE_MS,
  DISPLAY_MS,
  PANEL_H,
  CORNER_R,
  ICON_FONT_SIZE,
  LABEL_FONT_SIZE,
  KIND_CONFIG,
  DEFAULT_PANEL_COLOR,
  FEEDBACK_DISMISSED_EVENT,
} from './feedbackOverlayConfig';

export type { FeedbackKind } from './feedbackOverlayConfig';
export { FEEDBACK_DISMISSED_EVENT } from './feedbackOverlayConfig';

export interface FeedbackOverlayConfig {
  scene: Phaser.Scene;
  width?: number;
  height?: number;
  depth?: number;
}

export class FeedbackOverlay {
  private panel: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private iconGO: Phaser.GameObjects.Text;
  private dismissTimer: Phaser.Time.TimerEvent | null = null;
  private readonly scene: Phaser.Scene;
  private readonly cx: number;
  private readonly showY: number;
  private readonly hideY: number;
  private readonly panelW: number;
  private readonly depth: number;
  private activeParticleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private panelColor: number = DEFAULT_PANEL_COLOR;

  readonly events: Phaser.Events.EventEmitter;

  constructor(config: FeedbackOverlayConfig) {
    const { scene, width = 800, height = 1280, depth = 100 } = config;

    this.scene = scene;
    this.depth = depth;
    this.events = new Phaser.Events.EventEmitter();
    this.panelW = width;
    this.cx = width / 2;
    this.showY = height - PANEL_H / 2;
    this.hideY = height + PANEL_H / 2 + 10;

    this.panel = scene.add.graphics().setDepth(depth).setVisible(false);

    this.iconGO = scene.add
      .text(this.cx, this.hideY - 65, '✓', {
        fontSize: ICON_FONT_SIZE,
        fontFamily: TITLE_FONT,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setVisible(false);

    this.label = scene.add
      .text(this.cx, this.hideY + 10, '', {
        fontSize: LABEL_FONT_SIZE,
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

    if (kind === 'correct') sfx.playCorrect();
    else if (kind === 'incorrect') sfx.playIncorrect();

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
          targets: [this.iconGO, this.label, this.panel],
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
      this.redrawPanel(this.showY, 1);
      this.iconGO.setY(this.showY - 65);
      this.label.setY(this.showY + 10);
      this.dismissTimer = this.scene.time.delayedCall(DISPLAY_MS[kind], dismiss);
      return;
    }

    this.scene.tweens.add({
      targets: this.panel,
      duration: SLIDE_MS,
      ease: 'Back.easeOut',
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        this.redrawPanel(this.hideY + (this.showY - this.hideY) * tween.progress, 1);
      },
      onComplete: () => this.redrawPanel(this.showY, 1),
    });

    this.scene.tweens.add({
      targets: [this.iconGO, this.label],
      props: {
        y: {
          from: undefined,
          to: (target: Phaser.GameObjects.Text) =>
            target === this.iconGO ? this.showY - 65 : this.showY + 10,
        },
      },
      duration: SLIDE_MS,
      ease: 'Back.easeOut',
      onComplete: () => {
        const ctx = this.buildAnimContext();
        if (kind === 'correct') {
          anim.animateCorrectEntry(ctx);
          anim.burstStarParticles(ctx, (e) => this.activeParticleEmitters.push(e));
        } else if (kind === 'incorrect') {
          anim.animateIncorrectEntry(ctx);
        } else if (kind === 'close') {
          anim.animateCloseEntry(ctx);
        }
        this.dismissTimer = this.scene.time.delayedCall(DISPLAY_MS[kind], dismiss);
      },
    });
  }

  private buildAnimContext(): anim.AnimationContext {
    return {
      scene: this.scene,
      iconGO: this.iconGO,
      label: this.label,
      panel: this.panel,
      showY: this.showY,
      cx: this.cx,
      panelW: this.panelW,
      depth: this.depth,
      redrawPanel: this.redrawPanel.bind(this),
    };
  }

  private redrawPanel(centerY: number, alpha: number): void {
    this.panel.clear();
    this.panel.setAlpha(alpha);
    this.panel.setX(0);
    this.panel.fillStyle(this.panelColor, 1);
    this.panel.fillRoundedRect(0, centerY - PANEL_H / 2, this.panelW, PANEL_H, CORNER_R);
    this.panel.lineStyle(2, NAVY, 0.15);
    this.panel.strokeRoundedRect(0, centerY - PANEL_H / 2, this.panelW, PANEL_H, CORNER_R);
  }

  private hide(): void {
    this.panel.setVisible(false).setAlpha(1).setX(0);
    this.panel.clear();
    this.iconGO
      .setVisible(false)
      .setAlpha(1)
      .setScale(1)
      .setY(this.hideY - 65)
      .setX(this.cx);
    this.label
      .setVisible(false)
      .setAlpha(1)
      .setScale(1)
      .setY(this.hideY + 10)
      .setX(this.cx);
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
