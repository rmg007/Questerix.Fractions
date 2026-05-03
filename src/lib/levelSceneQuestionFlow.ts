import * as Phaser from 'phaser';
import { log } from './log';
import { A11yLayer } from '@/components/A11yLayer';
import { HintLadder } from '@/components/HintLadder';
import { tts } from '@/audio/TTSService';
import { withSpan } from '@/lib/observability/withSpan';
import { SPAN_NAMES } from '@/lib/observability/span-names';
import type { QuestionTemplate, ValidatorResult, ProgressionEvent } from '@/types';
import type { Interaction } from '@/scenes/interactions/types';
import { getInteractionForArchetype } from '@/scenes/utils/levelRouter';

const CW = 800;
const CH = 1280;
const SESSION_GOAL = 5;

export interface QuestionFlowContext {
  scene: Phaser.Scene;
  levelNumber: number;
  questionIndex: number;
  wrongCount: number;
  inputLocked: boolean;
  lastPayload: unknown;
  currentTemplate: QuestionTemplate;
  hintLadder: HintLadder | null;
  questionStartTime: number;
  responseTimes: number[];
  submitButtonContainer: Phaser.GameObjects.Container | null;
  currentQuestionHintIds: string[];
  currentRoundEvents: ProgressionEvent[];
  activeInteraction: Interaction | null;
  promptText: Phaser.GameObjects.Text;
  hintTextGO: Phaser.GameObjects.Text;
  questionCounterText: Phaser.GameObjects.Text;
  updateCounter?: (answered: number, total: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mascot: any;
}

export interface QuestionFlowCallbacks {
  recordAttempt: (result: ValidatorResult, responseMs: number) => Promise<void>;
  showOutcome: (result: ValidatorResult) => void;
  makeFallbackTemplate: () => QuestionTemplate;
  getTemplatePool: () => QuestionTemplate[];
  animateCounterBadge: () => void;
  setQuestionIndex: (index: number) => void;
  setWrongCount: (count: number) => void;
  setInputLocked: (locked: boolean) => void;
  setLastPayload: (payload: unknown) => void;
  setCurrentTemplate: (template: QuestionTemplate) => void;
  setHintLadder: (ladder: HintLadder) => void;
  setQuestionStartTime: (time: number) => void;
  setCurrentQuestionHintIds: (ids: string[]) => void;
  setCurrentRoundEvents: (events: ProgressionEvent[]) => void;
  setActiveInteraction: (interaction: Interaction | null) => void;
  addResponseTime: (ms: number) => void;
}

export async function loadQuestion(
  index: number,
  ctx: QuestionFlowContext,
  callbacks: QuestionFlowCallbacks
): Promise<void> {
  callbacks.setQuestionIndex(index);
  callbacks.setWrongCount(0);
  callbacks.setInputLocked(false);
  callbacks.setLastPayload(null);
  callbacks.setCurrentQuestionHintIds([]);
  callbacks.setCurrentRoundEvents([]);

  ctx.submitButtonContainer?.setVisible(true);
  ctx.activeInteraction?.unmount();
  callbacks.setActiveInteraction(null);

  let template: QuestionTemplate;
  const pool = callbacks.getTemplatePool();
  if (pool.length > 0) {
    template = pool[index % pool.length]!;
  } else {
    template = callbacks.makeFallbackTemplate();
  }
  callbacks.setCurrentTemplate(template);
  callbacks.setHintLadder(new HintLadder(template.difficultyTier));

  ctx.hintTextGO.setVisible(false);
  ctx.promptText.setText(template.prompt.text);
  ctx.questionCounterText.setText(`${index + 1} / ${SESSION_GOAL}`);
  ctx.updateCounter?.(index + 1, SESSION_GOAL);
  callbacks.animateCounterBadge();

  log.q('load', {
    index,
    id: template.id,
    archetype: template.archetype,
    tier: template.difficultyTier,
    prompt: template.prompt.text,
    validatorId: template.validatorId,
    source: pool.length > 0 ? 'dexie' : 'synthetic',
  });

  tts.speak(template.prompt.text);
  A11yLayer.announce(
    `Level ${ctx.levelNumber}, question ${index + 1} of ${SESSION_GOAL}. ${template.prompt.text}`
  );

  callbacks.setQuestionStartTime(Date.now());

  const interaction = getInteractionForArchetype(template.archetype, template.validatorId);
  callbacks.setActiveInteraction(interaction);
  interaction.mount({
    scene: ctx.scene,
    template,
    centerX: CW / 2,
    centerY: CH / 2 - 80,
    width: CW,
    height: CH,
    onCommit: (payload) => void commitQuestion(payload, ctx, callbacks),
    pushEvent: (event) => callbacks.setCurrentRoundEvents([...ctx.currentRoundEvents, event]),
  });

  ctx.submitButtonContainer?.setVisible(template.archetype !== 'identify');
  ctx.mascot?.startIdleTimer();

  if (index === 0) {
    ctx.scene.time.delayedCall(600, () =>
      ctx.mascot?.showSpeechBubble("Ready? Let's go! 🚀", 2000)
    );
  } else if (index === SESSION_GOAL - 1) {
    ctx.scene.time.delayedCall(400, () =>
      ctx.mascot?.showSpeechBubble("Last one! You've got this!", 2000)
    );
  }
}

export async function commitQuestion(
  payload: unknown,
  ctx: QuestionFlowContext,
  callbacks: QuestionFlowCallbacks
): Promise<void> {
  if (ctx.inputLocked) return;
  log.input('interaction_commit', {
    level: ctx.levelNumber,
    archetype: ctx.currentTemplate?.archetype,
    payload,
  });
  callbacks.setLastPayload(payload);
  await submitQuestion(ctx, callbacks);
}

export async function submitQuestion(
  ctx: QuestionFlowContext,
  callbacks: QuestionFlowCallbacks
): Promise<void> {
  if (ctx.inputLocked || ctx.lastPayload === null) return;
  callbacks.setInputLocked(true);
  ctx.submitButtonContainer?.setAlpha(0.5);

  log.valid('submit', {
    level: ctx.levelNumber,
    questionId: ctx.currentTemplate.id,
    archetype: ctx.currentTemplate.archetype,
    validatorId: ctx.currentTemplate.validatorId,
    payload: ctx.lastPayload,
  });

  const startedAt = Date.now();
  let result: ValidatorResult;

  try {
    const { getValidator } = await import('@/validators/registry');
    const validator = getValidator(ctx.currentTemplate.validatorId);
    if (validator) {
      result = (validator as { fn: (i: unknown, p: unknown) => ValidatorResult }).fn(
        ctx.lastPayload,
        ctx.currentTemplate.payload
      );
    } else {
      const { partitionEqualAreas } = await import('@/validators/partition');
      result = partitionEqualAreas.fn(
        ctx.lastPayload as unknown as import('@/validators/partition').PartitionInput,
        ctx.currentTemplate.payload as unknown as import('@/validators/partition').PartitionPayload
      );
    }
  } catch (err) {
    log.error('VALID', 'validator_error', {
      error: String(err),
      questionId: ctx.currentTemplate.id,
    });
    result = { outcome: 'incorrect', score: 0, feedback: 'validator_error' };
  }

  const validatorMs = Date.now() - startedAt;
  const totalResponseMs = Date.now() - ctx.questionStartTime;
  callbacks.addResponseTime(totalResponseMs);

  log.valid('result', {
    outcome: result.outcome,
    score: result.score,
    feedback: result.feedback,
    validatorMs,
    totalResponseMs,
    questionId: ctx.currentTemplate.id,
    attemptNumber: ctx.wrongCount + 1,
  });

  await withSpan(
    SPAN_NAMES.QUESTION.SUBMIT,
    {
      'question.archetype': ctx.currentTemplate.archetype,
      'question.outcome': result.outcome,
      'scene.level': ctx.levelNumber,
    },
    () => callbacks.recordAttempt(result, totalResponseMs)
  );

  callbacks.showOutcome(result);
}
