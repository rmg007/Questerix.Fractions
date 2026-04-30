/**
 * Integration tests for the curriculum seed/load pipeline.
 * Uses fake-indexeddb so no real browser is needed.
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { db } from '../../src/persistence/db';
import { questionTemplateRepo } from '../../src/persistence/repositories/questionTemplate';
import { seedIfEmpty } from '../../src/curriculum/seed';
import { loadCurriculumBundle } from '../../src/curriculum/loader';
import type { QuestionTemplate, ArchetypeId } from '../../src/types';
import { QuestionTemplateId, ValidatorId, SkillId, MisconceptionId } from '../../src/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeTemplate(
  overrides: Partial<QuestionTemplate> & { id: string; archetype: string }
): QuestionTemplate {
  return {
    id: QuestionTemplateId(overrides.id),
    archetype: overrides.archetype as ArchetypeId,
    prompt: { text: 'Test prompt', ttsKey: 'tts.test' },
    payload: { targetPartitions: 2, areaTolerance: 0.05 },
    correctAnswer: true,
    validatorId: ValidatorId('validator.partition.equalAreas'),
    skillIds: [SkillId('SK-01')],
    misconceptionTraps: [MisconceptionId('MC-WHB-01')],
    difficultyTier: 'easy',
    ...overrides,
  } as QuestionTemplate;
}

const L1_TEMPLATES: QuestionTemplate[] = [
  makeTemplate({ id: 'q:pt:L1:0001', archetype: 'partition' }),
  makeTemplate({ id: 'q:id:L1:0002', archetype: 'identify' }),
  makeTemplate({ id: 'q:pt:L1:0003', archetype: 'partition', difficultyTier: 'medium' }),
];

const L2_TEMPLATES: QuestionTemplate[] = [
  makeTemplate({ id: 'q:id:L2:0001', archetype: 'identify' }),
];

const MOCK_BUNDLE = {
  version: 1,
  contentVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  levels: {
    '01': L1_TEMPLATES,
    '02': L2_TEMPLATES,
  },
};

// ── Test setup ─────────────────────────────────────────────────────────────────

beforeEach(async () => {
  // Clear all stores before each test to ensure clean state
  await db.questionTemplates.clear();
  await db.deviceMeta.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('seedIfEmpty', () => {
  it('seeds empty DB from mock fetch', async () => {
    // Mock fetch to return the mock bundle
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_BUNDLE,
      })
    );

    const result = await seedIfEmpty();

    expect(result.alreadySeeded).toBe(false);
    expect(result.seeded).toBe(L1_TEMPLATES.length + L2_TEMPLATES.length);

    const count = await questionTemplateRepo.count();
    expect(count).toBeGreaterThan(0);
  });

  it('returns alreadySeeded=true when DB has templates', async () => {
    // Set up device metadata with matching content version
    await db.deviceMeta.add({
      installId: 'device',
      schemaVersion: 3,
      contentVersion: '1.0.0',
      preferences: {
        audio: true,
        reduceMotion: false,
        highContrast: false,
        ttsLocale: 'en-US',
        largeTouchTargets: false,
        persistGranted: false,
      },
      lastBackupAt: null,
      lastRestoredAt: null,
      pendingSyncCount: 0,
      syncState: 'local',
    });

    await questionTemplateRepo.bulkPut(L1_TEMPLATES);

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await seedIfEmpty();

    expect(result.alreadySeeded).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns seeded=0 and does not throw on missing fetch (404)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
    );

    const result = await seedIfEmpty();

    expect(result.seeded).toBe(0);
    expect(result.alreadySeeded).toBe(false);
    const count = await questionTemplateRepo.count();
    expect(count).toBe(0);
  });

  it('returns seeded=0 and does not throw on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    await expect(seedIfEmpty()).resolves.toMatchObject({ seeded: 0, alreadySeeded: false });
  });
});

describe('questionTemplateRepo.getByLevel', () => {
  it('returns only L1 templates for level 1', async () => {
    await questionTemplateRepo.bulkPut([...L1_TEMPLATES, ...L2_TEMPLATES]);

    const results = await questionTemplateRepo.getByLevel(1);

    expect(results.length).toBe(L1_TEMPLATES.length);
    for (const t of results) {
      expect(t.id).toMatch(/:L1:/);
    }
  });

  it('returns only L2 templates for level 2', async () => {
    await questionTemplateRepo.bulkPut([...L1_TEMPLATES, ...L2_TEMPLATES]);

    const results = await questionTemplateRepo.getByLevel(2);

    expect(results.length).toBe(L2_TEMPLATES.length);
    for (const t of results) {
      expect(t.id).toMatch(/:L2:/);
    }
  });

  it('returns empty array for level with no templates', async () => {
    await questionTemplateRepo.bulkPut(L1_TEMPLATES);

    const results = await questionTemplateRepo.getByLevel(9);
    expect(results).toHaveLength(0);
  });
});

describe('loadCurriculumBundle', () => {
  it('flattens levels into a single array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_BUNDLE,
      })
    );

    const bundle = await loadCurriculumBundle();
    expect(bundle.questionTemplates).toHaveLength(L1_TEMPLATES.length + L2_TEMPLATES.length);
  });

  it('returns [] on 404 without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const bundle = await loadCurriculumBundle();
    expect(bundle.questionTemplates).toHaveLength(0);
  });
});
