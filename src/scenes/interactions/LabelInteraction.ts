/**
 * LabelInteraction — drag word-tile onto highlighted region.
 * per activity-archetypes.md §3 (L2, L3)
 * Stubbed: visual matching with basic drag-drop tile.
 */

import * as Phaser from 'phaser';
import { TestHooks } from '../utils/TestHooks';
import type { Interaction, InteractionContext } from './types';
import {
  NAVY,
  NAVY_HEX,
  OPTION_BG,
  OPTION_BORDER,
  SELECTED_BG,
  TEXT_BODY,
  TEXT_ON_FILL,
} from '../utils/levelTheme';

interface LabelOption {
  id: string;
  text: string;
}
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
    const regions = payload.regions ?? [
      { id: 'r0', alt: 'left region' },
      { id: 'r1', alt: 'right region' },
    ];

    // Draw region boxes
    const regionW = 140;
    const regionH = 140;
    regions.forEach((reg, i) => {
      const x = centerX - (regions.length - 1) * 80 + i * 160;
      const box = scene.add.rectangle(x, centerY - 60, regionW, regionH, OPTION_BG).setDepth(5);
      box.setStrokeStyle(2, OPTION_BORDER);
      scene.add
        .text(x, centerY - 60, reg.alt ?? reg.id, {
          fontSize: '13px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          color: TEXT_BODY,
        })
        .setOrigin(0.5)
        .setDepth(6);
      this.gameObjects.push(box);
    });

    // Label tiles
    labels.forEach((lbl, i) => {
      const tx = centerX - (labels.length - 1) * 70 + i * 140;
      const ty = centerY + 140;
      const tile = scene.add
        .rectangle(tx, ty, 120, 48, SELECTED_BG)
        .setDepth(7)
        .setInteractive({ draggable: true, useHandCursor: true });
      const ttext = scene.add
        .text(tx, ty, lbl.text, {
          fontSize: '16px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          color: NAVY_HEX,
        })
        .setOrigin(0.5)
        .setDepth(8);

      const snapToFirst = () => {
        // Mock drag-drop by snapping to first region for e2e simplicity
        const firstRegionId = regions[0]!.id;
        this.placements[lbl.id] = firstRegionId;
        tile.setStrokeStyle(4, NAVY);
      };

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

      TestHooks.mountInteractive(`label-tile-${i}`, snapToFirst, {
        top: `${(ty / 1280) * 100}%`,
        left: `${(tx / 800) * 100}%`,
        width: '120px',
        height: '48px',
      });

      this.gameObjects.push(tile, ttext);
    });

    // Submit button
    const sy = centerY + 240;
    const sbg = scene.add.rectangle(centerX, sy, 240, 52, NAVY).setDepth(7);
    const slbl = scene.add
      .text(centerX, sy, 'Check', {
        fontSize: '20px',
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

    const submit = () => {
      const mappings = Object.entries(this.placements).map(([labelId, regionId]) => ({
        labelId,
        regionId,
      }));
      onCommit({ mappings });
    };

    shit.on('pointerup', submit);

    TestHooks.mountInteractive(`label-submit`, submit, {
      top: `${(sy / 1280) * 100}%`,
      left: `${(centerX / 800) * 100}%`,
      width: '240px',
      height: '52px',
    });

    this.gameObjects.push(sbg, slbl, shit);
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.placements = {};
    TestHooks.unmountAll();
  }
}
