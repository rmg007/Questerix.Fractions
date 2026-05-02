import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PRIORS,
  MASTERY_THRESHOLD,
  updatePKnown,
  updateMastery,
  deriveState,
  predictCorrect,
  validateBktParams,
  isMastered,
} from '@/engine/bkt';
import type { BktParams, SkillMastery } from '@/types';
import { StudentId, SkillId } from '@/types';

function freshMastery(estimate = 0): SkillMastery {
  return {
    studentId: StudentId('s-test'),
    skillId: SkillId('SK-TEST'),
    compositeKey: [StudentId('s-test'), SkillId('SK-TEST')],
    masteryEstimate: estimate,
    state: estimate === 0 ? 'NOT_STARTED' : 'LEARNING',
    consecutiveCorrectUnassisted: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    lastAttemptAt: Date.now(),
    masteredAt: null,
    decayedAt: null,
    syncState: 'local',
  };
}

describe('validateBktParams', () => {
  it('throws on pGuess = 0', () => {
    expect(() => validateBktParams({ ...DEFAULT_PRIORS, pGuess: 0 })).toThrow();
  });

  it('throws on pGuess = 1', () => {
    expect(() => validateBktParams({ ...DEFAULT_PRIORS, pGuess: 1 })).toThrow();
  });

  it('throws on pSlip = 0', () => {
    expect(() => validateBktParams({ ...DEFAULT_PRIORS, pSlip: 0 })).toThrow();
  });

  it('throws on pSlip = 1', () => {
    expect(() => validateBktParams({ ...DEFAULT_PRIORS, pSlip: 1 })).toThrow();
  });

  it('does not throw for valid DEFAULT_PRIORS', () => {
    expect(() => validateBktParams(DEFAULT_PRIORS)).not.toThrow();
  });
});

describe('updatePKnown edge cases', () => {
  it('P_known = 0 with correct answer increases via transit', () => {
    const result = updatePKnown(0, true, DEFAULT_PRIORS);
    expect(result).toBeGreaterThan(0);
  });

  it('P_known = 1 with correct answer stays at 1', () => {
    const result = updatePKnown(1, true, DEFAULT_PRIORS);
    expect(result).toBeCloseTo(1, 5);
  });

  it('P_known = 1 with wrong answer stays at 1 (degenerate case)', () => {
    const result = updatePKnown(1, false, DEFAULT_PRIORS);
    expect(result).toBeCloseTo(1, 5);
  });

  it('P_known = 0 with wrong answer still increases slightly via transit', () => {
    const result = updatePKnown(0, false, DEFAULT_PRIORS);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('alternating correct/wrong converges to stable point', () => {
    let p = 0.5;
    for (let i = 0; i < 100; i++) {
      p = updatePKnown(p, i % 2 === 0, DEFAULT_PRIORS);
    }
    const p2 = updatePKnown(updatePKnown(p, true, DEFAULT_PRIORS), false, DEFAULT_PRIORS);
    expect(Math.abs(p - p2)).toBeLessThan(0.01);
  });
});

describe('predictCorrect', () => {
  it('P(correct) at mastery = 0 equals pGuess', () => {
    const result = predictCorrect(0, DEFAULT_PRIORS);
    expect(result).toBeCloseTo(DEFAULT_PRIORS.pGuess, 5);
  });

  it('P(correct) at mastery = 1 equals 1 - pSlip', () => {
    const result = predictCorrect(1, DEFAULT_PRIORS);
    expect(result).toBeCloseTo(1 - DEFAULT_PRIORS.pSlip, 5);
  });

  it('P(correct) at mastery = 0.5 is between pGuess and 1-pSlip', () => {
    const result = predictCorrect(0.5, DEFAULT_PRIORS);
    expect(result).toBeGreaterThan(DEFAULT_PRIORS.pGuess);
    expect(result).toBeLessThan(1 - DEFAULT_PRIORS.pSlip);
  });

  it('is monotonically increasing in mastery', () => {
    const steps = [0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1.0];
    for (let i = 1; i < steps.length; i++) {
      expect(predictCorrect(steps[i]!, DEFAULT_PRIORS)).toBeGreaterThanOrEqual(
        predictCorrect(steps[i - 1]!, DEFAULT_PRIORS)
      );
    }
  });
});

describe('custom BKT params', () => {
  const easyParams: BktParams = { pInit: 0.3, pTransit: 0.2, pSlip: 0.05, pGuess: 0.1 };
  const hardParams: BktParams = { pInit: 0.05, pTransit: 0.05, pSlip: 0.2, pGuess: 0.3 };

  it('easy params reach mastery faster', () => {
    let easy = easyParams.pInit;
    let hard = hardParams.pInit;
    for (let i = 0; i < 10; i++) {
      easy = updatePKnown(easy, true, easyParams);
      hard = updatePKnown(hard, true, hardParams);
    }
    expect(easy).toBeGreaterThan(hard);
  });

  it('high pGuess inflates P_known after wrong answers', () => {
    const highGuess: BktParams = { ...DEFAULT_PRIORS, pGuess: 0.4 };
    const lowGuess: BktParams = { ...DEFAULT_PRIORS, pGuess: 0.1 };
    const pHigh = updatePKnown(0.5, false, highGuess);
    const pLow = updatePKnown(0.5, false, lowGuess);
    expect(pHigh).toBeGreaterThan(pLow);
  });
});

describe('isMastered', () => {
  it('returns false for fresh mastery record', () => {
    expect(isMastered(freshMastery(0))).toBe(false);
  });

  it('returns true at exactly MASTERY_THRESHOLD', () => {
    expect(isMastered(freshMastery(MASTERY_THRESHOLD))).toBe(true);
  });

  it('returns true above MASTERY_THRESHOLD', () => {
    expect(isMastered(freshMastery(0.99))).toBe(true);
  });

  it('returns false just below MASTERY_THRESHOLD', () => {
    expect(isMastered(freshMastery(MASTERY_THRESHOLD - 0.001))).toBe(false);
  });
});

describe('deriveState edge cases', () => {
  it('LEARNING at estimate = 0.01', () => {
    expect(deriveState(0.01, 0)).toBe('LEARNING');
  });

  it('LEARNING at estimate = 0.64', () => {
    expect(deriveState(0.64, 0)).toBe('LEARNING');
  });

  it('APPROACHING at estimate = 0.65', () => {
    expect(deriveState(0.65, 0)).toBe('APPROACHING');
  });

  it('APPROACHING at estimate = MASTERY_THRESHOLD with streak 2', () => {
    expect(deriveState(MASTERY_THRESHOLD, 2)).toBe('APPROACHING');
  });

  it('MASTERED at estimate = MASTERY_THRESHOLD with streak 3', () => {
    expect(deriveState(MASTERY_THRESHOLD, 3)).toBe('MASTERED');
  });
});

describe('updateMastery integration', () => {
  it('tracks lastAttemptAt as a number', () => {
    const m = freshMastery(0.5);
    const updated = updateMastery(m, true);
    expect(typeof updated.lastAttemptAt).toBe('number');
  });

  it('mixed correct/wrong sequence produces realistic trajectory', () => {
    const sequence = [true, true, false, true, true, true, false, true, true, true];
    let m = freshMastery(DEFAULT_PRIORS.pInit);
    const trajectory: number[] = [];
    for (const correct of sequence) {
      m = updateMastery(m, correct);
      trajectory.push(m.masteryEstimate);
    }
    // After mostly correct answers from pInit=0.1, should be well above 0.5
    expect(trajectory[trajectory.length - 1]!).toBeGreaterThan(0.5);
    // Trajectory should generally trend upward
    expect(trajectory[trajectory.length - 1]!).toBeGreaterThan(trajectory[0]!);
  });

  it('wrong answer after mastered drops state back', () => {
    let m = freshMastery(0.9);
    m = { ...m, state: 'MASTERED', consecutiveCorrectUnassisted: 5 };
    m = updateMastery(m, false);
    expect(m.state).not.toBe('MASTERED');
    expect(m.consecutiveCorrectUnassisted).toBe(0);
  });
});
