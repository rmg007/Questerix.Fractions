/**
 * ProgressBar — session progress indicator shown as 5 collectible stars,
 * plus per-skill mastery chips displayed below the stars.
 * per interaction-model.md §6.2 (per-session success), C9 (5+ problems per session)
 * per design-language.md §6.4 (reduced motion), task-25 (star redesign)
 *
 * Stars display ☆ (empty) → ★ (filled) as the student answers correctly.
 * Skill chips show UNSEEN (grey) / LEARNING (yellow) / MASTERED (green) state.
 * The "N / 5" numeric label is removed in favour of an accessible aria-label
 * on the sentinel element so the display stays clean for K-2 learners.
 */

import * as Phaser from 'phaser';
import { TITLE_FONT } from '../scenes/utils/levelTheme';
import { TestHooks } from '../scenes/utils/TestHooks';
import { checkReduceMotion } from '../lib/preferences';
import type { ChipState, SkillSummaryEntry } from '../persistence/repositories/skillMastery';

// ── Chip appearance ─────────────────────────────────────────────────────────
const CHIP_SIZE = 24; // canvas px — display-only, not interactive
const CHIP_GAP = 6;
const CHIP_Y_OFFSET = 48; // below the star row
const CHIP_MAX_VISIBLE = 5;
const CHIP_COLOR: Record<ChipState, number> = {
  UNSEEN: 0x9ca3af, // grey-400
  LEARNING: 0xfbbf24, // amber-400
  MASTERED: 0x22c55e, // green-500
};
const CHIP_ALPHA_UNSEEN = 0.55;
const CHIP_ANIMATE_MS = 180;

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
const STAR_COLOR_FILLED = '#FBBF24'; // gold / amber-400 per colors.ts HEX.gold
const STAR_COLOR_EMPTY = '#FDE68A'; // goldDim / amber-200 per colors.ts HEX.goldDim
const ANIMATE_MS = 200;

export class ProgressBar extends Phaser.GameObjects.Container {
  private stars: Phaser.GameObjects.Text[] = [];
  private currentValue: number = 0;
  private readonly goal: number;
  private sentinel: HTMLElement | null = null;
  private activeTweens: Phaser.Tweens.Tween[] = [];

  // ── Skill chips ──────────────────────────────────────────────────────────
  /** Chip graphics objects, one per visible skill (max CHIP_MAX_VISIBLE). */
  private chipGraphics: Phaser.GameObjects.Graphics[] = [];
  /** Current chip states, cached to detect transitions. */
  private chipStates: ChipState[] = [];
  /** Trophy text overlays (⭐) for kept-fresh chips, aligned with chipGraphics. */
  private chipLabels: Phaser.GameObjects.Text[] = [];
  /** Overflow "+N" text when there are more skills than chips. */
  private overflowText: Phaser.GameObjects.Text | null = null;

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
    const reduceMotion = checkReduceMotion();

    this.stars.forEach((star, i) => {
      const filled = i < this.currentValue;
      star.setText(filled ? STAR_FILLED : STAR_EMPTY);
      star.setColor(filled ? STAR_COLOR_FILLED : STAR_COLOR_EMPTY);

      // Bounce the newly filled star
      if (!reduceMotion && filled && i === prev) {
        star.setScale(1.4);
        const tween = this.scene.tweens.add({
          targets: star,
          scale: 1,
          duration: ANIMATE_MS,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.activeTweens = this.activeTweens.filter((t) => t !== tween);
          },
        });
        this.activeTweens.push(tween);
      } else {
        star.setScale(1);
      }
    });

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

  /**
   * Update skill chips from a LevelMasterySummary.
   * Renders up to CHIP_MAX_VISIBLE chips; shows "+N" for overflow.
   * LEARNING→MASTERED transition gets a brief success scale flash.
   * Display-only — chips are not interactive (24×24 px is below touch-target minimum).
   */
  updateSkillChips(skills: SkillSummaryEntry[], totalSkillCount?: number): void {
    const visible = skills.slice(0, CHIP_MAX_VISIBLE);
    const overflow = (totalSkillCount ?? skills.length) - visible.length;
    const reduceMotion = checkReduceMotion();

    // Width available for chips: evenly spaced across the bar width.
    const barWidth = this.width > 0 ? this.width : 400;
    const chipAreaWidth = Math.min(
      barWidth,
      visible.length * (CHIP_SIZE + CHIP_GAP) + (overflow > 0 ? CHIP_SIZE + CHIP_GAP : 0)
    );
    const startX = (barWidth - chipAreaWidth) / 2;

    // Lazily create or reuse chip graphics and kept-fresh labels.
    while (this.chipGraphics.length < visible.length) {
      const g = this.scene.add.graphics();
      this.add(g);
      this.chipGraphics.push(g);
      const lbl = this.scene.add
        .text(0, 0, '⭐', { fontSize: '10px', fontFamily: TITLE_FONT })
        .setOrigin(0.5)
        .setVisible(false);
      this.add(lbl);
      this.chipLabels.push(lbl);
    }

    // Update each chip.
    visible.forEach((entry, i) => {
      const prevState = this.chipStates[i];
      const g = this.chipGraphics[i]!;
      const cx = startX + i * (CHIP_SIZE + CHIP_GAP);
      const cy = CHIP_Y_OFFSET;

      g.clear();
      g.fillStyle(CHIP_COLOR[entry.state], entry.state === 'UNSEEN' ? CHIP_ALPHA_UNSEEN : 1);
      g.fillRoundedRect(cx, cy, CHIP_SIZE, CHIP_SIZE, 6);

      // Flash animation on LEARNING→MASTERED transition.
      if (!reduceMotion && prevState === 'LEARNING' && entry.state === 'MASTERED') {
        g.setScale(0.7);
        const tween = this.scene.tweens.add({
          targets: g,
          scale: 1,
          duration: CHIP_ANIMATE_MS,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.activeTweens = this.activeTweens.filter((t) => t !== tween);
          },
        });
        this.activeTweens.push(tween);
      } else {
        g.setScale(1);
      }

      this.chipStates[i] = entry.state;

      // Show ⭐ trophy on kept-fresh MASTERED chips.
      const lbl = this.chipLabels[i];
      if (lbl) {
        lbl.setPosition(cx + CHIP_SIZE - 4, cy + 4);
        lbl.setVisible(entry.keptFresh === true && entry.state === 'MASTERED');
      }
    });

    // Hide any excess chip graphics and labels.
    for (let i = visible.length; i < this.chipGraphics.length; i++) {
      this.chipGraphics[i]!.clear();
      this.chipGraphics[i]!.setScale(1);
      this.chipLabels[i]?.setVisible(false);
    }

    // Overflow "+N" chip.
    if (overflow > 0) {
      const ox = startX + visible.length * (CHIP_SIZE + CHIP_GAP);
      if (!this.overflowText) {
        this.overflowText = this.scene.add
          .text(ox, CHIP_Y_OFFSET + CHIP_SIZE / 2, '', {
            fontFamily: TITLE_FONT,
            fontSize: '24px',
            color: '#9ca3af',
          })
          .setOrigin(0, 0.5);
        this.add(this.overflowText);
      }
      this.overflowText.setText(`+${overflow}`);
      this.overflowText.setX(ox);
      this.overflowText.setVisible(true);
    } else if (this.overflowText) {
      this.overflowText.setVisible(false);
    }
  }

  get value(): number {
    return this.currentValue;
  }
  get isComplete(): boolean {
    return this.currentValue >= this.goal;
  }

  override destroy(): void {
    for (const tween of this.activeTweens) {
      tween.remove();
    }
    this.activeTweens = [];
    // Chip graphics and overflowText are children of the container and will be
    // destroyed by super.destroy(true) below — no need to call destroy() manually.
    super.destroy();
  }
}
