/**
 * Unit tests for the adaptive level router (src/engine/router.ts).
 * Covers: calibration freeze, regression detection, level-up routing,
 * stay routing, and boundary clamping.
 *
 * per runtime-architecture.md §11 (routing rules)
 */

import { describe, it, expect } from 'vitest';
import { decideNextLevel } from '@/engine/router';
import { MASTERY_THRESHOLD } from '@/engine/bkt';
import type { RouterArgs } from '@/engine/router';
import type { SkillMastery } from '@/types';
import { LevelId, SkillId, StudentId } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMastery(skillId: string, estimate: number): SkillMastery {
  return {
    studentId: StudentId('s-test'),
    skillId: SkillId(skillId),
    compositeKey: [StudentId('s-test'), SkillId(skillId)],
    masteryEstimate: estimate,
    state: estimate >= MASTERY_THRESHOLD ? 'MASTERED' : 'LEARNING',
    consecutiveCorrectUnassisted: estimate >= MASTERY_THRESHOLD ? 3 : 0,
    totalAttempts: 10,
    correctAttempts: 8,
    lastAttemptAt: Date.now(),
    masteredAt: estimate >= MASTERY_THRESHOLD ? Date.now() : null,
    decayedAt: null,
    syncState: 'local',
  };
}

function masteredMap(...skillIds: string[]): Map<ReturnType<typeof SkillId>, SkillMastery> {
  return new Map(skillIds.map((id) => [SkillId(id), makeMastery(id, MASTERY_THRESHOLD)]));
}

function unmasteredMap(...skillIds: string[]): Map<ReturnType<typeof SkillId>, SkillMastery> {
  return new Map(skillIds.map((id) => [SkillId(id), makeMastery(id, 0.3)]));
}

function makeArgs(overrides: Partial<RouterArgs> = {}): RouterArgs {
  return {
    currentLevel: LevelId(3),
    masteries: new Map(),
    prereqsMet: false,
    inCalibration: false,
    recentOutcomes: [],
    ...overrides,
  };
}

// ── Rule 1: Calibration freeze (Q19 fix) ─────────────────────────────────────

describe('calibration freeze', () => {
  it('returns currentLevel unchanged when inCalibration is true', () => {
    const args = makeArgs({
      currentLevel: LevelId(5),
      inCalibration: true,
      prereqsMet: true,
      masteries: masteredMap('SK-01', 'SK-02'),
      recentOutcomes: [false, false, false, false, false],
    });
    expect(decideNextLevel(args)).toBe(5);
  });

  it('calibration freeze takes priority over regression signal', () => {
    const args = makeArgs({
      currentLevel: LevelId(4),
      inCalibration: true,
      recentOutcomes: [false, false, false, false, false],
    });
    expect(decideNextLevel(args)).toBe(4);
  });

  it('calibration freeze takes priority over level-up eligibility', () => {
    const args = makeArgs({
      currentLevel: LevelId(2),
      inCalibration: true,
      prereqsMet: true,
      masteries: masteredMap('SK-01'),
    });
    expect(decideNextLevel(args)).toBe(2);
  });
});

// ── Rule 2: Regression (route down) ──────────────────────────────────────────

describe('regression routing', () => {
  it('routes down when last 5 attempts were all wrong', () => {
    const args = makeArgs({
      currentLevel: LevelId(5),
      recentOutcomes: [false, false, false, false, false],
    });
    expect(decideNextLevel(args)).toBe(4);
  });

  it('routes down when accuracy is exactly below 40% in last 5', () => {
    // 1 correct out of 5 = 20% — below 40%
    const args = makeArgs({
      currentLevel: LevelId(5),
      recentOutcomes: [true, false, false, false, false],
    });
    expect(decideNextLevel(args)).toBe(4);
  });

  it('does NOT route down when accuracy is exactly 40% (2 correct out of 5)', () => {
    // 2/5 = 40% — not strictly below threshold
    const args = makeArgs({
      currentLevel: LevelId(5),
      recentOutcomes: [true, true, false, false, false],
    });
    // Should stay or go up, but not down
    expect(decideNextLevel(args)).toBeGreaterThanOrEqual(5);
  });

  it('does NOT route down with fewer than 5 recent outcomes', () => {
    const args = makeArgs({
      currentLevel: LevelId(5),
      recentOutcomes: [false, false, false, false], // only 4
    });
    expect(decideNextLevel(args)).toBeGreaterThanOrEqual(5);
  });

  it('clamps regression to MIN_LEVEL (1) when already at level 1', () => {
    const args = makeArgs({
      currentLevel: LevelId(1),
      recentOutcomes: [false, false, false, false, false],
    });
    expect(decideNextLevel(args)).toBe(1);
  });

  it('clamps regression to MIN_LEVEL when at level 2', () => {
    const args = makeArgs({
      currentLevel: LevelId(2),
      recentOutcomes: [false, false, false, false, false],
    });
    // Routes down to 1 (not below)
    expect(decideNextLevel(args)).toBe(1);
  });
});

// ── Rule 3: Level-up routing ──────────────────────────────────────────────────

describe('level-up routing', () => {
  it('routes up when prereqsMet AND all skills mastered', () => {
    const args = makeArgs({
      currentLevel: LevelId(3),
      prereqsMet: true,
      masteries: masteredMap('SK-01', 'SK-02'),
    });
    expect(decideNextLevel(args)).toBe(4);
  });

  it('does NOT route up when prereqsMet is false', () => {
    const args = makeArgs({
      currentLevel: LevelId(3),
      prereqsMet: false,
      masteries: masteredMap('SK-01', 'SK-02'),
    });
    expect(decideNextLevel(args)).toBe(3);
  });

  it('does NOT route up when prereqsMet but not all skills mastered', () => {
    const args = makeArgs({
      currentLevel: LevelId(3),
      prereqsMet: true,
      masteries: unmasteredMap('SK-01', 'SK-02'),
    });
    expect(decideNextLevel(args)).toBe(3);
  });

  it('does NOT route up with empty mastery map even if prereqsMet', () => {
    const args = makeArgs({
      currentLevel: LevelId(3),
      prereqsMet: true,
      masteries: new Map(),
    });
    expect(decideNextLevel(args)).toBe(3);
  });

  it('clamps level-up to MAX_LEVEL (9) when already at level 9', () => {
    const args = makeArgs({
      currentLevel: LevelId(9),
      prereqsMet: true,
      masteries: masteredMap('SK-01'),
    });
    expect(decideNextLevel(args)).toBe(9);
  });

  it('clamps level-up to MAX_LEVEL when at level 8', () => {
    const args = makeArgs({
      currentLevel: LevelId(8),
      prereqsMet: true,
      masteries: masteredMap('SK-01'),
    });
    expect(decideNextLevel(args)).toBe(9);
  });
});

// ── Rule 4: Stay ──────────────────────────────────────────────────────────────

describe('stay routing', () => {
  it('returns currentLevel when no routing rule fires', () => {
    const args = makeArgs({
      currentLevel: LevelId(4),
      prereqsMet: false,
      masteries: unmasteredMap('SK-01'),
      recentOutcomes: [true, true, true], // < 5 outcomes, no regression window
    });
    expect(decideNextLevel(args)).toBe(4);
  });

  it('stays at level with mixed recent outcomes (no failure streak)', () => {
    const args = makeArgs({
      currentLevel: LevelId(6),
      recentOutcomes: [true, false, true, true, false], // 3/5 = 60% — above 40%
    });
    expect(decideNextLevel(args)).toBe(6);
  });

  it('stays at level 1 for a brand-new student', () => {
    const args = makeArgs({
      currentLevel: LevelId(1),
      masteries: new Map(),
      prereqsMet: false,
      inCalibration: false,
      recentOutcomes: [],
    });
    expect(decideNextLevel(args)).toBe(1);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('all mastered scenario: routes up from level 5 to 6', () => {
    const mastery = masteredMap('SK-A', 'SK-B', 'SK-C');
    const args = makeArgs({
      currentLevel: LevelId(5),
      prereqsMet: true,
      masteries: mastery,
    });
    expect(decideNextLevel(args)).toBe(6);
  });

  it('nothing mastered scenario: stays at current level', () => {
    const args = makeArgs({
      currentLevel: LevelId(3),
      prereqsMet: false,
      masteries: unmasteredMap('SK-01', 'SK-02', 'SK-03'),
    });
    expect(decideNextLevel(args)).toBe(3);
  });

  it('one archetype failing scenario: routes down on failure streak', () => {
    const args = makeArgs({
      currentLevel: LevelId(7),
      recentOutcomes: [false, false, false, false, false],
    });
    expect(decideNextLevel(args)).toBe(6);
  });

  it('regression takes priority over level-up when both fire', () => {
    // Failure streak fires first per the routing priority order
    const args = makeArgs({
      currentLevel: LevelId(5),
      prereqsMet: true,
      masteries: masteredMap('SK-01'),
      recentOutcomes: [false, false, false, false, false],
    });
    // Regression wins — routes down, not up
    expect(decideNextLevel(args)).toBe(4);
  });
});
