import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seedIfEmpty } from '@/curriculum/seed';
import { db } from '@/persistence/db';
import {
  ActivityId,
  MisconceptionId,
  QuestionTemplateId,
  SkillId,
  ValidatorId,
} from '@/types/branded';
import type { CurriculumBundle } from '@/curriculum/loader';

const questionTemplateId = QuestionTemplateId('q:partition:L1:0001');
const skillId = SkillId('SK-01');
const activityId = ActivityId('partition_shapes');
const misconceptionId = MisconceptionId('MC-WHB-01');

function makeBundle(contentVersion = '1.0.0'): CurriculumBundle {
  return {
    version: 1,
    contentVersion,
    generatedAt: '2026-05-04T00:00:00.000Z',
    curriculumPacks: [
      {
        id: 'pack:k2-fractions',
        schemaVersion: 1,
        contentVersion,
        gradeBand: 'K-2',
        publishedAt: '2026-05-04',
        locales: ['en-US'],
      },
    ],
    standards: [
      {
        id: 'CCSS.1.G.A.3',
        framework: 'CCSS',
        code: '1.G.A.3',
        text: 'Partition circles and rectangles into equal shares.',
        gradeLevel: 1,
      },
    ],
    skills: [
      {
        id: skillId,
        name: 'Name equal shares',
        description: 'Recognize equal partitioned shares.',
        gradeLevel: 1,
        prerequisites: [],
        standardIds: ['CCSS.1.G.A.3'],
        bktParams: { pInit: 0.2, pTransit: 0.15, pSlip: 0.1, pGuess: 0.2 },
      },
    ],
    activities: [
      {
        id: activityId,
        title: 'Partition shapes',
        gradeBand: ['1'],
        levelGroup: '01-02',
        skillIds: [skillId],
        unlockRule: null,
        isCore: true,
        archetype: 'partition',
      },
    ],
    activityLevels: [
      {
        id: 'partition_shapes:L1',
        activityId,
        levelNumber: 1,
        scaffoldLevel: 1,
        fractionPoolIds: ['frac:1/2'],
        questionTemplateIds: [questionTemplateId],
        difficultyConfig: {
          timerSeconds: null,
          hintsAllowed: true,
          tolerance: 0,
          problemCount: 1,
        },
        advanceCriteria: {
          minAccuracy: 0.8,
          minProblems: 1,
          maxAvgHints: 1,
        },
      },
    ],
    fractionBank: [
      {
        id: 'frac:1/2',
        numerator: 1,
        denominator: 2,
        decimalValue: 0.5,
        benchmark: 'half',
        denominatorFamily: 'halves',
        visualAssets: {},
      },
    ],
    questionTemplates: [
      {
        id: questionTemplateId,
        archetype: 'partition',
        prompt: {
          text: 'Shade one half.',
          ttsKey: 'q.partition.l1.0001',
        },
        payload: { denominator: 2 },
        correctAnswer: { numerator: 1, denominator: 2 },
        validatorId: ValidatorId('validator.partition.equalShares'),
        skillIds: [skillId],
        misconceptionTraps: [misconceptionId],
        difficultyTier: 'easy',
      },
    ],
    misconceptions: [
      {
        id: misconceptionId,
        name: 'Whole-half confusion',
        description: 'Treats one piece as the whole.',
        detectionPattern: {
          signalType: 'validator',
          rule: 'whole_as_part',
        },
        interventionActivityIds: [activityId],
        gradeLevel: [1],
      },
    ],
    hints: [
      {
        id: 'hint:partition:0001:1',
        questionTemplateId,
        type: 'verbal',
        order: 1,
        content: { text: 'Make two equal pieces first.' },
        pointCost: 1,
      },
    ],
  };
}

async function clearSeedStores(): Promise<void> {
  await Promise.all([
    db.curriculumPacks.clear(),
    db.standards.clear(),
    db.skills.clear(),
    db.activities.clear(),
    db.activityLevels.clear(),
    db.fractionBank.clear(),
    db.questionTemplates.clear(),
    db.misconceptions.clear(),
    db.hints.clear(),
    db.deviceMeta.clear(),
  ]);
}

describe('seedIfEmpty', () => {
  beforeEach(async () => {
    await clearSeedStores();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads the curriculum bundle and seeds every static store with level groups', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeBundle(),
      })
    );

    const result = await seedIfEmpty();

    expect(result).toEqual({
      seeded: 9,
      alreadySeeded: false,
      contentVersion: '1.0.0',
      wiped: true,
    });
    expect(await db.curriculumPacks.count()).toBe(1);
    expect(await db.standards.count()).toBe(1);
    expect(await db.skills.count()).toBe(1);
    expect(await db.activities.count()).toBe(1);
    expect(await db.activityLevels.count()).toBe(1);
    expect(await db.fractionBank.count()).toBe(1);
    expect(await db.questionTemplates.count()).toBe(1);
    expect(await db.misconceptions.count()).toBe(1);
    expect(await db.hints.count()).toBe(1);

    const storedTemplate = await db.questionTemplates.get(questionTemplateId);
    expect(storedTemplate).toMatchObject({
      id: questionTemplateId,
      levelGroup: '01-02',
    });
  });

  it('returns the existing count without refetching when matching content is already seeded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeBundle(),
      })
    );
    await seedIfEmpty();

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await seedIfEmpty();

    expect(result).toEqual({
      seeded: 1,
      alreadySeeded: true,
      contentVersion: '1.0.0',
      wiped: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
