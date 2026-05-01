/**
 * FeedbackAnimations — extracted animation logic for FeedbackOverlay.
 * Handles entry animations for correct/incorrect/close feedback and particle bursts.
 */

import * as Phaser from 'phaser';
import { TestHooks } from '../scenes/utils/TestHooks';

export interface AnimationContext {
  scene: Phaser.Scene;
  iconGO: Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
  panel: Phaser.GameObjects.Graphics;
  showY: number;
  cx: number;
  panelW: number;
  depth: number;
  redrawPanel(centerY: number, alpha: number): void;
}

/** Correct: icon scale 0.5→1.0 with a spring bounce. */
export function animateCorrectEntry(ctx: AnimationContext): void {
  ctx.iconGO.setScale(0.5);
  ctx.scene.tweens.add({
    targets: ctx.iconGO,
    scaleX: 1.0,
    scaleY: 1.0,
    duration: 280,
    ease: 'Back.easeOut',
  });
}

/** Incorrect: visible horizontal shake (x: center → +18 → −18 → +10 → center, ~320ms). */
export function animateIncorrectEntry(ctx: AnimationContext): void {
  const shake = { offset: 0 };
  ctx.scene.tweens.chain({
    targets: shake,
    tweens: [
      { offset: 18, duration: 80, ease: 'Sine.easeInOut' },
      { offset: -18, duration: 80, ease: 'Sine.easeInOut' },
      { offset: 10, duration: 80, ease: 'Sine.easeInOut' },
      {
        offset: 0,
        duration: 80,
        ease: 'Sine.easeOut',
        onComplete: () => ctx.redrawPanel(ctx.showY, 1),
      },
    ],
    onUpdate: () => {
      ctx.iconGO.setX(ctx.cx + shake.offset);
      ctx.label.setX(ctx.cx + shake.offset);
      ctx.panel.setX(shake.offset);
    },
  });
}

/** Close: gentle pulse scale 1.0→1.04→1.0 (~250ms). */
export function animateCloseEntry(ctx: AnimationContext): void {
  ctx.scene.tweens.add({
    targets: [ctx.iconGO, ctx.label],
    scaleX: 1.04,
    scaleY: 1.04,
    duration: 125,
    ease: 'Sine.easeInOut',
    yoyo: true,
  });
}

/** Correct: burst of small stars drifting upward from panel center. */
export function burstStarParticles(
  ctx: AnimationContext,
  onEmitterDestroy: (emitter: Phaser.GameObjects.Particles.ParticleEmitter) => void
): void {
  if (!ctx.scene.textures.exists('clr-accentA')) return;
  TestHooks.mountSentinel('sparkle-burst');

  const starColors = [0xfcd34d, 0xfbbf24, 0xf59e0b, 0xfde68a, 0xffffff];
  const perColor = 3;
  for (const tint of starColors) {
    const emitter = ctx.scene.add.particles(ctx.cx, ctx.showY, 'clr-accentA', {
      lifespan: 700,
      speed: { min: 40, max: 160 },
      scale: { start: 5, end: 1 },
      alpha: { start: 1, end: 0 },
      tint,
      angle: { min: -180, max: 0 },
      emitting: false,
    });
    emitter.setDepth(ctx.depth + 5);
    emitter.explode(perColor);
    onEmitterDestroy(emitter);
    ctx.scene.time.delayedCall(900, () => {
      emitter.destroy();
    });
  }
}
