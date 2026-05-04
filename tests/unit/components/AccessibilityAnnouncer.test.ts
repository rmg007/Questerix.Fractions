/**
 * Unit tests for AccessibilityAnnouncer — ARIA live region for screen readers.
 */

import { describe, it, expect } from 'vitest';
import { AccessibilityAnnouncer } from '@/components/AccessibilityAnnouncer';

describe('AccessibilityAnnouncer', () => {
  it('injects aria-live region into DOM', () => {
    const announcer = new AccessibilityAnnouncer();

    expect(announcer.region).toBeInstanceOf(HTMLElement);
    expect(announcer.region.getAttribute('aria-live')).toBe('polite');
  });

  it('appends text nodes on announce()', () => {
    const announcer = new AccessibilityAnnouncer();

    announcer.announce('Test message');

    expect(announcer.region.textContent).toContain('Test message');
  });

  it('handles multiple messages in sequence', () => {
    const announcer = new AccessibilityAnnouncer();

    announcer.announce('First');
    announcer.announce('Second');

    expect(announcer.region.textContent).toContain('First');
    expect(announcer.region.textContent).toContain('Second');
  });

  it('clears queue on destroy', () => {
    const announcer = new AccessibilityAnnouncer();

    announcer.announce('Message');
    announcer.destroy();

    expect(announcer.region.children.length).toBe(0);
  });

  it('handles empty message gracefully', () => {
    const announcer = new AccessibilityAnnouncer();

    expect(() => announcer.announce('')).not.toThrow();
  });

  it('supports polite (default) and assertive modes', () => {
    const politeAnnouncer = new AccessibilityAnnouncer({ politeness: 'polite' });
    const assertiveAnnouncer = new AccessibilityAnnouncer({ politeness: 'assertive' });

    expect(politeAnnouncer.region.getAttribute('aria-live')).toBe('polite');
    expect(assertiveAnnouncer.region.getAttribute('aria-live')).toBe('assertive');
  });
});
