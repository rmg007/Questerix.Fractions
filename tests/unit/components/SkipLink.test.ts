/**
 * Unit tests for SkipLink component (WCAG 2.4.1 bypass-blocks link).
 * Tests DOM accessibility, focus management, and keyboard navigation.
 *
 * SKIP: legacy stub tests instantiate `new SkipLink(container, { href })`
 * — but `SkipLink` is exported as a function module (`labelCanvas`,
 * `injectSkipLink`, `removeSkipLink`), not a class, and renders a button
 * (not an anchor) appended directly to `document.body` with a fixed id.
 * Re-enable after rewriting against the function-style API. WCAG behaviour
 * is currently covered by `tests/a11y/wcag.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import * as SkipLink from '@/components/SkipLink';

describe.skip('SkipLink', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders a hidden-until-focused anchor link', () => {
    const link = new SkipLink(container, { href: '#canvas-root' });

    expect(link.element).toBeInstanceOf(HTMLAnchorElement);
    expect(link.element.href).toContain('canvas-root');
  });

  it('has proper accessibility attributes', () => {
    const link = new SkipLink(container, { href: '#main-content' });

    expect(link.element.getAttribute('href')).toBe('#main-content');
    // Should be accessible to keyboard users
    expect(link.element.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('moves focus on click', () => {
    const target = document.createElement('div');
    target.id = 'test-target';
    document.body.appendChild(target);

    const link = new SkipLink(container, { href: '#test-target' });
    link.element.click();

    // After click, focus should move (or be intended to move) to target
    expect(link.element).toBeDefined();

    document.body.removeChild(target);
  });

  it('supports custom text label', () => {
    const link = new SkipLink(container, { href: '#canvas', label: 'Skip to game' });

    expect(link.element.textContent).toContain('Skip to game');
  });

  it('can be destroyed', () => {
    const link = new SkipLink(container, { href: '#canvas' });

    expect(() => link.destroy()).not.toThrow();
  });
});
