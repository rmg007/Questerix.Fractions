/**
 * Context and callback builders for LevelScene question flow.
 * Reduces boilerplate in loadQuestion and onSubmit methods.
 */

import type {
  QuestionTemplate,
  ValidatorResult,
  ProgressionEvent,
} from '@/types';
import type { Interaction } from '../interactions/types';
import type { HintLadder } from '../../components/HintLadder';
import type { Mascot } from '../../components/Mascot';
import type Phaser from 'phaser';
import type {
  QuestionFlowContext,
  QuestionFlowCallbacks,
} from '../../lib/levelSceneQuestionFlow';

export interface QuestionFlowState {
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
  submitButtonContainer: Phaser.GameObjects.Container;
  currentQuestionHintIds: string[];
  currentRoundEvents: ProgressionEvent[];
  activeInteraction: Interaction | null;
  promptText: Phaser.GameObjects.Text;
  hintTextGO: Phaser.GameObjects.Text;
  questionCounterText: Phaser.GameObjects.Text;
  updateCounter: (answered: number, total: number) => void;
  mascot: Mascot;
}

export function buildQuestionFlowContext(state: QuestionFlowState): QuestionFlowContext {
  return {
    scene: state.scene,
    levelNumber: state.levelNumber,
    questionIndex: state.questionIndex,
    wrongCount: state.wrongCount,
    inputLocked: state.inputLocked,
    lastPayload: state.lastPayload,
    currentTemplate: state.currentTemplate,
    hintLadder: state.hintLadder,
    questionStartTime: state.questionStartTime,
    responseTimes: state.responseTimes,
    submitButtonContainer: state.submitButtonContainer,
    currentQuestionHintIds: state.currentQuestionHintIds,
    currentRoundEvents: state.currentRoundEvents,
    activeInteraction: state.activeInteraction,
    promptText: state.promptText,
    hintTextGO: state.hintTextGO,
    questionCounterText: state.questionCounterText,
    updateCounter: state.updateCounter,
    mascot: state.mascot,
  };
}

export interface QuestionFlowCallbackSetters {
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
  recordAttempt: (result: ValidatorResult, responseMs: number) => void;
  showOutcome: (result: ValidatorResult) => void;
  makeFallbackTemplate: () => QuestionTemplate;
  getTemplatePool: () => QuestionTemplate[];
  animateCounterBadge: () => void;
}

export function buildQuestionFlowCallbacks(setters: QuestionFlowCallbackSetters): QuestionFlowCallbacks {
  return {
    recordAttempt: setters.recordAttempt,
    showOutcome: setters.showOutcome,
    makeFallbackTemplate: setters.makeFallbackTemplate,
    getTemplatePool: setters.getTemplatePool,
    animateCounterBadge: setters.animateCounterBadge,
    setQuestionIndex: setters.setQuestionIndex,
    setWrongCount: setters.setWrongCount,
    setInputLocked: setters.setInputLocked,
    setLastPayload: setters.setLastPayload,
    setCurrentTemplate: setters.setCurrentTemplate,
    setHintLadder: setters.setHintLadder,
    setQuestionStartTime: setters.setQuestionStartTime,
    setCurrentQuestionHintIds: setters.setCurrentQuestionHintIds,
    setCurrentRoundEvents: setters.setCurrentRoundEvents,
    setActiveInteraction: setters.setActiveInteraction,
    addResponseTime: setters.addResponseTime,
  };
}
