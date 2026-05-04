/**
 * Mascot state animation builders.
 * Each function takes the mascot context and triggers a specific animation.
 */

import * as Phaser from 'phaser';
import { ACTION_FILL, NAVY } from '../../scenes/utils/levelTheme';
import { BODY_R } from './character';

const AMBER = ACTION_FILL;

export interface MascotAnimContext {
  scene: Phaser.Scene;
  mascot: Phaser.GameObjects.Container;
  face: Phaser.GameObjects.Container;
  baseY: number;
  baseScale: number;
  reduceMotion: boolean;
  toIdle: () => void;
}

export function playIdle(ctx: MascotAnimContext): Phaser.Tweens.Tween | null {
  if (ctx.reduceMotion) return null;
  return ctx.scene.tweens.add({
    targets: ctx.mascot,
    y: ctx.baseY - 8,
    duration: 1500,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });
}

export function playCelebrate(ctx: MascotAnimContext): void {
  if (ctx.reduceMotion) {
    ctx.toIdle();
    return;
  }
  const bs = ctx.baseScale;
  ctx.scene.tweens.chain({
    targets: ctx.mascot,
    tweens: [
      {
        y: ctx.baseY - 40,
        scaleX: bs * 1.4,
        scaleY: bs * 1.4,
        angle: 180,
        duration: 250,
        ease: 'Back.easeOut',
      },
      {
        y: ctx.baseY,
        scaleX: bs,
        scaleY: bs,
        angle: 360,
        duration: 250,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          ctx.mascot.setAngle(0);
          ctx.toIdle();
        },
      },
    ],
  });
}

export function playEncourage(ctx: MascotAnimContext): void {
  if (ctx.reduceMotion) {
    ctx.toIdle();
    return;
  }
  ctx.scene.tweens.chain({
    targets: ctx.face,
    tweens: [
      { angle: -8, duration: 150, ease: 'Sine.easeInOut' },
      { angle: 8, duration: 150, ease: 'Sine.easeInOut' },
      { angle: -6, duration: 120, ease: 'Sine.easeInOut' },
      { angle: 6, duration: 120, ease: 'Sine.easeInOut' },
      { angle: 0, duration: 100, ease: 'Linear', onComplete: () => ctx.toIdle() },
    ],
  });
}

export function playCheerBig(ctx: MascotAnimContext): void {
  if (ctx.reduceMotion) {
    ctx.toIdle();
    return;
  }
  const bs = ctx.baseScale;
  ctx.scene.tweens.chain({
    targets: ctx.mascot,
    tweens: [
      {
        y: ctx.baseY - 60,
        scaleX: bs * 1.4,
        scaleY: bs * 1.4,
        angle: 180,
        duration: 400,
        ease: 'Back.easeOut',
      },
      {
        y: ctx.baseY,
        scaleX: bs,
        scaleY: bs,
        angle: 360,
        duration: 400,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          ctx.mascot.setAngle(0);
          ctx.toIdle();
        },
      },
    ],
  });
}

export function playOops(ctx: MascotAnimContext): void {
  if (ctx.reduceMotion) {
    ctx.toIdle();
    return;
  }
  const bs = ctx.baseScale;
  ctx.scene.tweens.chain({
    targets: ctx.mascot,
    tweens: [
      {
        y: ctx.baseY + 10,
        scaleX: bs * 1.2,
        scaleY: bs * 0.8,
        duration: 120,
        ease: 'Sine.easeOut',
      },
      {
        y: ctx.baseY - 6,
        scaleX: bs * 0.95,
        scaleY: bs * 1.05,
        duration: 160,
        ease: 'Back.easeOut',
      },
      {
        y: ctx.baseY,
        scaleX: bs,
        scaleY: bs,
        duration: 720,
        ease: 'Sine.easeInOut',
        onComplete: () => ctx.toIdle(),
      },
    ],
  });

  const drop = ctx.scene.add.graphics();
  const dropX = ctx.mascot.x + BODY_R * 0.9;
  const dropY = ctx.mascot.y - BODY_R * 0.3;
  drop.fillStyle(0x60a5fa, 0.9);
  drop.fillCircle(dropX, dropY + 5, 5);
  drop.fillTriangle(dropX - 4, dropY + 5, dropX + 4, dropY + 5, dropX, dropY - 4);
  drop.setDepth(ctx.mascot.depth + 2);

  ctx.scene.time.delayedCall(250, () => {
    ctx.scene.tweens.add({
      targets: drop,
      alpha: 0,
      y: drop.y + 12,
      duration: 350,
      ease: 'Cubic.easeIn',
      onComplete: () => drop.destroy(),
    });
  });
}

export function playCelebrateHop(ctx: MascotAnimContext): void {
  if (ctx.reduceMotion) {
    ctx.toIdle();
    return;
  }
  ctx.scene.tweens.chain({
    targets: ctx.mascot,
    tweens: [
      { y: ctx.baseY - 20, duration: 130, ease: 'Sine.easeOut' },
      { y: ctx.baseY, duration: 130, ease: 'Bounce.easeOut' },
      { y: ctx.baseY - 20, duration: 130, ease: 'Sine.easeOut' },
      {
        y: ctx.baseY,
        duration: 130,
        ease: 'Bounce.easeOut',
        onComplete: () => ctx.toIdle(),
      },
    ],
  });
}

export function drawSleepEyelids(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(AMBER, 1);
  g.fillEllipse(-11, -6, 20, 13);
  g.fillEllipse(15, -6, 20, 13);
  g.lineStyle(3, NAVY, 1);
  g.beginPath();
  g.arc(-11, -11, 9, 0, Math.PI, false, 16);
  g.strokePath();
  g.beginPath();
  g.arc(15, -11, 9, 0, Math.PI, false, 16);
  g.strokePath();
}
