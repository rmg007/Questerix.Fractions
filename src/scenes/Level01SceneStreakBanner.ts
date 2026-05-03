/**
 * Streak banner animation extracted from Level01Scene.
 */

import * as Phaser from 'phaser';
import type { Mascot } from '@/components/Mascot';
import { sfx } from '@/audio/SFXService';
import { ACTION_FILL, NAVY, NAVY_HEX, TITLE_FONT } from './utils/levelTheme';

const CW = 800;

export function showStreakBanner(
  scene: Phaser.Scene,
  streak: number,
  mascot: Mascot | null | undefined
): void {
  const bannerText = streak >= 5 ? 'UNSTOPPABLE! ⭐' : '3 in a row! 🔥';
  const bannerBg = streak >= 5 ? 0xffd700 : ACTION_FILL;

  const PILL_W = 520,
    PILL_H = 88,
    PILL_R = 44;
  const cx = CW / 2;
  const startY = -PILL_H;
  const landY = 140;

  const g = scene.add.graphics().setDepth(90);
  g.fillStyle(bannerBg, 1);
  g.fillRoundedRect(cx - PILL_W / 2, startY - PILL_H / 2, PILL_W, PILL_H, PILL_R);
  g.lineStyle(3, NAVY, 0.4);
  g.strokeRoundedRect(cx - PILL_W / 2, startY - PILL_H / 2, PILL_W, PILL_H, PILL_R);

  const txt = scene.add
    .text(cx, startY, bannerText, {
      fontFamily: TITLE_FONT,
      fontSize: '32px',
      color: NAVY_HEX,
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(91);

  sfx.playStreak();
  mascot?.setState('cheer-big');

  const container = scene.add.container(0, 0, [g, txt]).setDepth(90);

  scene.tweens.add({
    targets: [g, txt],
    y: `+=${landY - startY}`,
    duration: 400,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.time.delayedCall(1600, () => {
        scene.tweens.add({
          targets: [g, txt],
          y: `-=${landY - startY}`,
          duration: 350,
          ease: 'Back.easeIn',
          onComplete: () => container.destroy(),
        });
      });
    },
  });
}
