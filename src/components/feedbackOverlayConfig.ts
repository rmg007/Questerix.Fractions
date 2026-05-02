/**
 * FeedbackOverlay constants — extracted from FeedbackOverlay.ts to keep the
 * component under the 300 LOC component budget.
 *
 * Visual values reflect the T1 spec from Phase 3 (panel 260px, corner 32px,
 * icon 72px). Color hex pairs were R11-tuned for WCAG AA contrast.
 */

export type FeedbackKind = 'correct' | 'incorrect' | 'close';

// ── Timing ────────────────────────────────────────────────────────────────────
export const SLIDE_MS = 280;
export const FADE_MS = 140;
export const DISPLAY_MS: Record<FeedbackKind, number> = {
  correct: 1400,
  incorrect: 1600,
  close: 1200,
};

// ── Panel dimensions (T1 visual specs) ────────────────────────────────────────
export const PANEL_H = 260;
export const CORNER_R = 32;
export const ICON_FONT_SIZE = '72px';
export const LABEL_FONT_SIZE = '28px';

// ── Colors (R11: WCAG AA contrast ratios) ─────────────────────────────────────
const COLOR_CORRECT = 0xa8e6c8; // text #0D5A2E = 7.35:1
const COLOR_INCORRECT = 0xffccd6; // text #660017 = 8.42:1
const COLOR_CLOSE = 0xf59e0b; // text #1e3a8a = 6.78:1

export interface FeedbackKindConfig {
  color: number;
  textHex: string;
  text: string;
  icon: string;
}

export const KIND_CONFIG: Record<FeedbackKind, FeedbackKindConfig> = {
  correct: { color: COLOR_CORRECT, textHex: '#0D5A2E', text: 'Correct! 🌟', icon: '✓' },
  incorrect: {
    color: COLOR_INCORRECT,
    textHex: '#660017',
    text: 'Not quite — try again!',
    icon: '✗',
  },
  close: { color: COLOR_CLOSE, textHex: '#1e3a8a', text: 'Almost! Adjust a little.', icon: '~' },
};

/** Default panel color used before show() configures the kind. */
export const DEFAULT_PANEL_COLOR = COLOR_CORRECT;

/** Emitted when the overlay has fully dismissed. */
export const FEEDBACK_DISMISSED_EVENT = 'feedback-dismissed';
