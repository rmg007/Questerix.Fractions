/**
 * NumberLine — reusable number line with tick marks and optional draggable marker.
 * per design-language.md §2, §5, §6.4 (reduced motion)
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from '../../utils/colors';

export interface NumberLineOpts {
  x: number;
  y: number;
  length: number;
  minValue?: number;
  maxValue?: number;
  tickFractions?: number[];
  snapPositions?: number[];
  /** When set, tick labels are rendered as fraction notation (e.g. 1/3, 2/3). */
  denominator?: number;
}

const SNAP_THRESHOLD = 16; // px

export class NumberLine {
  private gfx: Phaser.GameObjects.Graphics;
  private marker?: Phaser.GameObjects.Arc;
  private tickTexts: Phaser.GameObjects.Text[] = [];
  private readonly scene: Phaser.Scene;
  private readonly opts: Required<NumberLineOpts>;
  private currentValue: number;

  constructor(scene: Phaser.Scene, opts: NumberLineOpts) {
    this.scene = scene;
    this.opts = {
      minValue: 0,
      maxValue: 1,
      tickFractions: [],
      snapPositions: [],
      denominator: 0, // 0 = not set; falls back to legacy label logic
      ...opts,
    };
    this.currentValue = this.opts.minValue;

    this.gfx = scene.add.graphics().setDepth(5);
    this.draw();
  }

  /**
   * Format a tick value as a human-readable label.
   *
   * When `denominator` is set (> 0), render fraction notation:
   *   v=0 → "0", v=1 → "1", v=k/d → "k/d"
   *
   * Otherwise fall back to the legacy logic that special-cases 0, 0.5, and 1.
   */
  private formatTickLabel(v: number): string {
    const d = this.opts.denominator;
    if (d && d > 0) {
      const n = Math.round(v * d);
      if (n === 0) return '0';
      if (n === d) return '1';
      return `${n}/${d}`;
    }
    // Legacy fallback: handles halves (and whole numbers) without a denominator.
    if (v === 0) return '0';
    if (v === 1) return '1';
    if (v === 0.5) return '1/2';
    return String(v);
  }

  private draw(): void {
    const { x, y, length, minValue, maxValue, tickFractions } = this.opts;
    const left = x - length / 2;
    const range = maxValue - minValue;

    this.gfx.clear();
    this.gfx.lineStyle(4, CLR.neutral600, 1);
    this.gfx.lineBetween(left, y, left + length, y);

    // Always draw ticks at endpoints; add 0.5 midpoint only when no custom
    // denominator is set (otherwise 0.5 would be mislabelled, e.g. "2/3" for thirds).
    const baseTicks = [minValue, maxValue];
    if (!this.opts.denominator && minValue <= 0.5 && 0.5 <= maxValue) {
      baseTicks.splice(1, 0, 0.5);
    }
    const allTicks = Array.from(new Set([...baseTicks, ...tickFractions!])).sort((a, b) => a - b);

    allTicks.forEach((v) => {
      const tx = left + ((v - minValue) / range) * length;
      this.gfx.lineStyle(2, CLR.neutral600, 1);
      this.gfx.lineBetween(tx, y - 12, tx, y + 12);
      const lbl = this.formatTickLabel(v);
      const t = this.scene.add
        .text(tx, y + 20, lbl, {
          fontSize: '14px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          color: HEX.neutral600,
        })
        .setOrigin(0.5, 0)
        .setDepth(6);
      this.tickTexts.push(t);
    });
  }

  setMarker(value: number): void {
    this.currentValue = value;
    const { x, y, length, minValue, maxValue } = this.opts;
    const left = x - length / 2;
    const mx = left + ((value - minValue) / (maxValue - minValue)) * length;
    if (!this.marker) {
      this.marker = this.scene.add.circle(mx, y, 14, CLR.primary).setDepth(9);
      this.marker.setStrokeStyle(2, CLR.primaryStrong);
    } else {
      this.marker.setPosition(mx, y);
    }
  }

  enableDrag(onCommit: (value: number) => void): void {
    const { x, y, length, minValue, maxValue, snapPositions } = this.opts;
    const left = x - length / 2;
    const range = maxValue - minValue;

    if (!this.marker) this.setMarker(minValue);

    this.marker!.setInteractive({ draggable: true, useHandCursor: true });

    this.marker!.on('drag', (_ptr: unknown, dx: number) => {
      const clamped = Phaser.Math.Clamp(dx, left, left + length);
      this.marker!.setPosition(clamped, y);
      this.currentValue = minValue + ((clamped - left) / length) * range;
    });

    this.marker!.on('dragend', () => {
      let snapped = this.currentValue;
      if (snapPositions!.length > 0) {
        let best = snapPositions![0]!;
        let bestDist = Infinity;
        for (const sp of snapPositions!) {
          const spx = left + ((sp - minValue) / range) * length;
          const mx2 = left + ((this.currentValue - minValue) / range) * length;
          const d = Math.abs(mx2 - spx);
          if (d < bestDist) {
            bestDist = d;
            best = sp;
          }
        }
        if (bestDist <= SNAP_THRESHOLD) snapped = best;
      }
      this.currentValue = snapped;
      const finalX = left + ((snapped - minValue) / range) * length;
      this.marker!.setPosition(finalX, y);
      onCommit(snapped);
    });
  }

  destroy(): void {
    this.gfx.destroy();
    this.marker?.destroy();
    this.tickTexts.forEach((t) => t.destroy());
  }
}
