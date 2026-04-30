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
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_DIM,
} from '../scenes/utils/levelTheme';

import { TestHooks } from '../scenes/utils/TestHooks';
import type { LevelMeta } from '../scenes/utils/levelMeta';

const BODY_FONT = '"Lexend", "Nunito", system-ui, sans-serif';

// ── Adventure theme colours ───────────────────────────────────────────────────

const UNLOCKED_BG = SKY_BG; // #E0F2FE — pale sky
const UNLOCKED_BORDER = PATH_BLUE; // #93C5FD — light blue path
const LOCKED_BG = 0xf1f5f9; // slate-100 — muted for locked
const LOCKED_BORDER = 0xc8d6e0; // soft blue-grey
const HOVER_BG = PATH_BLUE; // blue-300 on hover
const BADGE_FILL = ACTION_FILL; // amber — matches Check button / Play station

const CARD_W = 220;
const CARD_H = 160;
const CARD_RADIUS = 16;

export interface LevelCardOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  meta: LevelMeta;
  unlocked: boolean;
  suggested: boolean;
  onTap: (levelNumber: number) => void;
}

export class LevelCard extends Phaser.GameObjects.Container {
  private readonly meta: LevelMeta;
  private readonly unlocked: boolean;
  private readonly onTap: (n: number) => void;
  private bg!: Phaser.GameObjects.Graphics;
  private readonly reducedMotion: boolean;
  private readonly bgFill: number;
  private readonly bgBorder: number;

  constructor(opts: LevelCardOptions) {
    super(opts.scene, opts.x, opts.y);
    this.meta = opts.meta;
    this.unlocked = opts.unlocked;
    this.onTap = opts.onTap;
    this.bgFill = opts.unlocked ? UNLOCKED_BG : LOCKED_BG;
    this.bgBorder = opts.unlocked ? UNLOCKED_BORDER : LOCKED_BORDER;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.build(opts.suggested);
    opts.scene.add.existing(this);
    TestHooks.mountInteractive(
      `level-card-L${opts.meta.number}`,
      () => {
        if (opts.unlocked) opts.onTap(opts.meta.number);
      },
      { width: `${CARD_W}px`, height: `${CARD_H}px` }
    );
  }

  private build(suggested: boolean): void {
    const s = this.scene;

    this.bg = s.add.graphics();
    this.drawCard(this.bgFill, this.bgBorder);
    this.add(this.bg);

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

    // Grade band — top-right
    this.add(
      s.add
        .text(CARD_W / 2 - 10, -CARD_H / 2 + 12, `Gr ${this.meta.gradeBand}`, {
          fontSize: '11px',
          fontFamily: BODY_FONT,
          color: this.unlocked ? TEXT_BODY : TEXT_DIM,
        })
        .setOrigin(1, 0)
    );

    // Lock icon for locked levels
    if (!this.unlocked) {
      this.add(s.add.text(0, -36, '🔒', { fontSize: '22px' }).setOrigin(0.5));
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
          this.drawCard(HOVER_BG, UNLOCKED_BORDER, 0.5);
        });
        hit.on('pointerout', () => {
          this.bg.clear();
          this.drawCard(this.bgFill, this.bgBorder);
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
