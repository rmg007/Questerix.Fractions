/**
 * SessionCompleteOverlay scaffold-recommendation banner.
 * "Level N unlocked!" / "Keep practising" / "Try an easier one" — slides in after stars land.
 */

import * as Phaser from 'phaser';
import { TITLE_FONT, NAVY_HEX, NAVY, ACTION_FILL } from '../../scenes/utils/levelTheme';
import { A11yLayer } from '../A11yLayer';

export type ScaffoldRecommendation = 'advance' | 'stay' | 'regress';

export interface ScaffoldBannerConfig {
  scene: Phaser.Scene;
  cx: number;
  y: number;
  recommendation: ScaffoldRecommendation;
  nextLevelNumber: number | null | undefined;
  reduceMotion: boolean;
  onNextLevel?: (() => void) | undefined;
  onPlayAgain: () => void;
  onMenu: () => void;
}

export function createScaffoldBanner(
  config: ScaffoldBannerConfig
): Phaser.GameObjects.GameObject[] {
  const {
    scene,
    cx,
    y,
    recommendation,
    nextLevelNumber,
    reduceMotion,
    onNextLevel,
    onPlayAgain,
    onMenu,
  } = config;

  const bannerText =
    recommendation === 'advance'
      ? nextLevelNumber
        ? `Level ${nextLevelNumber} unlocked! →`
        : 'Great job! →'
      : recommendation === 'stay'
        ? 'Keep practising →'
        : "Let's try an easier one →";

  const handleTap = (): void => {
    if (recommendation === 'advance' && nextLevelNumber && onNextLevel) onNextLevel();
    else if (recommendation === 'stay') onPlayAgain();
    else if (recommendation === 'regress') onMenu();
  };

  const W = 440,
    H = 64,
    R = 32;
  const bg = scene.add.graphics().setAlpha(0);
  bg.fillStyle(ACTION_FILL, 1);
  bg.fillRoundedRect(cx - W / 2, y - H / 2, W, H, R);
  bg.lineStyle(3, NAVY, 0.4);
  bg.strokeRoundedRect(cx - W / 2, y - H / 2, W, H, R);

  const txt = scene.add
    .text(cx, y, bannerText, {
      fontFamily: TITLE_FONT,
      fontSize: '36px',
      color: NAVY_HEX,
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setAlpha(0);

  const hit = scene.add
    .rectangle(cx, y, W, 100, 0, 0) // 100 canvas px — WCAG 2.5.5 (≥44 CSS px at 360 vp)
    .setAlpha(0)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', handleTap);

  A11yLayer.mountAction('a11y-scaffold-banner', bannerText, handleTap);

  scene.time.delayedCall(reduceMotion ? 0 : 1300, () => {
    scene.tweens.add({
      targets: [bg, txt],
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });
    hit.setAlpha(0.01);
  });

  return [bg, txt, hit];
}
