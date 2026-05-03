/**
 * Level01SceneSelection — BKT-adaptive question selection.
 */

import type { QuestionTemplate } from '@/types';
import type { PartitionPayload } from '@/validators/partition';

export interface L01Question {
  id: string;
  validatorId?: string;
  shapeType: 'rectangle' | 'circle';
  difficultyTier: 'easy' | 'medium' | 'hard';
  areaTolerance: number;
  snapMode: 'axis' | 'free';
  promptText: string;
}

export const SYNTHETIC_QUESTIONS: L01Question[] = [
  {
    id: 'q:ph:L1:0001',
    shapeType: 'rectangle',
    difficultyTier: 'easy',
    areaTolerance: 0.05,
    snapMode: 'axis',
    promptText: 'Cut this shape into two equal parts.',
  },
  {
    id: 'q:ph:L1:0002',
    shapeType: 'rectangle',
    difficultyTier: 'easy',
    areaTolerance: 0.05,
    snapMode: 'axis',
    promptText: 'Drag the line to make two equal parts.',
  },
  {
    id: 'q:ph:L1:0003',
    shapeType: 'rectangle',
    difficultyTier: 'medium',
    areaTolerance: 0.05,
    snapMode: 'free',
    promptText: 'Split the rectangle in half.',
  },
  {
    id: 'q:ph:L1:0004',
    shapeType: 'circle',
    difficultyTier: 'medium',
    areaTolerance: 0.05,
    snapMode: 'free',
    promptText: 'Cut this circle into two equal parts.',
  },
  {
    id: 'q:ph:L1:0008',
    shapeType: 'circle',
    difficultyTier: 'hard',
    areaTolerance: 0.03,
    snapMode: 'free',
    promptText: 'Cut this circle into two equal parts.',
  },
];

export function difficultyTierForMastery(estimate: number): 'easy' | 'medium' | 'hard' {
  if (estimate < 0.3) return 'easy';
  if (estimate < 0.65) return 'medium';
  return 'hard';
}

export function snapPctForMastery(estimate: number): number {
  if (estimate < 0.3) return 0.2;
  if (estimate < 0.65) return 0.15;
  return 0.1;
}

export interface SelectionResult {
  question: L01Question;
  archetype: string;
  snapPct: number;
}

export function selectNextQuestion(
  templatePool: QuestionTemplate[],
  usedQuestionIds: Set<string>,
  masteryEstimate: number
): SelectionResult {
  const snapPct = snapPctForMastery(masteryEstimate);
  const targetTier = difficultyTierForMastery(masteryEstimate);

  if (templatePool.length === 0) {
    const unused = SYNTHETIC_QUESTIONS.filter((q) => !usedQuestionIds.has(q.id));
    const tiered = unused.filter((q) => q.difficultyTier === targetTier);
    const pool = tiered.length > 0 ? tiered : unused.length > 0 ? unused : SYNTHETIC_QUESTIONS;
    const q = pool[Math.floor(Math.random() * pool.length)]!;
    usedQuestionIds.add(q.id);
    return { question: q, archetype: 'partition', snapPct };
  }

  const unused = templatePool.filter((t) => !usedQuestionIds.has(t.id));
  const tiered = unused.filter((t) => t.difficultyTier === targetTier);
  const pool = tiered.length > 0 ? tiered : unused.length > 0 ? unused : templatePool;
  const tmpl = pool[Math.floor(Math.random() * pool.length)]!;
  usedQuestionIds.add(tmpl.id);

  const payload = tmpl.payload as Partial<PartitionPayload> & {
    shapeType?: 'rectangle' | 'circle';
  };
  const tolerance =
    tmpl.difficultyTier === 'easy'
      ? Math.max(payload.areaTolerance ?? 0, 0.1)
      : (payload.areaTolerance ?? 0.05);

  return {
    question: {
      id: tmpl.id,
      validatorId: tmpl.validatorId,
      shapeType: payload.shapeType ?? 'rectangle',
      difficultyTier: tmpl.difficultyTier,
      areaTolerance: tolerance,
      snapMode: tmpl.difficultyTier === 'easy' ? 'axis' : 'free',
      promptText: tmpl.prompt.text,
    },
    archetype: tmpl.archetype,
    snapPct,
  };
}
