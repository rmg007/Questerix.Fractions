/**
 * Discrete case tests for the adaptive level router.
 * per runtime-architecture.md §11
 * Q19 fix — calibration freeze verified here
 */

import { describe, expect, it } from 'vitest';
import { decideNextLevel } from '@/engine/router';
import { MASTERY_THRESHOLD } from '@/engine/bkt';
import type { SkillMastery } from '@/types';
import { LevelId, StudentId, SkillId } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────

function masteryAt(estimate: number): SkillMastery {
  return {
    studentId: StudentId('student-1'),
    skillId: SkillId('SK-01'),
    compositeKey: [StudentId('student-1'), SkillId('SK-01')],
    masteryEstimate: estimate,
    state: estimate >= MASTERY_THRESHOLD ? 'MASTERED' : 'LEARNING',
    consecutiveCorrectUnassisted: estimate >= MASTERY_THRESHOLD ? 5 : 0,
    totalAttempts: 10,
    correctAttempts: 8,
    lastAttemptAt: Date.now(),
    masteredAt: null,
    decayedAt: null,
    syncState: 'local',
  };
}

function masteredMap(...skillIds: string[]): Map<ReturnType<typeof SkillId>, SkillMastery> {
  const map = new Map<ReturnType<typeof SkillId>, SkillMastery>();
  for (const id of skillIds) {
    const sid = SkillId(id);
    map.set(sid, { ...masteryAt(MASTERY_THRESHOLD), skillId: sid });
  }
  return map;
}

function unmasteredMap(...skillIds: string[]): Map<ReturnType<typeof SkillId>, SkillMastery> {
  const map = new Map<ReturnType<typeof SkillId>, SkillMastery>();
  for (const id of skillIds) {
    const sid = SkillId(id);
    map.set(sid, { ...masteryAt(0.5), skillId: sid });
  }
  return map;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('decideNextLevel — stays', () => {
  it('stays at current level when prereqs not met', () => {
    const result = decideNextLevel({
      currentLevel: LevelId(3),
      masteries: unmasteredMap('SK-01', 'SK-02'),
      prereqsMet: false,
      inCalibration: false,
    });
    expect(result).toBe(3);
  });

  it('stays when in calibration even if all prereqs mastered', () => {
    const result = decideNextLevel({
      currentLevel: LevelId(3),
      masteries: masteredMap('SK-01', 'SK-02'),
      prereqsMet: true,
      inCalibration: true, // Q19 fix
    });
    // Must NOT route up during calibration
    expect(result).toBe(3);
  });

  it('stays when prereqs met but current skills not fully mastered', () => {
    const result = decideNextLevel({
      currentLevel: LevelId(2),
      masteries: unmasteredMap('SK-03'),
      prereqsMet: true,
      inCalibration: false,
    });
    expect(result).toBe(2);
  });
});

describe('decideNextLevel — routes up', () => {
  it('routes up when prereqs met, all skills mastered, not in calibration', () => {
    const result = decideNextLevel({
      currentLevel: LevelId(3),
      masteries: masteredMap('SK-01', 'SK-02'),
      prereqsMet: true,
      inCalibration: false,
    });
    expect(result).toBe(4);
  });

  it('clamps at level 9 (does not exceed max)', () => {
    const result = decideNextLevel({
      currentLevel: LevelId(9),
      masteries: masteredMap('SK-01'),
      prereqsMet: true,
      inCalibration: false,
    });
    expect(result).toBe(9);
  });
});

describe('decideNextLevel — routes down', () => {
  it('routes down on 5-streak with 0 correct (0% accuracy)', () => {
    const result = decideNextLevel({
      currentLevel: LevelId(4),
      masteries: unmasteredMap('SK-01'),
      prereqsMet: false,
      inCalibration: false,
      recentOutcomes: [false, false, false, false, false],
    });
    expect(result).toBe(3);
  });

  it('routes down on 5-streak with 1 correct (20% < 40% threshold)', () => {
    const result = decideNextLevel({
      currentLevel: LevelId(5),
      masteries: unmasteredMap('SK-02'),
      prereqsMet: false,
      inCalibration: false,
      recentOutcomes: [true, false, false, false, false],
    });
    expect(result).toBe(4);
  });

  it('does not route down on 5-streak with 2 correct (40% = threshold boundary)', () => {
    const result = decideNextLevel({
      currentLevel: LevelId(3),
      masteries: unmasteredMap('SK-01'),
      prereqsMet: false,
      inCalibration: false,
      recentOutcomes: [true, true, false, false, false],
    });
    // 2/5 = 40%, which is equal to threshold — should stay (not < threshold)
    expect(result).toBe(3);
  });

  it('clamps at level 1 (does not go below min)', () => {
    const result = decideNextLevel({
      currentLevel: LevelId(1),
      masteries: unmasteredMap('SK-01'),
      prereqsMet: false,
      inCalibration: false,
      recentOutcomes: [false, false, false, false, false],
    });
    expect(result).toBe(1);
  });
});

describe('decideNextLevel — calibration freeze (Q19 fix)', () => {
  it('never routes up during calibration', () => {
    // Even with perfect mastery + met prereqs + all mastered
    const result = decideNextLevel({
      currentLevel: LevelId(2),
      masteries: masteredMap('SK-01', 'SK-02', 'SK-03'),
      prereqsMet: true,
      inCalibration: true,
      recentOutcomes: [true, true, true, true, true],
    });
    expect(result).toBe(2);
  });

  it('never routes down during calibration', () => {
    const result = decideNextLevel({
      currentLevel: LevelId(5),
      masteries: unmasteredMap('SK-01'),
      prereqsMet: false,
      inCalibration: true,
      recentOutcomes: [false, false, false, false, false],
    });
    expect(result).toBe(5);
  });

  it('resumes routing after calibration ends (inCalibration=false)', () => {
    const result = decideNextLevel({
      currentLevel: LevelId(3),
      masteries: masteredMap('SK-01'),
      prereqsMet: true,
      inCalibration: false,
    });
    expect(result).toBe(4);
  });
});

describe('decideNextLevel — edge cases', () => {
  it('fewer than 5 recent outcomes does not trigger regression', () => {
    const result = decideNextLevel({
      currentLevel: LevelId(3),
      masteries: unmasteredMap('SK-01'),
      prereqsMet: false,
      inCalibration: false,
      recentOutcomes: [false, false, false],
    });
    expect(result).toBe(3);
  });

  it('empty masteries map does not trigger route up', () => {
    const result = decideNextLevel({
      currentLevel: LevelId(2),
      masteries: new Map(),
      prereqsMet: true,
      inCalibration: false,
    });
    expect(result).toBe(2);
  });
});
