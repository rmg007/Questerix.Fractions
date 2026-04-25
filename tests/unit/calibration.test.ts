/**
 * Tests for the calibration round.
 * Q19 fix — per learning-hypotheses.md H-04 retention measurement
 */

import { describe, expect, it } from 'vitest';
import {
  startCalibration,
  recordCalibrationAttempt,
  isCalibrationComplete,
  shouldUseCalibration,
  CALIBRATION_ITEMS,
} from '@/engine/calibration';
import type { Session } from '@/types';
import { StudentId, SessionId, SkillId, ActivityId, LevelId } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────

function makeSession(partial?: Partial<Session>): Session {
  return {
    id: SessionId('session-prev'),
    studentId: StudentId('student-1'),
    activityId: ActivityId('identify_halves'),
    levelNumber: 3,
    scaffoldLevel: 2,
    startedAt: Date.now() - 600_000,
    endedAt: Date.now() - 10_000,
    totalAttempts: 12,
    correctAttempts: 9,
    accuracy: 0.75,
    avgResponseMs: 3200,
    xpEarned: 50,
    scaffoldRecommendation: 'stay',
    endLevel: 3,
    device: { type: 'tablet', viewport: { width: 1024, height: 768 } },
    syncState: 'local',
    ...partial,
  };
}

const prevSkills = [SkillId('SK-01'), SkillId('SK-02')];
const currentSessionId = SessionId('session-curr');

// ── Tests ─────────────────────────────────────────────────────────────────

describe('startCalibration', () => {
  it('returns null when prevSession is null (first session ever)', () => {
    const result = startCalibration(null, prevSkills, currentSessionId);
    expect(result).toBeNull();
  });

  it('returns null when prevSessionSkillIds is empty (no skills to calibrate)', () => {
    const result = startCalibration(makeSession(), [], currentSessionId);
    expect(result).toBeNull();
  });

  it('returns CalibrationState with remaining=5 on subsequent sessions', () => {
    const result = startCalibration(makeSession(), prevSkills, currentSessionId);
    expect(result).not.toBeNull();
    expect(result!.remaining).toBe(CALIBRATION_ITEMS);
    expect(result!.remaining).toBe(5);
  });

  it('targets the skills from the prior session', () => {
    const result = startCalibration(makeSession(), prevSkills, currentSessionId);
    expect(result!.targetSkillIds).toEqual(prevSkills);
  });

  it('carries the current sessionId, not the previous one', () => {
    const result = startCalibration(makeSession(), prevSkills, currentSessionId);
    expect(result!.sessionId).toBe(currentSessionId);
  });

  it('carries the studentId from the prior session', () => {
    const result = startCalibration(makeSession(), prevSkills, currentSessionId);
    expect(result!.studentId).toBe(makeSession().studentId);
  });
});

describe('recordCalibrationAttempt', () => {
  it('decrements remaining by 1', () => {
    const state = startCalibration(makeSession(), prevSkills, currentSessionId)!;
    const updated = recordCalibrationAttempt(state);
    expect(updated.remaining).toBe(CALIBRATION_ITEMS - 1);
  });

  it('does not mutate the original state', () => {
    const state = startCalibration(makeSession(), prevSkills, currentSessionId)!;
    const original = state.remaining;
    recordCalibrationAttempt(state);
    expect(state.remaining).toBe(original);
  });

  it('decrementing 5 times reaches 0', () => {
    let state = startCalibration(makeSession(), prevSkills, currentSessionId)!;
    for (let i = 0; i < CALIBRATION_ITEMS; i++) {
      state = recordCalibrationAttempt(state);
    }
    expect(state.remaining).toBe(0);
  });

  it('does not go below 0 on extra decrements', () => {
    let state = startCalibration(makeSession(), prevSkills, currentSessionId)!;
    for (let i = 0; i < CALIBRATION_ITEMS + 5; i++) {
      state = recordCalibrationAttempt(state);
    }
    expect(state.remaining).toBe(0);
  });
});

describe('isCalibrationComplete', () => {
  it('returns false when remaining > 0', () => {
    const state = startCalibration(makeSession(), prevSkills, currentSessionId)!;
    expect(isCalibrationComplete(state)).toBe(false);
  });

  it('returns true when remaining = 0', () => {
    let state = startCalibration(makeSession(), prevSkills, currentSessionId)!;
    for (let i = 0; i < CALIBRATION_ITEMS; i++) {
      state = recordCalibrationAttempt(state);
    }
    expect(isCalibrationComplete(state)).toBe(true);
  });

  it('returns true immediately if constructed with remaining=0', () => {
    const state = {
      studentId: StudentId('student-1'),
      sessionId: SessionId('s'),
      targetSkillIds: prevSkills,
      remaining: 0,
    };
    expect(isCalibrationComplete(state)).toBe(true);
  });
});

describe('shouldUseCalibration', () => {
  it('returns false when state is null', () => {
    expect(shouldUseCalibration(null)).toBe(false);
  });

  it('returns true when state has remaining > 0', () => {
    const state = startCalibration(makeSession(), prevSkills, currentSessionId)!;
    expect(shouldUseCalibration(state)).toBe(true);
  });

  it('returns false when calibration is complete (remaining=0)', () => {
    let state = startCalibration(makeSession(), prevSkills, currentSessionId)!;
    for (let i = 0; i < CALIBRATION_ITEMS; i++) {
      state = recordCalibrationAttempt(state);
    }
    expect(shouldUseCalibration(state)).toBe(false);
  });
});

describe('calibration remaining countdown — full sequence', () => {
  it('decrements from 5 to 0 across 5 attempts, then completes', () => {
    let state = startCalibration(makeSession(), prevSkills, currentSessionId)!;

    for (let i = CALIBRATION_ITEMS; i >= 1; i--) {
      expect(state.remaining).toBe(i);
      expect(shouldUseCalibration(state)).toBe(true);
      expect(isCalibrationComplete(state)).toBe(false);
      state = recordCalibrationAttempt(state);
    }

    expect(state.remaining).toBe(0);
    expect(isCalibrationComplete(state)).toBe(true);
    expect(shouldUseCalibration(state)).toBe(false);
  });
});
