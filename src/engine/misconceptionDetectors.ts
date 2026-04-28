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

  const evidenceIds: import('@/types').AttemptId[] = [];
  for (const attempt of compareAttempts) {
    // WHB-01 trap: student picks the option with the larger numerator
    // This occurs when correct answer is NOT '>' (i.e., top is NOT bigger)
    // and student chose '>' anyway
    if (attempt.outcome === 'WRONG' && attempt.studentAnswerRaw) {
      const raw = attempt.studentAnswerRaw as Record<string, unknown>;
      // If student answered '>' when that was wrong, likely WHB-01 trap
      if (raw.relation === '>') {
        evidenceIds.push(attempt.id);
      }
    }
  }

  const rate = evidenceIds.length / compareAttempts.length;
  if (rate >= 0.6) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-WHB-01' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds,
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

  const evidenceIds: import('@/types').AttemptId[] = [];
  for (const attempt of compareAttempts) {
    // WHB-02 trap: student picks larger denominator when it's actually smaller fraction
    // Occurs in same-numerator activities (L7) where larger denominator = smaller fraction
    if (attempt.outcome === 'WRONG' && attempt.studentAnswerRaw) {
      const raw = attempt.studentAnswerRaw as Record<string, unknown>;
      // Trap: student answers '<' (bottom is bigger) when larger denominator makes it smaller
      if (raw.relation === '<' && attempt.correctAnswerRaw) {
        const correct = attempt.correctAnswerRaw as Record<string, unknown>;
        if (correct.relation === '>') {
          evidenceIds.push(attempt.id);
        }
      }
    }
  }

  const rate = evidenceIds.length / compareAttempts.length;
  if (rate >= 0.6) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-WHB-02' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds,
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
      evidenceAttemptIds: hardAttempts.filter((a) => a.outcome !== 'EXACT').map((a) => a.id),
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

  const evidenceIds: import('@/types').AttemptId[] = [];
  for (const attempt of benchmarkAttempts) {
    // PRX-01: student places "almost_one" fraction in wrong zone
    // Pattern: zones for benchmark_sort are 0, 0.25, 0.5, 0.75, 1
    // "almost_one" should go in zone 4 (3/4–1)
    // Student places in zone 2 (1/4–1/2) or zone 3 (1/2–3/4)
    if (attempt.outcome === 'WRONG' && attempt.studentAnswerRaw && attempt.correctAnswerRaw) {
      const studentZone = (attempt.studentAnswerRaw as Record<string, unknown>).zoneIndex;
      const correctZone = (attempt.correctAnswerRaw as Record<string, unknown>).zoneIndex;

      // "almost_one" correct zone is typically 3 (0.75–1)
      // Confusion: placed in zone 1 (0.25–0.5) or zone 2 (0.5–0.75)
      if ((studentZone === 1 || studentZone === 2) && (correctZone === 3 || correctZone === 4)) {
        evidenceIds.push(attempt.id);
      }
    }
  }

  const rate = evidenceIds.length / benchmarkAttempts.length;
  if (rate >= 0.5) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-PRX-01' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds,
      syncState: 'local',
    };
  }

  return null;
}

/**
 * EOL-01 — Equal-Parts Loose Interpretation
 * Pattern: student answers "yes (equal)" ≥ 50% of time on clearly unequal partitions.
 * per misconceptions.md §3.2 MC-EOL-01
 */
export function detectEOL01(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level < 1 || attempts.length < 4) return null;

  const eolAttempts = attempts.filter((a) => a.archetype === 'equal_or_not');
  if (eolAttempts.length < 4) return null;

  const evidenceIds: import('@/types').AttemptId[] = [];
  for (const attempt of eolAttempts) {
    // EOL-01: student answers "yes (equal)" when correct answer is "no (unequal)"
    if (attempt.outcome === 'WRONG' && attempt.studentAnswerRaw && attempt.correctAnswerRaw) {
      const raw = attempt.studentAnswerRaw as Record<string, unknown>;
      const correct = attempt.correctAnswerRaw as Record<string, unknown>;
      // Trap: student says equal (true) when it's unequal (false)
      if (raw.studentAnswer === true && correct.correctAnswer === false) {
        evidenceIds.push(attempt.id);
      }
    }
  }

  const rate = evidenceIds.length / eolAttempts.length;
  if (rate >= 0.5) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-EOL-01' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds,
      syncState: 'local',
    };
  }

  return null;
}

/**
 * NOM-01 — Numerator Over Magnitude (placeholder for expansion)
 * Future: detect when student focuses only on numerator size.
 */
export function detectNOM01(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level < 6 || attempts.length < 5) return null;

  // Placeholder: future expansion from identify/compare patterns
  return null;
}

/**
 * ORD-01 — Ordering confusion (placeholder for expansion)
 * Future: detect pattern errors in sequencing fractions.
 */
export function detectORD01(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level < 7 || attempts.length < 5) return null;

  // Placeholder: future expansion from order archetype
  return null;
}

/**
 * Run all detectors in sequence; return array of all flags found.
 * Called from LevelScene.onCommit() after each question submission.
 * per C7.2 — upsert all flags to misconceptionFlagsRepo
 */
export async function runAllDetectors(
  attempts: Attempt[],
  level: number
): Promise<MisconceptionFlag[]> {
  const flags: MisconceptionFlag[] = [];

  const flag1 = detectEOL01(attempts, level);
  if (flag1) flags.push(flag1);

  const flag2 = detectWHB01(attempts, level);
  if (flag2) flags.push(flag2);

  const flag3 = detectWHB02(attempts, level);
  if (flag3) flags.push(flag3);

  const flag4 = detectMAG01(attempts, level);
  if (flag4) flags.push(flag4);

  const flag5 = detectPRX01(attempts, level);
  if (flag5) flags.push(flag5);

  const flag6 = detectNOM01(attempts, level);
  if (flag6) flags.push(flag6);

  const flag7 = detectORD01(attempts, level);
  if (flag7) flags.push(flag7);

  return flags;
}
