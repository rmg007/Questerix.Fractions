/**
 * SessionCompleteOverlay builders and helpers (extracted LOC)
 */

import * as Phaser from 'phaser';
import {
  TITLE_FONT,
  BODY_FONT,
  NAVY_HEX,
  NAVY,
  ACTION_FILL,
  ACTION_BORDER,
  ACTION_TEXT,
} from '../scenes/utils/levelTheme';
import { A11yLayer } from './A11yLayer';
import { TestHooks } from '../scenes/utils/TestHooks';

// ===== Score Display =====
export function starsFromAccuracy(correct: number, total: number): 1 | 2 | 3 {
  if (total === 0) return 1;
  const acc = correct / total;
  if (acc >= 0.9) return 3;
  if (acc >= 0.6) return 2;
  return 1;
}

export function getEncouragementLine(stars: 1 | 2 | 3, perfect = false): string {
  if (perfect) return 'Incredible! You nailed every one!';
  if (stars === 3) return 'Amazing! Perfect score!';
  if (stars === 2) return 'Great work! Keep it up!';
  return 'Nice try! Practice makes perfect!';
}

// ===== Modal Background =====
export function buildModalBackground(
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
    cardBg.fillStyle(0x87ceeb, 1);
    cardBg.fillRect(0, 0, width, height);
  }
  cardBg.lineStyle(4, NAVY, 1);
  cardBg.lineBetween(0, 0, width, 0);
  return cardBg;
}

// ===== Button Factory =====
export interface ButtonConfig {
  label: string;
  isWhite?: boolean;
  showShadow?: boolean;
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: ButtonConfig,
  onTap: () => void,
  a11yId: string,
  a11yLabel: string
): Phaser.GameObjects.GameObject[] {
  const { label, isWhite = false, showShadow = true } = config;
  const W = 300,
    H = isWhite ? 54 : 64,
    R = isWhite ? 27 : 32,
    SHADOW = showShadow ? 7 : 0;

  const graphics: Phaser.GameObjects.GameObject[] = [];

  if (showShadow && !isWhite) {
    const shadow = scene.add.graphics();
    shadow.fillStyle(ACTION_BORDER, 1);
    shadow.fillRoundedRect(x - W / 2, y - H / 2 + SHADOW, W, H, R);
    graphics.push(shadow);
  }

  const face = scene.add.graphics();
  face.fillStyle(isWhite ? 0xffffff : ACTION_FILL, 1);
  face.fillRoundedRect(x - W / 2, y - H / 2, W, H, R);
  face.lineStyle(isWhite ? 4 : 5, isWhite ? NAVY : ACTION_BORDER, 1);
  face.strokeRoundedRect(x - W / 2, y - H / 2, W, H, R);
  graphics.push(face);

  const txt = scene.add
    .text(x, y, label, {
      fontFamily: isWhite ? BODY_FONT : TITLE_FONT,
      fontSize: isWhite ? '20px' : '26px',
      color: isWhite ? NAVY_HEX : ACTION_TEXT,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  graphics.push(txt);

  const hit = scene.add
    .rectangle(x, y, W, H + SHADOW, 0, 0)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', onTap);
  if (!isWhite) hit.setDepth(50);
  graphics.push(hit);

  A11yLayer.mountAction(a11yId, a11yLabel, onTap);
  return graphics;
}

// ===== Scaffold Banner Text =====
export function buildScaffoldBannerText(
  recommendation: 'advance' | 'stay' | 'regress',
  nextLevelNumber: number | null
): string {
  if (recommendation === 'advance') {
    return nextLevelNumber ? `Level ${nextLevelNumber} unlocked! →` : 'Great job! →';
  }
  if (recommendation === 'stay') return 'Keep practising →';
  return "Let's try an easier one →";
}

export function buildAndRenderButtons(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  cx: number,
  scaffoldRecommendation: 'advance' | 'stay' | 'regress' | undefined,
  onNextLevel: (() => void) | undefined,
  onPlayAgain: () => void,
  onMenu: () => void
): void {
  const btnBaseY = scaffoldRecommendation ? 860 : 800;
  if (onNextLevel && !scaffoldRecommendation) {
    container.add(
      createButton(
        scene,
        cx,
        btnBaseY,
        { label: 'Next Level →' },
        onNextLevel,
        'a11y-session-complete-next',
        'Continue to the next level'
      )
    );
    TestHooks.mountInteractive('next-level-btn', onNextLevel, {
      width: '200px',
      height: '60px',
      top: '62%',
      left: '50%',
    });
    container.add(
      createButton(
        scene,
        cx,
        btnBaseY + 80,
        { label: 'Play Again' },
        onPlayAgain,
        'a11y-session-complete-again',
        'Play this level again'
      )
    );
    container.add(
      createButton(
        scene,
        cx,
        btnBaseY + 160,
        { label: 'Back to Menu', isWhite: true, showShadow: false },
        onMenu,
        'a11y-session-complete-menu',
        'Return to main menu'
      )
    );
    TestHooks.mountInteractive('session-complete-menu', onMenu, {
      width: '300px',
      height: '54px',
      top: `${((btnBaseY + 160) / 1280) * 100}%`,
      left: '50%',
    });
  } else {
    container.add(
      createButton(
        scene,
        cx,
        btnBaseY,
        { label: 'Play Again' },
        onPlayAgain,
        'a11y-session-complete-again',
        'Play this level again'
      )
    );
    container.add(
      createButton(
        scene,
        cx,
        btnBaseY + 80,
        { label: 'Back to Menu', isWhite: true, showShadow: false },
        onMenu,
        'a11y-session-complete-menu',
        'Return to main menu'
      )
    );
    TestHooks.mountInteractive('session-complete-menu', onMenu, {
      width: '300px',
      height: '54px',
      top: `${((btnBaseY + 80) / 1280) * 100}%`,
      left: '50%',
    });
  }
}

export function buildAndRenderScaffoldBanner(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  cx: number,
  isPerfect: boolean,
  recommendation: 'advance' | 'stay' | 'regress',
  nextLevelNumber: number | null,
  onNextLevel: (() => void) | undefined,
  onPlayAgain: () => void,
  onMenu: () => void,
  reduceMotion: boolean
): void {
  const scaffoldBannerY = isPerfect ? 760 : 740;
  const bannerText = buildScaffoldBannerText(recommendation, nextLevelNumber);
  const BANN_W = 440,
    BANN_H = 64,
    BANN_R = 32;

  const bannerBg = scene.add.graphics().setAlpha(0);
  bannerBg.fillStyle(ACTION_FILL, 1);
  bannerBg.fillRoundedRect(cx - BANN_W / 2, scaffoldBannerY - BANN_H / 2, BANN_W, BANN_H, BANN_R);
  bannerBg.lineStyle(3, NAVY, 0.4);
  bannerBg.strokeRoundedRect(cx - BANN_W / 2, scaffoldBannerY - BANN_H / 2, BANN_W, BANN_H, BANN_R);

  const bannerTxt = scene.add
    .text(cx, scaffoldBannerY, bannerText, {
      fontFamily: TITLE_FONT,
      fontSize: '24px',
      color: NAVY_HEX,
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setAlpha(0);

  const tapHandler = () => {
    if (recommendation === 'advance' && nextLevelNumber && onNextLevel) {
      onNextLevel();
    } else if (recommendation === 'stay') {
      onPlayAgain();
    } else if (recommendation === 'regress') {
      onMenu();
    }
  };
  const bannerHit = scene.add
    .rectangle(cx, scaffoldBannerY, BANN_W, BANN_H, 0, 0)
    .setAlpha(0)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', tapHandler);

  A11yLayer.mountAction('a11y-scaffold-banner', bannerText, tapHandler);
  container.add([bannerBg, bannerTxt, bannerHit]);

  scene.time.delayedCall(reduceMotion ? 0 : 1300, () => {
    scene.tweens.add({
      targets: [bannerBg, bannerTxt],
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });
    bannerHit.setAlpha(0.01);
  });
}

// ===== Text Rendering Helpers =====
export interface RenderTextResult {
  trophyT: Phaser.GameObjects.Text;
  headingT: Phaser.GameObjects.Text;
  starTexts: Phaser.GameObjects.Text[];
}

export function renderTrophyAndStars(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  cx: number,
  levelNumber: number,
  starCount: number,
  isPerfect: boolean,
  reduceMotion: boolean,
  width: number
): RenderTextResult {
  // Trophy
  const trophyEmoji = isPerfect ? '🌟' : '🏆';
  const trophyT = scene.add
    .text(cx, 320, trophyEmoji, { fontSize: '72px', fontFamily: TITLE_FONT })
    .setOrigin(0.5)
    .setScale(reduceMotion ? 1 : 0.5);
  container.add(trophyT);

  // Heading
  const headingText = isPerfect ? 'PERFECT! 🌟' : `Level ${levelNumber} Complete!`;
  const headingColor = isPerfect ? '#ffffff' : NAVY_HEX;
  const headingT = scene.add
    .text(cx, 420, headingText, {
      fontSize: isPerfect ? '42px' : '44px',
      fontFamily: TITLE_FONT,
      fontStyle: 'bold',
      color: headingColor,
    })
    .setOrigin(0.5);
  container.add(headingT);

  // Perfect line
  if (isPerfect) {
    const perfectT = scene.add
      .text(cx, 620, "ALL 5 correct! You're a star! ⭐", {
        fontSize: '20px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5);
    container.add(perfectT);
  }

  // Stars
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
    container.add(st);
  }

  return { trophyT, headingT, starTexts };
}
