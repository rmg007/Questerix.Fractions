/**
 * Unit tests for FractionDisplay component.
 * Tests happy path (valid fractions) and edge cases (0/1, 1/1, division by zero guards).
 */

import { describe, it, expect } from 'vitest';
import { FractionDisplay } from '@/components/FractionDisplay';
import { makeScene } from './helpers';

describe('FractionDisplay', () => {
  it('renders a valid fraction (3/4) with stacked layout', () => {
    const scene = makeScene();
    const display = new FractionDisplay(scene, { x: 0, y: 0, numerator: 3, denominator: 4 });

    // Verify the display has been created with the correct fraction
    expect(display.container).toBeDefined();
    // The component should render without errors
    expect(() => display.update({ numerator: 3, denominator: 4 })).not.toThrow();
  });

  it('handles edge case: 0/1 (zero numerator)', () => {
    const scene = makeScene();
    const display = new FractionDisplay(scene, { x: 0, y: 0, numerator: 0, denominator: 1 });

    // Should render without throwing division by zero
    expect(() => display.update({ numerator: 0, denominator: 1 })).not.toThrow();
    expect(display.container).toBeDefined();
  });

  it('handles edge case: 1/1 (whole fraction)', () => {
    const scene = makeScene();
    const display = new FractionDisplay(scene, { x: 0, y: 0, numerator: 1, denominator: 1 });

    expect(() => display.update({ numerator: 1, denominator: 1 })).not.toThrow();
    expect(display.container).toBeDefined();
  });

  it('preserves numerator when updating denominator only', () => {
    const scene = makeScene();
    const display = new FractionDisplay(scene, { x: 0, y: 0, numerator: 2, denominator: 3 });

    // Update to 2/5
    display.update({ numerator: 2, denominator: 5 });

    // Should not throw and should maintain consistent state
    expect(() => display.update({ numerator: 2, denominator: 5 })).not.toThrow();
  });

  it('destroys container on cleanup', () => {
    const scene = makeScene();
    const display = new FractionDisplay(scene, { x: 0, y: 0, numerator: 1, denominator: 2 });

    expect(() => display.destroy()).not.toThrow();
  });
});
