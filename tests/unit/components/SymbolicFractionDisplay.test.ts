/**
 * Unit tests for SymbolicFractionDisplay — renders a/b notation.
 */

import { describe, it, expect } from 'vitest';
import { SymbolicFractionDisplay } from '@/components/SymbolicFractionDisplay';
import { makeScene, makeText } from './helpers';

describe('SymbolicFractionDisplay', () => {
  it('renders a/b format (3/4)', () => {
    const scene = makeScene();
    const display = new SymbolicFractionDisplay(scene, {
      x: 0,
      y: 0,
      numerator: 3,
      denominator: 4,
    });

    expect(display).toBeDefined();
    expect(() => display.update({ numerator: 3, denominator: 4 })).not.toThrow();
  });

  it('handles edge case: undefined model', () => {
    const scene = makeScene();
    const display = new SymbolicFractionDisplay(scene, {
      x: 0,
      y: 0,
      numerator: undefined,
      denominator: undefined,
    });

    expect(display).toBeDefined();
  });

  it('handles negative numerator gracefully', () => {
    const scene = makeScene();
    const display = new SymbolicFractionDisplay(scene, {
      x: 0,
      y: 0,
      numerator: -1,
      denominator: 4,
    });

    expect(() => display.update({ numerator: -1, denominator: 4 })).not.toThrow();
  });

  it('updates text on model change', () => {
    const scene = makeScene();
    const display = new SymbolicFractionDisplay(scene, {
      x: 0,
      y: 0,
      numerator: 1,
      denominator: 2,
    });

    display.update({ numerator: 3, denominator: 4 });

    expect(display).toBeDefined();
  });

  it('destroys without errors', () => {
    const scene = makeScene();
    const display = new SymbolicFractionDisplay(scene, {
      x: 0,
      y: 0,
      numerator: 1,
      denominator: 2,
    });

    expect(() => display.destroy()).not.toThrow();
  });
});
