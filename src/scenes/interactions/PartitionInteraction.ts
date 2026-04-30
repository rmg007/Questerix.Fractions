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
import { NAVY, OPTION_BG, OPTION_BORDER } from '../utils/levelTheme';

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
  private handlePos!: number;

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
        // Drop = commit to LevelScene (which auto-submits). Without this the
        // Check button is dead — lastPayload stays null and onSubmit returns.
        ctx.onCommit(buildInput());
      },
    });

    // partition-target: transparent button that triggers submit
    TestHooks.mountInteractive(
      'partition-target',
      () => {
        ctx.onCommit(buildInput());
      },
      { width: '120px', height: '120px', top: '50%', left: '50%' }
    );
  }

  unmount(): void {
    this.shapeGraphics?.destroy();
    this.partitionLine?.destroy();
    (this.dragHandle as DragHandle | undefined)?.destroy();
    TestHooks.unmount('partition-target');
  }

  private drawShape(shapeType: 'rectangle' | 'circle', cx: number, cy: number): void {
    const g = this.shapeGraphics;
    g.clear();
    if (shapeType === 'rectangle') {
      g.fillStyle(OPTION_BG, 1);
      g.fillRect(cx - SHAPE_W / 2, cy - SHAPE_H / 2, SHAPE_W, SHAPE_H);
      g.lineStyle(3, OPTION_BORDER, 1);
      g.strokeRect(cx - SHAPE_W / 2, cy - SHAPE_H / 2, SHAPE_W, SHAPE_H);
    } else {
      g.fillStyle(OPTION_BG, 1);
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
}
