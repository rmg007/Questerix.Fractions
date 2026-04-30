/**
 * OrderInteraction — draggable BarModel cards snapped into ordered slots.
 * per activity-archetypes.md §7 (L9)
 */

import * as Phaser from 'phaser';
import { BarModel } from './utils';
import type { Interaction, InteractionContext } from './types';
import {
  NAVY,
  OPTION_BORDER,
  SELECTED_BG,
  SKY_BG,
  TEXT_BODY,
  TEXT_ON_FILL,
} from '../utils/levelTheme';

interface FracDef {
  id: string;
  label: string;
  numerator: number;
  denominator: number;
}
interface OrderPayload {
  fractions?: FracDef[];
  fractionIds?: string[];
  labels?: string[];
  direction?: 'asc' | 'desc';
}

// Accepts "1/2", "frac:1/2". "frac:" is the curriculum reference prefix.
function parseFrac(s: string): { n: number; d: number } {
  const stripped = s.startsWith('frac:') ? s.slice(5) : s;
  const [n, d] = stripped.split('/').map(Number);
  return { n: n ?? 1, d: d ?? 1 };
}

export class OrderInteraction implements Interaction {
  readonly archetype = 'order' as const;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private bars: BarModel[] = [];
  private sequence: (string | null)[] = [];

  mount(ctx: InteractionContext): void {
    const { scene, template, centerX, centerY, width, onCommit } = ctx;
    const payload = template.payload as OrderPayload;

    const fracs: FracDef[] =
      payload.fractions ??
      (payload.fractionIds ?? []).map((id, i) => {
        const { n, d } = parseFrac(id);
        const lbl = payload.labels?.[i] ?? `${n}/${d}`;
        return { id, label: lbl, numerator: n, denominator: d };
      });

    const n = fracs.length || 1;
    this.sequence = new Array<string | null>(n).fill(null);

    const cardW = Math.min(120, (width - 80) / n - 12);
    const cardH = 44;
    const gap = 12;
    const totalW = n * (cardW + gap) - gap;
    const startX = centerX - totalW / 2;

    // Slot outlines (bottom lane)
    const slotY = centerY + 80;
    const slotRects: Phaser.GameObjects.Rectangle[] = [];
    for (let si = 0; si < n; si++) {
      const sx = startX + si * (cardW + gap) + cardW / 2;
      const slot = scene.add
        .rectangle(sx, slotY, cardW, cardH + 8, SKY_BG)
        .setStrokeStyle(2, OPTION_BORDER)
        .setDepth(4);
      scene.add
        .text(sx, slotY + cardH / 2 + 14, `${si + 1}`, {
          fontSize: '13px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          color: TEXT_BODY,
        })
        .setOrigin(0.5)
        .setDepth(5);
      slotRects.push(slot);
      this.gameObjects.push(slot);
    }

    // Source cards (top lane) — each has a mini BarModel + drag
    fracs.forEach((frac, i) => {
      const cx2 = startX + i * (cardW + gap) + cardW / 2;
      const cy2 = centerY - 80;

      const bar = new BarModel(scene, {
        x: cx2,
        y: cy2,
        width: cardW - 4,
        height: cardH - 4,
        numerator: frac.numerator,
        denominator: frac.denominator,
        label: frac.label,
        fillColor: NAVY,
      });
      this.bars.push(bar);

      // Invisible drag handle over the bar
      const handle = scene.add
        .rectangle(cx2, cy2, cardW, cardH + 8, 0, 0)
        .setInteractive({ draggable: true, useHandCursor: true })
        .setDepth(10);
      handle.setData('fracId', frac.id);
      handle.setData('barIdx', i);

      handle.on('dragstart', () => {
        ctx.pushEvent({
          type: 'pickUp',
          targetId: frac.id,
          timestamp: Date.now(),
        });
      });
      handle.on('drag', (_p: unknown, dx: number, dy: number) => {
        handle.setPosition(dx, dy);
      });

      handle.on('dragend', () => {
        let best = 0;
        let bestDist = Infinity;
        for (let si = 0; si < n; si++) {
          const sx = startX + si * (cardW + gap) + cardW / 2;
          const d = Math.hypot(handle.x - sx, handle.y - slotY);
          if (d < bestDist) {
            bestDist = d;
            best = si;
          }
        }
        this.sequence[best] = frac.id;
        handle.setPosition(startX + best * (cardW + gap) + cardW / 2, slotY);
        slotRects[best].setFillStyle(SELECTED_BG);

        ctx.pushEvent({
          type: 'place',
          targetId: frac.id,
          trayIndex: best,
          timestamp: Date.now(),
        });
      });

      this.gameObjects.push(handle);
    });

    // Submit button
    const sy = centerY + 200;
    const sbg = scene.add.rectangle(centerX, sy, 200, 52, NAVY).setDepth(7);
    const stxt = scene.add
      .text(centerX, sy, 'Check Order', {
        fontSize: '17px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: TEXT_ON_FILL,
      })
      .setOrigin(0.5)
      .setDepth(8);
    const shit = scene.add
      .rectangle(centerX, sy, 200, 52, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(9);
    shit.on('pointerup', () => onCommit({ sequence: this.sequence.filter(Boolean) }));
    this.gameObjects.push(sbg, stxt, shit);
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.bars.forEach((b) => b.destroy());
    this.bars = [];
    this.sequence = [];
  }
}
