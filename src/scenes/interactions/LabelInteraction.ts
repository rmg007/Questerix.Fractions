/**
 * LabelInteraction — drag word-tile onto highlighted region.
 * per activity-archetypes.md §3 (L2, L3)
 * Stubbed: visual matching with basic drag-drop tile.
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from '../utils/colors';
import type { Interaction, InteractionContext } from './types';

interface LabelOption { id: string; text: string }
interface LabelPayload {
  labels?: LabelOption[];
  expectedLabelForRegion?: Record<string, string>;
  regions?: Array<{ id: string; alt?: string }>;
}

export class LabelInteraction implements Interaction {
  readonly archetype = 'label' as const;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private placements: Record<string, string> = {};

  mount(ctx: InteractionContext): void {
    const { scene, template, centerX, centerY, onCommit } = ctx;
    const payload = template.payload as LabelPayload;
    const labels = payload.labels ?? [{ id: 'half', text: 'one half' }];
    const regions = payload.regions ?? [{ id: 'r0', alt: 'left region' }, { id: 'r1', alt: 'right region' }];

    // Draw region boxes
    const regionW = 140;
    const regionH = 140;
    regions.forEach((reg, i) => {
      const x = centerX - (regions.length - 1) * 80 + i * 160;
      const box = scene.add.rectangle(x, centerY - 60, regionW, regionH, CLR.neutral50).setDepth(5);
      box.setStrokeStyle(2, CLR.neutral300);
      scene.add.text(x, centerY - 60, reg.alt ?? reg.id, {
        fontSize: '13px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        color: HEX.neutral600,
      }).setOrigin(0.5).setDepth(6);
      this.gameObjects.push(box);
    });

    // Label tiles
    labels.forEach((lbl, i) => {
      const tx = centerX - (labels.length - 1) * 70 + i * 140;
      const ty = centerY + 140;
      const tile = scene.add.rectangle(tx, ty, 120, 48, CLR.primarySoft).setDepth(7)
        .setInteractive({ draggable: true, useHandCursor: true });
      const ttext = scene.add.text(tx, ty, lbl.text, {
        fontSize: '16px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        color: HEX.primary,
      }).setOrigin(0.5).setDepth(8);

      tile.on('drag', (_ptr: unknown, dx: number, dy: number) => {
        tile.setPosition(dx, dy);
        ttext.setPosition(dx, dy);
      });

      tile.on('dragend', () => {
        // Simple: snap to nearest region
        const nearestIdx = regions.reduce((best, _reg, ri) => {
          const rx = centerX - (regions.length - 1) * 80 + ri * 160;
          const dist = Math.abs(tile.x - rx);
          const bdist = Math.abs(tile.x - (centerX - (regions.length - 1) * 80 + best * 160));
          return dist < bdist ? ri : best;
        }, 0);
        this.placements[lbl.id] = regions[nearestIdx]!.id;
      });

      this.gameObjects.push(tile, ttext);
    });

    // Submit button
    const sy = centerY + 240;
    const sbg = scene.add.rectangle(centerX, sy, 240, 52, CLR.primary).setDepth(7);
    const slbl = scene.add.text(centerX, sy, 'Check', {
      fontSize: '20px', fontFamily: '"Nunito", system-ui, sans-serif',
      fontStyle: 'bold', color: HEX.neutral0,
    }).setOrigin(0.5).setDepth(8);
    const shit = scene.add.rectangle(centerX, sy, 240, 52, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(9);
    shit.on('pointerup', () => {
      const mappings = Object.entries(this.placements).map(([labelId, regionId]) => ({ labelId, regionId }));
      onCommit({ mappings });
    });
    this.gameObjects.push(sbg, slbl, shit);
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.placements = {};
  }
}
