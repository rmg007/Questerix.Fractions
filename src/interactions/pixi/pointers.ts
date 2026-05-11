/**
 * Pointer event utilities for Pixi interactions.
 * Translates Pixi PIXI.FederatedPointerEvent to normalized events (tap, drag, drop, snap).
 * Per React+PixiJS migration plan §5
 */

import * as PIXI from 'pixi.js';

export interface PointerDown {
  type: 'pointerdown';
  x: number;
  y: number;
  pointerId: number;
  targetId?: string;
}

export interface PointerMove {
  type: 'pointermove';
  x: number;
  y: number;
  pointerId: number;
  deltaX: number;
  deltaY: number;
}

export interface PointerUp {
  type: 'pointerup';
  x: number;
  y: number;
  pointerId: number;
}

export interface TapEvent {
  type: 'tap';
  x: number;
  y: number;
  targetId?: string;
}

export interface DragStartEvent {
  type: 'drag-start';
  x: number;
  y: number;
  targetId?: string;
}

export interface DragEvent {
  type: 'drag';
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  targetId?: string;
}

export interface DragEndEvent {
  type: 'drag-end';
  x: number;
  y: number;
  targetId?: string;
}

export interface DropEvent {
  type: 'drop';
  x: number;
  y: number;
  targetId?: string;
  droppedOnId?: string;
}

export interface SnapEvent {
  type: 'snap';
  x: number;
  y: number;
  snappedX: number;
  snappedY: number;
  gridSize: number;
}

export interface DragCancelEvent {
  type: 'drag-cancel';
  targetId?: string;
}

export type PointerEvent =
  | TapEvent
  | DragStartEvent
  | DragEvent
  | DragEndEvent
  | DropEvent
  | SnapEvent
  | DragCancelEvent;

export interface PointerListenerOptions {
  tapThreshold?: number; // pixels; default 8
  dragThreshold?: number; // pixels; default 5
  onEvent?: (event: PointerEvent) => void;
}

/**
 * Manage pointer state and gesture detection.
 * Emits normalized events for tap, drag, drop, and snap interactions.
 */
export class PointerManager {
  private pointers = new Map<number, PointerState>();
  private onEvent: ((event: PointerEvent) => void) | undefined;
  private dragThreshold: number;

  constructor(options: PointerListenerOptions = {}) {
    this.dragThreshold = options.dragThreshold ?? 5;
    this.onEvent = options.onEvent;
  }

  /**
   * Attach pointer listeners to a Pixi container.
   * Container must have interactiveChildren enabled.
   */
  attach(container: PIXI.Container): void {
    container.addEventListener('pointerdown', (e: PIXI.FederatedPointerEvent) =>
      this.onPointerDown(e)
    );
    container.addEventListener('pointermove', (e: PIXI.FederatedPointerEvent) =>
      this.onPointerMove(e)
    );
    container.addEventListener('pointerup', (e: PIXI.FederatedPointerEvent) => this.onPointerUp(e));
    container.addEventListener('pointerupoutside', (e: PIXI.FederatedPointerEvent) =>
      this.onPointerUp(e)
    );
    container.addEventListener('pointercancel', (e: PIXI.FederatedPointerEvent) =>
      this.onPointerCancel(e)
    );
  }

  /**
   * Emit an event to listeners.
   */
  private emit = (event: PointerEvent): void => {
    if (this.onEvent) {
      this.onEvent(event);
    }
  };

  /**
   * Handle pointer down: start tracking.
   */
  private onPointerDown(e: PIXI.FederatedPointerEvent): void {
    const pointerId = e.pointerId ?? 0;
    const targetId = (e.target as unknown as { id?: string })?.id;
    const state = new PointerState(pointerId, e.clientX, e.clientY, targetId);
    this.pointers.set(pointerId, state);

    const tapEvent: TapEvent = {
      type: 'tap',
      x: state.startX,
      y: state.startY,
    };
    if (state.targetId) tapEvent.targetId = state.targetId;
    this.emit(tapEvent);
  }

  /**
   * Handle pointer move: detect drag or emit move events.
   */
  private onPointerMove(e: PIXI.FederatedPointerEvent): void {
    const pointerId = e.pointerId ?? 0;
    const state = this.pointers.get(pointerId);
    if (!state) return;

    const deltaX = e.clientX - state.lastX;
    const deltaY = e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;

    const totalDeltaX = e.clientX - state.startX;
    const totalDeltaY = e.clientY - state.startY;
    const distance = Math.sqrt(totalDeltaX ** 2 + totalDeltaY ** 2);

    // Transition to drag if threshold exceeded
    if (!state.isDragging && distance > this.dragThreshold) {
      state.isDragging = true;
      const dragStartEvent: DragStartEvent = {
        type: 'drag-start',
        x: state.lastX,
        y: state.lastY,
      };
      if (state.targetId) dragStartEvent.targetId = state.targetId;
      this.emit(dragStartEvent);
    }

    if (state.isDragging) {
      const dragEvent: DragEvent = {
        type: 'drag',
        x: state.lastX,
        y: state.lastY,
        deltaX,
        deltaY,
      };
      if (state.targetId) dragEvent.targetId = state.targetId;
      this.emit(dragEvent);
    }
  }

  /**
   * Handle pointer up: end tap or drag.
   */
  private onPointerUp(e: PIXI.FederatedPointerEvent): void {
    const pointerId = e.pointerId ?? 0;
    const state = this.pointers.get(pointerId);
    if (!state) return;

    if (state.isDragging) {
      const dragEndEvent: DragEndEvent = {
        type: 'drag-end',
        x: e.clientX,
        y: e.clientY,
      };
      if (state.targetId) dragEndEvent.targetId = state.targetId;
      this.emit(dragEndEvent);
    }

    this.pointers.delete(pointerId);
  }

  /**
   * Handle pointer cancel: abort gesture.
   */
  private onPointerCancel(e: PIXI.FederatedPointerEvent): void {
    const pointerId = e.pointerId ?? 0;
    const state = this.pointers.get(pointerId);
    if (!state) return;

    if (state.isDragging) {
      const dragCancelEvent: DragCancelEvent = {
        type: 'drag-cancel',
      };
      if (state.targetId) dragCancelEvent.targetId = state.targetId;
      this.emit(dragCancelEvent);
    }

    this.pointers.delete(pointerId);
  }

  /**
   * Check if a point is inside a Pixi container (for drop detection).
   */
  static pointInContainer(container: PIXI.Container, x: number, y: number): boolean {
    const local = container.toLocal(new PIXI.Point(x, y));
    return (
      local.x >= 0 && local.x <= container.width && local.y >= 0 && local.y <= container.height
    );
  }

  /**
   * Snap a coordinate to a grid.
   */
  static snapToGrid(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
  }
}

/**
 * Track state of a single pointer.
 */
class PointerState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  isDragging = false;
  targetId: string | undefined;
  pointerId: number;

  constructor(pointerId: number, startX: number, startY: number, targetId: string | undefined) {
    this.pointerId = pointerId;
    this.startX = startX;
    this.startY = startY;
    this.lastX = startX;
    this.lastY = startY;
    this.targetId = targetId;
  }
}
