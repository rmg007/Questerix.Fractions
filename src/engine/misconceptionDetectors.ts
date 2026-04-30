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
      evidenceAttemptIds: hardAttempts.filter((_, i) => i < 3).map((a) => a.id),
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
 * NOM-01 — Numerator Over Magnitude
 * Pattern: student consistently chooses options with higher numerators even when magnitude is small.
 */
export function detectNOM01(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level < 6 || attempts.length < 5) return null;

  const compareAttempts = attempts.filter((a) => a.archetype === 'compare');
  if (compareAttempts.length < 5) return null;

  const evidenceIds: import('@/types').AttemptId[] = [];
  for (const attempt of compareAttempts) {
    if (attempt.outcome === 'WRONG' && attempt.studentAnswerRaw) {
      const raw = attempt.studentAnswerRaw as Record<string, unknown>;
      // If student picked the option with the larger numerator digit (e.g. 3/8 vs 1/2)
      // This is often captured by the same logic as WHB-01 but can be broader.
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
      misconceptionId: 'MC-NOM-01' as MisconceptionId,
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
 * EOL-02 — Rotated-Halves Confusion
 */
export function detectEOL02(attempts: Attempt[], _level: number): MisconceptionFlag | null {
  if (attempts.length < 3) return null;
  const eolAttempts = attempts.filter((a) => a.archetype === 'equal_or_not');
  const rotated = eolAttempts.filter((a) => {
    const p = (a as any).payload as Record<string, any>;
    return p && p.rotation !== 0 && p.rotation !== undefined;
  });
  if (rotated.length < 3) return null;

  const evidenceIds = rotated
    .filter((a) => a.outcome === 'WRONG' && (a.studentAnswerRaw as any)?.studentAnswer === false)
    .map((a) => a.id);

  if (evidenceIds.length / rotated.length >= 0.5) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-EOL-02' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds as any,
      syncState: 'local',
    };
  }
  return null;
}

/**
 * EOL-03 — Visual-Symmetry-Equals-Equality
 */
export function detectEOL03(attempts: Attempt[], _level: number): MisconceptionFlag | null {
  if (attempts.length < 3) return null;
  const eolAttempts = attempts.filter((a) => a.archetype === 'equal_or_not');
  const evidenceIds = eolAttempts
    .filter((a) => a.outcome === 'WRONG' && (a.studentAnswerRaw as any)?.studentAnswer === true)
    .map((a) => a.id);

  if (evidenceIds.length / eolAttempts.length >= 0.4) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-EOL-03' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds as any,
      syncState: 'local',
    };
  }
  return null;
}

/**
 * EOL-04 — Equal Means Identical
 */
export function detectEOL04(attempts: Attempt[], _level: number): MisconceptionFlag | null {
  if (attempts.length < 3) return null;
  const eolAttempts = attempts.filter((a) => a.archetype === 'equal_or_not');
  const evidenceIds = eolAttempts
    .filter((a) => a.outcome === 'WRONG' && (a.studentAnswerRaw as any)?.studentAnswer === false)
    .map((a) => a.id);

  if (evidenceIds.length / eolAttempts.length >= 0.5) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-EOL-04' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds as any,
      syncState: 'local',
    };
  }
  return null;
}

/**
 * MAG-02 — Whole Disappears When Divided
 */
export function detectMAG02(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level !== 5 || attempts.length < 3) return null;
  // Specific to compositional fourths in L5
  const compAttempts = attempts.filter((a) => (a as any).skillIds?.includes('KC-PRODUCTION-2'));
  if (compAttempts.length < 3) return null;

  const evidenceIds = compAttempts.filter((a) => a.outcome === 'WRONG').map((a) => a.id);
  if (evidenceIds.length >= 3) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-MAG-02' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds as any,
      syncState: 'local',
    };
  }
  return null;
}

/**
 * PRX-02 — All Fractions Are Less Than One-Half
 */
export function detectPRX02(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level < 8 || attempts.length < 5) return null;
  const benchmarkAttempts = attempts.filter((a) => a.archetype === 'benchmark');
  const targetAboveHalf = benchmarkAttempts.filter((a) => {
    const c = a.correctAnswerRaw as any;
    return c && c.targetValue > 0.5;
  });
  if (targetAboveHalf.length < 3) return null;

  const evidenceIds = targetAboveHalf
    .filter((a) => (a.studentAnswerRaw as any)?.placedValue < 0.5)
    .map((a) => a.id);

  if (evidenceIds.length / targetAboveHalf.length >= 0.6) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-PRX-02' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds as any,
      syncState: 'local',
    };
  }
  return null;
}

/**
 * SHP-01 — Whole = Circle
 */
export function detectSHP01(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level > 2) return null;
  const rectangleAttempts = attempts.filter((a) => (a as any).payload?.shapeType === 'rectangle');
  if (rectangleAttempts.length < 3) return null;

  const evidenceIds = rectangleAttempts
    .filter((a) => ((a as any).durationMS ?? 0) > 30000 || ((a as any).hintCount ?? 0) > 2)
    .map((a) => a.id);

  if (evidenceIds.length >= 2) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-SHP-01' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds as any,
      syncState: 'local',
    };
  }
  return null;
}

/**
 * SHP-02 — Size = Wholeness
 */
export function detectSHP02(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level !== 1) return null;
  const smallShapeAttempts = attempts.filter((a) => (a as any).payload?.scale < 0.6);
  if (smallShapeAttempts.length < 3) return null;

  const evidenceIds = smallShapeAttempts.filter((a) => a.outcome === 'WRONG').map((a) => a.id);
  if (evidenceIds.length >= 2) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-SHP-02' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds as any,
      syncState: 'local',
    };
  }
  return null;
}

/**
 * VOC-01 — Fourth ≠ Quarter
 */
export function detectVOC01(attempts: Attempt[], _level: number): MisconceptionFlag | null {
  const vocabAttempts = attempts.filter((a) =>
    (a as any).prompt?.text?.toLowerCase().includes('quarter')
  );
  if (vocabAttempts.length < 2) return null;

  const evidenceIds = vocabAttempts.filter((a) => a.outcome === 'WRONG').map((a) => a.id);
  if (evidenceIds.length >= 2) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-VOC-01' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds as any,
      syncState: 'local',
    };
  }
  return null;
}

/**
 * L5-THIRDS-HALF-01 — Thirds vs Half Confusion
 */
export function detectL5ThirdsHalf(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level !== 5) return null;
  const thirdsAttempts = attempts.filter((a) => (a as any).payload?.targetPartitions === 3);
  const evidenceIds = thirdsAttempts
    .filter((a) => (a.studentAnswerRaw as any)?.actualPartitions === 2)
    .map((a) => a.id);

  if (evidenceIds.length / thirdsAttempts.length >= 0.5) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-L5-THIRDS-HALF-01' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds as any,
      syncState: 'local',
    };
  }
  return null;
}

/**
 * L5-FOURTHS-3CUTS-01 — Fourths by 3 Cuts
 */
export function detectL5Fourths3Cuts(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level !== 5) return null;
  const fourthsAttempts = attempts.filter((a) => (a as any).payload?.targetPartitions === 4);
  const evidenceIds = fourthsAttempts
    .filter((a) => (a.studentAnswerRaw as any)?.cutCount === 3)
    .map((a) => a.id);

  if (evidenceIds.length >= 1) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-L5-FOURTHS-3CUTS-01' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds as any,
      syncState: 'local',
    };
  }
  return null;
}

/**
 * L5-DENSWITCH-01 — Denominator Switch Confusion
 */
export function detectL5DenSwitch(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level !== 5) return null;
  const multiStep = attempts.filter((a) => (a as any).payload?.isMultiStep === true);
  const evidenceIds = multiStep.filter((a) => a.outcome === 'WRONG').map((a) => a.id);

  if (evidenceIds.length >= 3) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-L5-DENSWITCH-01' as MisconceptionId,
      firstObservedAt: Date.now(),
      lastObservedAt: Date.now(),
      observationCount: evidenceIds.length,
      resolvedAt: null,
      evidenceAttemptIds: evidenceIds as any,
      syncState: 'local',
    };
  }
  return null;
}

/**
 * ORD-01 — Ordering confusion (placeholder for expansion)

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
 * STRAT-01 — No Strategy (Trial & Error)
 * Pattern: student picks up cards in tray order (0, 1, 2...) and tests them sequentially
 * against slot 1, 2... rather than picking benchmark fractions (1/2, 1) first.
 * Detected from roundEvents telemetry.
 */
export function detectSTRAT01(attempts: Attempt[], level: number): MisconceptionFlag | null {
  if (level < 9 || attempts.length < 3) return null;

  const orderingAttempts = attempts.filter(
    (a) => ((a.archetype as string) === 'ordering' || (a.archetype as string) === 'order') && a.roundEvents && a.roundEvents.length > 0
  );
  if (orderingAttempts.length < 3) return null;

  const evidenceIds: any[] = [];
  for (const attempt of orderingAttempts) {
    const events = attempt.roundEvents!;

    // Check if the first 3 pickUp events follow tray order (index 0, then 1, then 2)
    const pickUpIndices = events
      .filter((e) => e.type === 'pickUp')
      .map((e) => e.trayIndex)
      .filter((idx) => idx !== undefined) as number[];

    if (pickUpIndices.length >= 3) {
      const isSequential = pickUpIndices.slice(0, 3).every((val, i) => val === i);
      if (isSequential) {
        evidenceIds.push(attempt.id);
      }
    }
  }

  const rate = evidenceIds.length / orderingAttempts.length;
  if (rate >= 0.7) {
    return {
      id: crypto.randomUUID(),
      studentId: attempts[0].studentId,
      misconceptionId: 'MC-STRAT-01' as MisconceptionId,
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

  const flagEOL02 = detectEOL02(attempts, level);
  if (flagEOL02) flags.push(flagEOL02);

  const flagEOL03 = detectEOL03(attempts, level);
  if (flagEOL03) flags.push(flagEOL03);

  const flagEOL04 = detectEOL04(attempts, level);
  if (flagEOL04) flags.push(flagEOL04);

  const flagMAG02 = detectMAG02(attempts, level);
  if (flagMAG02) flags.push(flagMAG02);

  const flagPRX02 = detectPRX02(attempts, level);
  if (flagPRX02) flags.push(flagPRX02);

  const flagSHP01 = detectSHP01(attempts, level);
  if (flagSHP01) flags.push(flagSHP01);

  const flagSHP02 = detectSHP02(attempts, level);
  if (flagSHP02) flags.push(flagSHP02);

  const flagVOC01 = detectVOC01(attempts, level);
  if (flagVOC01) flags.push(flagVOC01);

  const flagL5TH = detectL5ThirdsHalf(attempts, level);
  if (flagL5TH) flags.push(flagL5TH);

  const flagL5F3C = detectL5Fourths3Cuts(attempts, level);
  if (flagL5F3C) flags.push(flagL5F3C);

  const flagL5DS = detectL5DenSwitch(attempts, level);
  if (flagL5DS) flags.push(flagL5DS);

  const flag7 = detectORD01(attempts, level);
  if (flag7) flags.push(flag7);

  const flag8 = detectSTRAT01(attempts, level);
  if (flag8) flags.push(flag8);

  return flags;
}
