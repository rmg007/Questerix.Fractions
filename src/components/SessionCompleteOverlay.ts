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
import { A11yLayer } from './A11yLayer';
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
    } = config;

    const cx = width / 2;
    const reduceMotion = checkReduceMotion();

    const starCount = starsFromAccuracy(correctCount, totalAttempts);
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

    // Container origin at (0, 0); starts below viewport, slides to y = 0.
    this.container = scene.add.container(0, reduceMotion ? 0 : height).setDepth(depth);

    // Full-screen sky-blue card
    const cardBg = scene.add.graphics();
    cardBg.fillStyle(SKY_BG, 1);
    cardBg.fillRect(0, 0, width, height);
    cardBg.lineStyle(4, NAVY, 1);
    cardBg.lineBetween(0, 0, width, 0);
    this.container.add(cardBg);

    // Trophy — starts at scale 0.5 so the wave tween can spring it in
    const trophyT = scene.add
      .text(cx, 320, '🏆', { fontSize: '72px', fontFamily: TITLE_FONT })
      .setOrigin(0.5)
      .setScale(reduceMotion ? 1 : 0.5);
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

    // Push a modal A11y layer so the underlying scene becomes inert; popped
    // in destroy(). Mounts each action button as an SR-only DOM mirror so
    // VoiceOver / keyboard users can advance past this screen — the canvas
    // buttons are unreachable to assistive tech otherwise.
    A11yLayer.pushLayer('session-complete', `Level ${levelNumber} complete`);

    // Buttons — "Next Level" (primary) when available, then "Play Again", then Menu
    if (onNextLevel) {
      this.addNextLevelButton(scene, cx, 780, onNextLevel);
      this.addPlayAgainButton(scene, cx, 860, onPlayAgain);
      this.addMenuButton(scene, cx, 940, onMenu);
    } else {
      this.addPlayAgainButton(scene, cx, 800, onPlayAgain);
      this.addMenuButton(scene, cx, 880, onMenu);
    }

    // Mount sentinel immediately so tests can observe completion-screen as soon
    // as the overlay is constructed, regardless of animation duration.
    TestHooks.mountSentinel('completion-screen');

    if (reduceMotion) {
      for (const st of this.starTexts) st.setScale(1);
      sfx.playComplete();
      this.announce(levelNumber, starCount);
      return;
    }

    // Issue #96: overlay entrance — panel slides in from below the viewport.
    // The container starts at y = height (below the canvas) and tweens to y = 0.
    scene.tweens.add({
      targets: this.container,
      y: 0,
      duration: 420,
      ease: 'Back.Out',
      delay: 60,
      onComplete: () => {
        sfx.playComplete();
        // Issue #70: Trophy wave — elastic spring from 0.5 → 1.2 → 1.0.
        this.animateTrophyWave(scene, trophyT, () => {
          // Issue #82: Glow sync — start repeating alpha pulse on heading after wave.
          this.startGlowSync(scene, headingT);
          // Animate stars after trophy wave lands.
          this.animateStars(scene, cx, 530, depth, () => {
            this.announce(levelNumber, starCount);
          });
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

    A11yLayer.mountAction('session-complete-play-again', 'Play Again', onTap);

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

    A11yLayer.mountAction('session-complete-next-level', 'Next Level', onTap);

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
      .on('pointerup', onTap);

    TestHooks.mountInteractive('session-complete-menu-btn', onTap, {
      width: '300px',
      height: '54px',
      top: '74%',
      left: '50%',
    });

    A11yLayer.mountAction('session-complete-menu', 'Back to Menu', onTap);

    this.container.add([bg, txt, hit]);
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

    const colors = [0xfcd34d, 0x34d399, 0x60a5fa, 0xfb7185, 0xa78bfa, 0xf97316];
    for (const tint of colors) {
      const emitter = scene.add.particles(x, y, 'clr-accentA', {
        lifespan: 1000,
        speed: { min: 70, max: 280 },
        scale: { start: 9, end: 0 },
        alpha: { start: 1, end: 0 },
        tint,
        angle: { min: -160, max: -20 },
        gravityY: 320,
        quantity: 5,
        emitting: false,
      });
      emitter.setDepth(depth + 15);
      emitter.explode(5);
      scene.time.delayedCall(1400, () => emitter.destroy());
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

  destroy(): void {
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }
    A11yLayer.popLayer();
    this.container.destroy(true);
    this.starTexts.length = 0;
  }
}
