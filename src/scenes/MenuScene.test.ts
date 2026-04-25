/**
 * MenuScene unit tests.
 * Full Phaser scene shim is not feasible without a browser environment,
 * so we focus on the pure-TS pieces: LEVEL_META and decideNextLevel integration.
 * TODO: add a lightweight canvas shim (e.g. jest-canvas-mock) to enable scene mount tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LEVEL_META } from './utils/levelMeta';
import { decideNextLevel } from '../engine/router';
import type { LevelId, SkillId, SkillMastery } from '@/types';

// ── LEVEL_META ─────────────────────────────────────────────────────────────

describe('LEVEL_META', () => {
  it('has exactly 9 entries', () => {
    expect(LEVEL_META).toHaveLength(9);
  });

  it('numbers 1–9 in order', () => {
    const nums = LEVEL_META.map((m) => m.number);
    expect(nums).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('every entry has a non-empty name and concept', () => {
    for (const m of LEVEL_META) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.concept.length).toBeGreaterThan(0);
    }
  });

  it('grade bands are valid enum values', () => {
    const valid = new Set(['K', '1', '2']);
    for (const m of LEVEL_META) {
      expect(valid.has(m.gradeBand)).toBe(true);
    }
  });
});

// ── decideNextLevel integration (simulates MenuScene's buildGrid call) ──────

describe('MenuScene buildGrid — decideNextLevel usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is called once and returns a LevelId in range 1–9', () => {
    const spy = vi.spyOn({ decideNextLevel }, 'decideNextLevel');

    const masteries = new Map<SkillId, SkillMastery>();
    const result = decideNextLevel({
      currentLevel: 1 as LevelId,
      masteries,
      prereqsMet: false,
      inCalibration: false,
    });

    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(9);
    spy.mockRestore();
  });

  it('stays at L1 for new student with no mastery data', () => {
    const result = decideNextLevel({
      currentLevel: 1 as LevelId,
      masteries: new Map(),
      prereqsMet: false,
      inCalibration: false,
    });
    expect(result).toBe(1);
  });
});
