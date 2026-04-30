/**
 * EqualOrNotInteraction — binary tap judgment: equal parts or not?
 * per activity-archetypes.md §9, level-01.md §4.1
 */

import * as Phaser from 'phaser';
import { TestHooks } from '../utils/TestHooks';
import type { Interaction, InteractionContext } from './types';
import {
  CHOICE_NO,
  CHOICE_YES,
  NAVY,
  OPTION_BG,
  OPTION_BORDER,
  TEXT_ON_FILL,
} from '../utils/levelTheme';

export class EqualOrNotInteraction implements Interaction {
  readonly archetype = 'equal_or_not' as const;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private _scene!: Phaser.Scene;
  private _cx = 0;
  private _cy = 0;
  private _overlayGfx: Phaser.GameObjects.Graphics[] = [];

  mount(ctx: InteractionContext): void {
    const { scene, centerX, centerY, width, onCommit } = ctx;
    this._scene = scene;
    this._cx = centerX;
    this._cy = centerY;
    const btnW = Math.min(240, width / 3);
    const btnH = 88;
    const gap = 24;
    const y = centerY + 240;

    // Shape display — simple visual placeholder
    const shapeG = scene.add.graphics().setDepth(5);
    shapeG.fillStyle(OPTION_BG, 1);
    shapeG.fillRect(centerX - 170, centerY - 130, 340, 260);
    shapeG.lineStyle(3, OPTION_BORDER, 1);
    shapeG.strokeRect(centerX - 170, centerY - 130, 340, 260);
    // Draw the partition lines from payload
    const payload = ctx.template.payload as { partitionLines?: number[][][]; rotation?: number };
    (payload.partitionLines ?? []).forEach((line) => {
      if (line.length >= 2) {
        const x1 = centerX - 170 + line[0]![0]! * 340;
        const y1 = centerY - 130 + line[0]![1]! * 260;
        const x2 = centerX - 170 + line[1]![0]! * 340;
        const y2 = centerY - 130 + line[1]![1]! * 260;
        shapeG.lineStyle(3, NAVY, 1);
        shapeG.lineBetween(x1, y1, x2, y2);
      }
    });
    this.gameObjects.push(shapeG);

    const makeBtn = (x: number, label: string, answer: boolean, color: number, testid: string) => {
      const bg = scene.add.rectangle(x, y, btnW, btnH, color).setDepth(5);
      const lbl = scene.add
        .text(x, y, label, {
          fontSize: '22px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          fontStyle: 'bold',
          color: TEXT_ON_FILL,
        })
        .setOrigin(0.5)
        .setDepth(6);
      const hit = scene.add
        .rectangle(x, y, btnW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(7);
      const submit = () => onCommit({ answer });
      hit.on('pointerup', submit);
      TestHooks.mountInteractive(testid, submit, {
        top: `${(y / 1280) * 100}%`,
        left: `${(x / 800) * 100}%`,
        width: `${btnW}px`,
        height: `${btnH}px`,
      });
      this.gameObjects.push(bg, lbl, hit);
    };

    makeBtn(centerX - btnW / 2 - gap / 2, '✓ Equal', true, CHOICE_YES, 'equal-btn');
    makeBtn(centerX + btnW / 2 + gap / 2, '✗ Not equal', false, CHOICE_NO, 'not-equal-btn');
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this._overlayGfx.forEach((g) => g.destroy());
    this._overlayGfx = [];
    import('../utils/TestHooks').then(({ TestHooks }) => TestHooks.unmountAll());
  }

  showVisualOverlay(): void {
    // Draw a faint amber crosshair at the centre of the shape so students can
    // visually measure whether the partitioned sections are equal in size.
    const overlay = this._scene.add.graphics().setDepth(12).setAlpha(0.45);
    overlay.lineStyle(2, 0xfbbf24, 1);
    const shapeX = this._cx - 170;
    const shapeY = this._cy - 130;
    overlay.lineBetween(shapeX + 170, shapeY, shapeX + 170, shapeY + 260);
    overlay.lineBetween(shapeX, shapeY + 130, shapeX + 340, shapeY + 130);

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
