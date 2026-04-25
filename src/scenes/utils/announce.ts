/**
 * announce() — unified accessibility + TTS helper.
 * Writes to the ARIA-live region and speaks via TTS in one call.
 * per docs/30-architecture/accessibility.md §6 (screen reader) and §7 (TTS)
 */

import { AccessibilityAnnouncer } from '@/components/AccessibilityAnnouncer';
import { tts } from '@/audio';

export interface AnnounceOptions {
  /** If true, cancels any in-progress speech before speaking (default: false). */
  interrupt?: boolean;
}

/**
 * Announce text to screen readers (ARIA-live) and speak it via TTS.
 * Both channels are independent — either may be unavailable without affecting the other.
 */
export function announce(text: string, _opts?: AnnounceOptions): void {
  AccessibilityAnnouncer.announce(text);
  tts.speak(text);
}
