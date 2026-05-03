/**
 * ChocolateBarModel — renders an illustrated chocolate bar divided into N columns.
 * Used by PartitionInteraction when shapeType = 'chocolate_bar'.
 * per plans/visual-game-ideas.md §1-B
 */

import * as Phaser from 'phaser';

// ── Chocolate palette ─────────────────────────────────────────────────────────

const CHOC_DARK = 0x4a2100;   // outer border / dividers
const CHOC_MID = 0x7c3a00;    // main fill
const CHOC_LIGHT = 0xa05c20;  // emboss highlight
const CHOC_GOLD = 0xf59e0b;   // selected-segment fill
const CHOC_GREY = 0x9ca3af;   // unselected segment (post-commit feedback)
const GLOSS = 0xffffff;       // gloss highlight

export interface ChocolateBarModelOpts {
  scene: Phaser.Scene;
  /** Centre X of the whole bar */
  cx: number;
  /** Centre Y of the whole bar */
  cy: number;
  /** Total width of the bar */
  width: number;
  /** Total height of the bar */
  height: number;
  /** Number of equal segments (denominator) */
  denominator: number;
  depth?: number;
}

export class ChocolateBarModel {
  private readonly opts: Required<ChocolateBarModelOpts>;
  private gfx: Phaser.GameObjects.Graphics;

  constructor(opts: ChocolateBarModelOpts) {
    this.opts = { depth: 5, ...opts };
    this.gfx = opts.scene.add.graphics().setDepth(this.opts.depth);
    this.drawBase();
  }

  // ── Computed geometry ────────────────────────────────────────────────────────

  get left(): number {
    return this.opts.cx - this.opts.width / 2;
  }
  get top(): number {
    return this.opts.cy - this.opts.height / 2;
  }
  get segmentWidth(): number {
    return this.opts.width / this.opts.denominator;
  }

  /**
   * X position of the boundary between segment `i` and `i+1`.
   * i = 0 → left edge, i = denominator → right edge.
   */
  boundaryX(i: number): number {
    return this.left + this.segmentWidth * i;
  }

  /**
   * All interior boundary X positions (segment snap targets for DragHandle).
   */
  snapTargets(): number[] {
    const targets: number[] = [];
    for (let i = 1; i < this.opts.denominator; i++) {
      targets.push(this.boundaryX(i));
    }
    return targets;
  }

  // ── Public drawing API ───────────────────────────────────────────────────────

  /**
   * Highlight the left `n` segments (gold) and grey out the rest.
   * Used by PartitionInteraction.showCorrectFeedback() for chocolate_bar.
   */
  showFeedback(n: number): void {
    this.gfx.clear();
    this.drawSegmentsFeedback(n);
    this.drawGrooves();
    this.drawOuterBorder();
    this.drawGloss();
  }

  destroy(): void {
    this.gfx.destroy();
  }

  // ── Private drawing helpers ──────────────────────────────────────────────────

  private drawBase(): void {
    const { width, height } = this.opts;
    const g = this.gfx;
    const l = this.left;
    const t = this.top;
    const RADIUS = 14;

    // Drop shadow
    g.fillStyle(CHOC_DARK, 0.3);
    g.fillRoundedRect(l + 4, t + 6, width, height, RADIUS);

    // Main chocolate fill
    g.fillStyle(CHOC_MID, 1);
    g.fillRoundedRect(l, t, width, height, RADIUS);

    // Inner lighter tint (top portion for depth)
    g.fillStyle(CHOC_LIGHT, 0.4);
    g.fillRoundedRect(l + 6, t + 6, width - 12, height * 0.45, RADIUS - 4);

    // Segment fills (individual squares)
    this.drawSegments();

    // Groove lines between segments
    this.drawGrooves();

    // Outer border
    this.drawOuterBorder();

    // Gloss highlight
    this.drawGloss();
  }

  private drawSegments(): void {
    const { height } = this.opts;
    const l = this.left;
    const t = this.top;
    const sw = this.segmentWidth;
    const INNER_PAD = 5;
    const INNER_RADIUS = 6;

    for (let i = 0; i < this.opts.denominator; i++) {
      const sx = l + sw * i + INNER_PAD;
      const sy = t + INNER_PAD;
      const sw2 = sw - INNER_PAD * 2;
      const sh = height - INNER_PAD * 2;

      // Embossed segment
      g_fillRoundedRect(this.gfx, CHOC_LIGHT, 0.25, sx, sy, sw2, sh, INNER_RADIUS);
      g_strokeRoundedRect(this.gfx, CHOC_DARK, 0.35, 1, sx, sy, sw2, sh, INNER_RADIUS);
    }
  }

  private drawSegmentsFeedback(leftCount: number): void {
    const { width, height } = this.opts;
    const l = this.left;
    const t = this.top;
    const sw = this.segmentWidth;
    const RADIUS = 14;
    const INNER_PAD = 5;
    const INNER_RADIUS = 6;

    // Drop shadow
    this.gfx.fillStyle(CHOC_DARK, 0.3);
    this.gfx.fillRoundedRect(l + 4, t + 6, width, height, RADIUS);

    // Full bar base
    this.gfx.fillStyle(CHOC_MID, 1);
    this.gfx.fillRoundedRect(l, t, width, height, RADIUS);
    this.gfx.fillStyle(CHOC_LIGHT, 0.4);
    this.gfx.fillRoundedRect(l + 6, t + 6, width - 12, height * 0.45, RADIUS - 4);

    // Segment fills
    for (let i = 0; i < this.opts.denominator; i++) {
      const sx = l + sw * i + INNER_PAD;
      const sy = t + INNER_PAD;
      const sw2 = sw - INNER_PAD * 2;
      const sh = height - INNER_PAD * 2;

      if (i < leftCount) {
        // Selected: warm gold overlay
        g_fillRoundedRect(this.gfx, CHOC_GOLD, 0.55, sx, sy, sw2, sh, INNER_RADIUS);
        g_strokeRoundedRect(this.gfx, 0xd97706, 0.7, 2, sx, sy, sw2, sh, INNER_RADIUS);
      } else {
        // Unselected: grey
        g_fillRoundedRect(this.gfx, CHOC_GREY, 0.4, sx, sy, sw2, sh, INNER_RADIUS);
        g_strokeRoundedRect(this.gfx, 0x6b7280, 0.3, 1, sx, sy, sw2, sh, INNER_RADIUS);
      }
    }
  }

  private drawGrooves(): void {
    const { height } = this.opts;
    const t = this.top;
    const GROOVE_PAD = 8;

    this.gfx.lineStyle(3, CHOC_DARK, 0.6);
    for (let i = 1; i < this.opts.denominator; i++) {
      const gx = this.boundaryX(i);
      this.gfx.lineBetween(gx, t + GROOVE_PAD, gx, t + height - GROOVE_PAD);
    }
  }

  private drawOuterBorder(): void {
    const { width, height } = this.opts;
    const l = this.left;
    const t = this.top;
    this.gfx.lineStyle(3, CHOC_DARK, 0.85);
    this.gfx.strokeRoundedRect(l, t, width, height, 14);
  }

  private drawGloss(): void {
    const l = this.left;
    const t = this.top;
    const { width } = this.opts;
    // Top-left gloss ellipse
    this.gfx.fillStyle(GLOSS, 0.12);
    this.gfx.fillEllipse(l + width * 0.2, t + 22, width * 0.35, 20);
  }
}

// ── Tiny local helpers (avoid modifying Graphics prototype) ──────────────────

function g_fillRoundedRect(
  g: Phaser.GameObjects.Graphics,
  color: number,
  alpha: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x, y, w, h, r);
}

function g_strokeRoundedRect(
  g: Phaser.GameObjects.Graphics,
  color: number,
  alpha: number,
  lineW: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  g.lineStyle(lineW, color, alpha);
  g.strokeRoundedRect(x, y, w, h, r);
}
