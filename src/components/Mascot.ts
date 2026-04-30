/**
 * Mascot — a friendly procedurally-drawn character guide.
 *
 * A small amber/navy wizard drawn entirely from Phaser Graphics primitives
 * (no image files). Provides idle bob, celebrate jump, encourage wobble, and
 * wave animations. Returns to idle automatically after celebrate / encourage.
 *
 * per design-language.md §7.3 (procedural shapes only)
 */

import * as Phaser from 'phaser';
import { ACTION_FILL, ACTION_BORDER, NAVY } from '../scenes/utils/levelTheme';

// ── Local palette tokens not exported from levelTheme ────────────────────────

const AMBER = ACTION_FILL;
const AMBER_DARK = ACTION_BORDER;
const WHITE = 0xffffff;
const ROSE = 0xfb7185;

// ── Character proportions ────────────────────────────────────────────────────

const BODY_R = 40;
const HAT_BASE = 50;
const HAT_H = 55;

export class Mascot extends Phaser.GameObjects.Container {
  private readonly reduceMotion: boolean;
  private baseY: number;
  private readonly baseScale: number;
  private idleTween: Phaser.Tweens.Tween | null = null;

  private bodyCircle!: Phaser.GameObjects.Graphics;
  private face!: Phaser.GameObjects.Container;
  private hat!: Phaser.GameObjects.Graphics;
  private leftArm!: Phaser.GameObjects.Graphics;
  private rightArm!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, scale = 1) {
    super(scene, x, y);

    this.baseY = y;
    this.baseScale = scale;
    this.reduceMotion = Mascot.checkReduceMotion();

    this.buildCharacter();

    if (scale !== 1) {
      this.setScale(scale);
    }

    scene.add.existing(this as Phaser.GameObjects.GameObject);
    this.setDepth(5);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Reposition the mascot to a new base location.
   * Updates internal baseY so subsequent animations (idle bob, celebrate jump)
   * are anchored to the new position rather than the construction-time position.
   */
  reposition(x: number, y: number): void {
    this.stopCurrent();
    this.baseY = y;
    this.setPosition(x, y);
  }

  /** Gentle floating bob — loops until another animation takes over. */
  idle(): void {
    this.stopCurrent();
    if (this.reduceMotion) return;

    this.idleTween = this.scene.tweens.add({
      targets: this,
      y: this.baseY - 8,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /** Jump + spin + scale burst (~500ms), then returns to idle. */
  celebrate(): void {
    this.stopCurrent();

    if (this.reduceMotion) {
      this.idle();
      return;
    }

    const bs = this.baseScale;

    this.scene.tweens.chain({
      targets: this,
      tweens: [
        {
          y: this.baseY - 40,
          scaleX: bs * 1.4,
          scaleY: bs * 1.4,
          angle: 180,
          duration: 250,
          ease: 'Back.easeOut',
        },
        {
          y: this.baseY,
          scaleX: bs,
          scaleY: bs,
          angle: 360,
          duration: 250,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            this.setAngle(0);
            this.idle();
          },
        },
      ],
    });
  }

  /** Head-wobble (rotation ±8°, ~700ms total), then returns to idle. */
  encourage(): void {
    this.stopCurrent();

    if (this.reduceMotion) {
      this.idle();
      return;
    }

    this.scene.tweens.chain({
      targets: this.face,
      tweens: [
        { angle: -8, duration: 150, ease: 'Sine.easeInOut' },
        { angle: 8, duration: 150, ease: 'Sine.easeInOut' },
        { angle: -6, duration: 120, ease: 'Sine.easeInOut' },
        { angle: 6, duration: 120, ease: 'Sine.easeInOut' },
        {
          angle: 0,
          duration: 100,
          ease: 'Linear',
          onComplete: () => {
            this.idle();
          },
        },
      ],
    });
  }

  /** Arm-raise wave. */
  wave(): void {
    if (this.reduceMotion) return;

    this.scene.tweens.chain({
      targets: this.rightArm,
      tweens: [
        { angle: -60, duration: 200, ease: 'Back.easeOut' },
        { angle: -30, duration: 150, ease: 'Sine.easeInOut' },
        { angle: -60, duration: 150, ease: 'Sine.easeInOut' },
        { angle: -30, duration: 150, ease: 'Sine.easeInOut' },
        { angle: 0, duration: 200, ease: 'Back.easeIn' },
      ],
    });
  }

  // ── Character construction ────────────────────────────────────────────────

  private buildCharacter(): void {
    this.hat = this.scene.add.graphics();
    this.drawHat(this.hat);
    this.add(this.hat);

    this.leftArm = this.scene.add.graphics();
    this.leftArm.setPosition(-BODY_R - 6, 4);
    this.drawArm(this.leftArm, 'left');
    this.add(this.leftArm);

    this.rightArm = this.scene.add.graphics();
    this.rightArm.setPosition(BODY_R + 6, 4);
    this.drawArm(this.rightArm, 'right');
    this.add(this.rightArm);

    this.bodyCircle = this.scene.add.graphics();
    this.drawBody(this.bodyCircle);
    this.add(this.bodyCircle);

    this.face = this.scene.add.container(0, -4);
    this.buildFace(this.face);
    this.add(this.face);
  }

  private drawHat(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(NAVY, 1);
    g.fillEllipse(0, -BODY_R + 4, HAT_BASE + 12, 14);

    g.fillStyle(NAVY, 1);
    g.fillTriangle(-HAT_BASE / 2, -BODY_R + 4, HAT_BASE / 2, -BODY_R + 4, 0, -BODY_R - HAT_H);

    g.fillStyle(AMBER, 0.45);
    g.fillTriangle(
      -HAT_BASE / 4,
      -BODY_R + 4,
      HAT_BASE / 4,
      -BODY_R + 4,
      0,
      -BODY_R - HAT_H * 0.55
    );

    g.fillStyle(AMBER, 1);
    g.fillCircle(0, -BODY_R - HAT_H * 0.55, 5);
  }

  private drawBody(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(AMBER_DARK, 0.35);
    g.fillCircle(3, 5, BODY_R);

    g.fillStyle(AMBER, 1);
    g.fillCircle(0, 0, BODY_R);

    g.lineStyle(3, AMBER_DARK, 1);
    g.strokeCircle(0, 0, BODY_R);

    g.fillStyle(WHITE, 0.25);
    g.fillCircle(-12, -10, 16);
  }

  private buildFace(container: Phaser.GameObjects.Container): void {
    const g = this.scene.add.graphics();

    g.fillStyle(WHITE, 1);
    g.fillCircle(-13, -8, 9);
    g.fillStyle(WHITE, 1);
    g.fillCircle(13, -8, 9);

    g.fillStyle(NAVY, 1);
    g.fillCircle(-11, -8, 5);
    g.fillStyle(NAVY, 1);
    g.fillCircle(15, -8, 5);

    g.fillStyle(WHITE, 1);
    g.fillCircle(-9, -11, 2);
    g.fillStyle(WHITE, 1);
    g.fillCircle(17, -11, 2);

    g.fillStyle(ROSE, 0.45);
    g.fillEllipse(-20, 2, 14, 8);
    g.fillStyle(ROSE, 0.45);
    g.fillEllipse(20, 2, 14, 8);

    g.fillStyle(AMBER_DARK, 0.7);
    g.fillEllipse(0, 14, 22, 10);
    g.fillStyle(AMBER, 1);
    g.fillRect(-11, 4, 22, 8);

    container.add(g);
  }

  private drawArm(g: Phaser.GameObjects.Graphics, side: 'left' | 'right'): void {
    const dir = side === 'left' ? -1 : 1;
    g.fillStyle(AMBER, 1);
    g.fillEllipse(dir * 8, 0, 20, 28);
    g.lineStyle(2, AMBER_DARK, 0.8);
    g.strokeEllipse(dir * 8, 0, 20, 28);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  override destroy(fromScene?: boolean): void {
    if (this.idleTween) {
      this.idleTween.stop();
      this.idleTween = null;
    }
    this.scene.tweens.killTweensOf(this);
    if (this.face) this.scene.tweens.killTweensOf(this.face);
    if (this.rightArm) this.scene.tweens.killTweensOf(this.rightArm);
    super.destroy(fromScene);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Stop all active tweens and reset to the stable resting state. */
  private stopCurrent(): void {
    if (this.idleTween) {
      this.idleTween.stop();
      this.idleTween = null;
    }
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.face);
    this.scene.tweens.killTweensOf(this.rightArm);

    this.setPosition(this.x, this.baseY);
    this.setScale(this.baseScale);
    this.setAngle(0);
    this.face.setAngle(0);
    this.rightArm.setAngle(0);
  }

  private static checkReduceMotion(): boolean {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }
}
