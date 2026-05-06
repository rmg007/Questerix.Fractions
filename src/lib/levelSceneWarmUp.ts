import * as Phaser from 'phaser';
import { tween, Duration } from '@/scenes/utils/motion';

const CW = 800;
const CH = 1280;
const OVERLAY_DEPTH = 500;

/**
 * Animates a "Warm-up complete!" overlay and resolves when the dismiss
 * animation finishes. Respects prefers-reduced-motion via the tween wrapper.
 */
export function showWarmUpCompleteOverlay(scene: Phaser.Scene): Promise<void> {
  return new Promise((resolve) => {
    const bg = scene.add
      .rectangle(CW / 2, CH / 2, CW, CH, 0x1a2e4a, 0.85)
      .setDepth(OVERLAY_DEPTH)
      .setAlpha(0);

    const label = scene.add
      .text(CW / 2, CH / 2, '⭐ Warm-up complete!', {
        fontSize: '52px',
        fontFamily: 'Nunito, sans-serif',
        color: '#FFDD57',
        stroke: '#1a2e4a',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(OVERLAY_DEPTH + 1)
      .setAlpha(0);

    tween(scene, [bg, label], { alpha: 1 }, {
      duration: Duration.base,
      onComplete: () => {
        tween(scene, [bg, label], { alpha: 0 }, {
          delay: 600,
          duration: Duration.long,
          onComplete: () => {
            bg.destroy();
            label.destroy();
            resolve();
          },
        });
      },
    });
  });
}

/**
 * Renders a "skip warm-up →" link bottom-right.
 * Tapping calls onSkip immediately.
 */
export function createSkipWarmUpButton(
  scene: Phaser.Scene,
  onSkip: () => void
): Phaser.GameObjects.Text {
  return scene.add
    .text(CW - 28, CH - 44, 'skip warm-up →', {
      fontSize: '26px',
      fontFamily: 'Nunito, sans-serif',
      color: '#7799BB',
    })
    .setOrigin(1, 1)
    .setDepth(15)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', onSkip);
}
