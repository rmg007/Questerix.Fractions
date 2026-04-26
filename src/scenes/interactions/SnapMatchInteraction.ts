/**
 * SnapMatchInteraction — pair-matching grid: left text cards ↔ right BarModels.
 * Connector lines drawn with Graphics after each match.
 * per activity-archetypes.md §8 (L2, L3)
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from '../utils/colors';
import { BarModel } from './utils';
import type { Interaction, InteractionContext } from './types';

interface MatchItem {
  id: string;
  label: string;
  numerator?: number;
  denominator?: number;
}
interface SnapMatchPayload {
  leftItems?: MatchItem[];
  rightItems?: MatchItem[];
  expectedPairs?: [string, string][];
}

function parseFrac(s: string): { n: number; d: number } {
  const [n, d] = s.split('/').map(Number);
  return { n: isNaN(n) ? 1 : n, d: isNaN(d) ? 1 : d };
}

export class SnapMatchInteraction implements Interaction {
  readonly archetype = 'snap_match' as const;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private bars: BarModel[] = [];
  private lines: Phaser.GameObjects.Graphics[] = [];
  private pairs: Array<[string, string]> = [];
  private rightPositions: Map<string, { x: number; y: number }> = new Map();

  mount(ctx: InteractionContext): void {
    const { scene, template, centerX, centerY, onCommit } = ctx;
    const payload = template.payload as SnapMatchPayload;
    const left = payload.leftItems ?? [];
    const right = payload.rightItems ?? [];

    const rows = Math.max(left.length, right.length, 1);
    const rowH = 72;
    const startY = centerY - ((rows - 1) * rowH) / 2;
    const colLeft = centerX - 200;
    const colRight = centerX + 130;
    const barW = 140;
    const barH = 36;

    // Right column — BarModels
    right.forEach((item, i) => {
      const ry = startY + i * rowH;
      const { n, d } =
        item.numerator !== undefined
          ? { n: item.numerator, d: item.denominator ?? 1 }
          : parseFrac(item.label);
      const bar = new BarModel(scene, {
        x: colRight + barW / 2,
        y: ry,
        width: barW,
        height: barH,
        numerator: n,
        denominator: d,
        fillColor: CLR.accentC,
      });
      this.bars.push(bar);
      this.rightPositions.set(item.id, { x: colRight + barW / 2, y: ry });

      // Right slot outline (behind bar)
      const slotBox = scene.add
        .rectangle(colRight + barW / 2, ry, barW + 8, barH + 8, CLR.neutral50)
        .setStrokeStyle(2, CLR.neutral300)
        .setDepth(4);
      this.gameObjects.push(slotBox);
    });

    // Left column — draggable text cards
    left.forEach((item, i) => {
      const ly = startY + i * rowH;
      const card = scene.add
        .rectangle(colLeft, ly, 120, 48, CLR.primarySoft)
        .setStrokeStyle(2, CLR.primary)
        .setDepth(7)
        .setInteractive({ draggable: true, useHandCursor: true });
      const txt = scene.add
        .text(colLeft, ly, item.label, {
          fontSize: '18px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          fontStyle: 'bold',
          color: HEX.primary,
        })
        .setOrigin(0.5)
        .setDepth(8);
      card.setData('id', item.id);
      card.setData('originX', colLeft);
      card.setData('originY', ly);

      card.on('drag', (_p: unknown, dx: number, dy: number) => {
        card.setPosition(dx, dy);
        txt.setPosition(dx, dy);
      });

      card.on('dragend', () => {
        // Snap to nearest right item
        let bestId = right[0]?.id ?? '';
        let bestDist = Infinity;
        this.rightPositions.forEach(({ x, y }, id) => {
          const d = Math.hypot(card.x - x, card.y - y);
          if (d < bestDist) {
            bestDist = d;
            bestId = id;
          }
        });

        if (bestDist <= 80 && bestId) {
          const rpos = this.rightPositions.get(bestId)!;
          card.setPosition(rpos.x - barW - 20, rpos.y);
          txt.setPosition(rpos.x - barW - 20, rpos.y);
          this.pairs.push([item.id, bestId]);
          // Draw connection line
          const lineG = scene.add.graphics().setDepth(6);
          lineG.lineStyle(2, CLR.success, 1);
          lineG.lineBetween(rpos.x - barW - 20 + 60, rpos.y, rpos.x - barW / 2, rpos.y);
          this.lines.push(lineG);
        } else {
          card.setPosition(card.getData('originX') as number, card.getData('originY') as number);
          txt.setPosition(card.getData('originX') as number, card.getData('originY') as number);
        }
      });

      this.gameObjects.push(card, txt);
    });

    // Submit
    const sy = startY + rows * rowH + 32;
    const sbg = scene.add.rectangle(centerX, sy, 200, 52, CLR.primary).setDepth(7);
    const stxt = scene.add
      .text(centerX, sy, 'Check', {
        fontSize: '18px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: HEX.neutral0,
      })
      .setOrigin(0.5)
      .setDepth(8);
    const shit = scene.add
      .rectangle(centerX, sy, 200, 52, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(9);
    shit.on('pointerup', () => onCommit({ pairs: this.pairs }));
    this.gameObjects.push(sbg, stxt, shit);
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.bars.forEach((b) => b.destroy());
    this.bars = [];
    this.lines.forEach((l) => l.destroy());
    this.lines = [];
    this.pairs = [];
    this.rightPositions.clear();
  }
}
