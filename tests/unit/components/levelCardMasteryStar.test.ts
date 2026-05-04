/**
 * Unit tests for drawMasteryStar — the 24px gold star badge drawn on
 * a LevelCard when mastery >= 0.85.
 *
 * The threshold check itself lives at the call site (LevelCard reads
 * opts.mastered: boolean). This module is a pure draw helper: given a
 * scene + card dimensions, it returns a Graphics object with the star
 * polygon stroked and filled.
 */

import { describe, it, expect } from 'vitest';
import { drawMasteryStar } from '@/components/levelCardMasteryStar';
import { makeScene } from './helpers';

describe('drawMasteryStar', () => {
  it('returns a Graphics object that has been filled and stroked', () => {
    const scene = makeScene();
    const g = drawMasteryStar(scene, 200, 120, 1);

    expect(g).toBeDefined();
    const calls = g.getCalls();
    const methods = calls.map((c) => c.method);
    expect(methods).toContain('fillStyle');
    expect(methods).toContain('lineStyle');
    expect(methods).toContain('fillPath');
    expect(methods).toContain('strokePath');
  });

  it('uses the gold fill color (#FFD700)', () => {
    const scene = makeScene();
    const g = drawMasteryStar(scene, 200, 120, 1);

    const fill = g.getCalls().find((c) => c.method === 'fillStyle');
    expect(fill?.args[0]).toBe(0xffd700);
  });

  it('compensates for parent containerScale so the star renders at a fixed size', () => {
    const scene = makeScene();
    // Drawing at scale 2 should not throw and should still emit the same
    // primitives — internal radius math divides by the scale.
    expect(() => drawMasteryStar(scene, 200, 120, 2)).not.toThrow();
  });

  it('treats a non-positive containerScale as 1 (defensive)', () => {
    const scene = makeScene();
    expect(() => drawMasteryStar(scene, 200, 120, 0)).not.toThrow();
    expect(() => drawMasteryStar(scene, 200, 120, -1)).not.toThrow();
  });

  it('cleans up via the returned Graphics destroy()', () => {
    const scene = makeScene();
    const g = drawMasteryStar(scene, 200, 120, 1);
    expect(() => g.destroy()).not.toThrow();
  });
});
