/**
 * Unit tests for the question selection algorithm.
 * Covers ZPD window filtering, recency de-prioritisation,
 * cold-start behaviour, and preferUnmastered fallback.
 *
 * All tests are deterministic where possible; random-based tests
 * verify invariants over repeated draws.
 */

import { describe, it, expect } from 'vitest';
import { selectNextQuestion, RECENCY_WINDOW } from '@/engine/selection';
import type { SelectionArgs } from '@/engine/selection';
import type { QuestionTemplate, SkillMastery } from '@/types';
import { SkillId, QuestionTemplateId, StudentId, ValidatorId, ActivityId } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTemplate(id: string, skillIds: string[]): QuestionTemplate {
  return {
    id: QuestionTemplateId(id),
    archetype: 'partition',
    prompt: { text: `Question ${id}`, ttsKey: id },
    payload: {},
    correctAnswer: null,
    validatorId: ValidatorId('v-test'),
    skillIds: skillIds.map((s) => SkillId(s)),
    misconceptionTraps: [],
    difficultyTier: 'medium',
    hintTemplates: [],
    levelId: 1,
  } as unknown as QuestionTemplate;
}

function makeMastery(skillId: string, estimate: number): SkillMastery {
  return {
    studentId: StudentId('s-test'),
    skillId: SkillId(skillId),
    compositeKey: [StudentId('s-test'), SkillId(skillId)],
    masteryEstimate: estimate,
    state: 'LEARNING',
    consecutiveCorrectUnassisted: 0,
    totalAttempts: 5,
    correctAttempts: 3,
    lastAttemptAt: Date.now(),
    masteredAt: null,
    decayedAt: null,
    syncState: 'local',
  };
}

function makeArgs(overrides: Partial<SelectionArgs> = {}): SelectionArgs {
  return {
    candidates: [],
    studentMastery: new Map(),
    recentTemplateIds: new Set(),
    ...overrides,
  };
}

// ── Cold-start: no attempt history ────────────────────────────────────────────

describe('cold-start fallback', () => {
  it('returns a template when there is no mastery data', () => {
    const candidates = [makeTemplate('q1', ['SK-01']), makeTemplate('q2', ['SK-02'])];
    const result = selectNextQuestion(makeArgs({ candidates }));
    expect(result).not.toBeNull();
  });

  it('returns null when candidate list is empty', () => {
    const result = selectNextQuestion(makeArgs({ candidates: [] }));
    expect(result).toBeNull();
  });

  it('returns one of the provided candidates', () => {
    const candidates = [makeTemplate('q1', ['SK-01']), makeTemplate('q2', ['SK-02'])];
    const result = selectNextQuestion(makeArgs({ candidates }));
    expect(candidates).toContain(result);
  });
});

// ── ZPD window filtering ──────────────────────────────────────────────────────

describe('ZPD window filtering', () => {
  it('prefers a ZPD candidate (0.4 <= p < 0.85) over a mastered one', () => {
    const zpdTemplate = makeTemplate('zpd', ['SK-ZPD']);
    const masteredTemplate = makeTemplate('mastered', ['SK-MASTERED']);

    const mastery = new Map([
      [SkillId('SK-ZPD'), makeMastery('SK-ZPD', 0.6)],
      [SkillId('SK-MASTERED'), makeMastery('SK-MASTERED', 0.9)],
    ]);

    // Run many times — should always pick the ZPD one
    const picks = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const result = selectNextQuestion(
        makeArgs({ candidates: [zpdTemplate, masteredTemplate], studentMastery: mastery }),
      );
      if (result) picks.add(result.id);
    }
    expect(picks.has(QuestionTemplateId('zpd'))).toBe(true);
    // The mastered template should never win when a ZPD candidate exists
    expect(picks.has(QuestionTemplateId('mastered'))).toBe(false);
  });

  it('skips items below ZPD_LOW (p < 0.4) when ZPD candidates exist', () => {
    const belowZpd = makeTemplate('below', ['SK-LOW']);
    const inZpd = makeTemplate('zpd', ['SK-ZPD']);

    const mastery = new Map([
      [SkillId('SK-LOW'), makeMastery('SK-LOW', 0.2)],
      [SkillId('SK-ZPD'), makeMastery('SK-ZPD', 0.65)],
    ]);

    const picks = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const r = selectNextQuestion(makeArgs({ candidates: [belowZpd, inZpd], studentMastery: mastery }));
      if (r) picks.add(r.id);
    }
    expect(picks.has(QuestionTemplateId('zpd'))).toBe(true);
    expect(picks.has(QuestionTemplateId('below'))).toBe(false);
  });

  it('falls back to any candidate when no ZPD or unmastered candidates exist', () => {
    const mastered = makeTemplate('m', ['SK-MASTERED']);
    const mastery = new Map([[SkillId('SK-MASTERED'), makeMastery('SK-MASTERED', 0.95)]]);
    const result = selectNextQuestion(makeArgs({ candidates: [mastered], studentMastery: mastery }));
    expect(result).toBe(mastered);
  });
});

// ── preferUnmastered fallback ─────────────────────────────────────────────────

describe('preferUnmastered fallback', () => {
  it('with preferUnmastered=true, picks below-ZPD skill over mastered when no ZPD exists', () => {
    const belowZpd = makeTemplate('below', ['SK-LOW']);
    const mastered = makeTemplate('mastered', ['SK-HIGH']);

    const mastery = new Map([
      [SkillId('SK-LOW'), makeMastery('SK-LOW', 0.2)],
      [SkillId('SK-HIGH'), makeMastery('SK-HIGH', 0.9)],
    ]);

    const picks = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const r = selectNextQuestion(
        makeArgs({ candidates: [belowZpd, mastered], studentMastery: mastery, preferUnmastered: true }),
      );
      if (r) picks.add(r.id);
    }
    expect(picks.has(QuestionTemplateId('below'))).toBe(true);
    expect(picks.has(QuestionTemplateId('mastered'))).toBe(false);
  });
});

// ── Recency window de-prioritisation ─────────────────────────────────────────

describe('recency window', () => {
  it('avoids recently seen templates when fresh alternatives exist', () => {
    const recent = makeTemplate('recent', ['SK-01']);
    const fresh = makeTemplate('fresh', ['SK-01']);

    // Both share the same skill, same ZPD estimate — only recency differs
    const mastery = new Map([[SkillId('SK-01'), makeMastery('SK-01', 0.6)]]);
    const recentTemplateIds = new Set([QuestionTemplateId('recent')]);

    const picks = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const r = selectNextQuestion(
        makeArgs({ candidates: [recent, fresh], studentMastery: mastery, recentTemplateIds }),
      );
      if (r) picks.add(r.id);
    }
    expect(picks.has(QuestionTemplateId('fresh'))).toBe(true);
    expect(picks.has(QuestionTemplateId('recent'))).toBe(false);
  });

  it('falls back to recent template when it is the only candidate', () => {
    const only = makeTemplate('only', ['SK-01']);
    const recentTemplateIds = new Set([QuestionTemplateId('only')]);
    const result = selectNextQuestion(makeArgs({ candidates: [only], recentTemplateIds }));
    // Must not return null — stall avoidance means falling back to full pool
    expect(result).toBe(only);
  });

  it('RECENCY_WINDOW is exported and equals 5', () => {
    expect(RECENCY_WINDOW).toBe(5);
  });
});

// ── Deterministic invariants ──────────────────────────────────────────────────

describe('deterministic invariants', () => {
  it('always returns a value from the candidates array (not a fabricated object)', () => {
    const candidates = Array.from({ length: 10 }, (_, i) => makeTemplate(`q${i}`, ['SK-01']));
    const mastery = new Map([[SkillId('SK-01'), makeMastery('SK-01', 0.5)]]);
    for (let i = 0; i < 50; i++) {
      const r = selectNextQuestion(makeArgs({ candidates, studentMastery: mastery }));
      expect(candidates).toContain(r);
    }
  });

  it('returns null only when candidates array is empty', () => {
    expect(selectNextQuestion(makeArgs({ candidates: [] }))).toBeNull();
    expect(selectNextQuestion(makeArgs({ candidates: [makeTemplate('q1', ['SK-01'])] }))).not.toBeNull();
  });
});
