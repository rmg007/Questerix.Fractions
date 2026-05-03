/**
 * ExplainYourOrderInteraction — Two-phase interaction:
 * 1. Order cards (from OrderInteraction logic)
 * 2. Explain rule (from IdentifyInteraction logic)
 * per level-09.md §4.3
 */

import * as Phaser from 'phaser';
import { A11yLayer } from '../../components/A11yLayer';
import { BarModel } from './utils';
import type { Interaction, InteractionContext } from './types';
import { TestHooks } from '../utils/TestHooks';
import {
  NAVY,
  OPTION_BG,
  OPTION_BORDER,
  SELECTED_BG,
  SKY_BG,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_ON_FILL,
} from '../utils/levelTheme';

interface FracDef {
  id: string;
  label: string;
  numerator: number;
  denominator: number;
}

interface OrderWithRulePayload {
  cards: FracDef[];
  direction: 'ascending' | 'descending';
  postStep: {
    prompt: string;
    options: string[];
    correctRule: string;
  };
}

const RULE_LABELS: Record<string, string> = {
  same_denom_rule: 'Same bottom — bigger top wins',
  same_numer_rule: 'Same top — bigger bottom is smaller',
  benchmark_half: 'Used the half-line idea',
  benchmark_zero_one: 'Compared to 0 and 1',
};

export class ExplainYourOrderInteraction implements Interaction {
  readonly archetype = 'order' as const;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private bars: BarModel[] = [];
  private sequence: (string | null)[] = [];
  private selectedRule: string | null = null;
  private ctx!: InteractionContext;

  mount(ctx: InteractionContext): void {
    A11yLayer.unmountAll();
    this.ctx = ctx;
    this.renderOrderingPhase();
  }

  private renderOrderingPhase(): void {
    this.clearUI();
    const { scene, template, centerX, centerY, width } = this.ctx;
    const payload = template.payload as OrderWithRulePayload;
    const fracs = payload.cards;
    const n = fracs.length;
    this.sequence = new Array<string | null>(n).fill(null);

    const cardW = Math.min(120, (width - 80) / n - 12);
    const cardH = 44;
    const gap = 12;
    const totalW = n * (cardW + gap) - gap;
    const startX = centerX - totalW / 2;

    // Slot outlines
    const slotY = centerY + 80;
    const slotRects: Phaser.GameObjects.Rectangle[] = [];
    for (let si = 0; si < n; si++) {
      const sx = startX + si * (cardW + gap) + cardW / 2;
      const slot = scene.add
        .rectangle(sx, slotY, cardW, cardH + 8, SKY_BG)
        .setStrokeStyle(2, OPTION_BORDER)
        .setDepth(4);
      scene.add
        .text(sx, slotY + cardH / 2 + 14, `${si + 1}`, {
          fontSize: '13px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          color: TEXT_BODY,
        })
        .setOrigin(0.5)
        .setDepth(5);
      slotRects.push(slot);
      this.gameObjects.push(slot);
    }

    // Cards
    fracs.forEach((frac, i) => {
      const cx = startX + i * (cardW + gap) + cardW / 2;
      const cy = centerY - 80;

      const bar = new BarModel(scene, {
        x: cx,
        y: cy,
        width: cardW - 4,
        height: cardH - 4,
        numerator: frac.numerator,
        denominator: frac.denominator,
        label: `${frac.numerator}/${frac.denominator}`,
        fillColor: NAVY,
      });
      this.bars.push(bar);

      const hitW = Math.max(cardW, 44);
      const hitH = Math.max(cardH + 8, 44);
      const handle = scene.add
        .rectangle(cx, cy, cardW, cardH + 8, 0, 0)
        .setInteractive({
          draggable: true,
          useHandCursor: true,
          hitArea: new Phaser.Geom.Rectangle(-hitW / 2, -hitH / 2, hitW, hitH),
        })
        .setDepth(10);

      handle.on('dragstart', () => {
        this.ctx.pushEvent({
          type: 'pickUp',
          targetId: frac.id,
          timestamp: Date.now(),
        });
      });

      handle.on('drag', (_p: unknown, dx: number, dy: number) => {
        handle.setPosition(dx, dy);
        bar.setPosition(dx, dy);
      });

      handle.on('dragend', () => {
        let best = 0;
        let bestDist = Infinity;
        for (let si = 0; si < n; si++) {
          const sx = startX + si * (cardW + gap) + cardW / 2;
          const d = Math.hypot(handle.x - sx, handle.y - slotY);
          if (d < bestDist) {
            bestDist = d;
            best = si;
          }
        }
        this.sequence[best] = frac.id;
        const targetX = startX + best * (cardW + gap) + cardW / 2;
        handle.setPosition(targetX, slotY);
        bar.setPosition(targetX, slotY);
        slotRects[best]!.setFillStyle(SELECTED_BG);

        this.ctx.pushEvent({
          type: 'place',
          targetId: frac.id,
          trayIndex: best,
          timestamp: Date.now(),
        });
      });

      this.gameObjects.push(handle);
    });

    // Check Button
    const sy = centerY + 240;
    const sbg = scene.add.rectangle(centerX, sy, 220, 56, NAVY).setDepth(7);
    const stxt = scene.add
      .text(centerX, sy, 'Check Order', {
        fontSize: '18px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: TEXT_ON_FILL,
      })
      .setOrigin(0.5)
      .setDepth(8);
    const hit = scene.add
      .rectangle(centerX, sy, 220, 56, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(9);

    const checkOrder = () => {
      const filled = this.sequence.every((s) => s !== null);
      if (filled) {
        this.renderExplainingPhase();
      }
    };
    hit.on('pointerup', checkOrder);

    A11yLayer.mountAction('a11y-explain-check-order', 'Check ordering', checkOrder);

    TestHooks.mountInteractive(
      'order-check',
      () => {
        const filled = this.sequence.every((s) => s !== null);
        if (filled) {
          this.renderExplainingPhase();
        }
      },
      {
        top: `${(sy / 1280) * 100}%`,
        left: `${(centerX / 800) * 100}%`,
        width: '220px',
        height: '56px',
      }
    );

    this.gameObjects.push(sbg, stxt, hit);
  }

  private renderExplainingPhase(): void {
    this.clearUI();
    const { scene, template, centerX, centerY, width, onCommit } = this.ctx;
    const payload = template.payload as OrderWithRulePayload;
    const postStep = payload.postStep;

    const title = scene.add
      .text(centerX, centerY - 200, postStep.prompt, {
        fontSize: '24px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: TEXT_HEADING,
        align: 'center',
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.gameObjects.push(title);

    const options = postStep.options;
    const optionH = 60;
    const spacing = 15;
    const totalH = options.length * (optionH + spacing) - spacing;
    const startY = centerY - totalH / 2 + 40;

    options.forEach((optKey, i) => {
      const y = startY + i * (optionH + spacing);
      const bg = scene.add.rectangle(centerX, y, width - 100, optionH, OPTION_BG).setDepth(5);
      bg.setStrokeStyle(2, OPTION_BORDER);

      const label = scene.add
        .text(centerX, y, RULE_LABELS[optKey] || optKey, {
          fontSize: '16px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          color: TEXT_HEADING,
        })
        .setOrigin(0.5)
        .setDepth(6);

      const hit = scene.add
        .rectangle(centerX, y, width - 100, optionH, 0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(7);

      const select = () => {
        this.gameObjects
          .filter((o) => o instanceof Phaser.GameObjects.Rectangle && o.depth === 5)
          .forEach((r) => (r as Phaser.GameObjects.Rectangle).setFillStyle(OPTION_BG));
        bg.setFillStyle(SELECTED_BG);
        this.selectedRule = optKey;
        submitBtn.setFillStyle(NAVY);
        submitTxt.setColor(TEXT_ON_FILL);
      };

      hit.on('pointerup', select);

      A11yLayer.mountAction(`a11y-explain-rule-${optKey}`, RULE_LABELS[optKey] || optKey, select);

      TestHooks.mountInteractive(`rule-option-${optKey}`, select, {
        top: `${(y / 1280) * 100}%`,
        left: `${(centerX / 800) * 100}%`,
        width: `${width - 100}px`,
        height: `${optionH}px`,
      });

      this.gameObjects.push(bg, label, hit);
    });

    // Final Submit
    const sy = centerY + 240;
    const submitBtn = scene.add.rectangle(centerX, sy, 220, 56, SKY_BG).setDepth(7);
    const submitTxt = scene.add
      .text(centerX, sy, 'Submit', {
        fontSize: '20px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontStyle: 'bold',
        color: TEXT_BODY,
      })
      .setOrigin(0.5)
      .setDepth(8);
    const submitHit = scene.add
      .rectangle(centerX, sy, 220, 56, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(9);

    const submitExplain = () => {
      if (this.selectedRule) {
        onCommit({
          sequence: this.sequence,
          rule: this.selectedRule,
        });
      }
    };

    submitHit.on('pointerup', submitExplain);

    A11yLayer.mountAction('a11y-explain-submit', 'Submit reasoning', submitExplain);

    TestHooks.mountInteractive('explain-submit', submitExplain, {
      top: `${(sy / 1280) * 100}%`,
      left: `${(centerX / 800) * 100}%`,
      width: '220px',
      height: '56px',
    });

    this.gameObjects.push(submitBtn, submitTxt, submitHit);
  }

  private clearUI(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.bars.forEach((b) => b.destroy());
    this.bars = [];
    TestHooks.unmountAll();
  }

  unmount(): void {
    this.clearUI();
  }
}
