import type Phaser from 'phaser';
import type { QuestionTemplate, ValidatorResult, ProgressionEvent, HintTier } from '@/types';
import type { QuestionFlowContext, QuestionFlowCallbacks } from '../../lib/levelSceneQuestionFlow';
import type { OutcomeFlowContext, OutcomeFlowCallbacks } from '../../lib/levelSceneOutcomeFlow';
import type { HintLadder } from '../../components/HintLadder';
import type { Mascot } from '../../components/Mascot';
import type { ProgressBar } from '../../components/ProgressBar';
import type { FeedbackOverlay } from '../../components/FeedbackOverlay';
import type { Interaction } from '../interactions/types';

/**
 * Builds the context object shared by loadQuestion and onSubmit.
 * Reduces ~45 LOC of duplication between the two methods.
 */
export function buildQuestionFlowContext(args: {
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
}): QuestionFlowContext {
  return { ...args };
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
  return { ...sceneCallbacks };
}

/**
 * Builds the OutcomeFlow context object for showOutcome().
 */
export function buildOutcomeFlowContext(args: {
  scene: Phaser.Scene;
  levelNumber: number;
  questionIndex: number;
  wrongCount: number;
  attemptCount: number;
  correctCount: number;
  correctStreak: number;
  currentTemplate: QuestionTemplate;
  progressBar: ProgressBar;
  feedbackOverlay: FeedbackOverlay;
  submitButtonContainer: Phaser.GameObjects.Container | null;
  hintLadder: HintLadder | null;
  mascot: Mascot | null;
  activeInteraction: Interaction | null;
  /** Optional: when present, progress chips are refreshed from DB after each answer. */
  studentId?: string | null;
}): OutcomeFlowContext {
  return { ...args };
}

/**
 * Builds the OutcomeFlow callbacks object for showOutcome().
 */
export function buildOutcomeFlowCallbacks(sceneCallbacks: {
  setWrongCount: (c: number) => void;
  setAttemptCount: (c: number) => void;
  setCorrectCount: (c: number) => void;
  setCorrectStreak: (s: number) => void;
  setInputLocked: (l: boolean) => void;
  setLastPayload: (p: unknown) => void;
  loadQuestion: (i: number) => void;
  showSessionComplete: () => Promise<void>;
  setCurrentQuestionHintIds: (ids: string[]) => void;
  onHintRequest: () => Promise<void>;
  pulseHintButton: () => void;
  showHintForTier: (tier: HintTier) => void;
}): OutcomeFlowCallbacks {
  return { ...sceneCallbacks };
}
