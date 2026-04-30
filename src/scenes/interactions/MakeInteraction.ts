/**
 * MakeInteraction — drag fold-line + tap to shade regions.
 * per activity-archetypes.md §4 (L4, L5)
 * Delegates partition visuals; adds shade-tap phase.
 */

import * as Phaser from 'phaser';
import { DragHandle } from '../../components/DragHandle';
import type { Interaction, InteractionContext } from './types';
import {
  ACCENT_C,
  NAVY,
  OPTION_BG,
  OPTION_BORDER,
  SELECTED_BG,
  TEXT_ON_FILL,
} from '../utils/levelTheme';

const SHAPE_W = 340;
const SHAPE_H = 260;
const SNAP_PCT = 0.05;

interface MakePayload {
  shapeType?: 'rectangle' | 'circle';
  targetPartitions?: number;
  targetNumerator?: number;
  snapMode?: 'axis' | 'free';
  areaTolerance?: number;
}

export class MakeInteraction implements Interaction {
  readonly archetype = 'make' as const;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private dragHandle!: DragHandle;
  private handlePos!: number;
  private partitionLine!: Phaser.GameObjects.Graphics;
  private shadedRegions: Set<number> = new Set();
  private regionRects: Phaser.GameObjects.Rectangle[] = [];
  private phase: 'partition' | 'shade' = 'partition';
  private _scene!: Phaser.Scene;
  private _cx = 0;
  private _cy = 0;
  private _overlayGfx: Phaser.GameObjects.Graphics[] = [];

  mount(ctx: InteractionContext): void {
    const { scene, template, centerX, centerY, onCommit } = ctx;
    const payload = template.payload as MakePayload;
    const shapeType = payload.shapeType ?? 'rectangle';
    const snapMode = payload.snapMode ?? 'axis';
    const targetNumerator = payload.targetNumerator ?? 1;
    const areaTolerance = payload.areaTolerance ?? 0.05;

    this._scene = scene;
    this._cx = centerX;
    this._cy = centerY;
    this.handlePos = centerX;
    this.phase = 'partition';
    this.shadedRegions = new Set();

    const shapeG = scene.add.graphics().setDepth(5);
    this.drawShape(shapeG, shapeType, centerX, centerY);
    this.gameObjects.push(shapeG);

    this.partitionLine = scene.add.graphics().setDepth(6);
    this.gameObjects.push(this.partitionLine);
    this.updateLine(centerX, centerY);

    const minX = centerX - SHAPE_W / 2;
    const maxX = centerX + SHAPE_W / 2;
    const snapTargets = snapMode === 'axis' ? [centerX] : [];

    this.dragHandle = new DragHandle({
      scene,
      x: centerX,
      y: centerY,
      trackLength: SHAPE_H + 40,
      axis: 'horizontal',
      minPos: minX,
      maxPos: maxX,
      snapThreshold: SHAPE_W * SNAP_PCT,
      snapTargets,
      onMove: (pos) => {
        this.handlePos = pos;
        this.updateLine(pos, centerY);
      },
      onCommit: (pos) => {
        this.handlePos = pos;
        this.updateLine(pos, centerY);
      },
    });

    // Confirm partition button
    const btnY = centerY + SHAPE_H / 2 + 60;
    const bbg = scene.add.rectangle(centerX, btnY, 240, 52, NAVY).setDepth(7);
    const blbl = scene.add
      .text(centerX, btnY, 'Confirm Fold', {
        fontSize: '18px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: TEXT_ON_FILL,
      })
      .setOrigin(0.5)
      .setDepth(8);
    const bhit = scene.add
      .rectangle(centerX, btnY, 240, 52, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(9);

    bhit.on('pointerup', () => {
      if (this.phase !== 'partition') return;
      this.phase = 'shade';
      blbl.setText(`Tap ${targetNumerator} region(s) to shade`);
      // Create tappable regions
      const left = scene.add
        .rectangle((minX + this.handlePos) / 2, centerY, this.handlePos - minX, SHAPE_H, 0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(10);
      const right = scene.add
        .rectangle((this.handlePos + maxX) / 2, centerY, maxX - this.handlePos, SHAPE_H, 0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(10);

      [left, right].forEach((r, i) => {
        r.on('pointerup', () => {
          if (this.shadedRegions.has(i)) {
            this.shadedRegions.delete(i);
            r.setFillStyle(0, 0);
          } else {
            this.shadedRegions.add(i);
            r.setFillStyle(SELECTED_BG, 0.6);
          }
        });
        this.regionRects.push(r);
        this.gameObjects.push(r);
      });
    });

    // Submit
    const sy = btnY + 70;
    const sbg = scene.add.rectangle(centerX, sy, 240, 52, ACCENT_C).setDepth(7);
    scene.add
      .text(centerX, sy, 'Check', {
        fontSize: '18px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: TEXT_ON_FILL,
      })
      .setOrigin(0.5)
      .setDepth(8);
    const shit = scene.add
      .rectangle(centerX, sy, 240, 52, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(9);
    shit.on('pointerup', () => {
      const leftArea = this.handlePos - minX;
      const rightArea = maxX - this.handlePos;
      onCommit({
        regionAreas: [leftArea, rightArea],
        shadedRegionIds: [...this.shadedRegions].map(String),
        areaTolerance,
        targetNumerator,
      });
    });

    this.gameObjects.push(bbg, blbl, bhit, sbg, shit);
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.regionRects = [];
    (this.dragHandle as DragHandle | undefined)?.destroy();
    this._overlayGfx.forEach((g) => g.destroy());
    this._overlayGfx = [];
  }

  showVisualOverlay(): void {
    // Draw a faint amber reference line at the centre of the shape showing
    // where a halves fold would land — a structural cue, not the worked example.
    const overlay = this._scene.add.graphics().setDepth(12).setAlpha(0.5);
    overlay.lineStyle(3, 0xfbbf24, 1);
    overlay.lineBetween(this._cx, this._cy - SHAPE_H / 2 - 20, this._cx, this._cy + SHAPE_H / 2 + 20);
    this._overlayGfx.push(overlay);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this._scene.time.delayedCall(3000, () => { overlay.destroy(); });
    } else {
      this._scene.time.delayedCall(3000, () => {
        this._scene.tweens.add({ targets: overlay, alpha: 0, duration: 400, onComplete: () => overlay.destroy() });
      });
    }
  }

  private drawShape(
    g: Phaser.GameObjects.Graphics,
    shapeType: string,
    cx: number,
    cy: number
  ): void {
    g.fillStyle(OPTION_BG, 1);
    if (shapeType === 'circle') {
      g.fillCircle(cx, cy, SHAPE_W / 2);
      g.lineStyle(3, OPTION_BORDER, 1);
      g.strokeCircle(cx, cy, SHAPE_W / 2);
    } else {
      g.fillRect(cx - SHAPE_W / 2, cy - SHAPE_H / 2, SHAPE_W, SHAPE_H);
      g.lineStyle(3, OPTION_BORDER, 1);
      g.strokeRect(cx - SHAPE_W / 2, cy - SHAPE_H / 2, SHAPE_W, SHAPE_H);
    }
  }

  private updateLine(x: number, cy: number): void {
    this.partitionLine.clear();
    this.partitionLine.lineStyle(4, NAVY, 1);
    this.partitionLine.lineBetween(x, cy - SHAPE_H / 2 - 20, x, cy + SHAPE_H / 2 + 20);
  }
}
