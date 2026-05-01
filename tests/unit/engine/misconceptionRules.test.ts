/**
 * Unit tests for the declarative misconception rule table + interpreter.
 *
 * Phase 4.2 (per `PLANS/code-quality-2026-05-01.md`). Covers:
 *
 *  - Each rule fires correctly when synthetic attempts match (positive case)
 *  - Each rule does NOT fire when below `minObservations` (negative case)
 *  - Each rule does NOT fire when archetype/level guards don't match
 *  - A buggy rule predicate (`throw`) doesn't break the runner — other
 *    rules still execute
 *  - Snapshot parity: a fixed `recentAttempts` fixture passed to
 *    `runRules` produces the same flag set as the legacy `runAllDetectors`
 *    public API.
 *
 * The interpreter under test lives in `src/engine/misconceptionRunner.ts`;
 * the rule rows are at `src/engine/misconceptionRules.ts`.
 */

import { describe, it, expect } from 'vitest';
import {
  runRules,
  evaluateRule,
} from '../../../src/engine/misconceptionRunner';
import {
  MISCONCEPTION_RULES,
  type MisconceptionRule,
} from '../../../src/engine/misconceptionRules';
import { runAllDetectors } from '../../../src/engine/misconceptionDetectors';
import type { DetectorContext } from '../../../src/engine/ports';
import type { Attempt } from '@/types';
import type { MisconceptionId } from '../../../src/types/branded';

// ── Test helpers ───────────────────────────────────────────────────────────

const FIXED_NOW = 1_700_000_000_000;
const makeCtx = (): DetectorContext & {
  warnings: Array<{ event: string; attrs?: Record<string, unknown> }>;
} => {
  let n = 0;
  const warnings: Array<{ event: string; attrs?: Record<string, unknown> }> = [];
  return {
    warnings,
    clock: { now: () => FIXED_NOW, monotonic: () => FIXED_NOW },
    ids: { generate: () => `mc-test-${++n}` },
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: (event, attrs) => warnings.push({ event, attrs }),
      error: () => undefined,
    },
  };
};

let nextAttemptId = 0;
const makeAttempt = (overrides: Partial<Attempt>): Attempt => {
  nextAttemptId += 1;
  return {
    id: `a-${nextAttemptId}` as Attempt['id'],
    sessionId: 's-1' as Attempt['sessionId'],
    studentId: 'stu-1' as Attempt['studentId'],
    questionTemplateId: 'q-1' as Attempt['questionTemplateId'],
    archetype: 'equal_or_not',
    roundNumber: 1,
    attemptNumber: 1,
    startedAt: 0,
    submittedAt: 0,
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
  };
};

const ruleById = (id: MisconceptionId): MisconceptionRule => {
  const r = MISCONCEPTION_RULES.find((rule) => rule.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
};

// ── Per-rule positive cases ────────────────────────────────────────────────

describe('MISCONCEPTION_RULES — positive cases (rule fires)', () => {
  it('MC-EOL-01 fires when ≥50% of equal_or_not attempts answer "yes" to "no"', () => {
    const trap = makeAttempt({
      archetype: 'equal_or_not',
      outcome: 'WRONG',
      studentAnswerRaw: { studentAnswer: true },
      correctAnswerRaw: { correctAnswer: false },
    });
    const attempts = [trap, trap, trap, trap];
    const result = evaluateRule(ruleById('MC-EOL-01' as MisconceptionId), attempts, 1);
    expect(result).not.toBeNull();
    expect(result!.observationCount).toBe(4);
  });

  it('MC-WHB-01 fires when ≥60% of compare attempts pick ">" wrongly at L6+', () => {
    const wrong = makeAttempt({
      archetype: 'compare',
      outcome: 'WRONG',
      studentAnswerRaw: { relation: '>' },
    });
    const attempts = [wrong, wrong, wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-WHB-01' as MisconceptionId), attempts, 6);
    expect(result).not.toBeNull();
    expect(result!.observationCount).toBe(5);
  });

  it('MC-WHB-02 fires at L7+ when student picks "<" but correct is ">"', () => {
    const wrong = makeAttempt({
      archetype: 'compare',
      outcome: 'WRONG',
      studentAnswerRaw: { relation: '<' },
      correctAnswerRaw: { relation: '>' },
    });
    const attempts = [wrong, wrong, wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-WHB-02' as MisconceptionId), attempts, 7);
    expect(result).not.toBeNull();
  });

  it('MC-MAG-01 fires when accuracy<0.5 AND avgError>0.2 at L8+', () => {
    const wrong = makeAttempt({
      archetype: 'compare',
      outcome: 'WRONG',
      errorMagnitude: 0.4,
    });
    const attempts = [wrong, wrong, wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-MAG-01' as MisconceptionId), attempts, 8);
    expect(result).not.toBeNull();
    // Historical: observationCount = floor(N * (1 - acc)) = floor(5 * 1) = 5.
    expect(result!.observationCount).toBe(5);
  });

  it('MC-PRX-01 fires at L8+ when student places almost_one in zone 1 or 2', () => {
    const wrong = makeAttempt({
      archetype: 'benchmark',
      outcome: 'WRONG',
      studentAnswerRaw: { zoneIndex: 1 },
      correctAnswerRaw: { zoneIndex: 3 },
    });
    const attempts = [wrong, wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-PRX-01' as MisconceptionId), attempts, 8);
    expect(result).not.toBeNull();
  });

  it('MC-NOM-01 fires at L6+ when ≥60% compare attempts pick ">"', () => {
    const wrong = makeAttempt({
      archetype: 'compare',
      outcome: 'WRONG',
      studentAnswerRaw: { relation: '>' },
    });
    const attempts = [wrong, wrong, wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-NOM-01' as MisconceptionId), attempts, 6);
    expect(result).not.toBeNull();
  });

  it('MC-EOL-02 fires when ≥50% rotated equal_or_not attempts answer "no" wrongly', () => {
    const wrong = makeAttempt({
      archetype: 'equal_or_not',
      outcome: 'WRONG',
      studentAnswerRaw: { studentAnswer: false },
      payload: { rotation: 45 },
    });
    const attempts = [wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-EOL-02' as MisconceptionId), attempts, 1);
    expect(result).not.toBeNull();
  });

  it('MC-EOL-03 fires when ≥40% equal_or_not attempts answer "yes" wrongly', () => {
    const wrong = makeAttempt({
      archetype: 'equal_or_not',
      outcome: 'WRONG',
      studentAnswerRaw: { studentAnswer: true },
    });
    const attempts = [wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-EOL-03' as MisconceptionId), attempts, 1);
    expect(result).not.toBeNull();
  });

  it('MC-EOL-04 fires when ≥50% equal_or_not attempts answer "no" wrongly', () => {
    const wrong = makeAttempt({
      archetype: 'equal_or_not',
      outcome: 'WRONG',
      studentAnswerRaw: { studentAnswer: false },
    });
    const attempts = [wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-EOL-04' as MisconceptionId), attempts, 1);
    expect(result).not.toBeNull();
  });

  it('MC-MAG-02 fires at L5 with 3+ wrong KC-PRODUCTION-2 attempts', () => {
    const wrong = makeAttempt({
      outcome: 'WRONG',
      skillIds: ['KC-PRODUCTION-2'],
    });
    const attempts = [wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-MAG-02' as MisconceptionId), attempts, 5);
    expect(result).not.toBeNull();
    expect(result!.observationCount).toBe(3);
  });

  it('MC-PRX-02 fires at L8+ when targetValue>0.5 but placedValue<0.5', () => {
    const wrong = makeAttempt({
      archetype: 'benchmark',
      correctAnswerRaw: { targetValue: 0.8 },
      studentAnswerRaw: { placedValue: 0.3 },
    });
    const attempts = [wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-PRX-02' as MisconceptionId), attempts, 8);
    expect(result).not.toBeNull();
  });

  it('MC-SHP-01 fires at L≤2 with rectangle attempts that ran long or used hints', () => {
    const slow = makeAttempt({
      payload: { shapeType: 'rectangle' },
      durationMS: 31000,
    });
    const attempts = [slow, slow, slow];
    const result = evaluateRule(ruleById('MC-SHP-01' as MisconceptionId), attempts, 1);
    expect(result).not.toBeNull();
  });

  it('MC-SHP-02 fires at L1 with small-shape wrong attempts', () => {
    const wrong = makeAttempt({
      outcome: 'WRONG',
      payload: { scale: 0.4 },
    });
    const attempts = [wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-SHP-02' as MisconceptionId), attempts, 1);
    expect(result).not.toBeNull();
  });

  it('MC-VOC-01 fires when prompts containing "quarter" are answered wrongly', () => {
    const wrong = makeAttempt({
      outcome: 'WRONG',
      prompt: { text: 'Show one quarter' },
    });
    const attempts = [wrong, wrong];
    const result = evaluateRule(ruleById('MC-VOC-01' as MisconceptionId), attempts, 2);
    expect(result).not.toBeNull();
  });

  it('MC-L5-THIRDS-HALF-01 fires at L5 when student partitions into 2 instead of 3', () => {
    const wrong = makeAttempt({
      payload: { targetPartitions: 3 },
      studentAnswerRaw: { actualPartitions: 2 },
    });
    const attempts = [wrong, wrong];
    const result = evaluateRule(
      ruleById('MC-L5-THIRDS-HALF-01' as MisconceptionId),
      attempts,
      5
    );
    expect(result).not.toBeNull();
  });

  it('MC-L5-FOURTHS-3CUTS-01 fires at L5 with cutCount === 3 on a fourths task', () => {
    const wrong = makeAttempt({
      payload: { targetPartitions: 4 },
      studentAnswerRaw: { cutCount: 3 },
    });
    const attempts = [wrong];
    const result = evaluateRule(
      ruleById('MC-L5-FOURTHS-3CUTS-01' as MisconceptionId),
      attempts,
      5
    );
    expect(result).not.toBeNull();
  });

  it('MC-L5-DENSWITCH-01 fires at L5 with 3+ wrong multi-step attempts', () => {
    const wrong = makeAttempt({
      outcome: 'WRONG',
      payload: { isMultiStep: true },
    });
    const attempts = [wrong, wrong, wrong];
    const result = evaluateRule(
      ruleById('MC-L5-DENSWITCH-01' as MisconceptionId),
      attempts,
      5
    );
    expect(result).not.toBeNull();
  });

  it('MC-ORD-01 fires at L9+ on sequential pickups across ≥3 ordering attempts', () => {
    const seq = makeAttempt({
      archetype: 'order' as Attempt['archetype'],
      outcome: 'WRONG',
      studentAnswerRaw: ['1/4', '1/2', '3/4'],
      roundEvents: [
        { type: 'pickUp', targetId: 'c0', trayIndex: 0, timestamp: 0 },
        { type: 'pickUp', targetId: 'c1', trayIndex: 1, timestamp: 1 },
        { type: 'pickUp', targetId: 'c2', trayIndex: 2, timestamp: 2 },
      ],
    });
    const attempts = [seq, seq, seq, seq, seq];
    const result = evaluateRule(ruleById('MC-ORD-01' as MisconceptionId), attempts, 9);
    expect(result).not.toBeNull();
    // evidenceLimit caps to 5.
    expect(result!.evidenceAttemptIds.length).toBeLessThanOrEqual(5);
  });

  it('MC-STRAT-01 fires at L9+ when ≥70% ordering attempts show sequential pickup', () => {
    const seq = makeAttempt({
      archetype: 'ordering' as unknown as Attempt['archetype'],
      roundEvents: [
        { type: 'pickUp', targetId: 'c0', trayIndex: 0, timestamp: 0 },
        { type: 'pickUp', targetId: 'c1', trayIndex: 1, timestamp: 1 },
        { type: 'pickUp', targetId: 'c2', trayIndex: 2, timestamp: 2 },
      ],
    });
    const attempts = [seq, seq, seq];
    const result = evaluateRule(ruleById('MC-STRAT-01' as MisconceptionId), attempts, 9);
    expect(result).not.toBeNull();
  });
});

// ── Per-rule negative cases ────────────────────────────────────────────────

describe('MISCONCEPTION_RULES — negative cases', () => {
  it('MC-EOL-01 does NOT fire below minCandidates', () => {
    const trap = makeAttempt({
      archetype: 'equal_or_not',
      outcome: 'WRONG',
      studentAnswerRaw: { studentAnswer: true },
      correctAnswerRaw: { correctAnswer: false },
    });
    const result = evaluateRule(
      ruleById('MC-EOL-01' as MisconceptionId),
      [trap, trap],
      1
    );
    expect(result).toBeNull();
  });

  it('MC-WHB-01 does NOT fire when level guard fails (L5 < min 6)', () => {
    const wrong = makeAttempt({
      archetype: 'compare',
      outcome: 'WRONG',
      studentAnswerRaw: { relation: '>' },
    });
    const attempts = [wrong, wrong, wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-WHB-01' as MisconceptionId), attempts, 5);
    expect(result).toBeNull();
  });

  it('MC-WHB-01 does NOT fire when archetype guard fails (no compare attempts)', () => {
    const wrong = makeAttempt({
      archetype: 'partition',
      outcome: 'WRONG',
      studentAnswerRaw: { relation: '>' },
    });
    const attempts = [wrong, wrong, wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-WHB-01' as MisconceptionId), attempts, 6);
    expect(result).toBeNull();
  });

  it('MC-MAG-01 does NOT fire when accuracy is high', () => {
    const ok = makeAttempt({ outcome: 'EXACT', errorMagnitude: 0 });
    const attempts = [ok, ok, ok, ok, ok];
    const result = evaluateRule(ruleById('MC-MAG-01' as MisconceptionId), attempts, 8);
    expect(result).toBeNull();
  });

  it('MC-MAG-02 does NOT fire when level !== 5', () => {
    const wrong = makeAttempt({
      outcome: 'WRONG',
      skillIds: ['KC-PRODUCTION-2'],
    });
    const attempts = [wrong, wrong, wrong];
    const result = evaluateRule(ruleById('MC-MAG-02' as MisconceptionId), attempts, 6);
    expect(result).toBeNull();
  });

  it('MC-SHP-01 does NOT fire above L2', () => {
    const slow = makeAttempt({
      payload: { shapeType: 'rectangle' },
      durationMS: 31000,
    });
    const result = evaluateRule(
      ruleById('MC-SHP-01' as MisconceptionId),
      [slow, slow, slow],
      3
    );
    expect(result).toBeNull();
  });

  it('MC-ORD-01 does NOT fire below evidence threshold', () => {
    const ok = makeAttempt({
      archetype: 'order' as Attempt['archetype'],
      outcome: 'EXACT',
      studentAnswerRaw: ['1/4', '1/2'],
      roundEvents: [
        { type: 'pickUp', targetId: 'c0', trayIndex: 2, timestamp: 0 },
        { type: 'pickUp', targetId: 'c1', trayIndex: 0, timestamp: 1 },
      ],
    });
    const result = evaluateRule(
      ruleById('MC-ORD-01' as MisconceptionId),
      [ok, ok, ok, ok, ok],
      9
    );
    expect(result).toBeNull();
  });
});

// ── Runner robustness ──────────────────────────────────────────────────────

describe('runRules', () => {
  it('a buggy rule predicate (throw) does not break the runner — other rules still fire', () => {
    const buggy: MisconceptionRule = {
      id: 'MC-BUG-99' as MisconceptionId,
      appliesTo: { levels: 'any' },
      minCandidates: 1,
      minObservations: 1,
      predicate: () => {
        throw new Error('intentional rule bug');
      },
    };

    // A rule that always fires so we can assert it still runs.
    const good: MisconceptionRule = {
      id: 'MC-GOOD-01' as MisconceptionId,
      appliesTo: { levels: 'any' },
      minCandidates: 1,
      minObservations: 1,
      predicate: (a) => a.outcome === 'WRONG',
    };

    const ctx = makeCtx();
    const attempt = makeAttempt({ outcome: 'WRONG' });
    const flags = runRules([attempt], 1, ctx, [buggy, good]);

    // The good rule fires; the buggy one is logged and skipped.
    expect(flags).toHaveLength(1);
    expect(flags[0]!.misconceptionId).toBe('MC-GOOD-01');
    expect(ctx.warnings.some((w) => w.event === 'misconception_rule_error')).toBe(true);
  });

  it('a buggy aggregator does not break the runner', () => {
    const buggy: MisconceptionRule = {
      id: 'MC-BUG-AGG' as MisconceptionId,
      appliesTo: { levels: 'any' },
      minCandidates: 1,
      minObservations: 1,
      aggregator: () => {
        throw new Error('agg bug');
      },
    };
    const ctx = makeCtx();
    const attempt = makeAttempt({});
    const flags = runRules([attempt], 1, ctx, [buggy]);
    expect(flags).toEqual([]);
    expect(ctx.warnings).toHaveLength(1);
  });

  it('returns [] for an empty attempts array', () => {
    const ctx = makeCtx();
    expect(runRules([], 1, ctx)).toEqual([]);
  });

  it('rule order in output matches rule order in MISCONCEPTION_RULES', () => {
    // Build attempts that cause both EOL-01 and EOL-03 to fire.
    const trap = makeAttempt({
      archetype: 'equal_or_not',
      outcome: 'WRONG',
      studentAnswerRaw: { studentAnswer: true },
      correctAnswerRaw: { correctAnswer: false },
    });
    const ctx = makeCtx();
    const flags = runRules([trap, trap, trap, trap], 1, ctx);
    const ids = flags.map((f) => f.misconceptionId);
    expect(ids).toContain('MC-EOL-01');
    expect(ids).toContain('MC-EOL-03');
    // EOL-01 appears earlier in the table than EOL-03.
    expect(ids.indexOf('MC-EOL-01')).toBeLessThan(ids.indexOf('MC-EOL-03'));
  });
});

// ── Snapshot parity with legacy `runAllDetectors` ──────────────────────────

describe('runAllDetectors public API parity', () => {
  it('produces the same set of misconceptionIds as runRules over the same fixture', async () => {
    // Mixed fixture: equal_or_not + compare attempts, several wrong outcomes.
    const trap = makeAttempt({
      archetype: 'equal_or_not',
      outcome: 'WRONG',
      studentAnswerRaw: { studentAnswer: true },
      correctAnswerRaw: { correctAnswer: false },
    });
    const compareWrong = makeAttempt({
      archetype: 'compare',
      outcome: 'WRONG',
      studentAnswerRaw: { relation: '>' },
      correctAnswerRaw: { relation: '<' },
    });
    const fixture = [
      trap,
      trap,
      trap,
      trap,
      compareWrong,
      compareWrong,
      compareWrong,
      compareWrong,
      compareWrong,
    ];

    const ctxLegacy = makeCtx();
    const legacyFlags = await runAllDetectors(fixture, 6, ctxLegacy);
    const legacyIds = legacyFlags.map((f) => f.misconceptionId).sort();

    const ctxNew = makeCtx();
    const newFlags = runRules(fixture, 6, ctxNew);
    const newIds = newFlags.map((f) => f.misconceptionId).sort();

    expect(newIds).toEqual(legacyIds);
  });

  it('every emitted flag uses the injected clock and id generator', async () => {
    const trap = makeAttempt({
      archetype: 'equal_or_not',
      outcome: 'WRONG',
      studentAnswerRaw: { studentAnswer: true },
      correctAnswerRaw: { correctAnswer: false },
    });
    const ctx = makeCtx();
    const flags = await runAllDetectors([trap, trap, trap, trap], 1, ctx);
    expect(flags.length).toBeGreaterThan(0);
    for (const f of flags) {
      expect(f.id).toMatch(/^mc-test-\d+$/);
      expect(f.firstObservedAt).toBe(FIXED_NOW);
      expect(f.lastObservedAt).toBe(FIXED_NOW);
      expect(f.syncState).toBe('local');
      expect(f.resolvedAt).toBeNull();
    }
  });
});

// ── Coverage check ─────────────────────────────────────────────────────────

describe('rule table integrity', () => {
  it('every rule has either a predicate or an aggregator (not both, not neither)', () => {
    for (const r of MISCONCEPTION_RULES) {
      const hasPred = !!r.predicate;
      const hasAgg = !!r.aggregator;
      expect(hasPred || hasAgg).toBe(true);
      expect(hasPred && hasAgg).toBe(false);
    }
  });

  it('rule IDs are unique', () => {
    const ids = MISCONCEPTION_RULES.map((r) => r.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });
});
