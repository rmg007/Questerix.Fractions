/**
 * Misconception detectors for L6–L9.
 * Each detector analyzes recent attempts and flags patterns per data-schema.md §3.5.
 */

import type { Attempt, MisconceptionFlag } from '../types/runtime';
import type { MisconceptionId } from '../types/branded';

/**
 * WHB-01 — Whole-Number Bias (Numerator)
 * Pattern: student picks larger-numerator option ≥ 60% of time on L6+ compare activities.
 * Flags when misconception is high-confidence.
 */
export function detectWHB01(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level < 6 || attempts.length < 5) return null;

  // Filter attempts on compare archetype
  const compareAttempts = attempts.filter((a) => a.archetype === 'compare');
  if (compareAttempts.length < 5) return null;

  let largerNumeratorCount = 0;
  for (const attempt of compareAttempts) {
    // WHB-01 trap: student picks the option with the larger numerator
    // This occurs when correct answer is NOT '>' (i.e., top is NOT bigger)
    // and student chose '>' anyway
    if (attempt.outcome === 'WRONG' && attempt.studentAnswerRaw) {
      const raw = attempt.studentAnswerRaw as Record<string, unknown>;
      // If student answered '>' when that was wrong, likely WHB-01 trap
      if (raw.relation === '>') {
        largerNumeratorCount++;
      }
    }
  }

  const rate = largerNumeratorCount / compareAttempts.length;
  if (rate >= 0.6) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-WHB-01' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: largerNumeratorCount,
      resolvedAt: null,
      evidenceAttemptIds: compareAttempts
        .filter((_, i) => i < 3)
        .map((a) => a.id),
      syncState: 'local',
    };
  }

  return null;
}

/**
 * WHB-02 — Whole-Number Bias (Denominator)
 * Pattern: student picks larger-denominator option ≥ 60% of time on L7+ compare activities.
 * This is the classic "larger denominator = larger fraction" trap.
 */
export function detectWHB02(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level < 7 || attempts.length < 5) return null;

  const compareAttempts = attempts.filter((a) => a.archetype === 'compare');
  if (compareAttempts.length < 5) return null;

  let largerDenominatorCount = 0;
  for (const attempt of compareAttempts) {
    // WHB-02 trap: student picks larger denominator when it's actually smaller fraction
    // Occurs in same-numerator activities (L7) where larger denominator = smaller fraction
    if (attempt.outcome === 'WRONG' && attempt.studentAnswerRaw) {
      const raw = attempt.studentAnswerRaw as Record<string, unknown>;
      // Trap: student answers '<' (bottom is bigger) when larger denominator makes it smaller
      if (raw.relation === '<' && attempt.correctAnswerRaw) {
        const correct = attempt.correctAnswerRaw as Record<string, unknown>;
        if (correct.relation === '>') {
          largerDenominatorCount++;
        }
      }
    }
  }

  const rate = largerDenominatorCount / compareAttempts.length;
  if (rate >= 0.6) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-WHB-02' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: largerDenominatorCount,
      resolvedAt: null,
      evidenceAttemptIds: compareAttempts
        .filter((_, i) => i < 3)
        .map((a) => a.id),
      syncState: 'local',
    };
  }

  return null;
}

/**
 * MAG-01 — Magnitude Blindness
 * Pattern: accuracy on hard-tier items < 50% AND avg errorMagnitude > 0.20.
 * Indicates student cannot reason about fraction magnitude across difficulty.
 */
export function detectMAG01(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level < 8 || attempts.length < 5) return null;

  const hardAttempts = attempts.filter((a) => a.outcome !== 'ABANDONED');
  if (hardAttempts.length < 5) return null;

  const correctCount = hardAttempts.filter((a) => a.outcome === 'EXACT').length;
  const accuracy = correctCount / hardAttempts.length;

  const avgError =
    hardAttempts.reduce((sum, a) => sum + (a.errorMagnitude ?? 0), 0) / hardAttempts.length;

  if (accuracy < 0.5 && avgError > 0.2) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-MAG-01' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: Math.floor(hardAttempts.length * (1 - accuracy)),
      resolvedAt: null,
      evidenceAttemptIds: hardAttempts
        .filter((_, i) => i < 3)
        .map((a) => a.id),
      syncState: 'local',
    };
  }

  return null;
}

/**
 * PRX-01 — Proximity-to-1 Confusion
 * Pattern: student places "almost_one" benchmark targets in "half"/"almost_half" zones ≥ 50% of time.
 * Indicates confusion between fractions close to 1 and those close to 0.5.
 */
export function detectPRX01(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level < 8 || attempts.length < 4) return null;

  const benchmarkAttempts = attempts.filter((a) => a.archetype === 'benchmark');
  if (benchmarkAttempts.length < 4) return null;

  let proximityConfusionCount = 0;
  for (const attempt of benchmarkAttempts) {
    // PRX-01: student places "almost_one" fraction in wrong zone
    // Pattern: zones for benchmark_sort are 0, 0.25, 0.5, 0.75, 1
    // "almost_one" should go in zone 4 (3/4–1)
    // Student places in zone 2 (1/4–1/2) or zone 3 (1/2–3/4)
    if (
      attempt.outcome === 'WRONG' &&
      attempt.studentAnswerRaw &&
      attempt.correctAnswerRaw
    ) {
      const studentZone = (attempt.studentAnswerRaw as Record<string, unknown>)
        .zoneIndex;
      const correctZone = (attempt.correctAnswerRaw as Record<string, unknown>)
        .zoneIndex;

      // "almost_one" correct zone is typically 3 (0.75–1)
      // Confusion: placed in zone 1 (0.25–0.5) or zone 2 (0.5–0.75)
      if (
        (studentZone === 1 || studentZone === 2) &&
        (correctZone === 3 || correctZone === 4)
      ) {
        proximityConfusionCount++;
      }
    }
  }

  const rate = proximityConfusionCount / benchmarkAttempts.length;
  if (rate >= 0.5) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-PRX-01' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: proximityConfusionCount,
      resolvedAt: null,
      evidenceAttemptIds: benchmarkAttempts
        .filter((_, i) => i < 3)
        .map((a) => a.id),
      syncState: 'local',
    };
  }

  return null;
}

/**
 * Run all detectors in sequence; return first flag found.
 * Called from LevelScene.onCommit() after each question submission.
 */
export async function runAllDetectors(
  attempts: Attempt[],
  level: number
): Promise<MisconceptionFlag | null> {
  const flag =
    detectWHB01(attempts, level) ??
    detectWHB02(attempts, level) ??
    detectMAG01(attempts, level) ??
    detectPRX01(attempts, level);

  return flag || null;
}
