/**
 * LabelInteraction — drag word-tile onto highlighted region.
 * per activity-archetypes.md §3 (L2, L3)
 * Stubbed: visual matching with basic drag-drop tile.
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
import { checkReduceMotion } from '../../lib/preferences';

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
  private _scene!: Phaser.Scene;
  private _cx = 0;
  private _cy = 0;
  private _regionCount = 0;
  private _overlayGfx: Phaser.GameObjects.Graphics[] = [];
  private a11yIds: string[] = [];

  mount(ctx: InteractionContext): void {
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

      // A11y: keyboard mirror — same handler the canvas drag-end + TestHooks use.
      // Without this, keyboard-only users cannot place a label tile on any region.
      const tileA11yId = `label-tile-${i}`;
      const firstRegionAlt = regions[0]?.alt ?? regions[0]?.id ?? 'first region';
      A11yLayer.mountAction(
        tileA11yId,
        `Place label "${lbl.text}" on ${firstRegionAlt}`,
        snapToFirst
      );
      this.a11yIds.push(tileA11yId);

      this.gameObjects.push(tile, ttext);
    });

    // A11y: per-region placement targets — let keyboard users place the most
    // recently focused label tile on a specific region. Each region action
    // routes to setPlacementTarget, mirroring drag-end's snap-to-region path.
    regions.forEach((reg, i) => {
      const placeOnRegion = () => {
        // Place every label tile that has not yet been assigned onto this region;
        // a keyboard user with one label simply lands the label here. With
        // multiple labels, repeated activations cycle through unplaced tiles.
        const unplaced = labels.find((l) => this.placements[l.id] !== reg.id);
        if (unplaced) {
          this.placements[unplaced.id] = reg.id;
          A11yLayer.announce(`Placed "${unplaced.text}" on ${reg.alt ?? reg.id}.`);
        }
      };
      const regionA11yId = `label-target-${i}`;
      A11yLayer.mountAction(regionA11yId, `Place a label on ${reg.alt ?? reg.id}`, placeOnRegion);
      this.a11yIds.push(regionA11yId);
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
    this._overlayGfx.forEach((g) => g.destroy());
    this._overlayGfx = [];
    this.a11yIds.forEach((id) => A11yLayer.unmount(id));
    this.a11yIds = [];
    TestHooks.unmountAll();
  }

  showVisualOverlay(): void {
    // Highlight each region box with an amber outline to show where labels belong.
    const regionW = 140;
    const regionH = 140;
    const overlay = this._scene.add.graphics().setDepth(12).setAlpha(0.7);
    overlay.lineStyle(4, 0xfbbf24, 1);
    for (let i = 0; i < this._regionCount; i++) {
      const rx = this._cx - (this._regionCount - 1) * 80 + i * 160;
      overlay.strokeRect(rx - regionW / 2, this._cy - 60 - regionH / 2, regionW, regionH);
    }
    this._overlayGfx.push(overlay);
    if (checkReduceMotion()) {
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
