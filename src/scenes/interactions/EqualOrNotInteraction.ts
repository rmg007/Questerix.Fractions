/**
 * EqualOrNotInteraction — binary tap judgment: equal parts or not?
 * per activity-archetypes.md §9, level-01.md §4.1
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from '../utils/colors';
import type { Interaction, InteractionContext } from './types';

export class EqualOrNotInteraction implements Interaction {
  readonly archetype = 'equal_or_not' as const;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];

  mount(ctx: InteractionContext): void {
    const { scene, centerX, centerY, width, onCommit } = ctx;
    const btnW = Math.min(240, width / 3);
    const btnH = 88;
    const gap = 24;
    const y = centerY + 240;

    // Shape display — simple visual placeholder
    const shapeG = scene.add.graphics().setDepth(5);
    shapeG.fillStyle(CLR.neutral50, 1);
    shapeG.fillRect(centerX - 170, centerY - 130, 340, 260);
    shapeG.lineStyle(3, CLR.neutral300, 1);
    shapeG.strokeRect(centerX - 170, centerY - 130, 340, 260);
    // Draw the partition lines from payload
    const payload = ctx.template.payload as { partitionLines?: number[][][]; rotation?: number };
    (payload.partitionLines ?? []).forEach((line) => {
      if (line.length >= 2) {
        const x1 = centerX - 170 + line[0]![0]! * 340;
        const y1 = centerY - 130 + line[0]![1]! * 260;
        const x2 = centerX - 170 + line[1]![0]! * 340;
        const y2 = centerY - 130 + line[1]![1]! * 260;
        shapeG.lineStyle(3, CLR.primary, 1);
        shapeG.lineBetween(x1, y1, x2, y2);
      }
    });
    this.gameObjects.push(shapeG);

    const makeBtn = (x: number, label: string, answer: boolean, color: number) => {
      const bg = scene.add.rectangle(x, y, btnW, btnH, color).setDepth(5);
      const lbl = scene.add
        .text(x, y, label, {
          fontSize: '22px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          fontStyle: 'bold',
          color: HEX.neutral0,
        })
        .setOrigin(0.5)
        .setDepth(6);
      const hit = scene.add
        .rectangle(x, y, btnW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(7);
      hit.on('pointerup', () => onCommit({ answer }));
      this.gameObjects.push(bg, lbl, hit);
    };

    makeBtn(centerX - btnW / 2 - gap / 2, '✓ Equal', true, CLR.success);
    makeBtn(centerX + btnW / 2 + gap / 2, '✗ Not equal', false, CLR.error);
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
  }
}
