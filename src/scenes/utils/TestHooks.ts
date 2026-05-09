/**
 * TestHooks — DOM sentinel manager for Playwright e2e tests.
 * Injects hidden DOM nodes alongside the Phaser canvas so tests can query
 * data-testid attributes. No visible impact on UI or accessibility tree.
 * per test-strategy.md §1.3 — sentinels mirror active scene/state.
 *
 * IMPORTANT: Must be no-op safe in jsdom/SSR (typeof document guard).
 */

const CONTAINER_ID = 'qf-testhooks';

// Test hooks are only enabled when ?testHooks=1 is in the URL or in dev mode.
// Production users never see the invisible interactive overlays that mount
// transparent L6/L7 shortcut buttons over the menu.
export function testHooksEnabled(): boolean {
  if (typeof window === 'undefined') return true; // jsdom / node — let tests run
  try {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('testHooks') === '1') return true;
  } catch (err) {
    /* ignore */
  }
  // Vite injects import.meta.env.DEV at build time
  try {
    return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  } catch (err) {
    return false;
  }
}

/** @internal */
function getOrCreateContainer(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText =
      'position:absolute;top:0;left:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:99999;';
    document.body?.appendChild(el);
  }
  return el;
}

const registry = new Map<string, HTMLElement>();

// ResizeObserver instances keyed by testid so unmount() can disconnect them.
const resizeObservers = new Map<string, ResizeObserver>();

export const TestHooks = {
  /** Check if test hooks are currently enabled. */
  isEnabled(): boolean {
    return testHooksEnabled();
  },
  /**
   * Mount a hidden, non-interactive sentinel div with the given data-testid.
   * Safe to call multiple times — returns existing element if already mounted.
   */
  mountSentinel(testid: string): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const existing = registry.get(testid);
    if (existing && existing.isConnected) return existing;

    const container = getOrCreateContainer();
    if (!container) return null;

    const el = document.createElement('div');
    el.setAttribute('data-testid', testid);
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;pointer-events:none;overflow:hidden;z-index:-1;';
    container.appendChild(el);
    registry.set(testid, el);
    return el;
  },

  /**
   * Mount an interactive, transparent overlay button positioned over the canvas.
   * The button forwards clicks to the provided handler.
   * z-index is high enough to sit above the Phaser canvas.
   *
   * Percentage opts (e.g. top:'35%') are interpreted as percentages of the
   * logical game canvas (800×1280). Pixel opts are passed through as-is.
   *
   * Positioning is applied via requestAnimationFrame so the canvas has been
   * laid out by the browser before we call getBoundingClientRect(). A
   * ResizeObserver keeps the button anchored when the viewport resizes.
   */
  mountInteractive(
    testid: string,
    onClick: () => void,
    opts?: { top?: string; left?: string; width?: string; height?: string }
  ): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    // Production guard: invisible interactive overlays must NEVER ship to real users.
    // They are e2e affordances only. Enable with ?testHooks=1 or in dev mode.
    if (!testHooksEnabled()) return null;
    // Remove stale button if it exists
    this.unmount(testid);

    const container = getOrCreateContainer();
    if (!container) return null;

    const btn = document.createElement('button');
    btn.setAttribute('data-testid', testid);
    btn.setAttribute('tabindex', '-1');

    // Start off-screen; positionBtn() will move it into place after layout.
    btn.style.cssText = [
      'position:fixed',
      'top:-9999px',
      'left:-9999px',
      'width:1px',
      'height:1px',
      'transform:translate(-50%,-50%)',
      'opacity:0.01',
      'cursor:pointer',
      'z-index:9999',
      'background:transparent',
      'border:none',
      'padding:0',
      'pointer-events:auto',
    ].join(';');
    btn.addEventListener('click', onClick);
    container.appendChild(btn);
    registry.set(testid, btn);

    // Compute and apply the canvas-relative position. Returns false when the
    // canvas is not yet rendered (rect is zero-sized), so the caller can retry.
    const positionBtn = (): boolean => {
      if (!btn.isConnected) return true; // element removed — stop retrying
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false; // layout pending

      const gameW = 800;
      const gameH = 1280;
      const scaleX = rect.width / gameW;
      const scaleY = rect.height / gameH;

      let top = opts?.top ?? '50%';
      let left = opts?.left ?? '50%';
      let width = opts?.width ?? '80px';
      let height = opts?.height ?? '80px';

      if (opts?.top?.endsWith('%')) {
        top = `${(parseFloat(opts.top) / 100) * gameH * scaleY + rect.top}px`;
      }
      if (opts?.left?.endsWith('%')) {
        left = `${(parseFloat(opts.left) / 100) * gameW * scaleX + rect.left}px`;
      }
      if (opts?.width?.endsWith('px')) {
        width = `${parseFloat(opts.width) * scaleX}px`;
      }
      if (opts?.height?.endsWith('px')) {
        height = `${parseFloat(opts.height) * scaleY}px`;
      }

      btn.style.top = top;
      btn.style.left = left;
      btn.style.width = width;
      btn.style.height = height;
      return true;
    };

    // Try immediately (canvas already rendered), then retry via rAF to catch
    // the common case where layout hasn't been flushed during scene create().
    if (!positionBtn()) {
      requestAnimationFrame(() => {
        positionBtn();
      });
    }

    // Reposition whenever the canvas resizes (orientation changes, window resize).
    const canvas = document.querySelector('canvas');
    if (canvas && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        positionBtn();
      });
      ro.observe(canvas);
      resizeObservers.set(testid, ro);
    }

    return btn;
  },

  /** Remove a sentinel/interactive button by testid. */
  unmount(testid: string): void {
    resizeObservers.get(testid)?.disconnect();
    resizeObservers.delete(testid);
    const el = registry.get(testid);
    if (el) {
      el.remove();
      registry.delete(testid);
    }
  },

  /** Remove all mounted sentinels. Call on scene shutdown. */
  unmountAll(): void {
    resizeObservers.forEach((ro) => ro.disconnect());
    resizeObservers.clear();
    registry.forEach((el) => el.remove());
    registry.clear();
  },

  /** Update aria-valuenow on a sentinel (e.g. progress bar). */
  setAriaValueNow(testid: string, n: number): void {
    const el = registry.get(testid);
    el?.setAttribute('aria-valuenow', String(n));
  },

  /** Set text content on a sentinel (e.g. hint-text). */
  setText(testid: string, text: string): void {
    const el = registry.get(testid);
    if (el) el.textContent = text;
  },

  /** Convenience: return the registered element for testid. */
  get(testid: string): HTMLElement | undefined {
    return registry.get(testid);
  },
};
