/**
 * DOM Orphan Check — verifies no A11yLayer elements remain after teardown.
 * Used in lifecycle tests to verify the Phase 7 gate criterion:
 * "DOM-orphan check after teardown = 0"
 */

const CONTAINER_ID_PREFIX = 'qf-a11y-layer-';
const STYLE_ID = 'qf-a11y-style';
const LIVE_REGION_ID = 'qf-a11y-live';

/**
 * Count orphaned A11y layer elements in the DOM.
 * Returns 0 if clean, throws with details if orphans found.
 *
 * Note: The style element and live region are global infrastructure created
 * once per session. We only flag as orphans if there are actual layer containers.
 */
export function expectZeroA11yOrphans(): number {
  if (typeof document === 'undefined') return 0;

  const containers = Array.from(document.querySelectorAll(`div[id^="${CONTAINER_ID_PREFIX}"]`));

  if (containers.length > 0) {
    const details = `Found ${containers.length} orphaned layer container(s): ${containers.map((c) => c.id).join(', ')}`;
    throw new Error(`A11y layer orphans detected:\n${details}`);
  }

  return 0;
}

/**
 * Clean up all A11y layer elements from the DOM.
 * Useful for test cleanup between test cases.
 */
export function cleanupA11yDOM(): void {
  if (typeof document === 'undefined') return;

  document.querySelectorAll(`div[id^="${CONTAINER_ID_PREFIX}"]`).forEach((el) => {
    el.remove();
  });

  const style = document.getElementById(STYLE_ID);
  if (style) {
    style.remove();
  }

  const liveRegion = document.getElementById(LIVE_REGION_ID);
  if (liveRegion) {
    liveRegion.remove();
  }
}
