/**
 * Keyboard input utilities for Pixi interactions.
 * Provides keyboard event management and focus handling.
 * Per React+PixiJS migration plan §5
 */

export interface KeyboardEventData {
  type: 'keydown' | 'keyup';
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

export interface KeyboardListenerOptions {
  onEvent?: (event: KeyboardEventData) => void;
  target?: HTMLElement | Window;
}

/**
 * Manage keyboard input for Pixi interactions.
 * Bridges DOM keyboard events to interaction models.
 */
export class KeyboardManager {
  private onEvent: ((event: KeyboardEventData) => void) | undefined;
  private target: HTMLElement | Window;
  private boundKeyDown: (e: globalThis.KeyboardEvent) => void;
  private boundKeyUp: (e: globalThis.KeyboardEvent) => void;
  private isAttached = false;

  constructor(options: KeyboardListenerOptions = {}) {
    this.onEvent = options.onEvent;
    this.target = options.target ?? window;
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
  }

  /**
   * Attach keyboard listeners to target (window or element).
   */
  attach(): void {
    if (this.isAttached) return;
    (this.target as any).addEventListener('keydown', this.boundKeyDown as any);
    (this.target as any).addEventListener('keyup', this.boundKeyUp as any);
    this.isAttached = true;
  }

  /**
   * Detach keyboard listeners.
   */
  detach(): void {
    if (!this.isAttached) return;
    (this.target as any).removeEventListener('keydown', this.boundKeyDown as any);
    (this.target as any).removeEventListener('keyup', this.boundKeyUp as any);
    this.isAttached = false;
  }

  /**
   * Emit a keyboard event to listeners.
   */
  private emit(event: KeyboardEventData): void {
    if (this.onEvent) {
      this.onEvent(event);
    }
  }

  /**
   * Handle keydown event.
   */
  private onKeyDown(e: globalThis.KeyboardEvent): void {
    this.emit({
      type: 'keydown',
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
    });
  }

  /**
   * Handle keyup event.
   */
  private onKeyUp(e: globalThis.KeyboardEvent): void {
    this.emit({
      type: 'keyup',
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
    });
  }
}

/**
 * Keyboard shortcuts for common interaction patterns.
 */
export const KEYBOARD_SHORTCUTS = {
  // Navigation
  arrowUp: 'ArrowUp',
  arrowDown: 'ArrowDown',
  arrowLeft: 'ArrowLeft',
  arrowRight: 'ArrowRight',

  // Selection / Confirmation
  enter: 'Enter',
  space: ' ',

  // Cancel / Back
  escape: 'Escape',
  backspace: 'Backspace',

  // Tab
  tab: 'Tab',
} as const;

/**
 * Map keyboard key to a semantic action.
 * Used by archetypes to translate raw keydown into interaction events.
 */
export function getKeyAction(key: string): string | null {
  const actions: Record<string, string> = {
    Enter: 'confirm',
    ' ': 'confirm',
    Escape: 'cancel',
    ArrowUp: 'move-up',
    ArrowDown: 'move-down',
    ArrowLeft: 'move-left',
    ArrowRight: 'move-right',
  };
  return actions[key] ?? null;
}

/**
 * Check if a key is a directional key.
 */
export function isDirectionalKey(key: string): boolean {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
}

/**
 * Check if a key is a confirmation key.
 */
export function isConfirmationKey(key: string): boolean {
  return ['Enter', ' '].includes(key);
}

/**
 * Check if a key is a cancel key.
 */
export function isCancelKey(key: string): boolean {
  return key === KEYBOARD_SHORTCUTS.escape;
}
