/**
 * Drag handle creation for Level01Scene.
 */

import * as Phaser from 'phaser';
import { DragHandle } from '@/components/DragHandle';
import { log } from '@/lib/log';

const CW = 800;
const SHAPE_CX = CW / 2;
const SHAPE_W = 400;
const SHAPE_H = 520;
const SHAPE_CY = 450;

export interface DragHandleOptions {
  scene: Phaser.Scene;
  initialX: number;
  snapMode: 'axis' | 'free';
  currentSnapPct: number;
  isInputLocked: () => boolean;
  onPositionChange: (pos: number) => void;
}

export function createPartitionDragHandle(opts: DragHandleOptions): DragHandle {
  const minX = SHAPE_CX - SHAPE_W / 2;
  const maxX = SHAPE_CX + SHAPE_W / 2;
  const snapThreshold = SHAPE_W * opts.currentSnapPct;
  const snapTargets = opts.snapMode === 'axis' ? [SHAPE_CX] : [];

  let dragStartPos = opts.initialX;

  return new DragHandle({
    scene: opts.scene,
    x: opts.initialX,
    y: SHAPE_CY,
    trackLength: SHAPE_H + 40,
    axis: 'horizontal',
    minPos: minX,
    maxPos: maxX,
    snapThreshold,
    snapTargets,
    onMove: (pos) => {
      if (!opts.isInputLocked()) {
        if (opts.initialX === dragStartPos) {
          log.drag('start', {
            fromX: dragStartPos,
            fromPct: Math.round(((dragStartPos - minX) / SHAPE_W) * 100),
          });
        }
        opts.onPositionChange(pos);
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
      opts.onPositionChange(pos);
    },
  });
}
