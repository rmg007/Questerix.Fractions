/**
 * Unit tests for the BKT (Bayesian Knowledge Tracing) engine.
 * Covers G-OPS6 requirements: priors, update direction, deriveState
 * thresholds, mastery convergence, and wrong-answer guard.
 *
 * Companion to tests/unit/bkt.test.ts (property-based tests).
 * This file uses concrete, deterministic scenarios for readability.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PRIORS,
  MASTERY_THRESHOLD,
  updatePKnown,
  updateMastery,
  deriveState,
} from '@/engine/bkt';
import type { SkillMastery } from '@/types';
import { StudentId, SkillId } from '@/types';

// ── Helper ────────────────────────────────────────────────────────────────

function freshMastery(masteryEstimate = 0): SkillMastery {
  return {
    studentId: StudentId('s-test'),
    skillId: SkillId('SK-TEST'),
    compositeKey: [StudentId('s-test'), SkillId('SK-TEST')],
    masteryEstimate,
    state: masteryEstimate === 0 ? 'NOT_STARTED' : 'LEARNING',
    consecutiveCorrectUnassisted: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    lastAttemptAt: Date.now(),
    masteredAt: null,
    decayedAt: null,
    syncState: 'local',
  };
}

// ── 1. Default priors ─────────────────────────────────────────────────────

describe('DEFAULT_PRIORS', () => {
  it('pInit is between 0 and 1 exclusive', () => {
    expect(DEFAULT_PRIORS.pInit).toBeGreaterThan(0);
    expect(DEFAULT_PRIORS.pInit).toBeLessThan(1);
  });

  it('pTransit is between 0 and 1 exclusive', () => {
    expect(DEFAULT_PRIORS.pTransit).toBeGreaterThan(0);
    expect(DEFAULT_PRIORS.pTransit).toBeLessThan(1);
  });

  it('pSlip is between 0 and 1 exclusive', () => {
    expect(DEFAULT_PRIORS.pSlip).toBeGreaterThan(0);
    expect(DEFAULT_PRIORS.pSlip).toBeLessThan(1);
  });

  it('pGuess is between 0 and 1 exclusive', () => {
    expect(DEFAULT_PRIORS.pGuess).toBeGreaterThan(0);
    expect(DEFAULT_PRIORS.pGuess).toBeLessThan(1);
  });
});

// ── 2. Correct answer increases masteryEstimate ───────────────────────────

describe('correct answer update', () => {
  it('increases masteryEstimate compared to prior', () => {
    const before = freshMastery(0.3);
    const after = updateMastery(before, true);
    expect(after.masteryEstimate).toBeGreaterThan(before.masteryEstimate);
  });

  it('masteryEstimate stays in [0, 1]', () => {
    const before = freshMastery(0.99);
    const after = updateMastery(before, true);
    expect(after.masteryEstimate).toBeGreaterThanOrEqual(0);
    expect(after.masteryEstimate).toBeLessThanOrEqual(1);
  });
});

// ── 3. Wrong answer decreases / holds masteryEstimate low ─────────────────

describe('wrong answer update', () => {
  it('does not raise masteryEstimate significantly from a low base', () => {
    // Starting from 0.1, a single wrong answer should not push above 0.2
    const result = updatePKnown(0.1, false, DEFAULT_PRIORS);
    expect(result).toBeLessThan(0.2);
  });

  it('repeated wrong answers keep masteryEstimate well below MASTERY_THRESHOLD', () => {
    let p = 0.3;
    for (let i = 0; i < 20; i++) {
      p = updatePKnown(p, false, DEFAULT_PRIORS);
    }
    expect(p).toBeLessThan(MASTERY_THRESHOLD);
  });
});

// ── 4. deriveState — NOT_STARTED for fresh student ───────────────────────

describe('deriveState — NOT_STARTED', () => {
  it('returns NOT_STARTED when estimate is exactly 0 and no streak', () => {
    expect(deriveState(0, 0)).toBe('NOT_STARTED');
  });

  it('freshMastery record has state NOT_STARTED', () => {
    const m = freshMastery(0);
    expect(m.state).toBe('NOT_STARTED');
  });
});

// ── 5. deriveState — MASTERED when estimate >= 0.85 AND streak >= 3 ───────

describe('deriveState — MASTERED', () => {
  it('returns MASTERED at the exact threshold with streak = 3', () => {
    expect(deriveState(MASTERY_THRESHOLD, 3)).toBe('MASTERED');
  });

  it('returns MASTERED well above threshold with long streak', () => {
    expect(deriveState(0.95, 5)).toBe('MASTERED');
  });

  it('does NOT return MASTERED if estimate >= threshold but streak < 3', () => {
    expect(deriveState(MASTERY_THRESHOLD, 2)).not.toBe('MASTERED');
  });

  it('does NOT return MASTERED if streak >= 3 but estimate < threshold', () => {
    expect(deriveState(0.84, 3)).not.toBe('MASTERED');
  });
});

// ── 6. deriveState — APPROACHING in mid-range ────────────────────────────

describe('deriveState — APPROACHING', () => {
  it('returns APPROACHING for estimate = 0.65 (lower boundary)', () => {
    expect(deriveState(0.65, 0)).toBe('APPROACHING');
  });

  it('returns APPROACHING for estimate = 0.75 (mid-range)', () => {
    expect(deriveState(0.75, 0)).toBe('APPROACHING');
  });

  it('returns APPROACHING for estimate >= 0.85 but streak < 3 (not yet MASTERED)', () => {
    expect(deriveState(0.9, 1)).toBe('APPROACHING');
  });
});

// ── 7. Multiple correct answers eventually reach MASTERED ─────────────────

describe('mastery convergence on correct streak', () => {
  it('reaches MASTERED state after sufficient correct answers', () => {
    let m = freshMastery(DEFAULT_PRIORS.pInit);
    for (let i = 0; i < 40; i++) {
      m = updateMastery(m, true);
    }
    expect(m.state).toBe('MASTERED');
    expect(m.masteryEstimate).toBeGreaterThanOrEqual(MASTERY_THRESHOLD);
    expect(m.consecutiveCorrectUnassisted).toBeGreaterThanOrEqual(3);
  });

  it('consecutiveCorrectUnassisted increments on each correct answer', () => {
    let m = freshMastery(0.5);
    m = updateMastery(m, true);
    expect(m.consecutiveCorrectUnassisted).toBe(1);
    m = updateMastery(m, true);
    expect(m.consecutiveCorrectUnassisted).toBe(2);
    m = updateMastery(m, true);
    expect(m.consecutiveCorrectUnassisted).toBe(3);
  });
});

// ── 8. Wrong answer after APPROACHING does not advance to MASTERED ─────────

describe('wrong answer guard against premature MASTERED', () => {
  it('a wrong answer resets consecutiveCorrectUnassisted to 0', () => {
    // Build up to APPROACHING with a streak of 2
    let m = freshMastery(0.5);
    m = updateMastery(m, true);
    m = updateMastery(m, true);
    expect(m.consecutiveCorrectUnassisted).toBe(2);

    // Wrong answer resets the streak
    m = updateMastery(m, false);
    expect(m.consecutiveCorrectUnassisted).toBe(0);
  });

  it('wrong answer after APPROACHING does not produce MASTERED state', () => {
    // Reach APPROACHING by pumping estimate to mid-range
    let m = freshMastery(0.65);
    m = { ...m, state: 'APPROACHING', consecutiveCorrectUnassisted: 2 };

    // One wrong answer — must not jump to MASTERED
    const after = updateMastery(m, false);
    expect(after.state).not.toBe('MASTERED');
  });
});
