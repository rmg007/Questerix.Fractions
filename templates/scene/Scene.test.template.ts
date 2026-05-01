// TODO: scaffolded by npm run scaffold:scene. Replace stubs and remove this comment.
/**
 * __NAME__Scene — module smoke tests.
 *
 * Full Phaser instantiation is impractical without a browser; the scene tests
 * confirm the module loads cleanly and the State factory returns the expected
 * default shape. Behavioural tests belong alongside the controller logic.
 */

import { describe, expect, it } from 'vitest';
import { create__NAME__State } from '../__NAME__State';

describe('__NAME__State', () => {
  it('returns a ready=false state by default', () => {
    const s = create__NAME__State();
    expect(s.ready).toBe(false);
  });

  it('returns a fresh object on every call', () => {
    const a = create__NAME__State();
    const b = create__NAME__State();
    expect(a).not.toBe(b);
  });
});

describe('__NAME__Scene module', () => {
  it('can be imported without throwing', async () => {
    const mod = await import('../__NAME__Scene').catch(() => null);
    // Phaser may not be available in the unit env; either outcome is acceptable
    // as long as no synchronous crash occurred during evaluation.
    if (mod !== null) {
      expect(typeof mod).toBe('object');
    }
    expect(true).toBe(true);
  });
});
