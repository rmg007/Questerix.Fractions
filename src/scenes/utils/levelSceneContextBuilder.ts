import type Phaser from 'phaser';
import type { QuestionTemplate, ValidatorResult, ProgressionEvent } from '@/types';
import type { QuestionFlowContext, QuestionFlowCallbacks } from '../../lib/levelSceneQuestionFlow';
import type { HintLadder } from '../../components/HintLadder';
import type { Mascot } from '../../components/Mascot';
import type { Interaction } from '../interactions/types';

/**
 * Builds the context object shared by loadQuestion and onSubmit.
 * Reduces ~45 LOC of duplication between the two methods.
 */
export function buildQuestionFlowContext(
  scene: Phaser.Scene,
  levelNumber: number,
  questionIndex: number,
  wrongCount: number,
  inputLocked: boolean,
  lastPayload: unknown,
  currentTemplate: QuestionTemplate,
  hintLadder: HintLadder | null,
  questionStartTime: number,
  responseTimes: number[],
  submitButtonContainer: Phaser.GameObjects.Container,
  currentQuestionHintIds: string[],
  currentRoundEvents: ProgressionEvent[],
  activeInteraction: Interaction | null,
  promptText: Phaser.GameObjects.Text,
  hintTextGO: Phaser.GameObjects.Text,
  questionCounterText: Phaser.GameObjects.Text,
  updateCounter: (answered: number, total: number) => void,
  mascot: Mascot
): QuestionFlowContext {
  return {
    scene,
    levelNumber,
    questionIndex,
    wrongCount,
    inputLocked,
    lastPayload,
    currentTemplate,
    hintLadder: hintLadder ?? null,
    questionStartTime,
    responseTimes,
    submitButtonContainer,
    currentQuestionHintIds,
    currentRoundEvents,
    activeInteraction,
    promptText,
    hintTextGO,
    questionCounterText,
    updateCounter: (n, t) => updateCounter(n, t),
    mascot,
  };
}

/**
 * Builds the callbacks object shared by loadQuestion and onSubmit.
 * Reduces ~47 LOC of duplication between the two methods.
 */
export function buildQuestionFlowCallbacks(sceneCallbacks: {
  recordAttempt: (result: ValidatorResult, responseMs: number) => Promise<void>;
  showOutcome: (result: ValidatorResult) => void;
  makeFallbackTemplate: () => QuestionTemplate;
  getTemplatePool: () => QuestionTemplate[];
  animateCounterBadge: () => void;
  setQuestionIndex: (i: number) => void;
  setWrongCount: (c: number) => void;
  setInputLocked: (l: boolean) => void;
  setLastPayload: (p: unknown) => void;
  setCurrentTemplate: (t: QuestionTemplate) => void;
  setHintLadder: (h: HintLadder | null) => void;
  setQuestionStartTime: (t: number) => void;
  setCurrentQuestionHintIds: (ids: string[]) => void;
  setCurrentRoundEvents: (events: ProgressionEvent[]) => void;
  setActiveInteraction: (i: Interaction | null) => void;
  addResponseTime: (ms: number) => void;
}): QuestionFlowCallbacks {
  return {
    recordAttempt: (result: ValidatorResult, responseMs: number) =>
      sceneCallbacks.recordAttempt(result, responseMs),
    showOutcome: (result: ValidatorResult) => sceneCallbacks.showOutcome(result),
    makeFallbackTemplate: () => sceneCallbacks.makeFallbackTemplate(),
    getTemplatePool: () => sceneCallbacks.getTemplatePool(),
    animateCounterBadge: () => sceneCallbacks.animateCounterBadge(),
    setQuestionIndex: (i: number) => sceneCallbacks.setQuestionIndex(i),
    setWrongCount: (c: number) => sceneCallbacks.setWrongCount(c),
    setInputLocked: (l: boolean) => sceneCallbacks.setInputLocked(l),
    setLastPayload: (p: unknown) => sceneCallbacks.setLastPayload(p),
    setCurrentTemplate: (t: QuestionTemplate) => sceneCallbacks.setCurrentTemplate(t),
    setHintLadder: (h: HintLadder | null) => sceneCallbacks.setHintLadder(h),
    setQuestionStartTime: (t: number) => sceneCallbacks.setQuestionStartTime(t),
    setCurrentQuestionHintIds: (ids: string[]) => sceneCallbacks.setCurrentQuestionHintIds(ids),
    setCurrentRoundEvents: (events: ProgressionEvent[]) =>
      sceneCallbacks.setCurrentRoundEvents(events),
    setActiveInteraction: (i: Interaction | null) => sceneCallbacks.setActiveInteraction(i),
    addResponseTime: (ms: number) => sceneCallbacks.addResponseTime(ms),
  };
}
