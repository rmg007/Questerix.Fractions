/**
 * IdentifyInteraction — tap-to-select from N option cards.
 * per activity-archetypes.md §2, level-01.md §4.2
 */

import * as Phaser from 'phaser';
import { TestHooks } from '../utils/TestHooks';
import type { Interaction, InteractionContext } from './types';
import { checkReduceMotion } from '../../lib/preferences';
import {
  BODY_FONT,
  createActionButton,
  OPTION_BG,
  OPTION_BORDER,
  SELECTED_BG,
  SELECTED_BORDER,
  TEXT_HEADING,
} from '../utils/levelTheme';

interface IdentifyOption {
  shapeType?: string;
  partitionLines?: number[][][];
  highlightedRegions?: number[];
  alt?: string;
}

interface IdentifyPayload {
  // Modern shape (per archetype spec)
  options?: IdentifyOption[];
  targetIndex: number;
  // Curriculum shape (q:id:L*:* templates) — fractionId is the correct
  // answer; distractors are the others. Order is interleaved at targetIndex.
  fractionId?: string;
  distractors?: string[];
}

function fracLabel(ref: string): string {
  return ref.startsWith('frac:') ? ref.slice(5) : ref;
}

function optionsFromCurriculum(p: IdentifyPayload): IdentifyOption[] {
  if (!p.fractionId || !p.distractors) return [];
  const target = p.targetIndex ?? 0;
  const out: IdentifyOption[] = p.distractors.map((d) => ({ alt: fracLabel(d) }));
  out.splice(target, 0, { alt: fracLabel(p.fractionId) });
  return out;
}

export class IdentifyInteraction implements Interaction {
  readonly archetype = 'identify' as const;

  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private selectedIndex: number = -1;
  private submitContainer: Phaser.GameObjects.Container | null = null;
  private optionBackgrounds: Phaser.GameObjects.Rectangle[] = [];

  mount(ctx: InteractionContext): void {
    const { scene, template, centerX, centerY, width, onCommit } = ctx;
    const payload = template.payload as IdentifyPayload;
    const options = payload.options ?? optionsFromCurriculum(payload);
    const count = options.length;
    const cardW = Math.min(180, (width - 80) / count);
    const cardH = 160;
    const spacing = 20;
    const totalW = count * cardW + (count - 1) * spacing;
    const startX = centerX - totalW / 2;
    const cardY = centerY - 60;

    this.optionBackgrounds = [];
    options.forEach((opt, i) => {
      const x = startX + i * (cardW + spacing) + cardW / 2;
      const bg = scene.add.rectangle(x, cardY, cardW, cardH, OPTION_BG).setDepth(5);
      bg.setStrokeStyle(2, OPTION_BORDER);
      this.optionBackgrounds.push(bg);

      // Render partition lines and highlighted regions if available
      if (opt.partitionLines && opt.highlightedRegions !== undefined) {
        const shapeW = cardW - 16;
        const shapeH = cardH - 32;
        const shapeX = x - shapeW / 2;
        const shapeY = cardY - shapeH / 2;

        // Draw shape background (white rectangle)
        const shapeRect = scene.add.rectangle(x, cardY - 10, shapeW, shapeH, 0xffffff).setDepth(5);

        // Draw partition lines
        const lineG = scene.add.graphics().setDepth(5);
        lineG.lineStyle(2, 0x1e3a8a, 1);
        opt.partitionLines.forEach((line) => {
          if (line.length >= 2) {
            const x1 = shapeX + line[0]![0]! * shapeW;
            const y1 = shapeY + line[0]![1]! * shapeH;
            const x2 = shapeX + line[1]![0]! * shapeW;
            const y2 = shapeY + line[1]![1]! * shapeH;
            lineG.lineBetween(x1, y1, x2, y2);
          }
        });

        // Highlight selected regions
        const fillG = scene.add.graphics().setDepth(4);
        fillG.fillStyle(0xfbbf24, 0.5);
        const numParts = Math.max(...opt.partitionLines.map(() => 1), 1) + 1;
        const partW = shapeW / numParts;

        opt.highlightedRegions.forEach((regionIdx) => {
          const rx = shapeX + regionIdx * partW;
          fillG.fillRect(rx, shapeY, partW, shapeH);
        });

        this.gameObjects.push(shapeRect, lineG, fillG);
      } else {
        // Fallback to text label if no shape data
        const label = scene.add
          .text(x, cardY, opt.alt ?? `Option ${i + 1}`, {
            fontSize: '14px',
            fontFamily: BODY_FONT,
            color: TEXT_HEADING,
            align: 'center',
            wordWrap: { width: cardW - 16 },
          })
          .setOrigin(0.5)
          .setDepth(6);
        this.gameObjects.push(label);
      }

      const hit = scene.add
        .rectangle(x, cardY, cardW, cardH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(7);

      const select = () => {
        // Deselect all
        this.optionBackgrounds.forEach((otherBg, idx) => {
          if (idx !== i) {
            otherBg.setFillStyle(OPTION_BG);
            otherBg.setStrokeStyle(2, OPTION_BORDER);
            scene.tweens.add({
              targets: otherBg,
              scaleX: 1.0,
              scaleY: 1.0,
              duration: 80,
            });
          }
        });

        // Select this one
        bg.setFillStyle(SELECTED_BG);
        bg.setStrokeStyle(3, SELECTED_BORDER);
        scene.tweens.add({
          targets: bg,
          scaleX: 1.06,
          scaleY: 1.06,
          duration: 100,
          ease: 'Power1',
        });

        this.selectedIndex = i;
        this.submitContainer?.setAlpha(1);
      };

      hit.on('pointerup', select);

      TestHooks.mountInteractive(`identify-option-${i}`, select, {
        top: `${(cardY / 1280) * 100}%`,
        left: `${(x / 800) * 100}%`,
        width: `${cardW}px`,
        height: `${cardH}px`,
      });

      this.gameObjects.push(bg, hit);
    });

    // Submit button
    const submitY = cardY + cardH / 2 + 60;
    const submit = () => {
      if (this.selectedIndex >= 0) {
        onCommit({ selectedIndex: this.selectedIndex });
      } else if (!checkReduceMotion()) {
        // Shake the submit button to indicate selection is required
        scene.tweens.add({
          targets: this.submitContainer,
          x: this.submitContainer!.x - 8,
          duration: 50,
          yoyo: true,
          repeat: 2,
        });
      }
    };

    this.submitContainer = createActionButton(scene, centerX, submitY, 'Check ✓', submit, 8);
    this.submitContainer.setAlpha(0.4);

    TestHooks.mountInteractive(`identify-submit`, submit, {
      top: `${(submitY / 1280) * 100}%`,
      left: `${(centerX / 800) * 100}%`,
      width: '320px',
      height: '64px',
    });

    this.gameObjects.push(this.submitContainer);
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.selectedIndex = -1;
    this.submitContainer = null;
    this.optionBackgrounds = [];
    TestHooks.unmountAll(); // Interaction owns its ephemeral hooks
  }
}
