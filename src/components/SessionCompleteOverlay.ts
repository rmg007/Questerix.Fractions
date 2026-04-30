/**
 * SessionCompleteOverlay — trophy level-complete screen.
 * A full-screen sky-blue card slides up from below viewport with animated stars,
 * confetti, and action buttons. Stars: 1 = <60%, 2 = 60–89%, 3 = 90%+.
 * per interaction-model.md §6.2, design-language.md §6.4 (reduced-motion)
 */

import * as Phaser from 'phaser';
import {
  TITLE_FONT,
  BODY_FONT,
  NAVY_HEX,
  NAVY,
  SKY_BG,
  ACTION_FILL,
  ACTION_BORDER,
  ACTION_TEXT,
} from '../scenes/utils/levelTheme';
import { AccessibilityAnnouncer } from './AccessibilityAnnouncer';
import { TestHooks } from '../scenes/utils/TestHooks';
import { sfx } from '../audio/SFXService';

export interface SessionCompleteConfig {
  scene: Phaser.Scene;
  levelNumber: number;
  correctCount: number;
  totalAttempts: number;
  width?: number;
  height?: number;
  depth?: number;
  onPlayAgain: () => void;
  onNextLevel?: () => void;
  onMenu: () => void;
}

export function starsFromAccuracy(correct: number, total: number): 1 | 2 | 3 {
  if (total === 0) return 1;
  const acc = correct / total;
  if (acc >= 0.9) return 3;
  if (acc >= 0.6) return 2;
  return 1;
}

export class SessionCompleteOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly starTexts: Phaser.GameObjects.Text[] = [];

  constructor(config: SessionCompleteConfig) {
    const {
      scene,
      levelNumber,
      correctCount,
      totalAttempts,
      width = 800,
      height = 1280,
      depth = 50,
      onPlayAgain,
      onNextLevel,
      onMenu,
    } = config;

    const cx = width / 2;
    const reduceMotion = this.checkReduceMotion();

    const starCount = starsFromAccuracy(correctCount, totalAttempts);
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

    // Container origin at (0, 0); starts below viewport, slides to y = 0.
    this.container = scene.add
      .container(0, reduceMotion ? 0 : height)
      .setDepth(depth);

    // Full-screen sky-blue card
    const cardBg = scene.add.graphics();
    cardBg.fillStyle(SKY_BG, 1);
    cardBg.fillRect(0, 0, width, height);
    cardBg.lineStyle(4, NAVY, 1);
    cardBg.lineBetween(0, 0, width, 0);
    this.container.add(cardBg);

    // Trophy emoji
    const trophyT = scene.add
      .text(cx, 320, '🏆', { fontSize: '72px', fontFamily: TITLE_FONT })
      .setOrigin(0.5);
    this.container.add(trophyT);

    // Heading
    const headingT = scene.add
      .text(cx, 420, `Level ${levelNumber} Complete!`, {
        fontSize: '44px',
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5);
    this.container.add(headingT);

    // Stars (scale 0 initially)
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
      this.starTexts.push(st);
      this.container.add(st);
    }

    // Encouragement
    const encT = scene.add
      .text(cx, 640, this.encouragementLine(starCount), {
        fontSize: '24px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
        align: 'center',
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5);
    this.container.add(encT);

    // Accuracy detail
    const accT = scene.add
      .text(cx, 690, `${correctCount} / ${totalAttempts} correct  (${accuracy}%)`, {
        fontSize: '19px',
        fontFamily: BODY_FONT,
        color: NAVY_HEX,
      })
      .setOrigin(0.5);
    this.container.add(accT);

    // S3-T3: Buttons — Play Again + Next Level (if available) + Menu
    const playAgainY = onNextLevel ? 800 : 820;
    const nextLevelY = onNextLevel ? 870 : null;
    const menuY = onNextLevel ? 940 : 900;

    this.addPlayAgainButton(scene, cx, playAgainY, onPlayAgain);
    if (onNextLevel && nextLevelY) {
      this.addNextLevelButton(scene, cx, nextLevelY, onNextLevel);
    }
    this.addMenuButton(scene, cx, menuY, onMenu);

    if (reduceMotion) {
      for (const st of this.starTexts) st.setScale(1);
      sfx.playComplete();
      this.announce(levelNumber, starCount);
      TestHooks.mountSentinel('completion-screen');
      return;
    }

    // S3-T3: Animate card with scale-in (400ms Back.easeOut) + confetti (60 particles)
    this.container.setScale(0.8).setAlpha(0);
    scene.tweens.add({
      targets: this.container,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut',
      delay: 60,
      onComplete: () => {
        sfx.playComplete();
        this.burstConfetti(scene, cx, 530, depth); // launch confetti early
        this.animateStars(scene, cx, 530, depth, () => {
          this.announce(levelNumber, starCount);
          TestHooks.mountSentinel('completion-screen');
        });
      },
    });
  }

  private addPlayAgainButton(scene: Phaser.Scene, x: number, y: number, onTap: () => void): void {
    const W = 300, H = 64, R = 32, SHADOW = 7;

    const shadow = scene.add.graphics();
    shadow.fillStyle(ACTION_BORDER, 1);
    shadow.fillRoundedRect(x - W / 2, y - H / 2 + SHADOW, W, H, R);

    const face = scene.add.graphics();
    face.fillStyle(ACTION_FILL, 1);
    face.fillRoundedRect(x - W / 2, y - H / 2, W, H, R);
    face.lineStyle(5, ACTION_BORDER, 1);
    face.strokeRoundedRect(x - W / 2, y - H / 2, W, H, R);

    const txt = scene.add
      .text(x, y, 'Play Again', {
        fontFamily: TITLE_FONT,
        fontSize: '26px',
        color: ACTION_TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const hit = scene.add
      .rectangle(x, y, W, H + SHADOW, 0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', onTap);

    this.container.add([shadow, face, txt, hit]);
  }

  private addNextLevelButton(scene: Phaser.Scene, x: number, y: number, onTap: () => void): void {
    const W = 300, H = 64, R = 32, SHADOW = 7;

    const shadow = scene.add.graphics();
    shadow.fillStyle(ACTION_BORDER, 1);
    shadow.fillRoundedRect(x - W / 2, y - H / 2 + SHADOW, W, H, R);

    const face = scene.add.graphics();
    face.fillStyle(ACTION_FILL, 1);
    face.fillRoundedRect(x - W / 2, y - H / 2, W, H, R);
    face.lineStyle(5, ACTION_BORDER, 1);
    face.strokeRoundedRect(x - W / 2, y - H / 2, W, H, R);

    const txt = scene.add
      .text(x, y, 'Keep going ▶', {
        fontFamily: TITLE_FONT,
        fontSize: '26px',
        color: ACTION_TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const hit = scene.add
      .rectangle(x, y, W, H + SHADOW, 0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', onTap);

    this.container.add([shadow, face, txt, hit]);
  }

  private addMenuButton(scene: Phaser.Scene, x: number, y: number, onTap: () => void): void {
    const W = 300, H = 54, R = 27;

    const bg = scene.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(x - W / 2, y - H / 2, W, H, R);
    bg.lineStyle(4, NAVY, 1);
    bg.strokeRoundedRect(x - W / 2, y - H / 2, W, H, R);

    const txt = scene.add
      .text(x, y, 'Back to Menu', {
        fontFamily: BODY_FONT,
        fontSize: '20px',
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5);

    const hit = scene.add
      .rectangle(x, y, W, H, 0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', onTap);

    this.container.add([bg, txt, hit]);
  }

  private animateStars(
    scene: Phaser.Scene,
    confettiX: number,
    confettiY: number,
    depth: number,
    onDone: () => void
  ): void {
    let delay = 0;
    for (let i = 0; i < this.starTexts.length; i++) {
      const st = this.starTexts[i]!;
      scene.time.delayedCall(delay, () => {
        scene.tweens.add({
          targets: st,
          scale: 1.2,
          duration: 180,
          ease: 'Back.easeOut',
          onComplete: () => {
            scene.tweens.add({ targets: st, scale: 1.0, duration: 100, ease: 'Cubic.easeOut' });
          },
        });
        if (i === 0) this.burstConfetti(scene, confettiX, confettiY, depth);
        if (i === this.starTexts.length - 1) scene.time.delayedCall(300, onDone);
      });
      delay += 300;
    }
    if (this.starTexts.length === 0) onDone();
  }

  private burstConfetti(scene: Phaser.Scene, x: number, y: number, depth: number): void {
    if (!scene.textures.exists('clr-accentA')) return;

    // S3-T3: 60 particles total (~10 per color) with celebratory arc
    const colors = [0xfcd34d, 0x34d399, 0x60a5fa, 0xfb7185, 0xa78bfa, 0xf97316];
    const particlesPerColor = Math.ceil(60 / colors.length);

    for (const tint of colors) {
      const emitter = scene.add.particles(x, y, 'clr-accentA', {
        lifespan: 1200,
        speed: { min: 80, max: 320 },
        scale: { start: 8, end: 0 },
        alpha: { start: 1, end: 0 },
        tint,
        angle: { min: -170, max: -10 }, // wider upward arc
        gravityY: 280,
        quantity: particlesPerColor,
        emitting: false,
      });
      emitter.setDepth(depth + 15);
      emitter.explode(particlesPerColor);
      scene.time.delayedCall(1600, () => emitter.destroy());
    }
  }

  private announce(levelNumber: number, stars: number): void {
    const word = stars === 1 ? 'star' : 'stars';
    AccessibilityAnnouncer.announce(`Level ${levelNumber} complete! You earned ${stars} ${word}.`);
  }

  private encouragementLine(stars: 1 | 2 | 3): string {
    if (stars === 3) return 'Amazing! Perfect score!';
    if (stars === 2) return 'Great work! Keep it up!';
    return 'Nice try! Practice makes perfect!';
  }

  private checkReduceMotion(): boolean {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  destroy(): void {
    this.container.destroy(true);
    this.starTexts.length = 0;
  }
}
