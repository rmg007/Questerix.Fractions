/**
 * PartitionInteraction — drag-divider mechanic for the `partition` archetype.
 * Ported from Level01Scene. Owns shape + drag-handle visuals.
 * per activity-archetypes.md §1, level-01.md §4.3
 */

import * as Phaser from 'phaser';
import { DragHandle } from '../../components/DragHandle';
import { TestHooks } from '../utils/TestHooks';
import type { Interaction, InteractionContext } from './types';
import type { PartitionInput, PartitionPayload } from '../../validators/partition';
import { log } from '../../lib/log';
import { NAVY, SKY_BG, ACTION_FILL, BODY_FONT, TITLE_FONT } from '../utils/levelTheme';
import { sfx } from '../../audio/SFXService';

const OPTION_BORDER = NAVY;

const SHAPE_W = 340;
const SHAPE_H = 260;
const SNAP_PCT = 0.05;
// Handle starts off-centre so the divider is clearly unequal on load —
// otherwise the centre is already the correct halves answer and a stray
// touch could submit a "correct" payload without genuine engagement.
const INITIAL_HANDLE_OFFSET_PCT = 0.3;

export class PartitionInteraction implements Interaction {
  readonly archetype = 'partition' as const;

  private scene!: Phaser.Scene;
  private shapeGraphics!: Phaser.GameObjects.Graphics;
  private partitionLine!: Phaser.GameObjects.Graphics;
  private dragHandle!: DragHandle;
  private dragAffordance: Phaser.GameObjects.Text | null = null;
  private handlePos!: number;
  private cutLineHint: Phaser.GameObjects.Graphics | null = null;
  private ghostGuide: Phaser.GameObjects.Graphics | null = null;
  private ghostLabel: Phaser.GameObjects.Text | null = null;
  private correctFillGraphics: Phaser.GameObjects.Graphics | null = null;
  private fractionLabels: Phaser.GameObjects.Text[] = [];
  private shapeCenterX!: number;
  private shapeCenterY!: number;
  private shapeType!: 'rectangle' | 'circle';
  private targetPartitions = 2;

  mount(ctx: InteractionContext): void {
    this.scene = ctx.scene;
    const { centerX, centerY } = ctx;

    this.shapeGraphics = this.scene.add.graphics().setDepth(5);
    this.partitionLine = this.scene.add.graphics().setDepth(6);
    this.handlePos = centerX - SHAPE_W * INITIAL_HANDLE_OFFSET_PCT;
    log.scene('partition_mount', {
      templateId: ctx.template.id,
      tier: ctx.template.difficultyTier,
      initialHandleX: Math.round(this.handlePos),
    });

    const payload = ctx.template.payload as Partial<PartitionPayload> & {
      shapeType?: 'rectangle' | 'circle';
      snapMode?: 'axis' | 'free';
    };
    const shapeType = payload.shapeType ?? 'rectangle';
    const snapMode = payload.snapMode ?? (ctx.template.difficultyTier === 'easy' ? 'axis' : 'free');

    this.shapeCenterX = centerX;
    this.shapeCenterY = centerY;
    this.shapeType = shapeType;
    this.targetPartitions = payload.targetPartitions ?? 2;

    this.drawShape(shapeType, centerX, centerY);
    this.updatePartitionLine(this.handlePos, centerY);

    const minX = centerX - SHAPE_W / 2;
    const maxX = centerX + SHAPE_W / 2;
    const snapTargets = snapMode === 'axis' ? [centerX] : [];

    const buildInput = (): PartitionInput => {
      const leftArea = this.handlePos - (centerX - SHAPE_W / 2);
      const rightArea = centerX + SHAPE_W / 2 - this.handlePos;
      return { regionAreas: [leftArea, rightArea] };
    };

    let dragStartPos = this.handlePos;

    this.dragHandle = new DragHandle({
      scene: this.scene,
      x: this.handlePos,
      y: centerY,
      trackLength: SHAPE_H + 40,
      axis: 'horizontal',
      minPos: minX,
      maxPos: maxX,
      snapThreshold: SHAPE_W * SNAP_PCT,
      snapTargets,
      onMove: (pos) => {
        if (this.handlePos === dragStartPos) {
          log.drag('start', {
            fromX: Math.round(dragStartPos),
            fromPct: Math.round(((dragStartPos - minX) / SHAPE_W) * 100),
          });
        }
        this.handlePos = pos;
        this.updatePartitionLine(pos, centerY);
        if (this.dragAffordance) {
          this.dragAffordance.setX(pos);
        }
      },
      onCommit: (pos) => {
        const pct = Math.round(((pos - minX) / SHAPE_W) * 100);
        const snapped = snapTargets.some((t) => Math.abs(t - pos) < 1);
        log.drag('commit', {
          handleX: Math.round(pos),
          pct,
          snappedToCenter: snapped,
          movedFrom: Math.round(dragStartPos),
        });
        dragStartPos = pos;
        this.handlePos = pos;
        this.updatePartitionLine(pos, centerY);
        if (this.dragAffordance) {
          this.dragAffordance.setX(pos);
        }
        // Drop = commit to LevelScene (which auto-submits). Without this the
        // Check button is dead — lastPayload stays null and onSubmit returns.
        ctx.onCommit(buildInput());
      },
    });

    // Fix 3: drag handle clarity affordance
    this.dragAffordance = this.scene.add
      .text(this.handlePos, centerY, '▲\n▼', {
        fontFamily: 'BODY_FONT',
        fontSize: '16px',
        color: '#1e3a8a', // NAVY
        align: 'center',
        lineSpacing: -4,
      })
      .setOrigin(0.5)
      .setDepth(10);

    // partition-target: transparent button that triggers submit
    TestHooks.mountInteractive(
      'partition-target',
      () => {
        ctx.onCommit(buildInput());
      },
      { width: '120px', height: '120px', top: '50%', left: '50%' }
    );

    ctx.onCommit(buildInput());
  }

  unmount(): void {
    this.shapeGraphics?.destroy();
    this.partitionLine?.destroy();
    this.cutLineHint?.destroy();
    this.cutLineHint = null;
    this.ghostGuide?.destroy();
    this.ghostGuide = null;
    this.ghostLabel?.destroy();
    this.ghostLabel = null;
    this.correctFillGraphics?.destroy();
    this.correctFillGraphics = null;
    this.fractionLabels.forEach((l) => l.destroy());
    this.fractionLabels = [];
    this.dragAffordance?.destroy();
    this.dragAffordance = null;
    (this.dragHandle as DragHandle | undefined)?.destroy();
    TestHooks.unmount('partition-target');
  }

  showGhostGuide(): void {
    this.ghostGuide?.destroy();
    this.ghostLabel?.destroy();

    const cx = this.shapeCenterX;
    const cy = this.shapeCenterY;
    const g = this.scene.add.graphics().setDepth(8).setAlpha(0.28);
    this.ghostGuide = g;

    g.lineStyle(3, NAVY, 1);

    if (this.shapeType === 'rectangle') {
      // Midpoint is a vertical line at cx
      const top = cy - SHAPE_H / 2;
      const bottom = cy + SHAPE_H / 2;
      this.drawDashedLine(g, cx, top, cx, bottom, 12, 8);
      this.ghostLabel = this.scene.add
        .text(cx + SHAPE_W / 2 + 6, cy, 'half', {
          fontFamily: BODY_FONT,
          fontSize: '14px',
          color: '#1e3a8a',
        })
        .setOrigin(0, 0.5)
        .setAlpha(0.35)
        .setDepth(8);
    } else {
      // For circle: midpoint is a vertical diameter at cx
      const top = cy - SHAPE_W / 2;
      const bottom = cy + SHAPE_W / 2;
      this.drawDashedLine(g, cx, top, cx, bottom, 12, 8);
      this.ghostLabel = this.scene.add
        .text(cx + SHAPE_W / 2 + 6, cy, 'half', {
          fontFamily: BODY_FONT,
          fontSize: '14px',
          color: '#1e3a8a',
        })
        .setOrigin(0, 0.5)
        .setAlpha(0.35)
        .setDepth(8);
    }
  }

  showCorrectFeedback(): void {
    sfx.playSnap();

    const cx = this.shapeCenterX;
    const cy = this.shapeCenterY;
    const n = this.targetPartitions;

    const fillG = this.scene.add.graphics().setDepth(5).setAlpha(0);
    this.correctFillGraphics = fillG;

    if (this.shapeType === 'rectangle') {
      const left = cx - SHAPE_W / 2;
      const top = cy - SHAPE_H / 2;
      const partW = SHAPE_W / n;
      const colors: number[] = [ACTION_FILL, SKY_BG];
      for (let i = 0; i < n; i++) {
        fillG.fillStyle(colors[i % colors.length]!, 0.45);
        fillG.fillRect(left + partW * i, top, partW, SHAPE_H);
      }

      // Fraction labels — centered in each segment
      this.scene.time.delayedCall(200, () => {
        for (let i = 0; i < n; i++) {
          const lx = left + partW * i + partW / 2;
          const label = this.scene.add
            .text(lx, cy, `1/${n}`, {
              fontFamily: TITLE_FONT,
              fontSize: '28px',
              color: '#1e3a8a',
            })
            .setOrigin(0.5)
            .setDepth(9)
            .setScale(0.5);
          this.fractionLabels.push(label);
          this.scene.tweens.add({
            targets: label,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
          });
        }
      });
    } else {
      // Circle: color the left and right semicircles
      fillG.fillStyle(ACTION_FILL, 0.45);
      fillG.fillCircle(cx, cy, SHAPE_W / 2);
      const maskG = this.scene.add.graphics().setDepth(5).setAlpha(0);
      maskG.fillStyle(SKY_BG, 0.45);
      maskG.fillRect(cx, cy - SHAPE_W / 2, SHAPE_W / 2, SHAPE_W);
      this.fractionLabels.push(
        this.scene.add.text(0, 0, '').setDepth(9)
      ); // sentinel so maskG gets destroyed with fractionLabels
      maskG.destroy(); // simplified: just fill the whole circle amber for circle shape
    }

    this.scene.tweens.add({
      targets: fillG,
      alpha: 1,
      duration: 350,
      ease: 'Sine.easeOut',
    });
  }

  /**
   * Draws dashed cut-line hints at the correct division positions.
   * Satisfies the Interaction.showVisualOverlay() interface contract.
   * Uses the targetPartitions stored during mount.
   */
  showVisualOverlay(): void {
    this.cutLineHint?.destroy();
    this.cutLineHint = this.scene.add.graphics().setDepth(7).setAlpha(0.85);

    const CUT_COLOR = 0xffaa00;
    const LINE_WIDTH = 3;
    const DASH_LEN = 12;
    const GAP_LEN = 7;

    this.cutLineHint.lineStyle(LINE_WIDTH, CUT_COLOR, 1);

    const cx = this.shapeCenterX;
    const cy = this.shapeCenterY;
    const n = this.targetPartitions;

    if (this.shapeType === 'rectangle') {
      const left = cx - SHAPE_W / 2;
      const top = cy - SHAPE_H / 2;
      const bottom = cy + SHAPE_H / 2;
      for (let i = 1; i < n; i++) {
        const x = left + (SHAPE_W * i) / n;
        this.drawDashedLine(this.cutLineHint, x, top, x, bottom, DASH_LEN, GAP_LEN);
      }
    } else {
      const radius = SHAPE_W / 2;
      const angleStep = (2 * Math.PI) / n;
      for (let i = 0; i < n; i++) {
        const angle = angleStep * i;
        const ex = cx + radius * Math.cos(angle);
        const ey = cy + radius * Math.sin(angle);
        this.drawDashedLine(this.cutLineHint, cx, cy, ex, ey, DASH_LEN, GAP_LEN);
      }
    }

    log.scene('cut_line_hint_shown', { shapeType: this.shapeType, targetPartitions: n });
  }

  private drawShape(shapeType: 'rectangle' | 'circle', cx: number, cy: number): void {
    const g = this.shapeGraphics;
    g.clear();
    if (shapeType === 'rectangle') {
      // Sky-tinted fill so the navy partition line is clearly visible
      g.fillStyle(SKY_BG, 0.55);
      g.fillRect(cx - SHAPE_W / 2, cy - SHAPE_H / 2, SHAPE_W, SHAPE_H);
      g.lineStyle(3, OPTION_BORDER, 1);
      g.strokeRect(cx - SHAPE_W / 2, cy - SHAPE_H / 2, SHAPE_W, SHAPE_H);
    } else {
      g.fillStyle(SKY_BG, 0.55);
      g.fillCircle(cx, cy, SHAPE_W / 2);
      g.lineStyle(3, OPTION_BORDER, 1);
      g.strokeCircle(cx, cy, SHAPE_W / 2);
    }
  }

  private updatePartitionLine(handleX: number, cy: number): void {
    this.partitionLine.clear();
    this.partitionLine.lineStyle(4, NAVY, 1);
    const top = cy - SHAPE_H / 2;
    const bottom = cy + SHAPE_H / 2;
    this.partitionLine.lineBetween(handleX, top - 20, handleX, bottom + 20);
  }

  private drawDashedLine(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dashLen: number,
    gapLen: number
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const totalLen = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / totalLen;
    const uy = dy / totalLen;
    let traveled = 0;
    let drawing = true;

    while (traveled < totalLen) {
      const segLen = Math.min(drawing ? dashLen : gapLen, totalLen - traveled);
      if (drawing) {
        const sx = x1 + ux * traveled;
        const sy = y1 + uy * traveled;
        const ex = x1 + ux * (traveled + segLen);
        const ey = y1 + uy * (traveled + segLen);
        g.lineBetween(sx, sy, ex, ey);
      }
      traveled += segLen;
      drawing = !drawing;
    }
  }
}
