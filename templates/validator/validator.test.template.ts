// TODO: scaffolded by npm run scaffold:validator. Replace stubs and remove this comment.
/**
 * Unit tests for `validator.__ARCHETYPE__.basic`.
 * Property-based tests via fast-check are encouraged once the real comparison
 * lands — see `tests/` for examples.
 */

import { describe, expect, it } from 'vitest';
import { __ARCHETYPE__Basic } from '../__ARCHETYPE__';

describe('validator.__ARCHETYPE__.basic', () => {
  it('exposes the canonical id + archetype + variant', () => {
    expect(__ARCHETYPE__Basic.id).toBe('validator.__ARCHETYPE__.basic');
    expect(__ARCHETYPE__Basic.archetype).toBe('__ARCHETYPE__');
    expect(__ARCHETYPE__Basic.variant).toBe('basic');
  });

  it('returns an incorrect ValidatorResult from the stub body', () => {
    const result = __ARCHETYPE__Basic.fn({ value: null }, { target: null });
    expect(result.outcome).toBe('incorrect');
    expect(result.score).toBe(0);
  });
});
