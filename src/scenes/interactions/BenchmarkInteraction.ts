/**
 * BenchmarkInteraction — BarModel of target fraction + number line 0..1 + 3 tap zones.
 * per activity-archetypes.md §6 (L8)
 */

import * as Phaser from 'phaser';
import { BarModel, NumberLine } from './utils';
import type { Interaction, InteractionContext } from './types';
import { NAVY, OPTION_BG, OPTION_BORDER, TEXT_HEADING } from '../utils/levelTheme';

interface BenchmarkPayload {
  targetFracId?: string;
  fractionId?: string; // curriculum's canonical "frac:N/D" reference
  targetLabel?: string;
  numerator?: number;
  denominator?: number;
}

type Zone = 'zero' | 'half' | 'one';

// Accepts "1/4", "frac:1/4". "frac:" is the curriculum reference prefix.
function parseFrac(s?: string): { n: number; d: number } {
  if (!s) return { n: 1, d: 4 };
  const stripped = s.startsWith('frac:') ? s.slice(5) : s;
  const [n, d] = stripped.split('/').map(Number);
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
    const fracRef = payload.targetLabel ?? payload.targetFracId ?? payload.fractionId ?? '1/4';
    const frac =
      payload.numerator !== undefined
        ? { n: payload.numerator, d: payload.denominator ?? 1 }
        : parseFrac(fracRef);
    const label = fracRef.startsWith('frac:') ? fracRef.slice(5) : fracRef;

    // Target bar model at top
    this.bar = new BarModel(scene, {
      x: centerX,
      y: centerY - 160,
      width: 240,
      height: 48,
      numerator: frac.n,
      denominator: frac.d,
      label,
      fillColor: NAVY,
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
        .rectangle(bx, zoneY, zoneW, 64, OPTION_BG)
        .setStrokeStyle(2, OPTION_BORDER)
        .setDepth(5);
      scene.add
        .text(bx, zoneY, zl, {
          fontSize: '14px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          color: TEXT_HEADING,
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
