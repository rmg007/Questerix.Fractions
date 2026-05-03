/**
 * DragHandle — touch + keyboard input wrapper for draggable partition handles.
 * Touch targets are ≥44×44 CSS px per design-language.md §5 (WCAG 2.5.5).
 * Arrow keys move handle in 8 px increments; Enter commits the position.
 * per interaction-model.md §9 (keyboard/switch access)
 * per design-language.md §5 (minimum touch target 44×44)
 *
 * Not a Phaser Container — avoids name-clash with Container.position / Container.moveTo.
 * Holds its own Rectangle game objects, added directly to the scene.
 */

import * as Phaser from 'phaser';
import { CLR } from '../scenes/utils/colors';
import { checkReduceMotion } from '../lib/preferences';

export interface DragHandleConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  /** Visible track length (horizontal or vertical). */
  trackLength: number;
  /** 'horizontal' moves along X; 'vertical' moves along Y. */
  axis: 'horizontal' | 'vertical';
  /** Minimum position (axis-relative). */
  minPos: number;
  /** Maximum position (axis-relative). */
  maxPos: number;
  /** Snap threshold in logical px — positions within this are snapped to snap targets. */
  snapThreshold?: number;
  /** Positions to snap to (axis-relative logical px). */
  snapTargets?: number[];
  depth?: number;
  onMove?: (pos: number) => void;
  onCommit?: (pos: number) => void;
}

const HANDLE_VISIBLE = 8; // stroke width of the visible line
const HIT_TARGET = 44; // per design-language.md §5 — WCAG 2.5.5 minimum
const KBD_STEP = 8; // per interaction-model.md §9 — 8 px increments
const GLOW_RADIUS = 28; // radius of the hover glow circle

export class DragHandle {
  private hitZone: Phaser.GameObjects.Rectangle;
  private visibleLine: Phaser.GameObjects.Rectangle;
  private glowCircle: Phaser.GameObjects.Arc;
  private gripper: Phaser.GameObjects.Arc;
  private gripperBorder: Phaser.GameObjects.Arc;
  private chevrons: Phaser.GameObjects.Text;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private loadPulseTween: Phaser.Tweens.Tween | null = null;
  private readonly scene: Phaser.Scene;

  private _pos: number;
  private isDragging: boolean = false;
  private readonly cfg: DragHandleConfig;
  private keyHandler?: (event: KeyboardEvent) => void;

  constructor(config: DragHandleConfig) {
    const { scene, x, y, trackLength, axis, depth = 20 } = config;

    this.scene = scene;
    this.cfg = config;
    this._pos = axis === 'horizontal' ? x : y;

    this.glowCircle = scene.add.circle(x, y, GLOW_RADIUS, CLR.accentA, 0).setDepth(depth - 1);

    const lineW = axis === 'horizontal' ? HANDLE_VISIBLE : trackLength;
    const lineH = axis === 'horizontal' ? trackLength : HANDLE_VISIBLE;
    this.visibleLine = scene.add
      .rectangle(x, y, lineW, lineH, CLR.primary)
      .setOrigin(0.5)
      .setDepth(depth);

    // UI-1: Circular gripper r=20 with white border + chevrons
    this.gripper = scene.add
      .circle(x, y, 20, CLR.primary)
      .setDepth(depth + 2)
      .setStrokeStyle(3, 0xffffff);
    this.gripperBorder = scene.add
      .circle(x, y, 22, 0xffffff, 0)
      .setDepth(depth + 2)
      .setStrokeStyle(2, CLR.primary);
    this.chevrons = scene.add
      .text(x, y, axis === 'horizontal' ? '‹ ›' : '⌃ ⌄', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(depth + 3);

    const hitW = axis === 'horizontal' ? HIT_TARGET : Math.max(trackLength, HIT_TARGET);
    const hitH = axis === 'horizontal' ? Math.max(trackLength, HIT_TARGET) : HIT_TARGET;
    this.hitZone = scene.add
      .rectangle(x, y, hitW, hitH, 0x000000, 0)
      .setOrigin(0.5)
      .setDepth(depth + 4)
      .setInteractive({ draggable: true });

    this.wirePointerEvents();
    this.wireKeyboardEvents();
    this.playLoadPulse();
  }

  /** UI-1: 2-pulse on load to draw attention to the gripper. */
  private playLoadPulse(): void {
    if (checkReduceMotion()) return;
    this.loadPulseTween = this.scene.tweens.add({
      targets: [this.gripper, this.gripperBorder, this.chevrons],
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 400,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 1,
    });
  }

  private wirePointerEvents(): void {
    const { minPos, maxPos, snapThreshold = 20, snapTargets = [], onMove, onCommit } = this.cfg;
    const isHoriz = this.cfg.axis === 'horizontal';

    this.hitZone.on('pointerover', () => {
      if (!this.isDragging) this.showGlow();
    });

    this.hitZone.on('pointerout', () => {
      if (!this.isDragging) this.hideGlow();
    });

    this.hitZone.on('dragstart', () => {
      this.isDragging = true;
      this.visibleLine.setFillStyle(CLR.primaryStrong); // visual feedback on grab
      this.showGlow();
    });

    this.hitZone.on('drag', (_ptr: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (!this.isDragging) return;
      const raw = isHoriz ? dragX : dragY;
      const clamped = Phaser.Math.Clamp(raw, minPos, maxPos);
      this._pos = clamped;
      this.setAxisPosition(clamped);
      onMove?.(clamped);
    });

    this.hitZone.on('dragend', () => {
      this.isDragging = false;
      this.visibleLine.setFillStyle(CLR.primary);
      this.hideGlow();

      // Magnetic snap — per interaction-model.md §3.1, level-01.md §4.3 (±5% snap)
      const snapped = this.findSnapTarget(this._pos, snapTargets, snapThreshold);
      if (snapped !== null) {
        this._pos = snapped;
        this.setAxisPosition(snapped);
      }
      onCommit?.(this._pos);
    });
  }

  private wireKeyboardEvents(): void {
    const isHoriz = this.cfg.axis === 'horizontal';
    const { minPos, maxPos, onMove, onCommit } = this.cfg;

    this.keyHandler = (event: KeyboardEvent) => {
      if (!this.hitZone.active) return;

      let delta = 0;
      if (isHoriz) {
        if (event.key === 'ArrowLeft') delta = -KBD_STEP;
        if (event.key === 'ArrowRight') delta = KBD_STEP;
      } else {
        if (event.key === 'ArrowUp') delta = -KBD_STEP;
        if (event.key === 'ArrowDown') delta = KBD_STEP;
      }

      if (delta !== 0) {
        event.preventDefault();
        this._pos = Phaser.Math.Clamp(this._pos + delta, minPos, maxPos);
        this.setAxisPosition(this._pos);
        onMove?.(this._pos);
      }

      // Enter commits position per interaction-model.md §9
      if (event.key === 'Enter') {
        event.preventDefault();
        onCommit?.(this._pos);
      }
    };

    this.scene.input.keyboard?.on('keydown', this.keyHandler);
  }

  private setAxisPosition(pos: number): void {
    const isHoriz = this.cfg.axis === 'horizontal';
    const moveX = (obj: { x: number; y: number; setPosition: (x: number, y: number) => void }) =>
      obj.setPosition(isHoriz ? pos : obj.x, isHoriz ? obj.y : pos);
    moveX(this.visibleLine);
    moveX(this.hitZone);
    moveX(this.glowCircle);
    moveX(this.gripper);
    moveX(this.gripperBorder);
    moveX(this.chevrons);
  }

  /** Returns the nearest snap target if within threshold, else null. */
  private findSnapTarget(pos: number, targets: number[], threshold: number): number | null {
    let best: number | null = null;
    let bestDist = Infinity;
    for (const t of targets) {
      const d = Math.abs(pos - t);
      if (d < bestDist && d <= threshold) {
        best = t;
        bestDist = d;
      }
    }
    return best;
  }

  /** Fade in a pulsing amber glow ring around the handle. */
  private showGlow(): void {
    if (checkReduceMotion()) return;
    this.glowTween?.stop();
    this.glowCircle.setAlpha(0.22);
    this.glowTween = this.scene.tweens.add({
      targets: this.glowCircle,
      alpha: 0.38,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /** Fade out the glow ring. */
  private hideGlow(): void {
    this.glowTween?.stop();
    this.glowTween = null;
    this.scene.tweens.add({
      targets: this.glowCircle,
      alpha: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Cubic.easeIn',
    });
  }

  /** Current handle position (axis-relative logical px). */
  get pos(): number {
    return this._pos;
  }

  /**
   * Programmatically move handle (e.g., for worked_example hint animation).
   * per design-language.md §6.1 (partition demonstration 400–600ms)
   * per design-language.md §6.4 (reduced motion = instant)
   */
  moveTo(newPos: number, animate = false): void {
    const clamped = Phaser.Math.Clamp(newPos, this.cfg.minPos, this.cfg.maxPos);
    const isHoriz = this.cfg.axis === 'horizontal';
    const reduceMotion = checkReduceMotion();

    if (!animate || reduceMotion) {
      this._pos = clamped;
      this.setAxisPosition(clamped);
    } else {
      const targetObj = isHoriz ? { x: clamped } : { y: clamped };
      this.scene.tweens.add({
        targets: [
          this.visibleLine,
          this.hitZone,
          this.glowCircle,
          this.gripper,
          this.gripperBorder,
          this.chevrons,
        ],
        ...targetObj,
        duration: 500,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          this._pos = clamped;
        },
      });
    }
  }

  destroy(): void {
    this.glowTween?.stop();
    this.loadPulseTween?.stop();
    this.glowCircle.destroy();
    this.visibleLine.destroy();
    this.gripper.destroy();
    this.gripperBorder.destroy();
    this.chevrons.destroy();
    this.hitZone.destroy();
    if (this.keyHandler) {
      this.scene.input.keyboard?.off('keydown', this.keyHandler);
    }
  }
}
