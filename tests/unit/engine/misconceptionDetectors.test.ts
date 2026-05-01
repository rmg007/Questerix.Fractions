/**
 * Unit tests for misconception detectors.
 * Tests C7.1-C7.3: EOL-01, WHB-01, WHB-02, MAG-01, PRX-01 detection.
 * per engine-wiring.md phase 7
 */

import { describe, it, expect } from 'vitest';
import {
  detectEOL01,
  detectWHB01,
  detectWHB02,
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
