/**
 * LabelInteraction — drag fraction-label tiles onto divided shape regions.
 * per activity-archetypes.md §3 (L2, L3)
 */

import * as Phaser from 'phaser';
import { A11yLayer } from '../../components/A11yLayer';
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
  /** labelId → regionId currently placed on it (the validator key). */
  private placements: Record<string, string> = {};
  private _scene!: Phaser.Scene;
  private _cx = 0;
  private _cy = 0;
  private _regionCount = 0;
  private _overlayGfx: Phaser.GameObjects.Graphics[] = [];

  mount(ctx: InteractionContext): void {
    A11yLayer.unmountAll();
    const { scene, template, centerX, centerY, onCommit } = ctx;
    const payload = template.payload as LabelPayload;
    const labels = payload.labels ?? [{ id: 'half', text: 'one half' }];
    const regions = payload.regions ?? [
      { id: 'r0', alt: 'left region' },
      { id: 'r1', alt: 'right region' },
    ];

    this._scene = scene;
    this._cx = centerX;
    this._cy = centerY;
    this._regionCount = regions.length;

    // Region geometry — pre-compute centers for snap distance checks below.
    const regionW = 140;
    const regionH = 140;
    const regionY = centerY - 60;
    const regionXs: number[] = regions.map(
      (_reg, i) => centerX - (regions.length - 1) * 80 + i * 160
    );

    regions.forEach((reg, i) => {
      const rx = regionXs[i]!;
      const box = scene.add.rectangle(rx, regionY, regionW, regionH, OPTION_BG).setDepth(5);
      box.setStrokeStyle(2, OPTION_BORDER);
      scene.add
        .text(rx, regionY, reg.alt ?? reg.id, {
          fontSize: '13px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          color: TEXT_BODY,
        })
        .setOrigin(0.5)
        .setDepth(6);
      // Drop-target placeholder — populated when a tile snaps in.
      const dropText = scene.add
        .text(rx, regionY, '', {
          fontSize: '20px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          color: NAVY_HEX,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(7)
        .setName(`drop-${reg.id}`);
      this.gameObjects.push(box, dropText);
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

      tile.on('drag', (_ptr: unknown, dx: number, dy: number) => {
        tile.setPosition(dx, dy);
        ttext.setPosition(dx, dy);
      });

      tile.on('dragend', () => {
        // Snap to nearest region by 2D distance, not just x — diagonals matter.
        let bestIdx = 0;
        let bestDist = Infinity;
        regionXs.forEach((rx, ri) => {
          const d = Math.hypot(tile.x - rx, tile.y - regionY);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = ri;
          }
        });
        const snappedRegionId = regions[bestIdx]!.id;
        this.placements[lbl.id] = snappedRegionId;

        // Snap visually + flag the active placement.
        tile.setPosition(regionXs[bestIdx]!, regionY);
        ttext.setPosition(regionXs[bestIdx]!, regionY);
        tile.setStrokeStyle(4, NAVY);

        // Show the label text inside the region's drop-target slot.
        const dropText = scene.children.getByName(
          `drop-${snappedRegionId}`
        ) as Phaser.GameObjects.Text | null;
        if (dropText) dropText.setText(lbl.text);
      });

      // TestHook: snap tile i to region (i % regionCount). Rotating across regions
      // gives multi-region tests meaningful coverage instead of always-region-0.
      const hookRegionIdx = i % regions.length;
      const hookRegionId = regions[hookRegionIdx]!.id;
      const snapForTest = () => {
        this.placements[lbl.id] = hookRegionId;
        tile.setPosition(regionXs[hookRegionIdx]!, regionY);
        ttext.setPosition(regionXs[hookRegionIdx]!, regionY);
        tile.setStrokeStyle(4, NAVY);
        const dropText = scene.children.getByName(
          `drop-${hookRegionId}`
        ) as Phaser.GameObjects.Text | null;
        if (dropText) dropText.setText(lbl.text);
      };

      TestHooks.mountInteractive(`label-tile-${i}`, snapForTest, {
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
    const hit = scene.add
      .rectangle(centerX, sy, 240, 52, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(9);

    const submit = () => {
      // Validator (`src/validators/label.ts`) keys on `studentMappings`.
      const studentMappings = Object.entries(this.placements).map(([labelId, regionId]) => ({
        labelId,
        regionId,
      }));
      onCommit({ studentMappings });
    };

    hit.on('pointerup', submit);

    A11yLayer.mountAction('a11y-label-submit', 'Submit label placements', submit);

    TestHooks.mountInteractive(`label-submit`, submit, {
      top: `${(sy / 1280) * 100}%`,
      left: `${(centerX / 800) * 100}%`,
      width: '240px',
      height: '52px',
    });

    this.gameObjects.push(sbg, slbl, hit);
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.placements = {};
    this._overlayGfx.forEach((g) => g.destroy());
    this._overlayGfx = [];
    TestHooks.unmountAll();
  }

  showVisualOverlay(): void {
    // Hint tier 2: amber outline around each region to guide placement.
    const regionW = 140;
    const regionH = 140;
    const overlay = this._scene.add.graphics().setDepth(12).setAlpha(0.7);
    overlay.lineStyle(4, 0xfbbf24, 1);
    for (let i = 0; i < this._regionCount; i++) {
      const rx = this._cx - (this._regionCount - 1) * 80 + i * 160;
      overlay.strokeRect(rx - regionW / 2, this._cy - 60 - regionH / 2, regionW, regionH);
    }
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
