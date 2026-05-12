/**
 * Pointer event utilities for Pixi interactions.
 * Translates Pixi FederatedPointerEvent to normalized events (tap, drag, drop, snap).
 * Per React+PixiJS migration plan §5
 *
 * All coordinates are validated for NaN/Infinity and optional bounds clamping.
 */

import { Container, FederatedPointerEvent, Point } from 'pixi.js';

/**
 * Bounds validation: ensure coordinates are valid finite numbers.
 * Returns the value if valid, or a safe fallback if not.
 */
function validateCoordinate(value: number, fallback: number = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Clamp a coordinate to bounds [min, max].
 * Respects safety margin for floating-point precision.
 */
function clampCoordinate(value: number, min: number, max: number): number {
  // First validate it's a finite number
  if (!Number.isFinite(value)) return (min + max) / 2;
  // Then clamp to bounds with 1px safety margin
  const margin = 1;
  return Math.max(min + margin, Math.min(max - margin, value));
}

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
  bounds?: { minX: number; minY: number; maxX: number; maxY: number }; // optional canvas bounds for clamping
}

/**
 * Manage pointer state and gesture detection.
 * Emits normalized events for tap, drag, drop, and snap interactions.
 * All coordinates are validated for NaN/Infinity and optional bounds.
 */
export class PointerManager {
  private pointers = new Map<number, PointerState>();
  private onEvent: ((event: PointerEvent) => void) | undefined;
  private dragThreshold: number;
  private bounds: { minX: number; minY: number; maxX: number; maxY: number } | undefined;

  constructor(options: PointerListenerOptions = {}) {
    this.dragThreshold = options.dragThreshold ?? 5;
    this.onEvent = options.onEvent;
    this.bounds = options.bounds;
  }

  /**
   * Validate and optionally clamp a coordinate pair to bounds.
   */
  private validateCoordinates(x: number, y: number): { x: number; y: number } {
    x = validateCoordinate(x);
    y = validateCoordinate(y);

    if (this.bounds) {
      x = clampCoordinate(x, this.bounds.minX, this.bounds.maxX);
      y = clampCoordinate(y, this.bounds.minY, this.bounds.maxY);
    }

    return { x, y };
  }

  /**
   * Attach pointer listeners to a Pixi container.
   * Container must have interactiveChildren enabled.
   */
  attach(container: Container): void {
    container.addEventListener('pointerdown', (e: FederatedPointerEvent) => this.onPointerDown(e));
    container.addEventListener('pointermove', (e: FederatedPointerEvent) => this.onPointerMove(e));
    container.addEventListener('pointerup', (e: FederatedPointerEvent) => this.onPointerUp(e));
    container.addEventListener('pointerupoutside', (e: FederatedPointerEvent) =>
      this.onPointerUp(e)
    );
    container.addEventListener('pointercancel', (e: FederatedPointerEvent) =>
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
   * Validates coordinates for NaN/Infinity and optional bounds.
   */
  private onPointerDown(e: FederatedPointerEvent): void {
    const pointerId = e.pointerId ?? 0;
    const targetId = (e.target as unknown as { id?: string })?.id;
    const { x, y } = this.validateCoordinates(e.clientX, e.clientY);
    const state = new PointerState(pointerId, x, y, targetId);
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
   * Validates coordinates for NaN/Infinity and optional bounds.
   */
  private onPointerMove(e: FederatedPointerEvent): void {
    const pointerId = e.pointerId ?? 0;
    const state = this.pointers.get(pointerId);
    if (!state) return;

    const { x: validX, y: validY } = this.validateCoordinates(e.clientX, e.clientY);

    const deltaX = validX - state.lastX;
    const deltaY = validY - state.lastY;
    state.lastX = validX;
    state.lastY = validY;

    const totalDeltaX = validX - state.startX;
    const totalDeltaY = validY - state.startY;
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
   * Validates coordinates for NaN/Infinity and optional bounds.
   */
  private onPointerUp(e: FederatedPointerEvent): void {
    const pointerId = e.pointerId ?? 0;
    const state = this.pointers.get(pointerId);
    if (!state) return;

    if (state.isDragging) {
      const { x, y } = this.validateCoordinates(e.clientX, e.clientY);
      const dragEndEvent: DragEndEvent = {
        type: 'drag-end',
        x,
        y,
      };
      if (state.targetId) dragEndEvent.targetId = state.targetId;
      this.emit(dragEndEvent);
    }

    this.pointers.delete(pointerId);
  }

  /**
   * Handle pointer cancel: abort gesture.
   */
  private onPointerCancel(e: FederatedPointerEvent): void {
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
  static pointInContainer(container: Container, x: number, y: number): boolean {
    const local = container.toLocal(new Point(x, y));
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
