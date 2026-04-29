/**
 * IdentifyInteraction — tap-to-select from N option cards.
 * per activity-archetypes.md §2, level-01.md §4.2
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from '../utils/colors';
import { TestHooks } from '../utils/TestHooks';
import type { Interaction, InteractionContext } from './types';

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
  private submitBtn: Phaser.GameObjects.Rectangle | null = null;
  private submitLabel: Phaser.GameObjects.Text | null = null;

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

      const select = () => {
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
      };

      hit.on('pointerup', select);

      TestHooks.mountInteractive(`identify-option-${i}`, select, {
        top: `${(cardY / 1280) * 100}%`,
        left: `${(x / 800) * 100}%`,
        width: `${cardW}px`,
        height: `${cardH}px`,
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

    const submit = () => {
      if (this.selectedIndex >= 0) {
        onCommit({ selectedIndex: this.selectedIndex });
      }
    };

    shit.on('pointerup', submit);

    TestHooks.mountInteractive(`identify-submit`, submit, {
      top: `${(submitY / 1280) * 100}%`,
      left: `${(centerX / 800) * 100}%`,
      width: '280px',
      height: '56px',
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
    TestHooks.unmountAll(); // Interaction owns its ephemeral hooks
  }
}
