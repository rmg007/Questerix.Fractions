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
  } catch {
    /* ignore */
  }
  // Vite injects import.meta.env.DEV at build time
  try {
    return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
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
      'position:absolute;top:0;left:0;width:0;height:0;overflow:visible;pointer-events:none;';
    document.body?.appendChild(el);
  }
  return el;
}

const registry = new Map<string, HTMLElement>();

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
    btn.setAttribute('aria-hidden', 'true');
    btn.setAttribute('tabindex', '-1');
    btn.style.cssText = [
      'position:fixed',
      `top:${opts?.top ?? '50%'}`,
      `left:${opts?.left ?? '50%'}`,
      `width:${opts?.width ?? '80px'}`,
      `height:${opts?.height ?? '80px'}`,
      'transform:translate(-50%,-50%)',
      'opacity:0',
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
    return btn;
  },

  /** Remove a sentinel/interactive button by testid. */
  unmount(testid: string): void {
    const el = registry.get(testid);
    if (el) {
      el.remove();
      registry.delete(testid);
    }
  },

  /** Remove all mounted sentinels. Call on scene shutdown. */
  unmountAll(): void {
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
