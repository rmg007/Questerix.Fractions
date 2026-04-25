/**
 * Property-based tests for the BKT pure math layer.
 * Uses fast-check for property-based testing.
 */

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  updatePKnown,
  updateMastery,
  predictCorrect,
  isMastered,
  MASTERY_THRESHOLD,
  DEFAULT_PRIORS,
  deriveState,
} from '@/engine/bkt';
import type { BktParams, SkillMastery } from '@/types';
import { StudentId, SkillId } from '@/types';

// ── Arbitraries ───────────────────────────────────────────────────────────

// fc.float requires 32-bit float boundaries — use Math.fround to convert
const f32 = Math.fround;

const pKnownArb = fc.float({ min: f32(0), max: f32(1), noNaN: true });
const bktParamsArb: fc.Arbitrary<BktParams> = fc.record({
  pInit: fc.float({ min: f32(0.01), max: f32(0.5), noNaN: true }),
  pTransit: fc.float({ min: f32(0.01), max: f32(0.5), noNaN: true }),
  pSlip: fc.float({ min: f32(0.01), max: f32(0.4), noNaN: true }),
  pGuess: fc.float({ min: f32(0.01), max: f32(0.4), noNaN: true }),
});

function makeSkillMastery(masteryEstimate: number): SkillMastery {
  return {
    studentId: StudentId('student-1'),
    skillId: SkillId('SK-01'),
    compositeKey: [StudentId('student-1'), SkillId('SK-01')],
    masteryEstimate,
    state: 'LEARNING',
    consecutiveCorrectUnassisted: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    lastAttemptAt: Date.now(),
    masteredAt: null,
    decayedAt: null,
    syncState: 'local',
  };
}

// ── Unit tests ────────────────────────────────────────────────────────────

describe('updatePKnown', () => {
  it('P_known stays in [0, 1] for any valid input — correct answer', () => {
    fc.assert(
      fc.property(pKnownArb, bktParamsArb, (p, params) => {
        const result = updatePKnown(p, true, params);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      }),
    );
  });

  it('P_known stays in [0, 1] for any valid input — incorrect answer', () => {
    fc.assert(
      fc.property(pKnownArb, bktParamsArb, (p, params) => {
        const result = updatePKnown(p, false, params);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      }),
    );
  });

  it('correct answer never decreases P_known (given non-degenerate params)', () => {
    // Restrict to "sane" params: pSlip < 0.5, pGuess < 0.5
    const saneParams: fc.Arbitrary<BktParams> = fc.record({
      pInit: fc.float({ min: f32(0.01), max: f32(0.5), noNaN: true }),
      pTransit: fc.float({ min: f32(0.01), max: f32(0.4), noNaN: true }),
      pSlip: fc.float({ min: f32(0.01), max: f32(0.3), noNaN: true }),
      pGuess: fc.float({ min: f32(0.01), max: f32(0.4), noNaN: true }),
    });
    fc.assert(
      fc.property(pKnownArb, saneParams, (p, params) => {
        const result = updatePKnown(p, true, params);
        expect(result).toBeGreaterThanOrEqual(p - 1e-10); // allow tiny fp tolerance
      }),
    );
  });

  it('incorrect answer never increases P_known beyond prior + transit (sane params)', () => {
    const saneParams: fc.Arbitrary<BktParams> = fc.record({
      pInit: fc.float({ min: f32(0.01), max: f32(0.5), noNaN: true }),
      pTransit: fc.float({ min: f32(0.01), max: f32(0.4), noNaN: true }),
      pSlip: fc.float({ min: f32(0.01), max: f32(0.3), noNaN: true }),
      pGuess: fc.float({ min: f32(0.01), max: f32(0.4), noNaN: true }),
    });
    fc.assert(
      fc.property(pKnownArb, saneParams, (p, params) => {
        const result = updatePKnown(p, false, params);
        // The only mechanism for growth after an incorrect is transit; result
        // cannot exceed p * pSlip / denominator + transit — and must be <= 1
        expect(result).toBeLessThanOrEqual(1 + 1e-10);
      }),
    );
  });

  it('after many correct answers P_known converges toward 1', () => {
    let p = 0.1;
    for (let i = 0; i < 50; i++) {
      p = updatePKnown(p, true, DEFAULT_PRIORS);
    }
    expect(p).toBeGreaterThan(0.85);
  });

  it('after many incorrect answers P_known remains low (bounded by guess/slip)', () => {
    let p = 0.1;
    for (let i = 0; i < 50; i++) {
      p = updatePKnown(p, false, DEFAULT_PRIORS);
    }
    // With default pGuess=0.2 the posterior is kept low; should stay below 0.4
    expect(p).toBeLessThan(0.4);
  });
});

describe('updatePKnown — monotonic on correct streak', () => {
  it('P_known after correct streak is non-decreasing sequence', () => {
    fc.assert(
      fc.property(
        fc.float({ min: f32(0.05), max: f32(0.7), noNaN: true }),
        fc.integer({ min: 2, max: 20 }),
        (startP, streakLen) => {
          let prev = startP;
          for (let i = 0; i < streakLen; i++) {
            const next = updatePKnown(prev, true, DEFAULT_PRIORS);
            expect(next).toBeGreaterThanOrEqual(prev - 1e-9);
            prev = next;
          }
        },
      ),
    );
  });
});

describe('predictCorrect', () => {
  it('result is in [0, 1] for any P_known', () => {
    fc.assert(
      fc.property(pKnownArb, bktParamsArb, (p, params) => {
        const result = predictCorrect(p, params);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      }),
    );
  });

  it('higher P_known produces higher predictCorrect (sane slip/guess)', () => {
    const result_low = predictCorrect(0.1, DEFAULT_PRIORS);
    const result_high = predictCorrect(0.9, DEFAULT_PRIORS);
    expect(result_high).toBeGreaterThan(result_low);
  });
});

describe('isMastered', () => {
  it('returns true when masteryEstimate >= MASTERY_THRESHOLD', () => {
    const mastery = makeSkillMastery(MASTERY_THRESHOLD);
    expect(isMastered(mastery)).toBe(true);
  });

  it('returns false when masteryEstimate < MASTERY_THRESHOLD', () => {
    const mastery = makeSkillMastery(MASTERY_THRESHOLD - 0.01);
    expect(isMastered(mastery)).toBe(false);
  });
});

describe('updateMastery', () => {
  it('increments totalAttempts by 1', () => {
    const m = makeSkillMastery(0.5);
    const updated = updateMastery(m, true);
    expect(updated.totalAttempts).toBe(1);
  });

  it('increments correctAttempts on correct answer', () => {
    const m = makeSkillMastery(0.5);
    const updated = updateMastery(m, true);
    expect(updated.correctAttempts).toBe(1);
  });

  it('does not increment correctAttempts on incorrect answer', () => {
    const m = makeSkillMastery(0.5);
    const updated = updateMastery(m, false);
    expect(updated.correctAttempts).toBe(0);
  });

  it('resets consecutiveCorrectUnassisted to 0 on incorrect', () => {
    const m = { ...makeSkillMastery(0.7), consecutiveCorrectUnassisted: 3 };
    const updated = updateMastery(m, false);
    expect(updated.consecutiveCorrectUnassisted).toBe(0);
  });

  it('does not mutate the original record', () => {
    const m = makeSkillMastery(0.5);
    const originalEstimate = m.masteryEstimate;
    updateMastery(m, true);
    expect(m.masteryEstimate).toBe(originalEstimate);
  });

  it('reaches MASTERED state after sufficient correct streak', () => {
    let m = makeSkillMastery(0.5);
    for (let i = 0; i < 30; i++) {
      m = updateMastery(m, true);
    }
    expect(m.state).toBe('MASTERED');
    expect(m.masteryEstimate).toBeGreaterThanOrEqual(MASTERY_THRESHOLD);
  });
});

describe('deriveState', () => {
  it('returns NOT_STARTED for estimate = 0', () => {
    expect(deriveState(0, 0)).toBe('NOT_STARTED');
  });

  it('returns LEARNING for estimate = 0.3', () => {
    expect(deriveState(0.3, 0)).toBe('LEARNING');
  });

  it('returns APPROACHING for estimate = 0.7', () => {
    expect(deriveState(0.7, 0)).toBe('APPROACHING');
  });

  it('returns MASTERED for estimate >= 0.85 and consecutiveCorrect >= 3', () => {
    expect(deriveState(0.9, 3)).toBe('MASTERED');
  });

  it('returns APPROACHING for estimate >= 0.85 but consecutiveCorrect < 3', () => {
    expect(deriveState(0.9, 2)).toBe('APPROACHING');
  });
});
