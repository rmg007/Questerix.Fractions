/**
 * QuestCompleteOverlay — grand celebration screen shown when a student
 * completes ALL 9 levels of the quest.
 * A full-screen sky-blue card slides up from below viewport with a 3×3 grid
 * of animated gold stars, triple-burst confetti, and action buttons.
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

export interface QuestCompleteConfig {
  scene: Phaser.Scene;
  width?: number;
  height?: number;
  depth?: number;
  onPlayAgainFromStart: () => void;
  onMenu: () => void;
}

export class QuestCompleteOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly starTexts: Phaser.GameObjects.Text[] = [];
  private glowTween: Phaser.Tweens.Tween | null = null;

  constructor(config: QuestCompleteConfig) {
    const { scene, width = 800, height = 1280, depth = 50, onPlayAgainFromStart, onMenu } = config;

    const cx = width / 2;
    const reduceMotion = checkReduceMotion();

    // Container origin at (0, 0); starts below viewport, slides to y = 0.
    this.container = scene.add.container(0, reduceMotion ? 0 : height).setDepth(depth);

    // Full-screen sky-blue card
    const cardBg = scene.add.graphics();
    cardBg.fillStyle(SKY_BG, 1);
    cardBg.fillRect(0, 0, width, height);
    cardBg.lineStyle(4, NAVY, 1);
    cardBg.lineBetween(0, 0, width, 0);
    this.container.add(cardBg);

    // Party emoji — starts at scale 0.5 so the wave tween can spring it in
    const trophyT = scene.add
      .text(cx, 330, '🎉', { fontSize: '72px', fontFamily: TITLE_FONT })
      .setOrigin(0.5)
      .setScale(reduceMotion ? 1 : 0.5);
    this.container.add(trophyT);

    // Heading
    const headingT = scene.add
      .text(cx, 440, 'Quest Complete!', {
        fontSize: '48px',
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5);
    this.container.add(headingT);

    // Sub-heading line 2
    const subHeadingT = scene.add
      .text(cx, 500, 'You mastered all 9 levels!', {
        fontSize: '24px',
        fontFamily: BODY_FONT,
        color: NAVY_HEX,
        align: 'center',
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5);
    this.container.add(subHeadingT);

    // 9 gold stars in a 3×3 grid, centered at y≈520–620
    const starSize = 44;
    const colSpacing = 80;
    const rowSpacing = 80;
    const gridCols = 3;
    const gridRows = 3;
    const gridW = (gridCols - 1) * colSpacing;
    const gridH = (gridRows - 1) * rowSpacing;
    const gridStartX = cx - gridW / 2;
    const gridStartY = 540 - gridH / 2;

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const st = scene.add
          .text(gridStartX + col * colSpacing, gridStartY + row * rowSpacing, '⭐', {
            fontSize: `${starSize}px`,
            fontFamily: TITLE_FONT,
          })
          .setOrigin(0.5)
          .setScale(0);
        this.starTexts.push(st);
        this.container.add(st);
      }
    }

    // Buttons
    this.addPlayAgainButton(scene, cx, 780, onPlayAgainFromStart);
    this.addMenuButton(scene, cx, 870, onMenu);

    if (reduceMotion) {
      for (const st of this.starTexts) st.setScale(1);
      sfx.playComplete();
      this.announce();
      TestHooks.mountSentinel('quest-complete-screen');
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
        sfx.playComplete();
        // Trophy wave — elastic spring from 0.5 → 1.2 → 1.0.
        this.animateTrophyWave(scene, trophyT, () => {
          // Glow sync — start repeating alpha pulse on heading after wave.
          this.startGlowSync(scene, headingT);
          // Animate stars after trophy wave lands.
          this.animateStars(scene, cx, 550, depth, () => {
            this.announce();
            TestHooks.mountSentinel('quest-complete-screen');
          });
        });
      },
    });
  }

  private addPlayAgainButton(scene: Phaser.Scene, x: number, y: number, onTap: () => void): void {
    const W = 320,
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
      .text(x, y, 'Play Again from Level 1', {
        fontFamily: TITLE_FONT,
        fontSize: '22px',
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
    const W = 320,
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

    this.container.add([bg, txt, hit]);
  }

  /**
   * Trophy wave — elastic spring scale 0.5 → 1.2 → 1.0 over 600ms.
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
   * Glow sync — repeating alpha yoyo 1.0 ↔ 0.7 every 800ms on the
   * "Quest Complete!" heading. Stored so destroy() can stop it cleanly.
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
        // Extended confetti: 3 bursts with 200ms delay between each
        if (i === 0) {
          this.burstConfetti(scene, confettiX, confettiY, depth);
          scene.time.delayedCall(200, () => this.burstConfetti(scene, confettiX, confettiY, depth));
          scene.time.delayedCall(400, () => this.burstConfetti(scene, confettiX, confettiY, depth));
        }
        if (i === this.starTexts.length - 1) scene.time.delayedCall(300, onDone);
      });
      delay += 150;
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

  private announce(): void {
    AccessibilityAnnouncer.announce('Quest complete! You mastered all 9 levels!');
  }

  destroy(): void {
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }
    this.container.destroy(true);
  }
}
