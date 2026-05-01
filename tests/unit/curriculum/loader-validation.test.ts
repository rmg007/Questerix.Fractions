/**
 * Phase 7.4 / harden R19: defensive boundary tests for the curriculum loader.
 *
 * Covers:
 *   - valid row passes the schema
 *   - missing required field is rejected (skipped from the loader output)
 *   - extra/unknown fields are tolerated (`.passthrough()`)
 *   - the loader continues processing other rows after a bad row
 *   - JSON-parsed bundles with invalid rows still produce a usable ParsedBundle
 *
 * These tests intentionally stay at the schema + loader boundary; downstream
 * persistence wiring is covered by `tests/integration/curriculum.test.ts`.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import { questionTemplateSchema, safeParseQuestionTemplate } from '../../../src/curriculum/schemas';
import { loadCurriculumBundle } from '../../../src/curriculum/loader';

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeValidRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q:pt:L1:0001',
    archetype: 'partition',
    prompt: { text: 'Make halves', ttsKey: 'tts.test' },
    payload: { targetPartitions: 2, areaTolerance: 0.05 },
    correctAnswer: true,
    validatorId: 'validator.partition.equalAreas',
    skillIds: ['SK-01'],
    misconceptionTraps: [],
    difficultyTier: 'easy' as const,
    ...overrides,
  };
}

// ── Schema-level tests ────────────────────────────────────────────────────

describe('questionTemplateSchema', () => {
  it('accepts a fully-formed canonical row', () => {
    const result = safeParseQuestionTemplate(makeValidRow());
    expect(result.ok).toBe(true);
  });

  it('accepts the legacy string-prompt form', () => {
    const result = safeParseQuestionTemplate(makeValidRow({ prompt: 'Make halves' }));
    expect(result.ok).toBe(true);
  });

  it('rejects rows missing the payload field', () => {
    const { payload: _omit, ...rest } = makeValidRow();
    void _omit;
    const result = safeParseQuestionTemplate(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/payload/);
    }
  });

  it('rejects rows missing the prompt field', () => {
    const { prompt: _omit, ...rest } = makeValidRow();
    void _omit;
    const result = safeParseQuestionTemplate(rest);
    expect(result.ok).toBe(false);
  });

  it('rejects rows with an empty skillIds array', () => {
    const result = safeParseQuestionTemplate(makeValidRow({ skillIds: [] }));
    expect(result.ok).toBe(false);
  });

  it('rejects rows with an unknown archetype', () => {
    const result = safeParseQuestionTemplate(makeValidRow({ archetype: 'totally-fake' }));
    expect(result.ok).toBe(false);
  });

  it('tolerates extra unknown fields via passthrough', () => {
    const parsed = questionTemplateSchema.safeParse(
      makeValidRow({ futurePipelineField: 'should-not-break-loader' })
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // passthrough preserves the unknown property on the parsed object
      expect((parsed.data as Record<string, unknown>)['futurePipelineField']).toBe(
        'should-not-break-loader'
      );
    }
  });

  it('rejects null prompt object', () => {
    const result = safeParseQuestionTemplate(makeValidRow({ prompt: null }));
    expect(result.ok).toBe(false);
  });
});

// ── Loader-level integration ──────────────────────────────────────────────

describe('loadCurriculumBundle (Zod boundary, R19)', () => {
  beforeEach(() => {
    // Silence the structured warn output in test runs; the schema-level tests
    // already verify the rejection behaviour.
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('drops malformed rows and keeps valid rows from the same bundle', async () => {
    const goodRow = makeValidRow({ id: 'q:pt:L1:0001' });
    const goodRow2 = makeValidRow({ id: 'q:id:L1:0002', archetype: 'identify' });
    // Missing payload — must be rejected.
    const { payload: _drop, ...badRow } = makeValidRow({ id: 'q:pt:L1:0003' });
    void _drop;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 1,
          contentVersion: '1.0.0',
          generatedAt: '2026-05-01T00:00:00Z',
          questionTemplates: [goodRow, badRow, goodRow2],
        }),
      })
    );

    const result = await loadCurriculumBundle('/curriculum/v1.json');

    expect(result.questionTemplates.map((t) => t.id)).toEqual(['q:pt:L1:0001', 'q:id:L1:0002']);
  });

  it('preserves passthrough fields on valid rows', async () => {
    const augmentedRow = makeValidRow({
      id: 'q:pt:L1:0099',
      futurePipelineField: 'preserved',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 1,
          contentVersion: '1.0.0',
          generatedAt: '2026-05-01T00:00:00Z',
          questionTemplates: [augmentedRow],
        }),
      })
    );

    const result = await loadCurriculumBundle('/curriculum/v1.json');
    expect(result.questionTemplates).toHaveLength(1);
    expect(
      (result.questionTemplates[0] as unknown as Record<string, unknown>)['futurePipelineField']
    ).toBe('preserved');
  });

  it('returns an empty bundle when fetch returns 404 (no schema crash)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
    );

    const result = await loadCurriculumBundle('/curriculum/v1.json');
    expect(result.questionTemplates).toEqual([]);
  });
});
