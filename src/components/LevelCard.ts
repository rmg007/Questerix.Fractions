/**
 * LevelCard — interactive Phaser.GameObjects.Container for a single level tile.
 * per design-language.md §2 (palette), §5 (touch target ≥44×44 CSS px)
 * per runtime-architecture.md §8 step 3
 */
import * as Phaser from 'phaser';
import { CLR, HEX } from '../scenes/utils/colors';
import { TestHooks } from '../scenes/utils/TestHooks';
import type { LevelMeta } from '../scenes/utils/levelMeta';

const CARD_W = 220;
const CARD_H = 160;
const CARD_RADIUS = 14;

export interface LevelCardOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  meta: LevelMeta;
  unlocked: boolean;
  suggested: boolean;
  /** Whether the player has completed this level (used for mastery ribbon). */
  completed?: boolean;
  /** Whether the player has mastered this level (BKT masteryEstimate >= threshold). */
  mastered?: boolean;
  onTap: (levelNumber: number) => void;
  /** Optional explicit scale applied to the card container. */
  containerScale?: number;
}

export class LevelCard extends Phaser.GameObjects.Container {
  private readonly meta: LevelMeta;
  private readonly unlocked: boolean;
  private readonly onTap: (n: number) => void;
  private bg!: Phaser.GameObjects.Graphics;
  private readonly reducedMotion: boolean;

  constructor(opts: LevelCardOptions) {
    super(opts.scene, opts.x, opts.y);
    this.meta = opts.meta;
    this.unlocked = opts.unlocked;
    this.onTap = opts.onTap;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.build(opts.suggested);
    opts.scene.add.existing(this);
    // per test-strategy.md §1.3 — interactive testid overlay per card
    TestHooks.mountInteractive(
      `level-card-L${opts.meta.number}`,
      () => opts.onTap(opts.meta.number),
      { width: `${CARD_W}px`, height: `${CARD_H}px` }
    );
  }

  private build(suggested: boolean): void {
    const s = this.scene;

    // Background card — greyed when locked, primary-soft when unlocked
    // per design-language.md §2.1 — no neon
    const bgColor = this.unlocked ? CLR.primarySoft : CLR.neutral100;
    const borderColor = this.unlocked ? CLR.primary : CLR.neutral300;

    this.bg = s.add.graphics();
    this.drawCard(bgColor, borderColor);
    this.add(this.bg);

    // Level number
    this.add(
      s.add.text(-CARD_W / 2 + 16, -CARD_H / 2 + 14, `L${this.meta.number}`, {
        fontSize: '20px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: this.unlocked ? HEX.primary : HEX.neutral600,
      })
    );
    // Name
    this.add(
      s.add
        .text(0, -14, this.meta.name, {
          fontSize: '18px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          fontStyle: 'bold',
          color: this.unlocked ? HEX.neutral900 : HEX.neutral600,
          align: 'center',
          wordWrap: { width: CARD_W - 24 },
        })
        .setOrigin(0.5)
    );
    // Concept
    this.add(
      s.add
        .text(0, 24, this.meta.concept, {
          fontSize: '13px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          color: this.unlocked ? HEX.neutral600 : HEX.neutral300,
          align: 'center',
          wordWrap: { width: CARD_W - 24 },
        })
        .setOrigin(0.5)
    );

    // Grade band + optional "Suggested next" badge
    // per runtime-architecture.md §11 routing rules
    const gradeText = s.add
      .text(CARD_W / 2 - 12, -CARD_H / 2 + 14, `Gr ${this.meta.gradeBand}`, {
        fontSize: '11px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        color: HEX.neutral600,
      })
      .setOrigin(1, 0);
    this.add(gradeText);

    if (suggested) {
      const badgeBg = s.add.graphics();
      badgeBg.fillStyle(CLR.accentA, 1);
      badgeBg.fillRoundedRect(-54, CARD_H / 2 - 28, 108, 22, 8);
      this.add(badgeBg);
      this.add(
        s.add
          .text(0, CARD_H / 2 - 17, 'Suggested next', {
            fontSize: '11px',
            fontFamily: '"Nunito", system-ui, sans-serif',
            fontStyle: 'bold',
            color: HEX.neutral900,
          })
          .setOrigin(0.5)
      );
    }

    // Hit zone — ≥44×44 per accessibility.md
    const hit = s.add
      .rectangle(0, 0, CARD_W, CARD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.add(hit);

    hit.on('pointerup', () => this.onTap(this.meta.number));

    if (!this.reducedMotion) {
      hit.on('pointerover', () => {
        this.bg.clear();
        const hover = this.unlocked ? CLR.primary : CLR.neutral300;
        this.drawCard(hover, hover, 0.15);
      });
      hit.on('pointerout', () => {
        this.bg.clear();
        this.drawCard(bgColor, borderColor);
      });
    }
  }

  private drawCard(fill: number, border: number, alpha = 1): void {
    this.bg.clear();
    this.bg.fillStyle(fill, alpha < 1 ? alpha : 1);
    this.bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
    this.bg.lineStyle(2, border, 1);
    this.bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
  }
}
