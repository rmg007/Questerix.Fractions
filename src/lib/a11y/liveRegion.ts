/**
 * liveRegion — DOM-based ARIA live region announcements for screen readers.
 *
 * Phaser renders to canvas; screen readers cannot read canvas content. This
 * module injects real DOM `aria-live` divs so feedback text (correct/incorrect,
 * level complete, etc.) is announced by VoiceOver, NVDA, TalkBack, and others.
 *
 * Two regions are created:
 * - `aria-live="polite"` — used for non-urgent feedback (correct answers, hints)
 * - `aria-live="assertive"` — used for urgent feedback (incorrect, level complete)
 *
 * Debounce: identical messages within 1 s collapse to prevent repetitive
 * chatter on rapid input (K–2 children may tap quickly).
 *
 * per WCAG 2.1 AA SC 4.1.3 (Status Messages)
 * per docs/30-architecture/a11y-announcement-order.md (Phase 2 — Live regions)
 */

const POLITE_ID = 'qf-live-polite';
const ASSERTIVE_ID = 'qf-live-assertive';

/** Tracks the last announcement per urgency to enable deduplication. */
const lastAnnouncement: Record<'polite' | 'assertive', { text: string; at: number }> = {
  polite: { text: '', at: 0 },
  assertive: { text: '', at: 0 },
};

/** Deduplication window in milliseconds. */
const DEDUPE_WINDOW_MS = 1000;

/**
 * Create and append a visually-hidden aria-live div to document.body.
 * Returns null in non-browser environments (SSR, unit tests without jsdom).
 */
function createLiveDiv(id: string, urgency: 'polite' | 'assertive'): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  el.setAttribute('aria-live', urgency);
  el.setAttribute('aria-atomic', 'true');
  el.setAttribute('role', urgency === 'assertive' ? 'alert' : 'status');
  // Visually hidden but screen-reader accessible (SR-only pattern)
  Object.assign(el.style, {
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
  document.body.appendChild(el);
  return el;
}

/**
 * Initialise both polite and assertive aria-live regions in document.body.
 *
 * Must be called once at app startup (from `main.ts`), before `new Phaser.Game()`.
 * Safe to call multiple times — idempotent (existing elements are reused).
 */
export function initLiveRegions(): void {
  if (typeof document === 'undefined') return;
  if (!document.getElementById(POLITE_ID)) {
    createLiveDiv(POLITE_ID, 'polite');
  }
  if (!document.getElementById(ASSERTIVE_ID)) {
    createLiveDiv(ASSERTIVE_ID, 'assertive');
  }
}

/**
 * Announce `text` via the appropriate ARIA live region.
 *
 * @param text    Human-readable message for the screen reader.
 *                Never pass internal codes (e.g. "WRONG") — use child-friendly copy.
 * @param urgency `'polite'` for correct/hints; `'assertive'` for incorrect/level-complete.
 *
 * Deduplication: if the same `text` was announced via the same urgency channel
 * within the last 1 second, the call is silently dropped to avoid repetitive chatter.
 *
 * @example
 * announce('Great job! That is correct.', 'polite');
 * announce('Not quite — try again!', 'assertive');
 */
export function announce(text: string, urgency: 'polite' | 'assertive'): void {
  if (typeof document === 'undefined') return;
  if (!text) return;

  // Deduplicate: same message within 1 s on the same channel → skip
  const prev = lastAnnouncement[urgency];
  const now = Date.now();
  if (prev.text === text && now - prev.at < DEDUPE_WINDOW_MS) return;

  lastAnnouncement[urgency] = { text, at: now };

  const id = urgency === 'assertive' ? ASSERTIVE_ID : POLITE_ID;
  let el = document.getElementById(id);
  if (!el) {
    // Lazily create if initLiveRegions() was not called (defensive fallback)
    el = createLiveDiv(id, urgency);
  }

  // Force re-announcement: clear first, then set on next animation frame.
  // Screen readers only announce when textContent *changes*, so clearing
  // first ensures the same string is re-announced if repeated after > 1 s.
  el.textContent = '';
  requestAnimationFrame(() => {
    if (el) el.textContent = text;
  });
}
