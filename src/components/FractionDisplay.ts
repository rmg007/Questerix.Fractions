/**
 * FractionDisplay — single source of truth for rendering any fraction.
 *
 * Per ux-elevation.md §9 T0 + T1: every fraction in the app — bar models,
 * prompt panels, badges, hint bubbles — must go through this component so
 * we never depend on Unicode glyphs (½, ¼, ¾) which render inconsistently
 * across operating systems and fail entirely in fallback fonts.
 *
 * Rendering modes:
 *   'stacked' — numerator over denominator with a thin divider rule
 *               (used for prompt panels, headlines, hint bubbles)
 *   'inline'  — numerator/denominator using ASCII slash
 *               (used for tight spaces like badges and chips)
 *
 * Special cases:
 *   - 0 / 1 renders as "0"
 *   - 1 / 1 renders as "1"
 *   These are not visual cheats; they are the canonical representations
 *   for the values as introduced in the curriculum (number-line endpoints).
 */

import * as Phaser from 'phaser';
import { HEX } from '../scenes/utils/colors';

export type FractionMode = 'stacked' | 'inline';

export interface FractionDisplayOptions {
  /** Visual layout. Defaults to 'inline'. */
  mode?: FractionMode;
  /** Pixel size for the numerator/denominator text. Defaults to 24. */
  fontSize?: number;
  /** Font family. Defaults to Lexend (T0) for prompt-readability. */
  fontFamily?: string;
  /** Text color. Defaults to neutral900. */
  color?: string;
  /** Color of the divider rule in 'stacked' mode. Defaults to neutral900. */
  dividerColor?: number;
  /** Depth for layering. Defaults to 5. */
  depth?: number;
}

const DEFAULT_FONT_FAMILY = '"Lexend", "Nunito", system-ui, sans-serif';

/** Parse a string like "3/5" or "½" or "1" into {num, den}. */
export function parseFraction(value: string): { num: number; den: number } | null {
  const v = value.trim();
  // Common Unicode glyphs (legacy support; new code passes a/b directly).
  const unicode: Record<string, [number, number]> = {
    '½': [1, 2],
    '⅓': [1, 3],
    '⅔': [2, 3],
    '¼': [1, 4],
    '¾': [3, 4],
    '⅕': [1, 5],
    '⅖': [2, 5],
    '⅗': [3, 5],
    '⅘': [4, 5],
    '⅙': [1, 6],
    '⅚': [5, 6],
    '⅛': [1, 8],
    '⅜': [3, 8],
    '⅝': [5, 8],
    '⅞': [7, 8],
  };
  if (unicode[v]) {
    return { num: unicode[v][0], den: unicode[v][1] };
  }
  const slash = v.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (slash) {
    const num = parseInt(slash[1]!, 10);
    const den = parseInt(slash[2]!, 10);
    if (Number.isFinite(num) && Number.isFinite(den) && den > 0) return { num, den };
  }
  const whole = v.match(/^-?\d+$/);
  if (whole) {
    return { num: parseInt(v, 10), den: 1 };
  }
  return null;
}

export class FractionDisplay {
  private container: Phaser.GameObjects.Container;
  private numText: Phaser.GameObjects.Text | null = null;
  private denText: Phaser.GameObjects.Text | null = null;
  private inlineText: Phaser.GameObjects.Text | null = null;
  private divider: Phaser.GameObjects.Rectangle | null = null;

  private readonly mode: FractionMode;
  private readonly fontSize: number;
  private readonly fontFamily: string;
  private readonly color: string;
  private readonly dividerColor: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private numerator: number,
    private denominator: number,
    options: FractionDisplayOptions = {}
  ) {
    this.mode = options.mode ?? 'inline';
    this.fontSize = options.fontSize ?? 24;
    this.fontFamily = options.fontFamily ?? DEFAULT_FONT_FAMILY;
    this.color = options.color ?? HEX.neutral900;
    this.dividerColor = options.dividerColor ?? parseInt(HEX.neutral900.slice(1), 16);

    if (denominator <= 0) {
      throw new Error(`FractionDisplay: denominator must be positive, got ${denominator}`);
    }

    this.container = scene.add.container(x, y);
    this.container.setDepth(options.depth ?? 5);
    this.render(scene);
  }

  /**
   * Construct from a string source (parses Unicode, "a/b", or whole number).
   * Returns null if the string is not parseable.
   */
  static fromString(
    scene: Phaser.Scene,
    x: number,
    y: number,
    value: string,
    options: FractionDisplayOptions = {}
  ): FractionDisplay | null {
    const parsed = parseFraction(value);
    if (!parsed) return null;
    return new FractionDisplay(scene, x, y, parsed.num, parsed.den, options);
  }

  /** Update the displayed fraction (re-renders). */
  setFraction(numerator: number, denominator: number): void {
    if (denominator <= 0) {
      throw new Error(`FractionDisplay: denominator must be positive, got ${denominator}`);
    }
    this.numerator = numerator;
    this.denominator = denominator;
    const scene = this.container.scene;
    this.clear();
    this.render(scene);
  }

  /** True when the fraction reduces to 0 (renders as "0"). */
  isZero(): boolean {
    return this.numerator === 0;
  }

  /** True when the fraction equals 1 (renders as "1"). */
  isOne(): boolean {
    return this.numerator === this.denominator;
  }

  /** Get the underlying Phaser container (for layout, alpha, etc.). */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy();
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private clear(): void {
    this.numText?.destroy();
    this.denText?.destroy();
    this.inlineText?.destroy();
    this.divider?.destroy();
    this.numText = this.denText = this.inlineText = null;
    this.divider = null;
  }

  private render(scene: Phaser.Scene): void {
    if (this.isZero()) {
      this.renderInline(scene, '0');
      return;
    }
    if (this.isOne()) {
      this.renderInline(scene, '1');
      return;
    }
    if (this.mode === 'inline') {
      this.renderInline(scene, `${this.numerator}/${this.denominator}`);
      return;
    }
    this.renderStacked(scene);
  }

  private renderInline(scene: Phaser.Scene, text: string): void {
    this.inlineText = scene.add
      .text(0, 0, text, {
        fontFamily: this.fontFamily,
        fontSize: `${this.fontSize}px`,
        color: this.color,
      })
      .setOrigin(0.5);
    this.container.add(this.inlineText);
  }

  private renderStacked(scene: Phaser.Scene): void {
    const numStr = String(this.numerator);
    const denStr = String(this.denominator);
    const lineH = this.fontSize * 1.05;

    this.numText = scene.add
      .text(0, -lineH * 0.55, numStr, {
        fontFamily: this.fontFamily,
        fontSize: `${this.fontSize}px`,
        color: this.color,
      })
      .setOrigin(0.5);
    this.denText = scene.add
      .text(0, lineH * 0.55, denStr, {
        fontFamily: this.fontFamily,
        fontSize: `${this.fontSize}px`,
        color: this.color,
      })
      .setOrigin(0.5);

    const divW = Math.max(this.numText.width, this.denText.width) * 1.1;
    const divThickness = Math.max(2, this.fontSize * 0.08);
    this.divider = scene.add.rectangle(0, 0, divW, divThickness, this.dividerColor).setOrigin(0.5);

    this.container.add([this.numText, this.denText, this.divider]);
  }
}
