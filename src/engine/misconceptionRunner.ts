/**
 * Misconception rule interpreter — walks a `MisconceptionRule[]` against a
 * window of recent attempts and emits `MisconceptionFlag[]`.
 *
 * Phase 4.2 (per `PLANS/code-quality-2026-05-01.md`) — replaces the
 * imperative `detect*` functions in `misconceptionDetectors.ts`. The
 * legacy file now re-exports a thin `runAllDetectors` wrapper that calls
 * into `runRules` here, so all callers (`Level01Scene`, `LevelScene`,
 * tests) keep their existing API.
 *
 * Per-rule processing:
 *   1. Skip if `appliesTo.levels` does not include `levelNumber`.
 *   2. Filter attempts by `appliesTo.archetypes`, then by `candidateFilter`.
 *   3. For predicate rules: walk candidates, collect IDs where
 *      `predicate(a) === true`. Fire when
 *      `count >= minObservations && (count / candidates) >= evidenceRate`.
 *   4. For aggregator rules: invoke `aggregator(candidates)` directly;
 *      fire when it returns a non-null `AggregatorResult` and the count
 *      meets `minObservations`.
 *   5. Build a `MisconceptionFlag` using `ctx.ids.generate()` for the id
 *      and `ctx.clock.now()` for the timestamps. `studentId` comes from
 *      the first attempt in the supplied list (consistent with the legacy
 *      detectors).
 *
 * Each rule is wrapped in try/catch — a buggy rule must not break the
 * whole runner. Errors are logged via `ctx.logger.warn`.
 *
 * Ordering: flags are emitted in rule-table order, matching the historical
 * `runAllDetectors` ordering.
 */

import type { Attempt, MisconceptionFlag } from '../types/runtime';
import type { AttemptId } from '../types/branded';
import type { DetectorContext } from './ports';
import {
  MISCONCEPTION_RULES,
  type MisconceptionRule,
  type AggregatorResult,
} from './misconceptionRules';

// ── Level guard ────────────────────────────────────────────────────────────

const matchesLevel = (guard: MisconceptionRule['appliesTo']['levels'], level: number): boolean => {
  if (guard === 'any') return true;
  if (Array.isArray(guard)) return guard.includes(level);
  if (guard.equals !== undefined) return level === guard.equals;
  if (guard.min !== undefined && level < guard.min) return false;
  if (guard.max !== undefined && level > guard.max) return false;
  return true;
};

// ── Single-rule evaluation ─────────────────────────────────────────────────

/**
 * Evaluate a single rule against a window of attempts. Returns the evidence
 * (without `id` and timestamps yet) or `null` if the rule does not fire.
 *
 * Pure function — no port access happens here. The caller assembles the
 * final `MisconceptionFlag` so that test snapshots over rule logic don't
 * depend on the clock/id ports.
 */
export function evaluateRule(
  rule: MisconceptionRule,
  attempts: Attempt[],
  level: number
): { evidenceAttemptIds: AttemptId[]; observationCount: number } | null {
  // 1. Level guard.
  if (!matchesLevel(rule.appliesTo.levels, level)) return null;

  // 2. Archetype + candidate filter.
  let candidates = attempts;
  if (rule.appliesTo.archetypes && rule.appliesTo.archetypes.length > 0) {
    const set = new Set<string>(rule.appliesTo.archetypes);
    candidates = candidates.filter((a) => set.has(a.archetype as string));
  }
  if (rule.candidateFilter) {
    candidates = candidates.filter(rule.candidateFilter);
  }

  const minCandidates = rule.minCandidates ?? 1;
  if (candidates.length < minCandidates) return null;

  // 3a. Aggregator path.
  if (rule.aggregator) {
    const result: AggregatorResult | null = rule.aggregator(candidates);
    if (!result) return null;
    const obs = result.observationCount ?? result.evidenceAttemptIds.length;
    if (obs < rule.minObservations) return null;
    const evidence = rule.evidenceLimit
      ? result.evidenceAttemptIds.slice(0, rule.evidenceLimit)
      : result.evidenceAttemptIds;
    return { evidenceAttemptIds: evidence, observationCount: obs };
  }

  // 3b. Predicate path.
  if (!rule.predicate) {
    // Misconfigured rule — treat as no-op.
    return null;
  }
  const evidenceIds: AttemptId[] = [];
  for (const a of candidates) {
    if (rule.predicate(a)) evidenceIds.push(a.id);
  }
  if (evidenceIds.length < rule.minObservations) return null;
  const rate = evidenceIds.length / candidates.length;
  if ((rule.evidenceRate ?? 0) > 0 && rate < rule.evidenceRate!) return null;

  const evidence = rule.evidenceLimit ? evidenceIds.slice(0, rule.evidenceLimit) : evidenceIds;
  return { evidenceAttemptIds: evidence, observationCount: evidenceIds.length };
}

// ── Public runner ──────────────────────────────────────────────────────────

/**
 * Walk every rule in the supplied table and return a `MisconceptionFlag`
 * for each rule that fires. Each rule invocation is wrapped in try/catch —
 * a buggy rule emits a `ctx.logger.warn` event but never breaks the run.
 *
 * Behavior parity: the output is identical (modulo timestamp/ID values)
 * to the legacy `runAllDetectors` function.
 */
export function runRules(
  attempts: Attempt[],
  level: number,
  ctx: DetectorContext,
  rules: readonly MisconceptionRule[] = MISCONCEPTION_RULES
): MisconceptionFlag[] {
  if (attempts.length === 0) return [];
  const studentId = attempts[0]!.studentId;
  const flags: MisconceptionFlag[] = [];

  for (const rule of rules) {
    try {
      const result = evaluateRule(rule, attempts, level);
      if (!result) continue;
      const stamp = ctx.clock.now();
      flags.push({
        id: ctx.ids.generate(),
        studentId,
        misconceptionId: rule.id,
        firstObservedAt: stamp,
        lastObservedAt: stamp,
        observationCount: result.observationCount,
        resolvedAt: null,
        evidenceAttemptIds: result.evidenceAttemptIds,
        syncState: 'local',
      });
    } catch (err) {
      ctx.logger.warn('misconception_rule_error', {
        ruleId: rule.id,
        error: String(err),
      });
    }
  }

  return flags;
}
