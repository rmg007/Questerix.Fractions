/**
 * Unit tests for PreferenceToggle component.
 * Tests DOM accessibility (ARIA), toggle state, and change callbacks.
 *
 * SKIP: legacy stub tests use a `(container, { label, initialValue,
 * onChange })` signature returning a `toggle.element` HTMLButtonElement.
 * The real `PreferenceToggle` takes `(opts: { key, label, ... },
 * position: { top, left })`, persists to `deviceMetaRepo`, and creates
 * its own document-mounted overlay container — it does not accept an
 * external host element. Re-enable after rewriting against the current
 * deviceMeta-backed API.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { PreferenceToggle } from '@/components/PreferenceToggle';

describe.skip('PreferenceToggle', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders a toggle switch with correct ARIA attributes', () => {
    const toggle = new PreferenceToggle(container, {
      label: 'Reduce motion',
      initialValue: false,
      onChange: vi.fn(),
    });

    expect(toggle.element).toBeInstanceOf(HTMLButtonElement);
    expect(toggle.element.getAttribute('role')).toBe('switch');
    expect(toggle.element.getAttribute('aria-label')).toContain('Reduce motion');
  });

  it('reflects initial state in aria-checked', () => {
    const toggle = new PreferenceToggle(container, {
      label: 'High contrast',
      initialValue: true,
      onChange: vi.fn(),
    });

    expect(toggle.element.getAttribute('aria-checked')).toBe('true');
  });

  it('calls onChange callback when toggled', () => {
    const onChange = vi.fn();
    const toggle = new PreferenceToggle(container, {
      label: 'Test toggle',
      initialValue: false,
      onChange,
    });

    toggle.element.click();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('updates aria-checked when state changes', () => {
    const onChange = vi.fn();
    const toggle = new PreferenceToggle(container, {
      label: 'Toggle',
      initialValue: false,
      onChange,
    });

    toggle.element.click();
    expect(toggle.element.getAttribute('aria-checked')).toBe('true');

    toggle.element.click();
    expect(toggle.element.getAttribute('aria-checked')).toBe('false');
  });

  it('supports keyboard activation (Enter key)', () => {
    const onChange = vi.fn();
    const toggle = new PreferenceToggle(container, {
      label: 'Keyboard test',
      initialValue: false,
      onChange,
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    toggle.element.dispatchEvent(event);
    toggle.element.click(); // simulate activation

    expect(onChange).toHaveBeenCalled();
  });

  it('cleans up on destroy', () => {
    const toggle = new PreferenceToggle(container, {
      label: 'Test',
      initialValue: false,
      onChange: vi.fn(),
    });

    expect(() => toggle.destroy()).not.toThrow();
  });
});
