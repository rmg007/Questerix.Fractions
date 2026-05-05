/**
 * Unit tests for misconception detectors.
 * Tests C7.1-C7.3: EOL-01, WHB-01, WHB-02, MAG-01, PRX-01 detection.
 * per engine-wiring.md phase 7
 */

import { describe, it, expect } from 'vitest';
import {
  detectEOL01,
  detectEQ01,
  detectEQ02,
  runAllDetectors,
} from '../../../src/engine/misconceptionDetectors';
import type { DetectorContext } from '../../../src/engine/ports';
import type { Attempt } from '@/types';

describe('Misconception Detectors', () => {
  // Deterministic test context — fixed clock + sequential IDs make flag
  // outputs reproducible without depending on Date.now() / crypto.randomUUID().
  const FIXED_NOW = 1_700_000_000_000;
  const makeCtx = (): DetectorContext => {
    let n = 0;
    return {
      clock: {
        now: () => FIXED_NOW,
        monotonic: () => FIXED_NOW,
      },
      ids: {
        generate: () => `mc-test-${++n}`,
      },
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    };
  };
  const ctx = makeCtx();

  const mockAttempt = (overrides: Partial<Attempt>): Attempt => ({
    id: `a-${Math.random()}` as any,
    sessionId: 's-1' as any,
    studentId: 'stu-1' as any,
    questionTemplateId: 'q-1' as any,
    archetype: 'equal_or_not',
    roundNumber: 1,
    attemptNumber: 1,
    startedAt: Date.now(),
    submittedAt: Date.now(),
    responseMs: 1000,
    studentAnswerRaw: null,
    correctAnswerRaw: null,
    outcome: 'WRONG',
    errorMagnitude: null,
    pointsEarned: 0,
    hintsUsedIds: [],
    hintsUsed: [],
    flaggedMisconceptionIds: [],
    validatorPayload: null,
    syncState: 'local',
    ...overrides,
  });

  describe('detectEOL01', () => {
    it('should flag when ≥50% of equal_or_not attempts are "yes" when answer is "no"', () => {
      const attempts = [
        mockAttempt({
          archetype: 'equal_or_not',
          outcome: 'WRONG',
          studentAnswerRaw: { studentAnswer: true },
          correctAnswerRaw: { correctAnswer: false },
        }),
        mockAttempt({
          archetype: 'equal_or_not',
          outcome: 'WRONG',
          studentAnswerRaw: { studentAnswer: true },
          correctAnswerRaw: { correctAnswer: false },
        }),
        mockAttempt({
          archetype: 'equal_or_not',
          outcome: 'WRONG',
          studentAnswerRaw: { studentAnswer: true },
          correctAnswerRaw: { correctAnswer: false },
        }),
        mockAttempt({
          archetype: 'equal_or_not',
          outcome: 'EXACT',
          studentAnswerRaw: { studentAnswer: true },
          correctAnswerRaw: { correctAnswer: true },
        }),
      ];

      const flag = detectEOL01(attempts, 1, ctx);
      expect(flag).toBeDefined();
      expect(flag?.misconceptionId).toBe('MC-EOL-01');
      expect(flag?.observationCount).toBe(3);
    });

    it('should not flag when < 50% are caught', () => {
      const attempts = [
        mockAttempt({
          archetype: 'equal_or_not',
          outcome: 'WRONG',
          studentAnswerRaw: { studentAnswer: true },
          correctAnswerRaw: { correctAnswer: false },
        }),
        mockAttempt({
          archetype: 'equal_or_not',
          outcome: 'EXACT',
          studentAnswerRaw: { studentAnswer: true },
          correctAnswerRaw: { correctAnswer: true },
        }),
      ];

      const flag = detectEOL01(attempts, 1, ctx);
      expect(flag).toBeNull();
    });

    it('should return null if < 4 attempts', () => {
      const attempts = [mockAttempt({ archetype: 'equal_or_not', outcome: 'WRONG' })];
      const flag = detectEOL01(attempts, 1, ctx);
      expect(flag).toBeNull();
    });
  });

  describe('detectEQ01', () => {
    it('should flag when ≥50% of same-denom compare attempts pick "=" wrongly', () => {
      const wrongEq = mockAttempt({
        archetype: 'compare',
        outcome: 'WRONG',
        payload: {
          fractionA: { numerator: 3, denominator: 8 },
          fractionB: { numerator: 4, denominator: 8 },
        },
        studentAnswerRaw: { relation: '=' },
        correctAnswerRaw: { relation: '<' },
      });
      const attempts = [wrongEq, wrongEq, wrongEq, wrongEq];
      const flag = detectEQ01(attempts, 6, ctx);
      expect(flag).toBeDefined();
      expect(flag?.misconceptionId).toBe('MC-EQ-01');
    });

    it('should return null when student picks the correct ">" (near-miss)', () => {
      const correctAttempt = mockAttempt({
        archetype: 'compare',
        outcome: 'EXACT',
        payload: {
          fractionA: { numerator: 4, denominator: 8 },
          fractionB: { numerator: 3, denominator: 8 },
        },
        studentAnswerRaw: { relation: '>' },
        correctAnswerRaw: { relation: '>' },
      });
      const flag = detectEQ01(
        [correctAttempt, correctAttempt, correctAttempt, correctAttempt],
        6,
        ctx
      );
      expect(flag).toBeNull();
    });

    it('should be deterministic: same input → same output', () => {
      const wrongEq = mockAttempt({
        archetype: 'compare',
        outcome: 'WRONG',
        payload: {
          fractionA: { numerator: 3, denominator: 8 },
          fractionB: { numerator: 4, denominator: 8 },
        },
        studentAnswerRaw: { relation: '=' },
        correctAnswerRaw: { relation: '<' },
      });
      const attempts = [wrongEq, wrongEq, wrongEq, wrongEq];
      const f1 = detectEQ01(attempts, 6, ctx);
      const f2 = detectEQ01(attempts, 6, ctx);
      // Both should be flagged (same observationCount / misconceptionId).
      expect(f1?.misconceptionId).toBe(f2?.misconceptionId);
      expect(f1?.observationCount).toBe(f2?.observationCount);
    });
  });

  describe('detectEQ02', () => {
    it('should flag when ≥50% of ½-equivalent benchmark attempts misplace the fraction', () => {
      const wrongPlace = mockAttempt({
        archetype: 'benchmark',
        outcome: 'WRONG',
        payload: { numerator: 2, denominator: 4 },
        studentAnswerRaw: { zoneIndex: 1 },
      });
      const attempts = [wrongPlace, wrongPlace, wrongPlace];
      const flag = detectEQ02(attempts, 8, ctx);
      expect(flag).toBeDefined();
      expect(flag?.misconceptionId).toBe('MC-EQ-02');
    });

    it('should return null for non-½-equivalent fractions (near-miss)', () => {
      const wrongNonHalf = mockAttempt({
        archetype: 'benchmark',
        outcome: 'WRONG',
        payload: { numerator: 3, denominator: 4 }, // 0.75 — not ½-equivalent
        studentAnswerRaw: { zoneIndex: 1 },
      });
      const flag = detectEQ02([wrongNonHalf, wrongNonHalf, wrongNonHalf], 8, ctx);
      expect(flag).toBeNull();
    });

    it('should be deterministic: same input → same output', () => {
      const wrongPlace = mockAttempt({
        archetype: 'benchmark',
        outcome: 'WRONG',
        payload: { numerator: 3, denominator: 6 }, // 3/6 = 0.5
        studentAnswerRaw: { zoneIndex: 1 },
      });
      const attempts = [wrongPlace, wrongPlace, wrongPlace];
      const f1 = detectEQ02(attempts, 8, ctx);
      const f2 = detectEQ02(attempts, 8, ctx);
      expect(f1?.misconceptionId).toBe(f2?.misconceptionId);
      expect(f1?.observationCount).toBe(f2?.observationCount);
    });
  });

  describe('runAllDetectors', () => {
    it('should return array of all flags found', async () => {
      const eolAttempts = [
        mockAttempt({
          archetype: 'equal_or_not',
          outcome: 'WRONG',
          studentAnswerRaw: { studentAnswer: true },
          correctAnswerRaw: { correctAnswer: false },
        }),
        mockAttempt({
          archetype: 'equal_or_not',
          outcome: 'WRONG',
          studentAnswerRaw: { studentAnswer: true },
          correctAnswerRaw: { correctAnswer: false },
        }),
        mockAttempt({
          archetype: 'equal_or_not',
          outcome: 'WRONG',
          studentAnswerRaw: { studentAnswer: true },
          correctAnswerRaw: { correctAnswer: false },
        }),
        mockAttempt({
          archetype: 'equal_or_not',
          outcome: 'WRONG',
          studentAnswerRaw: { studentAnswer: true },
          correctAnswerRaw: { correctAnswer: false },
        }),
      ];

      const flags = await runAllDetectors(eolAttempts, 1, ctx);
      expect(Array.isArray(flags)).toBe(true);
      expect(flags.length).toBeGreaterThan(0);
      expect(flags[0]?.misconceptionId).toBe('MC-EOL-01');
    });

    it('should return empty array if no flags detected', async () => {
      const attempts = [mockAttempt({ outcome: 'EXACT' })];
      const flags = await runAllDetectors(attempts, 1, ctx);
      expect(flags).toEqual([]);
    });
  });
});
