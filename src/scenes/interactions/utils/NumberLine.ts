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
      ...opts,
    };
    this.currentValue = this.opts.minValue;

    this.gfx = scene.add.graphics().setDepth(5);
    this.draw();
  }

  private draw(): void {
    const { x, y, length, minValue, maxValue, tickFractions } = this.opts;
    const left = x - length / 2;
    const range = maxValue - minValue;

    this.gfx.clear();
    this.gfx.lineStyle(4, CLR.neutral600, 1);
    this.gfx.lineBetween(left, y, left + length, y);

    // Always draw ticks at min, 0.5 (if in range), max
    const baseTicks = [minValue, maxValue];
    if (minValue <= 0.5 && 0.5 <= maxValue) baseTicks.splice(1, 0, 0.5);
    const allTicks = Array.from(new Set([...baseTicks, ...tickFractions!])).sort((a, b) => a - b);

    allTicks.forEach((v) => {
      const tx = left + ((v - minValue) / range) * length;
      this.gfx.lineStyle(2, CLR.neutral600, 1);
      this.gfx.lineBetween(tx, y - 12, tx, y + 12);
      const lbl = v === 0.5 ? '1/2' : v === 0 ? '0' : v === 1 ? '1' : String(v);
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
        let best = snapPositions![0];
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
