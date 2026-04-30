/**
 * LevelCard — interactive Phaser.GameObjects.Container for a single level tile.
 * Uses the sky-blue adventure theme from levelTheme.ts to stay cohesive with
 * MenuScene and LevelScene.
 * per design-language.md §2 (palette), §5 (touch target ≥44×44 CSS px)
 * per runtime-architecture.md §8 step 3
 */
import * as Phaser from 'phaser';
import {
  SKY_BG,
  PATH_BLUE,
  NAVY_HEX,
  ACTION_FILL,
  ACTION_BORDER,
  ACTION_TEXT,
  TITLE_FONT,
  BODY_FONT,
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_DIM,
} from '../scenes/utils/levelTheme';

import { TestHooks } from '../scenes/utils/TestHooks';
import type { LevelMeta } from '../scenes/utils/levelMeta';

// ── Mastery ribbon palette (matches LevelMapScene) ────────────────────────────
const RIBBON_GOLD = 0xfbbf24; // amber-400
const RIBBON_BORDER = 0xb45309; // amber-700
const RIBBON_H = 20;


// ── Adventure theme colours ───────────────────────────────────────────────────

const UNLOCKED_BG = SKY_BG; // #E0F2FE — pale sky
const UNLOCKED_BORDER = PATH_BLUE; // #93C5FD — light blue path
const LOCKED_BG = 0xf1f5f9; // slate-100 — muted for locked
const LOCKED_BORDER = 0xc8d6e0; // soft blue-grey
const HOVER_BG = PATH_BLUE; // blue-300 on hover
const BADGE_FILL = ACTION_FILL; // amber — matches Check button / Play station
const SUGGESTED_BORDER = ACTION_FILL; // amber border for suggested card
const SUGGESTED_GLOW = ACTION_FILL; // amber glow behind suggested card

// Completed level palette — amber tint to signal progress
const COMPLETED_BG = 0xfffbeb; // amber-50 — warm tint
const COMPLETED_BORDER = 0xfbbf24; // amber-400
const COMPLETED_STAR_BG = 0xfbbf24; // amber-400 — star badge fill
const COMPLETED_STAR_BORDER = 0xb45309; // amber-700 — star badge stroke

const CARD_W = 220;
const CARD_H = 160;
const CARD_RADIUS = 16;

export interface LevelCardOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  meta: LevelMeta;
  unlocked: boolean;
  completed?: boolean;
  suggested: boolean;
  mastered?: boolean;
  /**
   * The CSS/Phaser scale that the container will be set to after construction.
   * When provided, ribbon dimensions are divided by this value so the ribbon
   * renders at the correct physical size after the parent applies `setScale`.
   * Defaults to 1 (no compensation needed).
   */
  containerScale?: number;
  /**
   * Prefix used to name the TestHooks interactive element. Defaults to
   * 'level-card'. Override (e.g. 'overlay-card') to avoid clashing with
   * existing hooks when the card is used inside a floating overlay.
   */
  testHookPrefix?: string;
  onTap: (levelNumber: number) => void;
}

export class LevelCard extends Phaser.GameObjects.Container {
  private readonly meta: LevelMeta;
  private readonly unlocked: boolean;
  private readonly mastered: boolean;
  private readonly containerScale: number;
  private readonly completed: boolean;
  private readonly onTap: (n: number) => void;
  private bg!: Phaser.GameObjects.Graphics;
  private readonly reducedMotion: boolean;
  private readonly bgFill: number;
  private readonly bgBorder: number;

  constructor(opts: LevelCardOptions) {
    super(opts.scene, opts.x, opts.y);
    this.meta = opts.meta;
    this.unlocked = opts.unlocked;
    this.mastered = opts.mastered ?? false;
    this.containerScale = opts.containerScale ?? 1;
    this.completed = opts.completed ?? false;
    this.onTap = opts.onTap;
    this.bgFill = this.completed ? COMPLETED_BG : opts.unlocked ? UNLOCKED_BG : LOCKED_BG;
    this.bgBorder = this.completed ? COMPLETED_BORDER : opts.unlocked ? UNLOCKED_BORDER : LOCKED_BORDER;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.build(opts.suggested);
    opts.scene.add.existing(this);
    const hookPrefix = opts.testHookPrefix ?? 'level-card';
    TestHooks.mountInteractive(
      `${hookPrefix}-L${opts.meta.number}`,
      () => {
        if (opts.unlocked) opts.onTap(opts.meta.number);
      },
      { width: `${CARD_W}px`, height: `${CARD_H}px` }
    );
  }

  private build(suggested: boolean): void {
    const s = this.scene;

    // Glow halo behind card for the suggested level
    if (suggested) {
      const glowPad = 10;
      const glow = s.add.graphics();
      glow.fillStyle(SUGGESTED_GLOW, 1);
      glow.fillRoundedRect(
        -CARD_W / 2 - glowPad,
        -CARD_H / 2 - glowPad,
        CARD_W + glowPad * 2,
        CARD_H + glowPad * 2,
        CARD_RADIUS + glowPad
      );
      glow.setAlpha(0.15);
      this.add(glow);

      // Pulse the glow alpha for reduced-motion-friendly breathing effect
      if (!this.reducedMotion) {
        s.tweens.add({
          targets: glow,
          alpha: 0.45,
          duration: 900,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      }
    }

    this.bg = s.add.graphics();
    this.drawCard(this.bgFill, suggested ? SUGGESTED_BORDER : this.bgBorder, suggested ? 0.3 : 0);
    this.add(this.bg);

    // Gold mastery ribbon — top strip across the card, clipped to rounded corners.
    // Dimensions are divided by containerScale so the ribbon appears at a fixed
    // 20 × CARD_W screen-pixel size after the caller applies setScale(containerScale).
    if (this.mastered) {
      const cs = this.containerScale;
      const localH = RIBBON_H / cs;
      const localBorder = 2 / cs;
      const ribbonG = s.add.graphics();
      ribbonG.fillStyle(RIBBON_GOLD, 1);
      ribbonG.fillRoundedRect(
        -CARD_W / 2, -CARD_H / 2, CARD_W, localH,
        { tl: CARD_RADIUS, tr: CARD_RADIUS, bl: 0, br: 0 }
      );
      ribbonG.lineStyle(localBorder, RIBBON_BORDER, 1);
      ribbonG.strokeRoundedRect(
        -CARD_W / 2, -CARD_H / 2, CARD_W, localH,
        { tl: CARD_RADIUS, tr: CARD_RADIUS, bl: 0, br: 0 }
      );
      this.add(ribbonG);
    }

    // Level number chip — top-left
    this.add(
      s.add.text(-CARD_W / 2 + 14, -CARD_H / 2 + 12, `L${this.meta.number}`, {
        fontSize: '20px',
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        color: this.unlocked ? NAVY_HEX : TEXT_MUTED,
      })
    );

    // Level name — centred
    this.add(
      s.add
        .text(0, -12, this.meta.name, {
          fontSize: '18px',
          fontFamily: TITLE_FONT,
          fontStyle: 'bold',
          color: this.unlocked ? NAVY_HEX : TEXT_MUTED,
          align: 'center',
          wordWrap: { width: CARD_W - 24 },
        })
        .setOrigin(0.5)
    );

    // Concept — smaller, centred
    this.add(
      s.add
        .text(0, 26, this.meta.concept, {
          fontSize: '13px',
          fontFamily: BODY_FONT,
          color: this.unlocked ? TEXT_BODY : TEXT_DIM,
          align: 'center',
          wordWrap: { width: CARD_W - 24 },
        })
        .setOrigin(0.5)
    );

    // Grade band — top-right (hidden when completed to make room for the star badge)
    if (!this.completed) {
      this.add(
        s.add
          .text(CARD_W / 2 - 10, -CARD_H / 2 + 12, `Gr ${this.meta.gradeBand}`, {
            fontSize: '11px',
            fontFamily: BODY_FONT,
            color: this.unlocked ? TEXT_BODY : TEXT_DIM,
          })
          .setOrigin(1, 0)
      );
    }

    // Lock icon for locked levels
    if (!this.unlocked) {
      this.add(s.add.text(0, -36, '🔒', { fontSize: '22px' }).setOrigin(0.5));
    }

    // Star badge for completed levels — top-right corner circle
    if (this.completed) {
      const BADGE_R = 18;
      const bx = CARD_W / 2 - BADGE_R + 4;
      const by = -CARD_H / 2 + BADGE_R - 4;
      const badgeCircle = s.add.graphics();
      badgeCircle.fillStyle(COMPLETED_STAR_BG, 1);
      badgeCircle.lineStyle(2.5, COMPLETED_STAR_BORDER, 1);
      badgeCircle.fillCircle(bx, by, BADGE_R);
      badgeCircle.strokeCircle(bx, by, BADGE_R);
      this.add(badgeCircle);
      this.add(
        s.add
          .text(bx, by, '★', {
            fontSize: '20px',
            color: '#78350f',
          })
          .setOrigin(0.5)
      );
    }

    // "Suggested next" amber badge — bottom centre
    if (suggested) {
      const badgeBg = s.add.graphics();
      badgeBg.fillStyle(BADGE_FILL, 1);
      badgeBg.lineStyle(2, ACTION_BORDER, 1);
      badgeBg.fillRoundedRect(-58, CARD_H / 2 - 30, 116, 24, 10);
      badgeBg.strokeRoundedRect(-58, CARD_H / 2 - 30, 116, 24, 10);
      this.add(badgeBg);
      this.add(
        s.add
          .text(0, CARD_H / 2 - 18, 'Suggested next', {
            fontSize: '11px',
            fontFamily: BODY_FONT,
            fontStyle: 'bold',
            color: ACTION_TEXT,
          })
          .setOrigin(0.5)
      );
    }

    // Hit zone — ≥44×44 per accessibility.md
    const hit = s.add
      .rectangle(0, 0, CARD_W, CARD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: this.unlocked });
    this.add(hit);

    if (this.unlocked) {
      hit.on('pointerup', () => this.onTap(this.meta.number));

      if (!this.reducedMotion) {
        hit.on('pointerover', () => {
          this.bg.clear();
          this.drawCard(HOVER_BG, suggested ? SUGGESTED_BORDER : UNLOCKED_BORDER, 0.5);
        });
        hit.on('pointerout', () => {
          this.bg.clear();
          this.drawCard(this.bgFill, suggested ? SUGGESTED_BORDER : this.bgBorder, suggested ? 0.3 : 0);
        });
      }
    }
  }

  private drawCard(fill: number, border: number, shadowAlpha = 0): void {
    this.bg.clear();
    if (shadowAlpha > 0) {
      this.bg.fillStyle(border, shadowAlpha);
      this.bg.fillRoundedRect(-CARD_W / 2 + 2, -CARD_H / 2 + 4, CARD_W, CARD_H, CARD_RADIUS);
    }
    this.bg.fillStyle(fill, 1);
    this.bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
    this.bg.lineStyle(3, border, 1);
    this.bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
  }
}
