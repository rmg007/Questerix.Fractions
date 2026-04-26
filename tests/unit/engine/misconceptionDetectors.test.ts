/**
 * Unit tests for misconception detectors.
 * Test that detectors correctly flag patterns at >= 60% threshold.
 */

import { describe, it, expect } from 'vitest';
import {
  detectWHB01,
  detectWHB02,
  detectMAG01,
  detectPRX01,
} from '../../../src/engine/misconceptionDetectors';
import type { Attempt } from '../../../src/types/runtime';

function mockAttempt(overrides: Partial<Attempt>): Attempt {
  return {
    id: Math.random().toString(36),
    sessionId: 'sess-1' as any,
    studentId: 'student-1' as any,
    questionTemplateId: 'q-1' as any,
    archetype: 'compare',
    roundNumber: 1,
    attemptNumber: 1,
    startedAt: Date.now(),
    submittedAt: Date.now(),
    responseMs: 3000,
    studentAnswerRaw: { relation: '>' },
    correctAnswerRaw: { relation: '<' },
    outcome: 'WRONG',
    errorMagnitude: 0.15,
    pointsEarned: 0,
    hintsUsedIds: [],
    hintsUsed: [],
    flaggedMisconceptionIds: [],
    validatorPayload: {},
    syncState: 'local',
    ...overrides,
  };
}

describe('misconceptionDetectors', () => {
  describe('detectWHB01 (numerator bias)', () => {
    it('flags when student picks larger numerator >= 60% of time', () => {
      const attempts = [
        mockAttempt({
          archetype: 'compare',
          outcome: 'WRONG',
          studentAnswerRaw: { relation: '>' },
          correctAnswerRaw: { relation: '<' },
        }),
        mockAttempt({
          archetype: 'compare',
          outcome: 'WRONG',
          studentAnswerRaw: { relation: '>' },
          correctAnswerRaw: { relation: '<' },
        }),
        mockAttempt({
          archetype: 'compare',
          outcome: 'WRONG',
          studentAnswerRaw: { relation: '>' },
          correctAnswerRaw: { relation: '<' },
        }),
        mockAttempt({
          archetype: 'compare',
          outcome: 'WRONG',
          studentAnswerRaw: { relation: '>' },
          correctAnswerRaw: { relation: '<' },
        }),
        mockAttempt({
          archetype: 'compare',
          outcome: 'EXACT',
          studentAnswerRaw: { relation: '>' },
          correctAnswerRaw: { relation: '>' },
        }),
      ];
      const flag = detectWHB01(attempts, 6);
      expect(flag).not.toBeNull();
      expect(flag?.misconceptionId).toBe('MC-WHB-01');
    });

    it('does not flag when pattern < 60%', () => {
      const attempts = [
        mockAttempt({
          archetype: 'compare',
          outcome: 'EXACT',
          studentAnswerRaw: { relation: '>' },
        }),
        mockAttempt({
          archetype: 'compare',
          outcome: 'EXACT',
          studentAnswerRaw: { relation: '>' },
        }),
        mockAttempt({
          archetype: 'compare',
          outcome: 'WRONG',
          studentAnswerRaw: { relation: '>' },
          correctAnswerRaw: { relation: '<' },
        }),
        mockAttempt({
          archetype: 'compare',
          outcome: 'EXACT',
          studentAnswerRaw: { relation: '>' },
        }),
      ];
      const flag = detectWHB01(attempts, 6);
      expect(flag).toBeNull();
    });

    it('returns null for level < 6', () => {
      const attempts = [mockAttempt({ archetype: 'compare', outcome: 'WRONG' })];
      const flag = detectWHB01(attempts, 5);
      expect(flag).toBeNull();
    });

    it('returns null for < 5 attempts', () => {
      const attempts = [
        mockAttempt({ archetype: 'compare', outcome: 'WRONG' }),
        mockAttempt({ archetype: 'compare', outcome: 'WRONG' }),
      ];
      const flag = detectWHB01(attempts, 6);
      expect(flag).toBeNull();
    });
  });

  describe('detectWHB02 (denominator bias)', () => {
    it('flags when student picks larger denominator >= 60% of time', () => {
      const attempts = [
        mockAttempt({
          archetype: 'compare',
          outcome: 'WRONG',
          studentAnswerRaw: { relation: '<' },
          correctAnswerRaw: { relation: '>' },
        }),
        mockAttempt({
          archetype: 'compare',
          outcome: 'WRONG',
          studentAnswerRaw: { relation: '<' },
          correctAnswerRaw: { relation: '>' },
        }),
        mockAttempt({
          archetype: 'compare',
          outcome: 'WRONG',
          studentAnswerRaw: { relation: '<' },
          correctAnswerRaw: { relation: '>' },
        }),
        mockAttempt({
          archetype: 'compare',
          outcome: 'WRONG',
          studentAnswerRaw: { relation: '<' },
          correctAnswerRaw: { relation: '>' },
        }),
        mockAttempt({
          archetype: 'compare',
          outcome: 'EXACT',
          studentAnswerRaw: { relation: '<' },
          correctAnswerRaw: { relation: '<' },
        }),
      ];
      const flag = detectWHB02(attempts, 7);
      expect(flag).not.toBeNull();
      expect(flag?.misconceptionId).toBe('MC-WHB-02');
    });

    it('returns null for level < 7', () => {
      const attempts = [mockAttempt({ archetype: 'compare', outcome: 'WRONG' })];
      const flag = detectWHB02(attempts, 6);
      expect(flag).toBeNull();
    });
  });

  describe('detectMAG01 (magnitude blindness)', () => {
    it('flags when accuracy < 50% and avg error > 0.20', () => {
      const attempts = [
        mockAttempt({
          outcome: 'WRONG',
          errorMagnitude: 0.25,
        }),
        mockAttempt({
          outcome: 'WRONG',
          errorMagnitude: 0.30,
        }),
        mockAttempt({
          outcome: 'WRONG',
          errorMagnitude: 0.22,
        }),
        mockAttempt({
          outcome: 'EXACT',
          errorMagnitude: 0.0,
        }),
        mockAttempt({
          outcome: 'WRONG',
          errorMagnitude: 0.25,
        }),
      ];
      const flag = detectMAG01(attempts, 8);
      expect(flag).not.toBeNull();
      expect(flag?.misconceptionId).toBe('MC-MAG-01');
    });

    it('does not flag when accuracy >= 50%', () => {
      const attempts = [
        mockAttempt({ outcome: 'EXACT', errorMagnitude: 0.0 }),
        mockAttempt({ outcome: 'EXACT', errorMagnitude: 0.0 }),
        mockAttempt({ outcome: 'EXACT', errorMagnitude: 0.0 }),
        mockAttempt({ outcome: 'WRONG', errorMagnitude: 0.25 }),
      ];
      const flag = detectMAG01(attempts, 8);
      expect(flag).toBeNull();
    });

    it('returns null for level < 8', () => {
      const attempts = [mockAttempt({ outcome: 'WRONG', errorMagnitude: 0.25 })];
      const flag = detectMAG01(attempts, 7);
      expect(flag).toBeNull();
    });
  });

  describe('detectPRX01 (proximity-to-1 confusion)', () => {
    it('flags when placed in wrong zones >= 50% of time', () => {
      const attempts = [
        mockAttempt({
          archetype: 'benchmark',
          outcome: 'WRONG',
          studentAnswerRaw: { zoneIndex: 1 },
          correctAnswerRaw: { zoneIndex: 3 },
        }),
        mockAttempt({
          archetype: 'benchmark',
          outcome: 'WRONG',
          studentAnswerRaw: { zoneIndex: 2 },
          correctAnswerRaw: { zoneIndex: 3 },
        }),
        mockAttempt({
          archetype: 'benchmark',
          outcome: 'EXACT',
          studentAnswerRaw: { zoneIndex: 3 },
          correctAnswerRaw: { zoneIndex: 3 },
        }),
        mockAttempt({
          archetype: 'benchmark',
          outcome: 'WRONG',
          studentAnswerRaw: { zoneIndex: 1 },
          correctAnswerRaw: { zoneIndex: 3 },
        }),
      ];
      const flag = detectPRX01(attempts, 8);
      expect(flag).not.toBeNull();
      expect(flag?.misconceptionId).toBe('MC-PRX-01');
    });

    it('returns null for level < 8', () => {
      const attempts = [mockAttempt({ archetype: 'benchmark' })];
      const flag = detectPRX01(attempts, 7);
      expect(flag).toBeNull();
    });
  });
});
