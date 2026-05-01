/**
 * Misconception detectors — thin compatibility shim.
 *
 * Phase 4.2 (per `PLANS/code-quality-2026-05-01.md`) replaced the 16
 * imperative detector functions in this file with a declarative rule
 * table at `src/engine/misconceptionRules.ts`. The interpreter that
 * walks that table lives in `src/engine/misconceptionRunner.ts`.
 *
 * This module now exists only to preserve the public API:
 *
 *   - `runAllDetectors(attempts, level, ctx)` — used by `Level01Scene`,
 *     `LevelScene`, and the existing test suite. Delegates to `runRules`.
 *   - `detectEOL01` / `detectWHB01` / `detectWHB02` — single-rule
 *     wrappers used by the legacy unit tests in
 *     `tests/unit/engine/misconceptionDetectors.test.ts`. Each looks up
 *     the matching row in `MISCONCEPTION_RULES` and runs it through the
 *     same evaluator as the runner, then assembles a `MisconceptionFlag`
 *     using the injected `DetectorContext`.
 *
 * No host-global access happens in this file — the engine-port lint rule
 * for `src/engine/**` continues to apply.
 */

import type { Attempt, MisconceptionFlag } from '../types/runtime';
import type { MisconceptionId } from '../types/branded';
import type { DetectorContext } from './ports';
import { runRules, evaluateRule } from './misconceptionRunner';
import { MISCONCEPTION_RULES } from './misconceptionRules';

/**
 * Run a single rule (looked up by `MisconceptionId`) and return a flag
 * if it fires, or `null` otherwise. Used by the back-compat `detect*`
 * exports below.
 */
function runOneRule(
  mcId: MisconceptionId,
  attempts: Attempt[],
  level: number,
  ctx: DetectorContext
): MisconceptionFlag | null {
  const rule = MISCONCEPTION_RULES.find((r) => r.id === mcId);
  if (!rule || attempts.length === 0) return null;
  try {
    const result = evaluateRule(rule, attempts, level);
    if (!result) return null;
    const stamp = ctx.clock.now();
    return {
      id: ctx.ids.generate(),
      studentId: attempts[0]!.studentId,
      misconceptionId: rule.id,
      firstObservedAt: stamp,
      lastObservedAt: stamp,
      observationCount: result.observationCount,
      resolvedAt: null,
      evidenceAttemptIds: result.evidenceAttemptIds,
      syncState: 'local',
    };
  } catch (err) {
    ctx.logger.warn('misconception_rule_error', {
      ruleId: mcId,
      error: String(err),
    });
    return null;
  }
}

/**
 * EOL-01 — Equal-Parts Loose Interpretation.
 * Back-compat wrapper around the corresponding row in
 * `MISCONCEPTION_RULES`. Prefer `runAllDetectors` for new code.
 */
export function detectEOL01(
  attempts: Attempt[],
  level: number,
  ctx: DetectorContext
): MisconceptionFlag | null {
  return runOneRule('MC-EOL-01' as MisconceptionId, attempts, level, ctx);
}

/**
 * WHB-01 — Whole-Number Bias (Numerator).
 * Back-compat wrapper around the corresponding row in
 * `MISCONCEPTION_RULES`. Prefer `runAllDetectors` for new code.
 */
export function detectWHB01(
  attempts: Attempt[],
  level: number,
  ctx: DetectorContext
): MisconceptionFlag | null {
  return runOneRule('MC-WHB-01' as MisconceptionId, attempts, level, ctx);
}

/**
 * WHB-02 — Whole-Number Bias (Denominator).
 * Back-compat wrapper around the corresponding row in
 * `MISCONCEPTION_RULES`. Prefer `runAllDetectors` for new code.
 */
export function detectWHB02(
  attempts: Attempt[],
  level: number,
  ctx: DetectorContext
): MisconceptionFlag | null {
  return runOneRule('MC-WHB-02' as MisconceptionId, attempts, level, ctx);
}

/**
 * Run every rule in `MISCONCEPTION_RULES` and return the resulting flags.
 * Called from `LevelScene.onCommit()` (and `Level01Scene.onCommit()`)
 * after each question submission per C7.2.
 *
 * The `ctx` argument is the engine-port composition root for this run:
 * production callers pass `{ clock: SystemClock, ids: CryptoUuidGenerator,
 * logger: ConsoleEngineLogger }` from `src/lib/adapters`; tests pass
 * deterministic doubles (e.g. fixed-instant clock + sequential id generator).
 */
export async function runAllDetectors(
  attempts: Attempt[],
  level: number,
  ctx: DetectorContext
): Promise<MisconceptionFlag[]> {
  return runRules(attempts, level, ctx);
}
