/**
 * SessionCompleteOverlay layout/text creation helpers.
 * Trophy, heading, stars, encouragement, accuracy, and card background.
 */

import * as Phaser from 'phaser';
import { TITLE_FONT, BODY_FONT, NAVY_HEX, NAVY, SKY_BG } from '../../scenes/utils/levelTheme';

export function createCardBackground(
  scene: Phaser.Scene,
  width: number,
  height: number,
  isPerfect: boolean
): Phaser.GameObjects.Graphics {
  const cardBg = scene.add.graphics();
  if (isPerfect) {
    cardBg.fillStyle(0xffd700, 1);
    cardBg.fillRect(0, 0, width, height / 2);
    cardBg.fillStyle(0xff9500, 1);
    cardBg.fillRect(0, height / 2, width, height / 2);
  } else {
    cardBg.fillStyle(SKY_BG, 1);
    cardBg.fillRect(0, 0, width, height);
  }
  cardBg.lineStyle(4, NAVY, 1);
  cardBg.lineBetween(0, 0, width, 0);
  return cardBg;
}

export function createTrophy(
  scene: Phaser.Scene,
  cx: number,
  isPerfect: boolean,
  reduceMotion: boolean
): Phaser.GameObjects.Text {
  const trophyEmoji = isPerfect ? '🌟' : '🏆';
  return scene.add
    .text(cx, 320, trophyEmoji, { fontSize: '72px', fontFamily: TITLE_FONT })
    .setOrigin(0.5)
    .setScale(reduceMotion ? 1 : 0.5);
}

export function createHeading(
  scene: Phaser.Scene,
  cx: number,
  levelNumber: number,
  isPerfect: boolean
): Phaser.GameObjects.Text {
  const text = isPerfect ? 'PERFECT! 🌟' : `Level ${levelNumber} Complete!`;
  return scene.add
    .text(cx, 420, text, {
      fontSize: isPerfect ? '42px' : '44px',
      fontFamily: TITLE_FONT,
      fontStyle: 'bold',
      color: isPerfect ? '#ffffff' : NAVY_HEX,
    })
    .setOrigin(0.5);
}

export function createStars(
  scene: Phaser.Scene,
  cx: number,
  starCount: number
): Phaser.GameObjects.Text[] {
  const starTexts: Phaser.GameObjects.Text[] = [];
  const starSpacing = 90;
  const rowLeft = cx - (starSpacing * (starCount - 1)) / 2;
  for (let i = 0; i < starCount; i++) {
    const st = scene.add
      .text(rowLeft + i * starSpacing, 530, '⭐', {
        fontSize: '60px',
        fontFamily: TITLE_FONT,
      })
      .setOrigin(0.5)
      .setScale(0);
    starTexts.push(st);
  }
  return starTexts;
}

export function createPerfectLine(
  scene: Phaser.Scene,
  cx: number,
  width: number
): Phaser.GameObjects.Text {
  return scene.add
    .text(cx, 620, "ALL 5 correct! You're a star! ⭐", {
      fontSize: '20px',
      fontFamily: BODY_FONT,
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: width - 80 },
    })
    .setOrigin(0.5);
}

export function createEncouragement(
  scene: Phaser.Scene,
  cx: number,
  width: number,
  isPerfect: boolean,
  text: string
): Phaser.GameObjects.Text {
  return scene.add
    .text(cx, isPerfect ? 660 : 640, text, {
      fontSize: '24px',
      fontFamily: BODY_FONT,
      fontStyle: 'bold',
      color: isPerfect ? '#ffffff' : NAVY_HEX,
      align: 'center',
      wordWrap: { width: width - 80 },
    })
    .setOrigin(0.5);
}

export function createAccuracyText(
  scene: Phaser.Scene,
  cx: number,
  isPerfect: boolean,
  correctCount: number,
  totalAttempts: number,
  accuracy: number
): Phaser.GameObjects.Text {
  return scene.add
    .text(cx, isPerfect ? 710 : 690, `${correctCount} / ${totalAttempts} correct  (${accuracy}%)`, {
      fontSize: '19px',
      fontFamily: BODY_FONT,
      color: isPerfect ? '#ffffff' : NAVY_HEX,
    })
    .setOrigin(0.5);
}

export function encouragementLine(stars: 1 | 2 | 3, perfect = false): string {
  if (perfect) return 'Incredible! You nailed every one!';
  if (stars === 3) return 'Amazing! Perfect score!';
  if (stars === 2) return 'Great work! Keep it up!';
  return 'Nice try! Practice makes perfect!';
}
