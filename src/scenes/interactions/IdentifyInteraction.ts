/**
 * IdentifyInteraction — tap-to-select from N option cards.
 * per activity-archetypes.md §2, level-01.md §4.2
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from '../utils/colors';
import type { Interaction, InteractionContext } from './types';

interface IdentifyOption {
  shapeType?: string;
  partitionLines?: number[][][];
  highlightedRegions?: number[];
  alt?: string;
}

interface IdentifyPayload {
  options: IdentifyOption[];
  targetIndex: number;
}

export class IdentifyInteraction implements Interaction {
  readonly archetype = 'identify' as const;

  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private selectedIndex: number = -1;
  private submitBtn: Phaser.GameObjects.Rectangle | null = null;
  private submitLabel: Phaser.GameObjects.Text | null = null;

  mount(ctx: InteractionContext): void {
    const { scene, template, centerX, centerY, width, onCommit } = ctx;
    const payload = template.payload as IdentifyPayload;
    const options = payload.options ?? [];
    const count = options.length;
    const cardW = Math.min(180, (width - 80) / count);
    const cardH = 160;
    const spacing = 20;
    const totalW = count * cardW + (count - 1) * spacing;
    const startX = centerX - totalW / 2;
    const cardY = centerY - 60;

    options.forEach((opt, i) => {
      const x = startX + i * (cardW + spacing) + cardW / 2;
      const bg = scene.add.rectangle(x, cardY, cardW, cardH, CLR.neutral50).setDepth(5);
      bg.setStrokeStyle(2, CLR.neutral300);
      const label = scene.add
        .text(x, cardY, opt.alt ?? `Option ${i + 1}`, {
          fontSize: '14px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          color: HEX.neutral900,
          align: 'center',
          wordWrap: { width: cardW - 16 },
        })
        .setOrigin(0.5)
        .setDepth(6);

      const hit = scene.add
        .rectangle(x, cardY, cardW, cardH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(7);

      hit.on('pointerup', () => {
        // Deselect all
        this.gameObjects
          .filter(
            (o): o is Phaser.GameObjects.Rectangle =>
              o instanceof Phaser.GameObjects.Rectangle && o !== hit
          )
          .forEach((r) => r.setFillStyle(CLR.neutral50));
        bg.setFillStyle(CLR.primarySoft);
        this.selectedIndex = i;
        if (this.submitBtn) {
          this.submitBtn.setFillStyle(CLR.primary);
          this.submitLabel?.setColor(HEX.neutral0);
        }
      });

      this.gameObjects.push(bg, label, hit);
    });

    // Submit button
    const submitY = cardY + cardH / 2 + 60;
    const sbg = scene.add.rectangle(centerX, submitY, 280, 56, CLR.neutral100).setDepth(5);
    const slbl = scene.add
      .text(centerX, submitY, 'Check', {
        fontSize: '20px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: HEX.neutral600,
      })
      .setOrigin(0.5)
      .setDepth(6);
    const shit = scene.add
      .rectangle(centerX, submitY, 280, 56, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(7);
    shit.on('pointerup', () => {
      if (this.selectedIndex >= 0) {
        onCommit({ selectedIndex: this.selectedIndex });
      }
    });

    this.submitBtn = sbg;
    this.submitLabel = slbl;
    this.gameObjects.push(sbg, slbl, shit);
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.selectedIndex = -1;
    this.submitBtn = null;
    this.submitLabel = null;
  }
}
