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
import { checkReduceMotion } from '../lib/preferences';

export interface SessionCompleteConfig {
  scene: Phaser.Scene;
  levelNumber: number;
  correctCount: number;
  totalAttempts: number;
  width?: number;
  height?: number;
  depth?: number;
  onNextLevel?: () => void;
  onPlayAgain: () => void;
  onMenu: () => void;
  /** T11: Drives the scaffold banner text + tap target below the stars. */
  scaffoldRecommendation?: 'advance' | 'stay' | 'regress';
  /** T11: Passed alongside scaffoldRecommendation so the banner knows which level to name. */
  nextLevelNumber?: number | null;
  /** T15: When true, renders a gold "PERFECT!" variant instead of the sky-blue standard. */
  isPerfect?: boolean;
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
  private glowTween: Phaser.Tweens.Tween | null = null;
  private announced = false;

  constructor(config: SessionCompleteConfig) {
    const {
      scene,
      levelNumber,
      correctCount,
      totalAttempts,
      width = 800,
      height = 1280,
      depth = 50,
      onNextLevel,
      onPlayAgain,
      onMenu,
      scaffoldRecommendation,
      nextLevelNumber,
      isPerfect = false,
    } = config;

    const cx = width / 2;
    const reduceMotion = checkReduceMotion();

    const starCount = starsFromAccuracy(correctCount, totalAttempts);
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

    // Container origin at (0, 0); starts below viewport, slides to y = 0.
    this.container = scene.add.container(0, reduceMotion ? 0 : height).setDepth(depth);

    // T15: Gold background for perfect sessions, sky-blue for standard
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
    this.container.add(cardBg);

    // Trophy — starts at scale 0.5 so the wave tween can spring it in
    const trophyEmoji = isPerfect ? '🌟' : '🏆';
    const trophyT = scene.add
      .text(cx, 320, trophyEmoji, { fontSize: '72px', fontFamily: TITLE_FONT })
      .setOrigin(0.5)
      .setScale(reduceMotion ? 1 : 0.5);
    this.container.add(trophyT);

    // T15: Perfect heading is white "PERFECT! 🌟"; standard is navy "Level N Complete!"
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

    // T15: Extra "ALL 5 correct!" line for perfect sessions
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
      this.container.add(perfectT);
    }

    // Encouragement
    const encT = scene.add
      .text(cx, isPerfect ? 660 : 640, this.encouragementLine(starCount as 1 | 2 | 3, isPerfect), {
        fontSize: '24px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: isPerfect ? '#ffffff' : NAVY_HEX,
        align: 'center',
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5);
    this.container.add(encT);

    // Accuracy detail
    const accT = scene.add
      .text(
        cx,
        isPerfect ? 710 : 690,
        `${correctCount} / ${totalAttempts} correct  (${accuracy}%)`,
        {
          fontSize: '19px',
          fontFamily: BODY_FONT,
          color: isPerfect ? '#ffffff' : NAVY_HEX,
        }
      )
      .setOrigin(0.5);
    this.container.add(accT);

    // T11: Scaffold recommendation banner — slides in after stars land
    const scaffoldBannerY = isPerfect ? 760 : 740;
    if (scaffoldRecommendation) {
      const bannerText =
        scaffoldRecommendation === 'advance'
          ? nextLevelNumber
            ? `Level ${nextLevelNumber} unlocked! →`
            : 'Great job! →'
          : scaffoldRecommendation === 'stay'
            ? 'Keep practising →'
            : "Let's try an easier one →";

      const BANN_W = 440,
        BANN_H = 64,
        BANN_R = 32;
      const bannerBg = scene.add.graphics().setAlpha(0);
      bannerBg.fillStyle(ACTION_FILL, 1);
      bannerBg.fillRoundedRect(
        cx - BANN_W / 2,
        scaffoldBannerY - BANN_H / 2,
        BANN_W,
        BANN_H,
        BANN_R
      );
      bannerBg.lineStyle(3, NAVY, 0.4);
      bannerBg.strokeRoundedRect(
        cx - BANN_W / 2,
        scaffoldBannerY - BANN_H / 2,
        BANN_W,
        BANN_H,
        BANN_R
      );

      const bannerTxt = scene.add
        .text(cx, scaffoldBannerY, bannerText, {
          fontFamily: TITLE_FONT,
          fontSize: '24px',
          color: NAVY_HEX,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setAlpha(0);

      // Tap target for the banner navigates to the next level
      const bannerHit = scene.add
        .rectangle(cx, scaffoldBannerY, BANN_W, BANN_H, 0, 0)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (scaffoldRecommendation === 'advance' && nextLevelNumber && onNextLevel) {
            onNextLevel();
          } else if (scaffoldRecommendation === 'stay') {
            onPlayAgain();
          } else if (scaffoldRecommendation === 'regress') {
            onMenu(); // fall back to menu if no specific regress target
          }
        });

      this.container.add([bannerBg, bannerTxt, bannerHit]);

      // Animate the banner in 400ms after the overlay lands (stars finish at ~900ms + 400ms)
      scene.time.delayedCall(reduceMotion ? 0 : 1300, () => {
        scene.tweens.add({
          targets: [bannerBg, bannerTxt],
          alpha: 1,
          duration: 400,
          ease: 'Back.easeOut',
        });
        bannerHit.setAlpha(0.01); // make it interactive but visually transparent
      });
    }

    // Buttons — pushed down to account for banner
    const btnBaseY = scaffoldRecommendation ? 860 : 800;
    if (onNextLevel && !scaffoldRecommendation) {
      this.addNextLevelButton(scene, cx, btnBaseY, onNextLevel);
      this.addPlayAgainButton(scene, cx, btnBaseY + 80, onPlayAgain);
      this.addMenuButton(scene, cx, btnBaseY + 160, onMenu);
    } else {
      this.addPlayAgainButton(scene, cx, btnBaseY, onPlayAgain);
      this.addMenuButton(scene, cx, btnBaseY + 80, onMenu);
    }

    // Mount sentinel immediately so tests can observe completion-screen as soon
    // as the overlay is constructed, regardless of animation duration.
    TestHooks.mountSentinel('completion-screen');
    this.announce(levelNumber, starCount);

    if (reduceMotion) {
      for (const st of this.starTexts) st.setScale(1);
      if (isPerfect) sfx.playPerfectFanfare();
      else sfx.playComplete();
      this.announce(levelNumber, starCount);
      return;
    }

    // Overlay entrance — panel slides in from below the viewport.
    scene.tweens.add({
      targets: this.container,
      y: 0,
      duration: 420,
      ease: 'Back.Out',
      delay: 60,
      onComplete: () => {
        if (isPerfect) sfx.playPerfectFanfare();
        else sfx.playComplete();
        // Trophy wave — elastic spring from 0.5 → 1.2 → 1.0.
        this.animateTrophyWave(scene, trophyT, () => {
          // Glow sync — start repeating alpha pulse on heading after wave.
          this.startGlowSync(scene, headingT);
          // Animate stars after trophy wave lands.
          this.animateStars(
            scene,
            cx,
            530,
            depth,
            () => {
              this.announce(levelNumber, starCount);
            },
            isPerfect ? 80 : 40,
            isPerfect
          );
        });
      },
    });
  }

  private addPlayAgainButton(scene: Phaser.Scene, x: number, y: number, onTap: () => void): void {
    const W = 300,
      H = 64,
      R = 32,
      SHADOW = 7;

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
    const W = 300,
      H = 64,
      R = 32,
      SHADOW = 7;

    const shadow = scene.add.graphics();
    shadow.fillStyle(ACTION_BORDER, 1);
    shadow.fillRoundedRect(x - W / 2, y - H / 2 + SHADOW, W, H, R);

    const face = scene.add.graphics();
    face.fillStyle(ACTION_FILL, 1);
    face.fillRoundedRect(x - W / 2, y - H / 2, W, H, R);
    face.lineStyle(5, ACTION_BORDER, 1);
    face.strokeRoundedRect(x - W / 2, y - H / 2, W, H, R);

    const txt = scene.add
      .text(x, y, 'Next Level →', {
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

    TestHooks.mountInteractive('next-level-btn', onTap, {
      width: '200px',
      height: '60px',
      top: '62%',
      left: '50%',
    });

    this.container.add([shadow, face, txt, hit]);
  }

  private addMenuButton(scene: Phaser.Scene, x: number, y: number, onTap: () => void): void {
    const W = 300,
      H = 54,
      R = 27;

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
      .on('pointerup', onTap)
      .setDepth(50);

    this.container.add([bg, txt, hit]);

    // Add TestHooks for E2E testing and accessibility
    TestHooks.mountInteractive('session-complete-menu', onTap, {
      width: `${W}px`,
      height: `${H}px`,
      top: `${((y / 1280) * 100).toFixed(1)}%`,
      left: `${((x / 800) * 100).toFixed(1)}%`,
    });
  }

  /**
   * Issue #70: Trophy wave — elastic spring scale 0.5 → 1.2 → 1.0 over 600ms.
   * Already guarded: only called when reduceMotion is false.
   */
  private animateTrophyWave(
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

  /**
   * Issue #82: Glow sync — repeating alpha yoyo 1.0 ↔ 0.7 every 800ms on the
   * "Level N Complete!" heading. Stored so destroy() can stop it cleanly.
   * Already guarded: only called when reduceMotion is false.
   */
  private startGlowSync(scene: Phaser.Scene, target: Phaser.GameObjects.Text): void {
    this.glowTween = scene.tweens.add({
      targets: target,
      alpha: 0.7,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private animateStars(
    scene: Phaser.Scene,
    confettiX: number,
    confettiY: number,
    depth: number,
    onDone: () => void,
    confettiCount = 40,
    isPerfect = false
  ): void {
    let delay = 0;
    for (let i = 0; i < this.starTexts.length; i++) {
      const st = this.starTexts[i]!;
      scene.time.delayedCall(delay, () => {
        // T15: Extra bounce for perfect sessions (1.3x vs 1.2x)
        scene.tweens.add({
          targets: st,
          scale: isPerfect ? 1.3 : 1.2,
          duration: 180,
          ease: 'Back.easeOut',
          onComplete: () => {
            scene.tweens.add({ targets: st, scale: 1.0, duration: 100, ease: 'Cubic.easeOut' });
          },
        });
        if (i === 0) this.burstConfetti(scene, confettiX, confettiY, depth, confettiCount);
        if (i === this.starTexts.length - 1) scene.time.delayedCall(300, onDone);
      });
      delay += 300;
    }
    if (this.starTexts.length === 0) onDone();
  }

  private burstConfetti(
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

  private announce(levelNumber: number, stars: number): void {
    if (this.announced) return;
    this.announced = true;
    const word = stars === 1 ? 'star' : 'stars';
    AccessibilityAnnouncer.announce(`Level ${levelNumber} complete! You earned ${stars} ${word}.`);
  }

  private encouragementLine(stars: 1 | 2 | 3, perfect = false): string {
    if (perfect) return 'Incredible! You nailed every one!';
    if (stars === 3) return 'Amazing! Perfect score!';
    if (stars === 2) return 'Great work! Keep it up!';
    return 'Nice try! Practice makes perfect!';
  }

  destroy(): void {
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }
    this.container.destroy(true);
    this.starTexts.length = 0;
  }
}
