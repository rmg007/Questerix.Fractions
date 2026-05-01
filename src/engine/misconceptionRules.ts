/**
 * Misconception rule table — declarative definitions of every misconception
 * pattern the engine can detect.
 *
 * Phase 4.2 (per `PLANS/code-quality-2026-05-01.md`): replaces the imperative
 * detector functions in `misconceptionDetectors.ts` with rows of data. Adding
 * a misconception is now a single-row addition. The interpreter lives in
 * `misconceptionRunner.ts` and walks this table once per `runAllDetectors`
 * invocation.
 *
 * Behavior contract: the flags emitted by the runner over this table are
 * **identical** (modulo timestamp/ID values from injected ports) to those
 * produced by the previous hand-written `detect*` functions. Snapshot tests
 * in `tests/unit/engine/misconceptionRules.test.ts` lock this in.
 *
 * Two shapes are supported:
 *
 * 1. **Predicate rules** (`predicate`) — the common case. Walk the candidate
 *    attempts, count those where `predicate(attempt) === true`, and fire
 *    when `count >= minObservations && count / total >= evidenceRate`.
 *
 * 2. **Aggregator rules** (`aggregator`) — for cross-attempt analyses that
 *    don't fit a per-attempt boolean (e.g. MAG-01's accuracy + avgError
 *    composite). The aggregator returns the evidence directly. Used
 *    sparingly; flag this as the escape hatch when a row would otherwise
 *    require a per-rule custom function.
 *
 * Both shapes share the level/archetype guards plus a candidate filter
 * (`candidateFilter`) so the rule decides which attempts are eligible
 * before counting. This subsumes archetype filtering, payload filtering,
 * and prompt-text filtering uniformly.
 */

import type { Attempt, MisconceptionFlag } from '../types/runtime';
import type { ArchetypeId } from '../types/archetype';
import type { MisconceptionId, AttemptId } from '../types/branded';

/**
 * Aggregator return shape for cross-attempt analyses.
 * Returning `null` means "do not fire this rule".
 */
export interface AggregatorResult {
  /** Attempt IDs that support the misconception. */
  evidenceAttemptIds: AttemptId[];
  /** Optional override; defaults to `evidenceAttemptIds.length`. */
  observationCount?: number;
}

/**
 * One row in the misconception rule table.
 *
 * The runner uses `appliesTo` for level/archetype gating, then either
 * walks `candidateFilter`'d attempts under `predicate` or invokes
 * `aggregator` directly. Exactly one of `predicate` / `aggregator` must
 * be set.
 */
export interface MisconceptionRule {
  /** Misconception emitted when this rule fires (e.g. `MC-WHB-01`). */
  id: MisconceptionId;

  /**
   * Level/archetype guards. The runner short-circuits when these don't
   * match the active level. `levels: 'any'` means level-agnostic; archetype
   * filtering is delegated to `candidateFilter` because a few rules need
   * payload-level filtering rather than archetype-only filtering.
   */
  appliesTo: {
    /** Discrete level numbers, an inclusive range, or `'any'`. */
    levels: number[] | { min?: number; max?: number; equals?: number } | 'any';
    /**
     * Archetype allowlist. Empty/undefined = no archetype filter (the rule
     * uses `candidateFilter` to pick attempts).
     */
    archetypes?: ArchetypeId[];
  };

  /**
   * Refines `appliesTo` by selecting attempts that count toward this rule.
   * Default: identity (every attempt the archetype filter accepted).
   * Use this for payload-shape filters (e.g. `payload.shapeType === 'rectangle'`)
   * or prompt-text filters (e.g. `prompt.text` contains 'quarter').
   */
  candidateFilter?: (a: Attempt) => boolean;

  /**
   * Minimum total candidate attempts required before the rule can fire.
   * Without enough candidates, the rule short-circuits. Default: 1.
   */
  minCandidates?: number;

  /**
   * Minimum supporting (predicate-positive) attempts required to fire.
   * Default: 1.
   */
  minObservations: number;

  /**
   * Required ratio (`supporting / candidates`) for the rule to fire. Use
   * `0` to disable rate gating (some rules fire on count alone).
   * Default: 0.
   */
  evidenceRate?: number;

  /**
   * Per-attempt boolean. Returns `true` if this attempt supports the
   * misconception. Mutually exclusive with `aggregator`.
   */
  predicate?: (a: Attempt) => boolean;

  /**
   * Cross-attempt analysis — used when a clean predicate doesn't fit.
   * Receives the candidate attempts and returns evidence (or `null` to
   * skip). Mutually exclusive with `predicate`.
   *
   * Document why the rule needs an aggregator in a comment on the row.
   */
  aggregator?: (candidates: Attempt[]) => AggregatorResult | null;

  /**
   * Optional cap on emitted `evidenceAttemptIds` — ORD-01 historically
   * sliced at 5. Most rules emit all matching IDs.
   */
  evidenceLimit?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Type-narrow a value to a record. */
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Read `relation` field from a comparison answer payload. */
const readRelation = (raw: unknown): string | undefined =>
  isRecord(raw) && typeof raw.relation === 'string' ? raw.relation : undefined;

/** Read a numeric field from a record-like payload. */
const readNumber = (raw: unknown, key: string): number | undefined => {
  if (!isRecord(raw)) return undefined;
  const v = raw[key];
  return typeof v === 'number' ? v : undefined;
};

// ── Rule table ─────────────────────────────────────────────────────────────

/**
 * The full rule table. Order is irrelevant for correctness, but matches
 * the historical `runAllDetectors` ordering so flag arrays sort identically
 * for snapshot tests.
 *
 * NOTE: `flag.studentId` is sourced from `attempts[0]` by the runner; if
 * a rule's `candidateFilter` produces an empty list the rule short-circuits.
 */
export const MISCONCEPTION_RULES: readonly MisconceptionRule[] = [
  // ── EOL-01 — Equal-Parts Loose Interpretation ────────────────────────────
  {
    id: 'MC-EOL-01' as MisconceptionId,
    appliesTo: { levels: { min: 1 }, archetypes: ['equal_or_not'] },
    minCandidates: 4,
    minObservations: 1,
    evidenceRate: 0.5,
    predicate: (a) => {
      if (a.outcome !== 'WRONG') return false;
      if (!isRecord(a.studentAnswerRaw) || !isRecord(a.correctAnswerRaw)) return false;
      return (
        a.studentAnswerRaw.studentAnswer === true && a.correctAnswerRaw.correctAnswer === false
      );
    },
  },

  // ── WHB-01 — Whole-Number Bias (Numerator) ───────────────────────────────
  {
    id: 'MC-WHB-01' as MisconceptionId,
    appliesTo: { levels: { min: 6 }, archetypes: ['compare'] },
    minCandidates: 5,
    minObservations: 1,
    evidenceRate: 0.6,
    predicate: (a) => a.outcome === 'WRONG' && readRelation(a.studentAnswerRaw) === '>',
  },

  // ── WHB-02 — Whole-Number Bias (Denominator) ─────────────────────────────
  {
    id: 'MC-WHB-02' as MisconceptionId,
    appliesTo: { levels: { min: 7 }, archetypes: ['compare'] },
    minCandidates: 5,
    minObservations: 1,
    evidenceRate: 0.6,
    predicate: (a) =>
      a.outcome === 'WRONG' &&
      readRelation(a.studentAnswerRaw) === '<' &&
      readRelation(a.correctAnswerRaw) === '>',
  },

  // ── MAG-01 — Magnitude Blindness ─────────────────────────────────────────
  // RESISTS pure predicate form — fires on accuracy + avg errorMagnitude
  // composite across the whole window, not a per-attempt boolean. Modeled
  // via aggregator. Outcome filter (`!== 'ABANDONED'`) lives in candidateFilter.
  {
    id: 'MC-MAG-01' as MisconceptionId,
    appliesTo: { levels: { min: 8 } },
    candidateFilter: (a) => a.outcome !== 'ABANDONED',
    minCandidates: 5,
    minObservations: 1,
    aggregator: (cands) => {
      if (cands.length < 5) return null;
      const correctCount = cands.filter((a) => a.outcome === 'EXACT').length;
      const accuracy = correctCount / cands.length;
      const avgError = cands.reduce((sum, a) => sum + (a.errorMagnitude ?? 0), 0) / cands.length;
      if (accuracy < 0.5 && avgError > 0.2) {
        const evidence = cands.filter((a) => a.outcome !== 'EXACT').map((a) => a.id);
        // Match historical observationCount semantics: floor(N * (1 - acc)).
        return {
          evidenceAttemptIds: evidence,
          observationCount: Math.floor(cands.length * (1 - accuracy)),
        };
      }
      return null;
    },
  },

  // ── PRX-01 — Proximity-to-1 Confusion ────────────────────────────────────
  {
    id: 'MC-PRX-01' as MisconceptionId,
    appliesTo: { levels: { min: 8 }, archetypes: ['benchmark'] },
    minCandidates: 4,
    minObservations: 1,
    evidenceRate: 0.5,
    predicate: (a) => {
      if (a.outcome !== 'WRONG') return false;
      const sZone = readNumber(a.studentAnswerRaw, 'zoneIndex');
      const cZone = readNumber(a.correctAnswerRaw, 'zoneIndex');
      return (sZone === 1 || sZone === 2) && (cZone === 3 || cZone === 4);
    },
  },

  // ── NOM-01 — Numerator Over Magnitude ────────────────────────────────────
  {
    id: 'MC-NOM-01' as MisconceptionId,
    appliesTo: { levels: { min: 6 }, archetypes: ['compare'] },
    minCandidates: 5,
    minObservations: 1,
    evidenceRate: 0.6,
    predicate: (a) => a.outcome === 'WRONG' && readRelation(a.studentAnswerRaw) === '>',
  },

  // ── EOL-02 — Rotated-Halves Confusion ────────────────────────────────────
  {
    id: 'MC-EOL-02' as MisconceptionId,
    appliesTo: { levels: 'any', archetypes: ['equal_or_not'] },
    candidateFilter: (a) => {
      const p = a.payload as unknown;
      if (!isRecord(p)) return false;
      return p.rotation !== 0 && p.rotation !== undefined;
    },
    minCandidates: 3,
    minObservations: 1,
    evidenceRate: 0.5,
    predicate: (a) => {
      if (a.outcome !== 'WRONG') return false;
      const ans = a.studentAnswerRaw;
      return isRecord(ans) && ans.studentAnswer === false;
    },
  },

  // ── EOL-03 — Visual-Symmetry-Equals-Equality ─────────────────────────────
  // Note: original detector divides by archetype-attempt count without a
  // min-candidate guard (so empty list = NaN ÷ 0 → false). Preserve the
  // behaviour: minCandidates: 1 is the smallest non-trivial guard.
  {
    id: 'MC-EOL-03' as MisconceptionId,
    appliesTo: { levels: 'any', archetypes: ['equal_or_not'] },
    minCandidates: 1,
    minObservations: 1,
    evidenceRate: 0.4,
    predicate: (a) => {
      if (a.outcome !== 'WRONG') return false;
      const ans = a.studentAnswerRaw;
      return isRecord(ans) && ans.studentAnswer === true;
    },
  },

  // ── EOL-04 — Equal Means Identical ───────────────────────────────────────
  {
    id: 'MC-EOL-04' as MisconceptionId,
    appliesTo: { levels: 'any', archetypes: ['equal_or_not'] },
    minCandidates: 1,
    minObservations: 1,
    evidenceRate: 0.5,
    predicate: (a) => {
      if (a.outcome !== 'WRONG') return false;
      const ans = a.studentAnswerRaw;
      return isRecord(ans) && ans.studentAnswer === false;
    },
  },

  // ── MAG-02 — Whole Disappears When Divided ───────────────────────────────
  {
    id: 'MC-MAG-02' as MisconceptionId,
    appliesTo: { levels: { equals: 5 } },
    candidateFilter: (a) => a.skillIds?.includes('KC-PRODUCTION-2') ?? false,
    minCandidates: 3,
    // Historical detector required ≥3 evidence (not just count threshold).
    minObservations: 3,
    predicate: (a) => a.outcome === 'WRONG',
  },

  // ── PRX-02 — All Fractions Are Less Than One-Half ────────────────────────
  {
    id: 'MC-PRX-02' as MisconceptionId,
    appliesTo: { levels: { min: 8 }, archetypes: ['benchmark'] },
    candidateFilter: (a) => {
      const c = a.correctAnswerRaw as unknown;
      if (!isRecord(c)) return false;
      return typeof c.targetValue === 'number' && c.targetValue > 0.5;
    },
    minCandidates: 3,
    minObservations: 1,
    evidenceRate: 0.6,
    predicate: (a) => {
      const s = a.studentAnswerRaw as unknown;
      if (!isRecord(s)) return false;
      return typeof s.placedValue === 'number' && s.placedValue < 0.5;
    },
  },

  // ── SHP-01 — Whole = Circle ──────────────────────────────────────────────
  {
    id: 'MC-SHP-01' as MisconceptionId,
    appliesTo: { levels: { max: 2 } },
    candidateFilter: (a) => {
      const p = a.payload as unknown;
      return isRecord(p) && p.shapeType === 'rectangle';
    },
    minCandidates: 3,
    minObservations: 2,
    predicate: (a) => (a.durationMS ?? 0) > 30000 || (a.hintCount ?? 0) > 2,
  },

  // ── SHP-02 — Size = Wholeness ────────────────────────────────────────────
  {
    id: 'MC-SHP-02' as MisconceptionId,
    appliesTo: { levels: { equals: 1 } },
    candidateFilter: (a) => {
      const p = a.payload as unknown;
      if (!isRecord(p)) return false;
      return Number(p.scale ?? 0) < 0.6;
    },
    minCandidates: 3,
    minObservations: 2,
    predicate: (a) => a.outcome === 'WRONG',
  },

  // ── VOC-01 — Fourth ≠ Quarter ────────────────────────────────────────────
  {
    id: 'MC-VOC-01' as MisconceptionId,
    appliesTo: { levels: 'any' },
    candidateFilter: (a) => a.prompt?.text?.toLowerCase().includes('quarter') ?? false,
    minCandidates: 2,
    minObservations: 2,
    predicate: (a) => a.outcome === 'WRONG',
  },

  // ── L5-THIRDS-HALF-01 — Thirds vs Half Confusion ─────────────────────────
  // Note: original detector has no min-candidate guard. Without one, an
  // empty list yields 0 / 0 = NaN, the >= 0.5 check fails, and the rule
  // does not fire — same observable behaviour as minCandidates: 1.
  {
    id: 'MC-L5-THIRDS-HALF-01' as MisconceptionId,
    appliesTo: { levels: { equals: 5 } },
    candidateFilter: (a) => {
      const p = a.payload as unknown;
      return isRecord(p) && p.targetPartitions === 3;
    },
    minCandidates: 1,
    minObservations: 1,
    evidenceRate: 0.5,
    predicate: (a) => {
      const s = a.studentAnswerRaw as unknown;
      return isRecord(s) && s.actualPartitions === 2;
    },
  },

  // ── L5-FOURTHS-3CUTS-01 — Fourths by 3 Cuts ──────────────────────────────
  {
    id: 'MC-L5-FOURTHS-3CUTS-01' as MisconceptionId,
    appliesTo: { levels: { equals: 5 } },
    candidateFilter: (a) => a.payload?.targetPartitions === 4,
    minCandidates: 1,
    minObservations: 1,
    predicate: (a) => (a.studentAnswerRaw as Record<string, unknown>)?.cutCount === 3,
  },

  // ── L5-DENSWITCH-01 — Denominator Switch Confusion ───────────────────────
  {
    id: 'MC-L5-DENSWITCH-01' as MisconceptionId,
    appliesTo: { levels: { equals: 5 } },
    candidateFilter: (a) => a.payload?.isMultiStep === true,
    minCandidates: 1,
    minObservations: 3,
    predicate: (a) => a.outcome === 'WRONG',
  },

  // ── ORD-01 — Ordering confusion ──────────────────────────────────────────
  // RESISTS pure predicate form — three OR'd patterns (sequential pickup,
  // high swap count, multi-fraction wrong) plus an evidence cap of 5 IDs.
  // Modeled via aggregator. The candidate filter encodes the historical
  // archetype/array guards.
  {
    id: 'MC-ORD-01' as MisconceptionId,
    appliesTo: { levels: { min: 9 } },
    candidateFilter: (a) =>
      ((a.archetype as string) === 'order' || (a.archetype as string) === 'ordering') &&
      a.studentAnswerRaw !== undefined &&
      a.studentAnswerRaw !== null &&
      Array.isArray(a.studentAnswerRaw),
    minCandidates: 5,
    minObservations: 3,
    evidenceLimit: 5,
    aggregator: (cands) => {
      const evidenceIds: AttemptId[] = [];
      for (const attempt of cands) {
        // Pattern A: sequential tray picking (indices 0, 1, 2 in order).
        if (attempt.roundEvents && attempt.roundEvents.length > 0) {
          const pickUpEvents = attempt.roundEvents.filter((e) => e.type === 'pickUp');
          if (pickUpEvents.length >= 3) {
            const picked = pickUpEvents.slice(0, 3).map((e) => e.trayIndex);
            const isSequential =
              picked.length === 3 && picked[0] === 0 && picked[1] === 1 && picked[2] === 2;
            if (isSequential) {
              evidenceIds.push(attempt.id);
              continue;
            }
          }
        }
        // Pattern B: high swap count on wrong/close outcomes.
        if (
          attempt.roundEvents &&
          attempt.roundEvents.length > 0 &&
          !evidenceIds.includes(attempt.id)
        ) {
          const swapCount = attempt.roundEvents.filter((e) => e.type === 'swap').length;
          if ((attempt.outcome === 'WRONG' || attempt.outcome === 'CLOSE') && swapCount >= 2) {
            evidenceIds.push(attempt.id);
            continue;
          }
        }
        // Pattern C: multi-fraction wrong ordering (3+ items).
        if (
          attempt.studentAnswerRaw &&
          Array.isArray(attempt.studentAnswerRaw) &&
          (attempt.studentAnswerRaw as unknown[]).length >= 3 &&
          attempt.outcome === 'WRONG' &&
          !evidenceIds.includes(attempt.id)
        ) {
          evidenceIds.push(attempt.id);
        }
      }
      const rate = evidenceIds.length / cands.length;
      if (rate >= 0.5 && evidenceIds.length >= 3) {
        return { evidenceAttemptIds: evidenceIds };
      }
      return null;
    },
  },

  // ── STRAT-01 — No Strategy (Trial & Error) ───────────────────────────────
  {
    id: 'MC-STRAT-01' as MisconceptionId,
    appliesTo: { levels: { min: 9 } },
    candidateFilter: (a) =>
      ((a.archetype as string) === 'ordering' || (a.archetype as string) === 'order') &&
      !!a.roundEvents &&
      a.roundEvents.length > 0,
    minCandidates: 3,
    minObservations: 1,
    evidenceRate: 0.7,
    predicate: (a) => {
      const events = a.roundEvents ?? [];
      const pickUpIndices = events
        .filter((e) => e.type === 'pickUp')
        .map((e) => e.trayIndex)
        .filter((idx) => idx !== undefined) as number[];
      if (pickUpIndices.length < 3) return false;
      return pickUpIndices.slice(0, 3).every((val, i) => val === i);
    },
  },
];

/** Re-export for runner convenience. */
export type { MisconceptionFlag };
