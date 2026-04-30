/**
 * SkipLink — WCAG 2.4.1 Bypass Blocks.
 * Renders a visually-hidden <a> that becomes visible on keyboard focus,
 * moving focus to the Phaser canvas so keyboard/switch users can skip nav.
 * Inject once at boot via SkipLink.inject().
 * per interaction-model.md §9 (keyboard/switch access)
 */

const SKIP_LINK_ID = 'qf-skip-link';
const CANVAS_ID = 'qf-canvas';

/**
 * Ensure the Phaser canvas has the expected id, ARIA labels, and role.
 * Call after Phaser initialises its canvas element.
 * per interaction-model.md §9 (canvas accessibility)
 */
export function labelCanvas(): void {
  try {
    const canvas = document.querySelector('canvas');
    if (canvas && !canvas.id) {
      canvas.id = CANVAS_ID;
      // C6.6: Add ARIA labels and role for screen readers
      canvas.setAttribute('aria-label', 'Questerix Fractions game canvas');
      canvas.setAttribute('role', 'application');
      canvas.setAttribute('data-testid', 'phaser-canvas');
      // Canvas must be focusable for the skip link to land focus on it.
      if (!canvas.hasAttribute('tabindex')) {
        canvas.setAttribute('tabindex', '-1');
      }
    }
  } catch (err) {
    // Non-browser env — safe to ignore.
  }
}

/**
 * Inject the skip link into the DOM at the very top of <body>.
 * Idempotent — calling more than once is a no-op.
 */
export function injectSkipLink(): void {
  try {
    if (document.getElementById(SKIP_LINK_ID)) return;

    const link = document.createElement('a');
    link.id = SKIP_LINK_ID;
    link.href = `#${CANVAS_ID}`;
    link.textContent = 'Skip to game';

    // Visually hidden until focused — standard clip-pattern skip link technique.
    Object.assign(link.style, {
      position: 'absolute',
      top: '-9999px',
      left: '-9999px',
      zIndex: '9999',
      padding: '8px 16px',
      background: '#ffffff',
      color: '#1a1a2e',
      fontFamily: '"Lexend", "Nunito", system-ui, sans-serif',
      fontSize: '16px',
      fontWeight: 'bold',
      borderRadius: '4px',
      textDecoration: 'none',
      outline: '3px solid #6c47ff',
    });

    link.addEventListener('focus', () => {
      link.style.top = '8px';
      link.style.left = '8px';
    });

    link.addEventListener('blur', () => {
      link.style.top = '-9999px';
      link.style.left = '-9999px';
    });

    document.body.insertBefore(link, document.body.firstChild);
  } catch (err) {
    // DOM manipulation failed — safe to swallow (game still runs).
  }
}

/** Remove skip link from the DOM (call on game destroy). */
export function removeSkipLink(): void {
  document.getElementById(SKIP_LINK_ID)?.remove();
}

