/**
 * Phase 1 tests — button hit-region plan.
 *
 * Part 1: Regression for Phase 1b multi-touch config.
 * Part 2: Unit tests for the expectHitAreaCoversMinTarget / expectRectHitZoneCoversMinTarget helpers.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { MIN_HIT_CANVAS_PX, expectRectHitZoneCoversMinTarget } from '../utils/buttonHitArea';

// ---------------------------------------------------------------------------
// Phase 1b — multi-touch config regression
// ---------------------------------------------------------------------------

describe('Phase 1b — multi-touch config', () => {
  it('src/main.ts declares activePointers >= 2', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../src/main.ts'), 'utf8');
    // The config block must set activePointers to 2 or higher.
    // Pattern matches: activePointers: 2, activePointers: 3, activePointers: 4, …
    const match = src.match(/activePointers\s*:\s*(\d+)/);
    expect(match, 'activePointers not found in src/main.ts').toBeTruthy();
    const value = parseInt(match![1]!, 10);
    expect(value).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Helper unit tests — expectRectHitZoneCoversMinTarget
// ---------------------------------------------------------------------------

describe('MIN_HIT_CANVAS_PX', () => {
  it('equals ceil(44 / 0.45) = 98', () => {
    expect(MIN_HIT_CANVAS_PX).toBe(98);
  });
});

describe('expectRectHitZoneCoversMinTarget', () => {
  const makeRect = (w: number, h: number) =>
    ({ width: w, height: h }) as unknown as import('phaser').GameObjects.Rectangle;

  it('passes when width and height both meet the minimum', () => {
    expect(() => expectRectHitZoneCoversMinTarget(makeRect(98, 98), 'ok-btn')).not.toThrow();
    expect(() => expectRectHitZoneCoversMinTarget(makeRect(200, 100), 'wide-btn')).not.toThrow();
    expect(() => expectRectHitZoneCoversMinTarget(makeRect(98, 200), 'tall-btn')).not.toThrow();
  });

  it('throws when height is below minimum', () => {
    expect(() => expectRectHitZoneCoversMinTarget(makeRect(240, 52), 'label-submit')).toThrowError(
      /23\.4.*CSS px/
    );
  });

  it('throws when width is below minimum', () => {
    expect(() => expectRectHitZoneCoversMinTarget(makeRect(80, 200), 'narrow-btn')).toThrowError(
      /below the 98 canvas px/
    );
  });

  it('throws when both dimensions are below minimum', () => {
    expect(() => expectRectHitZoneCoversMinTarget(makeRect(44, 44), 'tiny-btn')).toThrowError(
      /below the 98 canvas px/
    );
  });

  it('passes with a custom minPx override', () => {
    expect(() => expectRectHitZoneCoversMinTarget(makeRect(44, 44), 'custom', 44)).not.toThrow();
  });

  it('error message includes CSS px equivalent', () => {
    let msg = '';
    try {
      expectRectHitZoneCoversMinTarget(makeRect(120, 48), 'snap-card');
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain('21.6'); // 48 × 0.45
    expect(msg).toContain('CSS px');
    expect(msg).toContain('snap-card');
  });
});
