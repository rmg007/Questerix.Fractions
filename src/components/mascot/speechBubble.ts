/**
 * Mascot speech bubble — text bubble with tail above the mascot's head.
 */

import * as Phaser from 'phaser';
import { NAVY, BODY_FONT } from '../../scenes/utils/levelTheme';
import { BODY_R, HAT_H } from './character';

const WHITE = 0xffffff;
const NAVY_HEX = '#1e3a8a';

export interface SpeechBubbleContext {
  scene: Phaser.Scene;
  x: number;
  y: number;
  scaleY: number;
  depth: number;
  reduceMotion: boolean;
}

export function createSpeechBubble(
  ctx: SpeechBubbleContext,
  text: string,
  durationMs: number,
  onDismiss: (container: Phaser.GameObjects.Container) => void
): Phaser.GameObjects.Container {
  const PAD = 24;
  const MAX_W = 440;

  const measurer = ctx.scene.add
    .text(0, 0, text, {
      fontSize: '32px',
      fontFamily: BODY_FONT,
      wordWrap: { width: MAX_W - PAD * 2 },
    })
    .setAlpha(0);
  const tw = Math.min(measurer.width + PAD * 2, MAX_W);
  const th = measurer.height + PAD;
  measurer.destroy();

  const worldX = ctx.x;
  let worldY = ctx.y - (BODY_R + HAT_H) * ctx.scaleY - th - 16;
  const MIN_Y = th / 2 + 10;
  const MAX_Y = 1280 - th / 2 - 10;
  worldY = Math.max(MIN_Y, Math.min(worldY, MAX_Y));

  const bg = ctx.scene.add.graphics();
  bg.fillStyle(WHITE, 1);
  bg.fillRoundedRect(-tw / 2, -th / 2, tw, th, 12);
  bg.lineStyle(2, NAVY, 1);
  bg.strokeRoundedRect(-tw / 2, -th / 2, tw, th, 12);
  bg.fillStyle(WHITE, 1);
  bg.fillTriangle(-8, th / 2 - 1, 8, th / 2 - 1, 0, th / 2 + 10);
  bg.lineStyle(2, NAVY, 1);
  bg.strokeTriangle(-8, th / 2 - 1, 8, th / 2 - 1, 0, th / 2 + 10);

  const label = ctx.scene.add
    .text(0, 0, text, {
      fontSize: '32px',
      fontFamily: BODY_FONT,
      color: NAVY_HEX,
      align: 'center',
      wordWrap: { width: tw - PAD },
    })
    .setOrigin(0.5);

  const container = ctx.scene.add.container(worldX, worldY, [bg, label]);
  container.setDepth(ctx.depth + 10);
  container.setAlpha(0);

  if (ctx.reduceMotion) {
    container.setAlpha(1);
    ctx.scene.time.delayedCall(durationMs, () => onDismiss(container));
    return container;
  }

  ctx.scene.tweens.add({
    targets: container,
    alpha: 1,
    duration: 200,
    ease: 'Cubic.easeOut',
  });

  ctx.scene.time.delayedCall(durationMs, () => {
    ctx.scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeIn',
      onComplete: () => onDismiss(container),
    });
  });

  return container;
}
