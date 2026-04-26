/**
 * BarModel — reusable horizontal bar showing a shaded fraction.
 * per design-language.md §2 (palette) and §5 (touch targets)
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from '../../utils/colors';

export interface BarModelOpts {
  x: number;
  y: number;
  width: number;
  height: number;
  numerator: number;
  denominator: number;
  label?: string;
  fillColor?: number;
  showDividers?: boolean;
}

export class BarModel {
  private gfx: Phaser.GameObjects.Graphics;
  private labelText?: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, opts: BarModelOpts) {
    const {
      x,
      y,
      width,
      height,
      numerator,
      denominator,
      label,
      fillColor = CLR.primary,
      showDividers = true,
    } = opts;

    const denom = Math.max(1, denominator);
    const numer = Phaser.Math.Clamp(numerator, 0, denom);
    const segW = width / denom;
    const left = x - width / 2;
    const top = y - height / 2;

    this.gfx = scene.add.graphics().setDepth(5);

    // Filled segments
    if (numer > 0) {
      this.gfx.fillStyle(fillColor, 1);
      this.gfx.fillRect(left, top, segW * numer, height);
    }

    // Unfilled segments
    if (numer < denom) {
      this.gfx.fillStyle(CLR.neutral100, 1);
      this.gfx.fillRect(left + segW * numer, top, segW * (denom - numer), height);
    }

    // Outline
    this.gfx.lineStyle(2, CLR.neutral300, 1);
    this.gfx.strokeRect(left, top, width, height);

    // Divider lines between segments
    if (showDividers && denom > 1) {
      this.gfx.lineStyle(1, CLR.neutral300, 1);
      for (let i = 1; i < denom; i++) {
        const dx = left + segW * i;
        this.gfx.lineBetween(dx, top, dx, top + height);
      }
    }

    // Label above bar
    if (label) {
      this.labelText = scene.add
        .text(x, top - 10, label, {
          fontSize: '20px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          fontStyle: 'bold',
          color: HEX.neutral900,
        })
        .setOrigin(0.5, 1)
        .setDepth(6);
    }
  }

  destroy(): void {
    this.gfx.destroy();
    this.labelText?.destroy();
  }
}
