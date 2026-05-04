/**
 * SessionCompleteOverlay animation helpers.
 * Trophy bounce, glow sync, star pop, and confetti burst.
 */

import * as Phaser from 'phaser';

export function animateTrophyWave(
  scene: Phaser.Scene,
  trophy: Phaser.GameObjects.Text,
  onComplete: () => void
): void {
  scene.tweens.add({
    targets: trophy,
    scaleX: 1.2,
    scaleY: 1.2,
    duration: 400,
    ease: Phaser.Math.Easing.Elastic.Out,
    onComplete: () => {
      scene.tweens.add({
        targets: trophy,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 200,
        ease: 'Cubic.easeOut',
        onComplete,
      });
    },
  });
}

export function startGlowSync(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Text
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    alpha: 0.7,
    duration: 800,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });
}

export function burstConfetti(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth: number,
  totalCount = 40
): void {
  if (!scene.textures.exists('clr-accentA')) return;
  const colors = [0xfcd34d, 0x34d399, 0x60a5fa, 0xfb7185, 0xa78bfa, 0xf97316];
  const perColor = Math.max(1, Math.round(totalCount / colors.length));
  for (const tint of colors) {
    const emitter = scene.add.particles(x, y, 'clr-accentA', {
      lifespan: 1000,
      speed: { min: 70, max: 280 },
      scale: { start: 9, end: 0 },
      alpha: { start: 1, end: 0 },
      tint,
      angle: { min: -160, max: -20 },
      gravityY: 320,
      quantity: perColor,
      emitting: false,
    });
    emitter.setDepth(depth + 15);
    emitter.explode(perColor);
    scene.time.delayedCall(1400, () => emitter.destroy());
  }
}

export function animateStars(
  scene: Phaser.Scene,
  starTexts: Phaser.GameObjects.Text[],
  confettiX: number,
  confettiY: number,
  depth: number,
  onDone: () => void,
  confettiCount = 40,
  isPerfect = false
): void {
  let delay = 0;
  for (let i = 0; i < starTexts.length; i++) {
    const st = starTexts[i]!;
    scene.time.delayedCall(delay, () => {
      scene.tweens.add({
        targets: st,
        scale: isPerfect ? 1.3 : 1.2,
        duration: 180,
        ease: 'Back.easeOut',
        onComplete: () => {
          scene.tweens.add({ targets: st, scale: 1.0, duration: 100, ease: 'Cubic.easeOut' });
        },
      });
      if (i === 0) burstConfetti(scene, confettiX, confettiY, depth, confettiCount);
      if (i === starTexts.length - 1) scene.time.delayedCall(300, onDone);
    });
    delay += 300;
  }
  if (starTexts.length === 0) onDone();
}
