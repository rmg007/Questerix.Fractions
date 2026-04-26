/**
 * AccessibilityAnnouncer — writes outcomes to an aria-live="polite" DOM region.
 * Injects a hidden div on first call; subsequent calls reuse it.
 * per interaction-model.md §9 (keyboard/switch access, ARIA live)
 */

const REGION_ID = 'qf-a11y-live';

function getOrCreateRegion(): HTMLElement {
  let region = document.getElementById(REGION_ID);
  if (!region) {
    region = document.createElement('div');
    region.id = REGION_ID;
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', 'status');
    // Visually hidden but readable by screen readers
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0,0,0,0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    document.body.appendChild(region);
  }
  return region;
}

/**
 * Singleton announcer. Safe to import and call from any scene.
 * per interaction-model.md §9 — ARIA live for outcomes
 * C6.9: destroy() is idempotent; safe to call multiple times.
 */
export const AccessibilityAnnouncer = {
  /**
   * Announce text to screen readers via the polite live region.
   * Clears and resets content so re-announcements of the same string fire.
   * @param text - Student-facing outcome text (never internal codes like "WRONG").
   *   per interaction-model.md §5.1 — never use the word "wrong"
   */
  announce(text: string): void {
    try {
      const region = getOrCreateRegion();
      // Force repaint by clearing first — screen readers detect the change
      region.textContent = '';
      // Use requestAnimationFrame so the clear is flushed before the new text
      requestAnimationFrame(() => {
        region.textContent = text;
      });
    } catch {
      // DOM manipulation failed — safe to swallow (game still runs)
    }
  },

  /**
   * Remove the live region from the DOM.
   * Idempotent: safe to call multiple times or from multiple scenes.
   * C6.9: Uses optional chaining (?.) so no-op if already removed.
   */
  destroy(): void {
    const el = document.getElementById(REGION_ID);
    if (el) {
      el.remove();
    }
    // If already destroyed, no-op (no error thrown)
  },
};
