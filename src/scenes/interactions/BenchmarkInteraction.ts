/**
 * BenchmarkInteraction — BarModel of target fraction + number line 0..1 + 3 tap zones.
 * per activity-archetypes.md §6 (L8)
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from '../utils/colors';
import { BarModel, NumberLine } from './utils';
import type { Interaction, InteractionContext } from './types';

interface BenchmarkPayload {
  targetFracId?: string;
  targetLabel?: string;
  numerator?: number;
  denominator?: number;
}

type Zone = 'zero' | 'half' | 'one';

function parseFrac(s?: string): { n: number; d: number } {
  if (!s) return { n: 1, d: 4 };
  const [n, d] = s.split('/').map(Number);
  return { n: n ?? 1, d: d ?? 1 };
}

export class BenchmarkInteraction implements Interaction {
  readonly archetype = 'benchmark' as const;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private bar: BarModel | undefined = undefined;
  private line: NumberLine | undefined = undefined;

  mount(ctx: InteractionContext): void {
    const { scene, template, centerX, centerY, width, onCommit } = ctx;
    const payload = template.payload as BenchmarkPayload;
    const label = payload.targetLabel ?? payload.targetFracId ?? '1/4';
    const frac =
      payload.numerator !== undefined
        ? { n: payload.numerator, d: payload.denominator ?? 1 }
        : parseFrac(label);

    // Target bar model at top
    this.bar = new BarModel(scene, {
      x: centerX,
      y: centerY - 160,
      width: 240,
      height: 48,
      numerator: frac.n,
      denominator: frac.d,
      label,
      fillColor: CLR.primary,
    });

    // Number line 0..1 with ½ tick
    const lineW = Math.min(560, width - 80);
    this.line = new NumberLine(scene, {
      x: centerX,
      y: centerY - 40,
      length: lineW,
      tickFractions: [0.5],
    });

    // Three drop zones
    const zones: Array<{ key: Zone; label: string; value: number }> = [
      { key: 'zero', label: 'Closer to 0', value: 0 },
      { key: 'half', label: 'Closer to ½', value: 0.5 },
      { key: 'one', label: 'Closer to 1', value: 1 },
    ];
    const zoneW = Math.min(160, (width - 80) / 3 - 12);
    const zoneY = centerY + 100;
    const spread = zoneW + 20;

    zones.forEach(({ key, label: zl }, i) => {
      const bx = centerX - spread + i * spread;
      const bg = scene.add
        .rectangle(bx, zoneY, zoneW, 64, CLR.neutral50)
        .setStrokeStyle(2, CLR.neutral300)
        .setDepth(5);
      scene.add
        .text(bx, zoneY, zl, {
          fontSize: '14px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          color: HEX.neutral900,
          align: 'center',
          wordWrap: { width: zoneW - 12 },
        })
        .setOrigin(0.5)
        .setDepth(6);
      const hit = scene.add
        .rectangle(bx, zoneY, zoneW, 64, 0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(7);
      hit.on('pointerup', () => onCommit({ zone: key }));
      this.gameObjects.push(bg, hit);
    });
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.bar?.destroy();
    this.line?.destroy();
    this.bar = undefined;
    this.line = undefined;
  }
}
