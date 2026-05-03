/**
 * SnapMatchInteraction — pair-matching grid: left text cards ↔ right BarModels.
 * Connector lines drawn with Graphics after each match.
 * per activity-archetypes.md §8 (L2, L3)
 */

import * as Phaser from 'phaser';
import { A11yLayer } from '../../components/A11yLayer';
import { BarModel } from './utils';
import type { Interaction, InteractionContext } from './types';
import {
  ACCENT_C,
  CHOICE_YES,
  NAVY,
  NAVY_HEX,
  OPTION_BG,
  OPTION_BORDER,
  SELECTED_BG,
  TEXT_ON_FILL,
} from '../utils/levelTheme';

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
  const parts = s.split('/').map(Number);
  const n = parts[0] ?? NaN;
  const d = parts[1] ?? NaN;
  return { n: isNaN(n) ? 1 : n, d: isNaN(d) ? 1 : d };
}

export class SnapMatchInteraction implements Interaction {
  readonly archetype = 'snap_match' as const;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private bars: BarModel[] = [];
  private lines: Phaser.GameObjects.Graphics[] = [];
  private pairs: Array<[string, string]> = [];
  private rightPositions: Map<string, { x: number; y: number }> = new Map();
  private _scene!: Phaser.Scene;
  private _colLeft = 0;
  private _colRight = 0;
  private _rows = 0;
  private _startY = 0;
  private _rowH = 0;
  private _overlayGfx: Phaser.GameObjects.Graphics[] = [];

  mount(ctx: InteractionContext): void {
    A11yLayer.unmountAll();
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

    this._scene = scene;
    this._colLeft = colLeft;
    this._colRight = colRight;
    this._rows = rows;
    this._startY = startY;
    this._rowH = rowH;

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
        fillColor: ACCENT_C,
      });
      this.bars.push(bar);
      this.rightPositions.set(item.id, { x: colRight + barW / 2, y: ry });

      // Right slot outline (behind bar)
      const slotBox = scene.add
        .rectangle(colRight + barW / 2, ry, barW + 8, barH + 8, OPTION_BG)
        .setStrokeStyle(2, OPTION_BORDER)
        .setDepth(4);
      this.gameObjects.push(slotBox);
    });

    // Left column — draggable text cards
    left.forEach((item, i) => {
      const ly = startY + i * rowH;
      const card = scene.add
        .rectangle(colLeft, ly, 120, 48, SELECTED_BG)
        .setStrokeStyle(2, NAVY)
        .setDepth(7)
        .setInteractive({ draggable: true, useHandCursor: true });
      const txt = scene.add
        .text(colLeft, ly, item.label, {
          fontSize: '18px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          fontStyle: 'bold',
          color: NAVY_HEX,
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
          lineG.lineStyle(2, CHOICE_YES, 1);
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
    const sbg = scene.add.rectangle(centerX, sy, 200, 52, NAVY).setDepth(7);
    const stxt = scene.add
      .text(centerX, sy, 'Check', {
        fontSize: '18px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: TEXT_ON_FILL,
      })
      .setOrigin(0.5)
      .setDepth(8);
    const hit = scene.add
      .rectangle(centerX, sy, 200, 52, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(9);
    const submitSnapMatch = () => onCommit({ pairs: this.pairs });
    hit.on('pointerup', submitSnapMatch);
    A11yLayer.mountAction('a11y-snapmatch-submit', 'Submit pair matches', submitSnapMatch);
    this.gameObjects.push(sbg, stxt, hit);
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
    this._overlayGfx.forEach((g) => g.destroy());
    this._overlayGfx = [];
  }

  showVisualOverlay(): void {
    // Draw a faint amber arrow from the left card column toward the right bar
    // column at the vertical midpoint, showing students the matching direction.
    const midY = this._startY + ((this._rows - 1) / 2) * this._rowH;
    const arrowStart = this._colLeft + 65;
    const arrowEnd = this._colRight - 15;

    const overlay = this._scene.add.graphics().setDepth(12).setAlpha(0.65);
    overlay.lineStyle(3, 0xfbbf24, 1);
    overlay.lineBetween(arrowStart, midY, arrowEnd, midY);
    overlay.lineBetween(arrowEnd, midY, arrowEnd - 10, midY - 7);
    overlay.lineBetween(arrowEnd, midY, arrowEnd - 10, midY + 7);

    this._overlayGfx.push(overlay);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this._scene.time.delayedCall(3000, () => {
        overlay.destroy();
      });
    } else {
      this._scene.time.delayedCall(3000, () => {
        this._scene.tweens.add({
          targets: overlay,
          alpha: 0,
          duration: 400,
          onComplete: () => overlay.destroy(),
        });
      });
    }
  }
}
