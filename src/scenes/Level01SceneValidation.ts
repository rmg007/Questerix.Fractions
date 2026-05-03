/**
 * Level01SceneValidation — answer validation flow.
 */

import { log } from '@/lib/log';
import type { ValidatorResult, QuestionTemplate } from '@/types';
import type { PartitionInput, PartitionPayload } from '@/validators/partition';
import type { L01Question } from './Level01SceneSelection';

const CW = 800;
const SHAPE_CX = CW / 2;
const SHAPE_W = 400;

export function computePartitionInput(handlePos: number): {
  input: PartitionInput;
  payload: (areaTolerance: number) => PartitionPayload;
  leftArea: number;
  rightArea: number;
} {
  const leftArea = handlePos - (SHAPE_CX - SHAPE_W / 2);
  const rightArea = SHAPE_CX + SHAPE_W / 2 - handlePos;
  return {
    input: { regionAreas: [leftArea, rightArea] },
    payload: (areaTolerance: number) => ({ targetPartitions: 2, areaTolerance }),
    leftArea,
    rightArea,
  };
}

export async function validateAnswer(
  currentQuestion: L01Question,
  templatePool: QuestionTemplate[],
  input: PartitionInput,
  payload: PartitionPayload
): Promise<ValidatorResult> {
  try {
    if (templatePool.length > 0) {
      const { getValidatorEntry } = await import('@/validators/registry');
      const reg = currentQuestion.validatorId
        ? getValidatorEntry(currentQuestion.validatorId)
        : undefined;
      if (!reg && currentQuestion.validatorId) {
        log.error('VALID', 'missing_validator', {
          validatorId: currentQuestion.validatorId,
          questionId: currentQuestion.id,
        });
        return { outcome: 'incorrect', score: 0, feedback: 'validator_not_found' };
      } else if (reg) {
        return reg.fn(input, payload);
      } else {
        const { partitionEqualAreas } = await import('@/validators/partition');
        return partitionEqualAreas.fn(input, payload);
      }
    } else {
      const { partitionEqualAreas } = await import('@/validators/partition');
      return partitionEqualAreas.fn(input, payload);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error('VALID', 'crash', { err: errorMsg, templateId: currentQuestion.id });
    return { outcome: 'incorrect', score: 0, feedback: 'validator_error' };
  }
}
