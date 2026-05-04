/**
 * Unit tests for AccessibilityAnnouncer — ARIA live region for screen readers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccessibilityAnnouncer } from '@/components/AccessibilityAnnouncer';

describe('AccessibilityAnnouncer', () => {
  beforeEach(() => {
    const existing = document.getElementById('qf-a11y-live');
    if (existing) existing.remove();
    // Stub requestAnimationFrame to fire synchronously
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    const region = document.getElementById('qf-a11y-live');
    if (region) region.remove();
  });

  it('injects aria-live region into DOM', () => {
    AccessibilityAnnouncer.announce('Test');
    const region = document.getElementById('qf-a11y-live');

    expect(region).toBeInstanceOf(HTMLElement);
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.getAttribute('aria-atomic')).toBe('true');
  });

  it('announces text to live region', () => {
    AccessibilityAnnouncer.announce('Test message');

    const region = document.getElementById('qf-a11y-live');
    expect(region?.textContent).toBe('Test message');
  });

  it('handles multiple messages in sequence', () => {
    AccessibilityAnnouncer.announce('First');
    AccessibilityAnnouncer.announce('Second');

    const region = document.getElementById('qf-a11y-live');
    expect(region?.textContent).toBe('Second');
  });

  it('destroys the region idempotently', () => {
    AccessibilityAnnouncer.announce('Message');
    const region = document.getElementById('qf-a11y-live');

    expect(region).toBeDefined();

    AccessibilityAnnouncer.destroy();
    expect(document.getElementById('qf-a11y-live')).toBeNull();

    // Calling destroy again should not throw
    expect(() => AccessibilityAnnouncer.destroy()).not.toThrow();
  });

  it('handles empty message gracefully', () => {
    expect(() => AccessibilityAnnouncer.announce('')).not.toThrow();

    const region = document.getElementById('qf-a11y-live');
    expect(region?.textContent).toBe('');
  });

  it('clears text before announcing new message', () => {
    AccessibilityAnnouncer.announce('First');

    const region = document.getElementById('qf-a11y-live');
    expect(region?.textContent).toBe('First');

    // Announce the same text again - should still clear and re-announce
    AccessibilityAnnouncer.announce('First');

    expect(region?.textContent).toBe('First');
  });
});
