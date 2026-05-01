/**
 * A11yLayer — DOM-parallel accessibility surface for canvas-rendered UI.
 *
 * The Phaser canvas is opaque to screen readers and many keyboard users.
 * This module mounts real <button> elements that mirror the canvas controls,
 * with proper ARIA labels, keyboard focus, and an aria-live region for
 * state announcements. Buttons are visually hidden by default (SR-only)
 * but become visible when focused (so keyboard users can see what they're
 * about to activate).
 *
 * Distinct from TestHooks (which mounts opacity:0 click overlays for E2E
 * tests gated behind ?testHooks=1). A11yLayer is always on in production.
 *
 * per WCAG 2.1 AA — Name/Role/Value (4.1.2), Keyboard (2.1.1), Bypass Blocks (2.4.1)
 */

import { BODY_FONT } from '../scenes/utils/levelTheme';

const CONTAINER_ID_PREFIX = 'qf-a11y-layer-';
const STYLE_ID = 'qf-a11y-style';
const LIVE_REGION_ID = 'qf-a11y-live';

const STYLE = `
.qf-a11y-container {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10000;
}
.qf-a11y-container button {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.qf-a11y-container button:focus,
.qf-a11y-container button:focus-visible {
  position: fixed;
  top: 8px;
  left: 8px;
  width: auto;
  height: auto;
  margin: 0;
  padding: 12px 24px;
  overflow: visible;
  clip: auto;
  background: #2F6FED;
  color: #ffffff;
  border: 3px solid #1E3A8A;
  border-radius: 8px;
  font-family: ${BODY_FONT};
  font-size: 18px;
  font-weight: bold;
  outline: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  cursor: pointer;
}
#${LIVE_REGION_ID} {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;

function ensureStyle(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.appendChild(style);
}

function ensureLiveRegion(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  ensureStyle();
  let el = document.getElementById(LIVE_REGION_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = LIVE_REGION_ID;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    document.body.appendChild(el);
  }
  return el;
}

const layerStack: HTMLElement[] = [];
const registries = new Map<HTMLElement, Map<string, HTMLButtonElement>>();

function getActiveLayer(): HTMLElement | null {
  if (layerStack.length === 0) {
    // Auto-create base layer if none exists
    A11yLayer.pushLayer('base', 'Game controls');
  }
  return layerStack[layerStack.length - 1] ?? null;
}

export const A11yLayer = {
  /**
   * Pushes a new accessibility layer (e.g. for a modal).
   * Background layers are marked as 'inert' and 'aria-hidden' to prevent stale interaction.
   */
  pushLayer(id: string, label: string): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    ensureStyle();

    // Suppress previous layer
    if (layerStack.length > 0) {
      const prev = layerStack[layerStack.length - 1]!;
      prev.setAttribute('aria-hidden', 'true');
      prev.setAttribute('inert', '');
    }

    const el = document.createElement('div');
    el.id = `${CONTAINER_ID_PREFIX}${id}`;
    el.className = 'qf-a11y-container';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', label);
    document.body.appendChild(el);

    layerStack.push(el);
    registries.set(el, new Map());
    return el;
  },

  /**
   * Pops the top layer and restores the previous one.
   */
  popLayer(): void {
    const el = layerStack.pop();
    if (el) {
      el.remove();
      registries.delete(el);
    }

    if (layerStack.length > 0) {
      const prev = layerStack[layerStack.length - 1]!;
      prev.removeAttribute('aria-hidden');
      prev.removeAttribute('inert');
    }
  },

  /**
   * Mount (or re-bind) a focusable, SR-only-by-default button mirroring a
   * canvas control on the active layer.
   */
  mountAction(id: string, label: string, onActivate: () => void): HTMLButtonElement | null {
    if (typeof document === 'undefined') return null;
    const container = getActiveLayer();
    if (!container) return null;

    const registry = registries.get(container)!;
    let btn = registry.get(id);

    if (!btn || !btn.isConnected) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-a11y-id', id);
      btn.setAttribute('data-testid', id);
      container.appendChild(btn);
      registry.set(id, btn);
    }

    // Replace previous click listener (clone-and-replace pattern)
    const fresh = btn.cloneNode(false) as HTMLButtonElement;
    fresh.textContent = label;
    fresh.setAttribute('aria-label', label);
    fresh.addEventListener('click', (ev) => {
      ev.preventDefault();
      onActivate();
    });
    btn.replaceWith(fresh);
    registry.set(id, fresh);
    return fresh;
  },

  /** Remove a single action button from the active layer. */
  unmount(id: string): void {
    const container = getActiveLayer();
    if (!container) return;
    const registry = registries.get(container);
    registry?.get(id)?.remove();
    registry?.delete(id);
  },

  /** Remove every action button on the active layer. */
  unmountAll(): void {
    const container = getActiveLayer();
    if (container) {
      container.innerHTML = '';
      registries.get(container)?.clear();
    }
  },

  /** Completely reset all layers (e.g. on hard reload/app crash). */
  resetAll(): void {
    while (layerStack.length > 0) {
      this.popLayer();
    }
  },

  /**
   * Announce a state change to assistive tech via the polite live region.
   */
  announce(message: string): void {
    const live = ensureLiveRegion();
    if (!live) return;
    // Force re-announcement by clearing first
    live.textContent = '';
    requestAnimationFrame(() => {
      live.textContent = message;
    });
  },

  /** For debugging. */
  count(): number {
    const container = getActiveLayer();
    return container ? (registries.get(container)?.size ?? 0) : 0;
  },
};
