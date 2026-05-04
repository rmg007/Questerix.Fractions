/**
 * Unit tests for SymbolicFractionDisplay — renders a/b notation.
 *
 * SKIP: legacy stub tests use options-bag construction
 * (`new SymbolicFractionDisplay(scene, { x, y, numerator, denominator })`)
 * + `display.update({...})`, but the real component uses positional args
 * + `setFraction(...)` and depends on real Phaser text-metric measurement
 * to position the vinculum bar between numerator and denominator glyphs.
 * Re-enable after rewriting against the current API or once a Phaser
 * canvas test environment is wired up.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { SymbolicFractionDisplay } from '@/components/SymbolicFractionDisplay';
import { makeScene } from './helpers';

describe.skip('SymbolicFractionDisplay', () => {
  it('renders a/b format (3/4)', () => {
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const display: any = new (SymbolicFractionDisplay as any)(scene as any, {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const display: any = new (SymbolicFractionDisplay as any)(scene as any, {
      x: 0,
      y: 0,
      numerator: undefined,
      denominator: undefined,
    });

    expect(display).toBeDefined();
  });

  it('handles negative numerator gracefully', () => {
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const display: any = new (SymbolicFractionDisplay as any)(scene as any, {
      x: 0,
      y: 0,
      numerator: -1,
      denominator: 4,
    });

    expect(() => display.update({ numerator: -1, denominator: 4 })).not.toThrow();
  });

  it('updates text on model change', () => {
    const scene = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const display: any = new (SymbolicFractionDisplay as any)(scene as any, {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const display: any = new (SymbolicFractionDisplay as any)(scene as any, {
      x: 0,
      y: 0,
      numerator: 1,
      denominator: 2,
    });

    expect(() => display.destroy()).not.toThrow();
  });
});
