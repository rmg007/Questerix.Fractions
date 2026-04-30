/**
 * ProgressBar — session progress indicator shown as 5 collectible stars.
 * per interaction-model.md §6.2 (per-session success), C9 (5+ problems per session)
 * per design-language.md §6.4 (reduced motion), task-25 (star redesign)
 *
 * Stars display ☆ (empty) → ★ (filled) as the student answers correctly.
 * The "N / 5" numeric label is removed in favour of an accessible aria-label
 * on the sentinel element so the display stays clean for K-2 learners.
 */

import * as Phaser from 'phaser';
import { TITLE_FONT } from '../scenes/utils/levelTheme';
import { TestHooks } from '../scenes/utils/TestHooks';

export interface ProgressBarConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height?: number;
  /** Total problems in session. per C9 — 5+ per session. */
  goal?: number;
  depth?: number;
}

const DEFAULT_GOAL = 5;
const STAR_EMPTY = '☆';
const STAR_FILLED = '★';
const STAR_FONT_SIZE = '36px';
const STAR_COLOR_FILLED = '#F59E0B'; // amber-500 per design spec
const STAR_COLOR_EMPTY = '#D1D5DB';  // gray-300 per design spec
const ANIMATE_MS = 280;

export class ProgressBar extends Phaser.GameObjects.Container {
  private stars: Phaser.GameObjects.Text[] = [];
  private currentValue: number = 0;
  private readonly goal: number;
  private sentinel: HTMLElement | null = null;

  constructor(config: ProgressBarConfig) {
    const { scene, x, y, width, goal = DEFAULT_GOAL, depth = 10 } = config;

    super(scene, x, y);

    this.goal = goal;

    const spacing = width / goal;

    for (let i = 0; i < goal; i++) {
      const sx = spacing * (i + 0.5);
      const star = scene.add
        .text(sx, 0, STAR_EMPTY, {
          fontFamily: TITLE_FONT,
          fontSize: STAR_FONT_SIZE,
          color: STAR_COLOR_EMPTY,
        })
        .setOrigin(0.5);
      this.stars.push(star);
    }

    this.add(this.stars);
    this.setDepth(depth);
    scene.add.existing(this);

    // Accessibility sentinel — no visible "N / 5" label; screen readers use aria attrs.
    this.sentinel = TestHooks.mountSentinel('progress-bar');
    if (this.sentinel) {
      this.sentinel.setAttribute('role', 'progressbar');
      this.sentinel.setAttribute('aria-label', `Progress: 0 of ${goal} questions correct`);
      this.sentinel.setAttribute('aria-valuenow', '0');
      this.sentinel.setAttribute('aria-valuemin', '0');
      this.sentinel.setAttribute('aria-valuemax', String(goal));
    }
  }

  /**
   * Update stars to reflect `value` out of `goal` correct answers.
   * Newly filled star gets a brief scale bounce unless prefers-reduced-motion.
   */
  setProgress(value: number): void {
    const prev = this.currentValue;
    this.currentValue = Math.min(Math.max(0, value), this.goal);
    const reduceMotion = this.checkReduceMotion();

    this.stars.forEach((star, i) => {
      const filled = i < this.currentValue;
      star.setText(filled ? STAR_FILLED : STAR_EMPTY);
      star.setColor(filled ? STAR_COLOR_FILLED : STAR_COLOR_EMPTY);

      // Bounce the newly filled star
      if (!reduceMotion && filled && i === prev) {
        star.setScale(1.4);
        this.scene.tweens.add({
          targets: star,
          scale: 1,
          duration: ANIMATE_MS,
          ease: 'Back.easeOut',
        });
      } else {
        star.setScale(1);
      }
    });

    // Halfway nudge: 3rd star gets emphasis
    if (!reduceMotion && this.currentValue === 3) {
      const thirdStar = this.stars[2];
      thirdStar.setScale(1.3); // slightly less than 1.4 since already filled
      this.scene.tweens.add({
        targets: thirdStar,
        scale: 1,
        duration: ANIMATE_MS,
        ease: 'Back.easeOut',
      });
    }

    TestHooks.setAriaValueNow('progress-bar', this.currentValue);
    const el = this.sentinel ?? TestHooks.get('progress-bar');
    if (el) {
      el.setAttribute('aria-valuenow', String(this.currentValue));
      el.setAttribute(
        'aria-label',
        `Progress: ${this.currentValue} of ${this.goal} questions correct`
      );
    }
  }

  get value(): number {
    return this.currentValue;
  }
  get isComplete(): boolean {
    return this.currentValue >= this.goal;
  }

  private checkReduceMotion(): boolean {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  }
}

