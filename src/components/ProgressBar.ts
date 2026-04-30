/**
 * ProgressBar — session progress indicator (N / GOAL attempts).
 * per interaction-model.md §6.2 (per-session success), C9 (5+ problems per session)
 * per design-language.md §6.1 (snap pulse), §6.4 (reduced motion)
 */

import * as Phaser from 'phaser';
import { CLR } from '../scenes/utils/colors';
import { TestHooks } from '../scenes/utils/TestHooks';
import { checkReduceMotion } from '../lib/preferences';

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

const DEFAULT_GOAL = 5; // per C9 — minimum 5 problems per session
const BAR_HEIGHT = 16;
const TRACK_COLOR = CLR.neutral100;
const FILL_COLOR = CLR.primary;
const FILL_COLOR_MID = CLR.accentC; // hints green progress at milestone
const COMPLETE_COLOR = CLR.success;
const ANIMATE_MS = 240; // per design-language.md §6.1 (snap pulse 180–240ms)

export class ProgressBar extends Phaser.GameObjects.Container {
  private track: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private countText: Phaser.GameObjects.Text;

  private currentValue: number = 0;
  private readonly goal: number;
  private readonly barWidth: number;

  constructor(config: ProgressBarConfig) {
    const { scene, x, y, width, height = BAR_HEIGHT, goal = DEFAULT_GOAL, depth = 10 } = config;

    super(scene, x, y);

    this.goal = goal;
    this.barWidth = width;

    // Track background — per design-language.md §2.4 neutral-100
    this.track = scene.add.rectangle(0, 0, width, height, TRACK_COLOR).setOrigin(0, 0.5);

    // Filled portion
    this.fill = scene.add.rectangle(0, 0, 0, height, FILL_COLOR).setOrigin(0, 0.5);

    // Count label — e.g. "2 / 5"
    this.countText = scene.add
      .text(width + 12, 0, `0 / ${goal}`, {
        fontSize: '14px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        color: '#5B6478', // neutral-600 per design-language.md §2.4
      })
      .setOrigin(0, 0.5);

    this.add([this.track, this.fill, this.countText]);
    this.setDepth(depth);
    scene.add.existing(this);

    // ── Test hook sentinel ─────────────────────────────────────────────────
    const sentinel = TestHooks.mountSentinel('progress-bar');
    if (sentinel) {
      sentinel.setAttribute('role', 'progressbar');
      sentinel.setAttribute('aria-valuenow', '0');
      sentinel.setAttribute('aria-valuemin', '0');
      sentinel.setAttribute('aria-valuemax', String(goal));
    }
  }

  /**
   * Update the bar to reflect `value` out of `goal` attempts.
   * Animates unless prefers-reduced-motion. per design-language.md §6.4
   */
  setProgress(value: number): void {
    this.currentValue = Math.min(Math.max(0, value), this.goal);
    const ratio = this.currentValue / this.goal;
    const targetW = this.barWidth * ratio;
    const complete = this.currentValue >= this.goal;

    const fillColor = complete
      ? COMPLETE_COLOR
      : this.currentValue >= Math.ceil(this.goal / 2)
        ? FILL_COLOR_MID
        : FILL_COLOR;

    this.fill.setFillStyle(fillColor);
    this.countText.setText(`${this.currentValue} / ${this.goal}`);
    TestHooks.setAriaValueNow('progress-bar', this.currentValue);

    const reduceMotion = checkReduceMotion();

    if (reduceMotion) {
      // per design-language.md §6.4 — instant transition
      this.fill.width = targetW;
    } else {
      // Animate fill width — per design-language.md §6.1 (snap pulse duration)
      this.scene.tweens.add({
        targets: this.fill,
        width: targetW,
        duration: ANIMATE_MS,
        ease: 'Cubic.easeOut',
      });
    }
  }

  get value(): number {
    return this.currentValue;
  }
  get isComplete(): boolean {
    return this.currentValue >= this.goal;
  }
}
