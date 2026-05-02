import * as Phaser from 'phaser';
import { log } from './log';
import { TestHooks } from '@/scenes/utils/TestHooks';
import { fadeAndStart } from '@/scenes/utils/sceneTransition';
import { NAVY, PATH_BLUE, BODY_FONT } from '@/scenes/utils/levelTheme';
import type { QuestionTemplate, ArchetypeId, ValidatorId, QuestionTemplateId } from '@/types';

const SESSION_GOAL = 5;

interface FallbackOverride {
  archetype: ArchetypeId;
  payload: Record<string, unknown>;
  validatorId: ValidatorId;
  prompt: string;
}

const LEVEL_FALLBACK_OVERRIDES: Record<number, FallbackOverride> = {
  1: {
    archetype: 'partition',
    payload: {
      shapeType: 'rectangle',
      targetPartitions: 2,
      snapMode: 'axis',
      areaTolerance: 0.05,
    },
    validatorId: 'validator.partition.equalAreas' as ValidatorId,
    prompt: 'Cut the shape into 2 equal parts.',
  },
  2: {
    archetype: 'partition',
    payload: {
      shapeType: 'rectangle',
      targetPartitions: 3,
      snapMode: 'free',
      areaTolerance: 0.08,
    },
    validatorId: 'validator.partition.equalAreas' as ValidatorId,
    prompt: 'Cut the shape into 3 equal parts.',
  },
  3: {
    archetype: 'equal_or_not',
    payload: {
      partitionLines: [
        [
          [0.5, 0],
          [0.5, 1],
        ],
      ],
    },
    validatorId: 'validator.equal_or_not.areaTolerance' as ValidatorId,
    prompt: 'Are these two parts equal?',
  },
};

export function makeFallbackTemplate(levelNumber: number): QuestionTemplate {
  const override = LEVEL_FALLBACK_OVERRIDES[levelNumber];

  if (override) {
    return {
      id: `q:ph:L${levelNumber}:fallback` as QuestionTemplateId,
      archetype: override.archetype,
      prompt: { text: override.prompt, ttsKey: '' },
      payload: override.payload,
      correctAnswer: override.archetype === 'equal_or_not' ? true : null,
      validatorId: override.validatorId,
      skillIds: [],
      misconceptionTraps: [],
      difficultyTier: 'easy',
    };
  }

  return {
    id: `q:ph:L${levelNumber}:fallback` as QuestionTemplateId,
    archetype: 'partition',
    prompt: { text: 'Cut this shape into two equal parts.', ttsKey: '' },
    payload: {
      shapeType: 'rectangle',
      targetPartitions: 2,
      snapMode: 'axis',
      areaTolerance: 0.05,
    },
    correctAnswer: null,
    validatorId: 'validator.partition.equalAreas' as ValidatorId,
    skillIds: [],
    misconceptionTraps: [],
    difficultyTier: 'easy',
  };
}

export async function loadTemplatesForLevel(
  levelNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
): Promise<QuestionTemplate[]> {
  log.tmpl('load_start', { level: levelNumber });
  try {
    const { questionTemplateRepo } = await import('@/persistence/repositories/questionTemplate');
    const all = await questionTemplateRepo.getByLevel(levelNumber);
    log.tmpl('dexie_raw', {
      level: levelNumber,
      totalReturned: all.length,
      archetypes: [...new Set(all.map((t) => t.archetype))],
    });
    const seen = new Set<string>();
    const picked: QuestionTemplate[] = [];
    for (const t of all) {
      if (!seen.has(t.id) && picked.length < SESSION_GOAL) {
        seen.add(t.id);
        picked.push(t);
      }
    }
    if (picked.length > 0) {
      log.tmpl('load_ok', {
        level: levelNumber,
        count: picked.length,
        ids: picked.map((t) => t.id),
        archetypes: [...new Set(picked.map((t) => t.archetype))],
      });
    } else {
      log.tmpl('load_empty', { level: levelNumber, fallback: 'synthetic' });
    }
    return picked;
  } catch (err) {
    log.warn('TMPL', 'load_error', {
      level: levelNumber,
      error: String(err),
      fallback: 'synthetic',
    });
    return [];
  }
}

export function showOfflineCurriculumToast(
  scene: Phaser.Scene,
  studentId: string | null,
  canvasWidth: number,
  canvasHeight: number
): void {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const TOAST_DEPTH = 2000;
  const message = "This level isn't available offline yet — please connect to download";

  const panel = scene.add
    .rectangle(cx, cy, canvasWidth - 80, 220, NAVY, 0.94)
    .setDepth(TOAST_DEPTH)
    .setStrokeStyle(3, PATH_BLUE, 1);

  const text = scene.add
    .text(cx, cy, message, {
      fontSize: '24px',
      fontFamily: BODY_FONT,
      color: '#FFFFFF',
      align: 'center',
      wordWrap: { width: canvasWidth - 140 },
    })
    .setOrigin(0.5)
    .setDepth(TOAST_DEPTH + 1);

  TestHooks.mountSentinel('offline-curriculum-toast');
  TestHooks.setText('offline-curriculum-toast', message);

  const dismiss = (): void => {
    panel.destroy();
    text.destroy();
    TestHooks.unmount('offline-curriculum-toast');
    fadeAndStart(scene, 'MenuScene', { lastStudentId: studentId });
  };

  scene.time.delayedCall(3500, dismiss);
}
