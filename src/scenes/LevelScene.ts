/**
 * LevelScene — generic config-driven scene for levels 1–9.
 * Receives `{ levelNumber: 1..9 }` via init(), loads templates from Dexie,
 * and drives one Interaction per question.
 * per runtime-architecture.md §6, C3 MVP (L1–L9), activity-archetypes.md §1–§10
 */

import * as Phaser from 'phaser';
import { PATH_BLUE, OPTION_BG } from './utils/levelTheme';
import { drawLevelBackground } from './utils/levelBackgrounds';
import { TestHooks } from './utils/TestHooks';
import { A11yLayer } from '../components/A11yLayer';
import { FeedbackOverlay, type FeedbackKind } from '../components/FeedbackOverlay';
import { ProgressBar } from '../components/ProgressBar';
import { AccessibilityAnnouncer } from '../components/AccessibilityAnnouncer';
import type { Interaction } from './interactions/types';
import type { QuestionTemplate, ValidatorResult } from '@/types';
import { MenuScene } from './MenuScene';
import { tts } from '../audio/TTSService';
import { sfx } from '../audio/SFXService';
import { log } from '../lib/log';
import { Mascot } from '../components/Mascot';
import { fadeAndStart } from './utils/sceneTransition';
import { checkReduceMotion } from '../lib/preferences';
import { getLastCurriculumLoadFailure, clearLastCurriculumLoadFailure } from '../curriculum/loader';
import { withSpan } from '../lib/observability/withSpan';
import { SPAN_NAMES } from '../lib/observability/span-names';
import { questFeedbackText as questFeedbackTextLib } from '../lib/levelSceneFeedback';
import {
  loadQuestion as loadQuestionFlow,
  submitQuestion,
  type QuestionFlowContext,
  type QuestionFlowCallbacks,
} from '../lib/levelSceneQuestionFlow';
import { showOutcome as showOutcomeFlow } from '../lib/levelSceneOutcomeFlow';
import {
  makeFallbackTemplate as makeFallbackTemplateLib,
  loadTemplatesForLevel,
  showOfflineCurriculumToast as showOfflineCurriculumToastLib,
} from '../lib/levelSceneTemplates';
import { LevelVignette } from '../components/LevelVignette';
import {
  createHeader as createHeaderLib,
  createPromptArea as createPromptAreaLib,
  createHintArea as createHintAreaLib,
  createHintButton as createHintButtonLib,
  createSubmitButton as createSubmitButtonLib,
} from '../lib/levelSceneChrome';
import { HintController } from './controllers/HintController';
import { ProgressionController } from './controllers/ProgressionController';
import {
  buildQuestionFlowContext,
  buildQuestionFlowCallbacks,
  buildOutcomeFlowContext,
  buildOutcomeFlowCallbacks,
} from './utils/levelSceneContextBuilder';

const CW = 800;
const CH = 1280;
const SESSION_GOAL = 5;

export interface LevelSceneData {
  levelNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  studentId?: string | null;
  resume?: boolean | undefined;
}

export class LevelScene extends Phaser.Scene {
  // Init data
  protected levelNumber: number = 1;
  private studentId: string | null = null;
  // Session state
  private questionIndex: number = 0;
  private attemptCount: number = 0;
  private wrongCount: number = 0;
  private inputLocked: boolean = false;

  // Fix G-E4: real accuracy + response-time tracking
  private correctCount: number = 0;
  // T16: consecutive correct streak for microcopy
  private correctStreak: number = 0;
  private responseTimes: number[] = [];
  private questionStartTime: number = 0;
  private currentRoundEvents: import('@/types').ProgressionEvent[] = [];

  // Template pool
  private templatePool: QuestionTemplate[] = [];
  private currentTemplate!: QuestionTemplate;

  // Current interaction
  private activeInteraction: Interaction | null = null;

  // Event listeners (tracked for cleanup)
  private pointerdownHandler?: () => void;

  // UI components
  private feedbackOverlay!: FeedbackOverlay;
  private progressBar!: ProgressBar;
  private promptText!: Phaser.GameObjects.Text;
  private hintTextGO!: Phaser.GameObjects.Text;
  private hintButton!: Phaser.GameObjects.Container;
  private submitButtonContainer!: Phaser.GameObjects.Container;
  private mascot!: Mascot;
  private levelVignette: LevelVignette | null = null;
  private questionCounterText!: Phaser.GameObjects.Text;
  private counterContainer!: Phaser.GameObjects.Container;
  private updateCounter!: (answered: number, total: number) => void;

  // Controllers (encapsulate complex state and operations)
  private hintController!: HintController;
  private progressionController!: ProgressionController;

  constructor(key = 'LevelScene') {
    super({ key });
  }

  init(data: LevelSceneData): void {
    this.levelNumber = data.levelNumber ?? 1;
    this.studentId = data.studentId ?? null;
    this.questionIndex = 0;
    this.attemptCount = 0;
    this.wrongCount = 0;
    this.correctCount = 0;
    this.correctStreak = 0;
    this.responseTimes = [];
    this.questionStartTime = 0;
    this.inputLocked = false;
    this.activeInteraction = null;
    // Initialize controllers
    this.hintController = new HintController(this);
    this.progressionController = new ProgressionController(this);
    log.scene('init', {
      level: this.levelNumber,
      studentId: this.studentId,
      resume: data.resume ?? false,
    });
  }

  async create(): Promise<void> {
    return withSpan(
      SPAN_NAMES.SCENE.CREATE,
      { 'scene.name': 'LevelScene', 'scene.level': this.levelNumber },
      () => this._createImpl()
    );
  }

  private async _createImpl(): Promise<void> {
    log.scene('create_start', { level: this.levelNumber });
    TestHooks.unmountAll();

    // Per-level illustrated scene background (§3-A)
    drawLevelBackground(this, this.levelNumber, CW, CH);

    // Fade in from black on arrival
    if (!checkReduceMotion()) {
      this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    this.templatePool = await loadTemplatesForLevel(
      this.levelNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
    );

    // Phase 11.2 — fall back to MenuScene if curriculum fetch failed and no usable templates.
    const loadFailure = getLastCurriculumLoadFailure();
    if (loadFailure && this.templatePool.length === 0) {
      log.warn('TMPL', 'offline_uncached', {
        level: this.levelNumber,
        reason: loadFailure.reason,
      });
      clearLastCurriculumLoadFailure();
      showOfflineCurriculumToastLib(this, this.studentId, CW, CH);
      return;
    }

    await this.openSession();

    // Build chrome
    const header = createHeaderLib(this, this.levelNumber, {
      sessionGoal: SESSION_GOAL,
      onBackToMenu: () => fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId }),
      backLogContext: () => ({
        level: this.levelNumber,
        questionIndex: this.questionIndex,
        attemptCount: this.attemptCount,
      }),
    });
    this.questionCounterText = header.questionCounterText;
    this.updateCounter = header.updateCounter;
    this.counterContainer = header.counterContainer;
    this.promptText = createPromptAreaLib(this);
    this.hintTextGO = createHintAreaLib(this);
    this.hintButton = createHintButtonLib(this, {
      onTap: () => this.onHintRequest(),
      logContext: () => ({
        level: this.levelNumber,
        questionIndex: this.questionIndex,
        wrongCount: this.wrongCount,
      }),
    });
    TestHooks.mountInteractive('hint-button', () => this.onHintRequest(), {
      width: '160px',
      height: '60px',
      left: '50%',
      top: '56%',
    });
    this.submitButtonContainer = createSubmitButtonLib(this, {
      onTap: () => void this.onSubmit(),
      logContext: () => ({
        level: this.levelNumber,
        lastPayload: this.lastPayload,
        inputLocked: this.inputLocked,
        questionIndex: this.questionIndex,
      }),
    });

    const progressCardG = this.add.graphics().setDepth(3);
    progressCardG.fillStyle(OPTION_BG, 1);
    progressCardG.fillRoundedRect(60, CH - 115, CW - 120, 80, 18);
    progressCardG.lineStyle(3, PATH_BLUE, 1);
    progressCardG.strokeRoundedRect(60, CH - 115, CW - 120, 80, 18);

    this.progressBar = new ProgressBar({
      scene: this,
      x: CW / 2 - 200,
      y: CH - 100,
      width: 400,
      goal: SESSION_GOAL,
    });

    this.feedbackOverlay = new FeedbackOverlay({ scene: this });

    this.mascot = new Mascot(this, 720, 160, 0.75);
    this.mascot.setState('idle');

    A11yLayer.unmountAll();
    A11yLayer.mountAction('a11y-submit', 'Check my answer', () => {
      void this.onSubmit();
    });
    A11yLayer.mountAction('a11y-hint', 'Get a hint', () => {
      this.onHintRequest();
    });
    A11yLayer.mountAction('a11y-back', 'Back to main menu', () => {
      fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId });
    });

    // Testid sentinels: mount generic `level-scene` + per-level `levelNN-scene`
    TestHooks.mountSentinel('level-scene');
    const levelId = `level${String(this.levelNumber).padStart(2, '0')}-scene`;
    TestHooks.mountSentinel(levelId);

    // hint-btn interactive overlay (upper-right ~y=270)
    TestHooks.mountInteractive(
      'hint-btn',
      () => {
        this.onHintRequest();
      },
      { width: '80px', height: '80px', top: '21.09%', left: 'calc(50% + 280px)' }
    );

    // hint-text sentinel (hidden until text set)
    TestHooks.mountSentinel('hint-text');

    // T4: Load persisted preferences — TTS is gated by its own `ttsEnabled` flag,
    // NOT by reduceMotion. Audio master toggle still acts as a parent gate.
    try {
      const { deviceMetaRepo } = await import('../persistence/repositories/deviceMeta');
      const meta = await deviceMetaRepo.get();
      const audioOn = meta.preferences.audio ?? true;
      sfx.setEnabled(audioOn);
      // TTS is on when: master audio is on AND ttsEnabled is on (default true)
      const ttsOn = audioOn && (meta.preferences.ttsEnabled ?? true);
      tts.setEnabled(ttsOn);
    } catch (_err) {
      // Graceful fallback — leave TTS and SFX in their default state
    }

    // T14: Any pointer input resets the idle timer.
    this.pointerdownHandler = () => {
      this.mascot?.resetIdleTimer();
      this.mascot?.startIdleTimer();
    };
    this.input.on('pointerdown', this.pointerdownHandler);

    // §3-E — play once-per-session level intro vignette, then start questions
    this.levelVignette = new LevelVignette(this, this.levelNumber);
    this.levelVignette.play(() => {
      this.levelVignette = null;
      this.loadQuestion(0);
    });
  }

  private buildQFContext(questionIndexOverride?: number): QuestionFlowContext {
    return buildQuestionFlowContext({
      scene: this,
      levelNumber: this.levelNumber,
      questionIndex: questionIndexOverride ?? this.questionIndex,
      wrongCount: this.wrongCount,
      inputLocked: this.inputLocked,
      lastPayload: this.lastPayload,
      currentTemplate: this.currentTemplate,
      hintLadder: this.hintController.getHintLadder(),
      questionStartTime: this.questionStartTime,
      responseTimes: this.responseTimes,
      submitButtonContainer: this.submitButtonContainer,
      currentQuestionHintIds: this.hintController.getCurrentQuestionHintIds(),
      currentRoundEvents: this.currentRoundEvents,
      activeInteraction: this.activeInteraction,
      promptText: this.promptText,
      hintTextGO: this.hintTextGO,
      questionCounterText: this.questionCounterText,
      updateCounter: (n, t) => this.updateCounter(n, t),
      mascot: this.mascot,
    });
  }

  private buildQFCallbacks(): QuestionFlowCallbacks {
    return buildQuestionFlowCallbacks({
      recordAttempt: (result, responseMs) => this.recordAttempt(result, responseMs),
      showOutcome: (result) => this.showOutcome(result),
      makeFallbackTemplate: () => makeFallbackTemplateLib(this.levelNumber),
      getTemplatePool: () => this.templatePool,
      animateCounterBadge: () => this.animateCounterBadge(),
      setQuestionIndex: (i) => {
        this.questionIndex = i;
      },
      setWrongCount: (c) => {
        this.wrongCount = c;
      },
      setInputLocked: (l) => {
        this.inputLocked = l;
      },
      setLastPayload: (p) => {
        this.lastPayload = p;
      },
      setCurrentTemplate: (t) => {
        this.currentTemplate = t;
        this.hintController.setCurrentTemplate(t);
      },
      setHintLadder: (h) => this.hintController.setHintLadder(h),
      setQuestionStartTime: (t) => {
        this.questionStartTime = t;
      },
      setCurrentQuestionHintIds: (ids) => this.hintController.setCurrentQuestionHintIds(ids),
      setCurrentRoundEvents: (events) => {
        this.currentRoundEvents = events;
      },
      setActiveInteraction: (i) => {
        this.activeInteraction = i;
      },
      addResponseTime: (ms) => {
        this.responseTimes.push(ms);
      },
    });
  }

  private async loadQuestion(index: number): Promise<void> {
    await loadQuestionFlow(index, this.buildQFContext(index), this.buildQFCallbacks());
  }

  private lastPayload: unknown = null;

  private async onSubmit(): Promise<void> {
    await submitQuestion(this.buildQFContext(), this.buildQFCallbacks());
  }

  private showOutcome(result: ValidatorResult): void {
    const ctx = buildOutcomeFlowContext({
      scene: this,
      levelNumber: this.levelNumber,
      questionIndex: this.questionIndex,
      wrongCount: this.wrongCount,
      attemptCount: this.attemptCount,
      correctCount: this.correctCount,
      correctStreak: this.correctStreak,
      currentTemplate: this.currentTemplate,
      progressBar: this.progressBar,
      feedbackOverlay: this.feedbackOverlay,
      submitButtonContainer: this.submitButtonContainer,
      hintLadder: this.hintController.getHintLadder(),
      mascot: this.mascot,
      activeInteraction: this.activeInteraction,
    });
    const callbacks = buildOutcomeFlowCallbacks({
      setWrongCount: (c) => {
        this.wrongCount = c;
      },
      setAttemptCount: (c) => {
        this.attemptCount = c;
      },
      setCorrectCount: (c) => {
        this.correctCount = c;
      },
      setCorrectStreak: (s) => {
        this.correctStreak = s;
      },
      setInputLocked: (l) => {
        this.inputLocked = l;
      },
      setLastPayload: (p) => {
        this.lastPayload = p;
      },
      loadQuestion: (i) => {
        void this.loadQuestion(i);
      },
      showSessionComplete: () => this.showSessionComplete(),
      setCurrentQuestionHintIds: (ids) => this.hintController.setCurrentQuestionHintIds(ids),
      onHintRequest: async () => {
        this.onHintRequest();
      },
      pulseHintButton: () => this.pulseHintButton(),
      showHintForTier: (tier) => {
        void this.showHintForTier(tier);
      },
    });
    void showOutcomeFlow(result, ctx, callbacks);
  }

  private payloadDenominator(): number | null {
    const payload = this.currentTemplate?.payload as Record<string, unknown> | undefined;
    if (!payload) return null;
    for (const key of ['targetPartitions', 'targetParts', 'denominator', 'parts', 'totalParts']) {
      const v = payload[key];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
    }
    return null;
  }

  questFeedbackText(kind: FeedbackKind): string | null {
    return questFeedbackTextLib(
      kind,
      this.currentTemplate?.archetype as string | undefined,
      this.payloadDenominator()
    );
  }

  private onHintRequest(): void {
    this.hintController.onHintRequest(
      this.levelNumber,
      this.questionIndex,
      this.wrongCount,
      this.mascot,
      (tier) => this.showHintForTier(tier)
    );
  }

  private async showHintForTier(tier: import('@/types').HintTier): Promise<void> {
    await this.hintController.showHintForTier(tier, {
      scene: this,
      levelNumber: this.levelNumber,
      questionIndex: this.questionIndex,
      wrongCount: this.wrongCount,
      currentTemplate: this.currentTemplate,
      hintButton: this.hintButton,
      hintTextGO: this.hintTextGO,
      currentQuestionHintIds: this.hintController.getCurrentQuestionHintIds(),
      mascot: this.mascot,
      activeInteraction: this.activeInteraction,
      hintLadder: this.hintController.getHintLadder(),
    });
  }

  private pulseHintButton(): void {
    this.hintController.pulseHintButton(
      this.levelNumber,
      this.questionIndex,
      this.wrongCount,
      this.hintButton,
      this.hintTextGO,
      this.mascot,
      this.activeInteraction
    );
  }

  private async openSession(): Promise<void> {
    if (!this.studentId) return;
    await this.progressionController.openSession(
      this.studentId as import('@/types').StudentId,
      this.levelNumber
    );
  }

  private async recordAttempt(result: ValidatorResult, responseMs: number): Promise<void> {
    if (!this.studentId) return;
    await this.progressionController.recordAttempt(
      this.studentId as import('@/types').StudentId,
      this.levelNumber,
      this.currentTemplate,
      this.questionIndex,
      this.wrongCount,
      result,
      responseMs,
      this.lastPayload,
      this.hintController.getCurrentQuestionHintIds(),
      this.currentRoundEvents
    );
  }

  private async showSessionComplete(): Promise<void> {
    const studentId = this.studentId as import('@/types').StudentId | null;
    await this.progressionController.showSessionComplete(
      this.levelNumber,
      studentId,
      this.attemptCount,
      this.correctCount,
      this.responseTimes,
      CW,
      CH,
      this.mascot,
      {
        setInputLocked: (l) => {
          this.inputLocked = l;
        },
        markLevelComplete: () => MenuScene.markLevelComplete(this.levelNumber, this.studentId),
        persistCompletion: async () => {
          if (!studentId) return;
          await this.progressionController.persistLevelCompletion(
            studentId,
            this.levelNumber,
            this.correctCount
          );
        },
        closeSession: () =>
          this.progressionController.closeSession(
            this.levelNumber,
            this.attemptCount,
            this.correctCount,
            this.responseTimes
          ),
        navigateNextLevel: (next) =>
          fadeAndStart(this, 'LevelScene', { levelNumber: next, studentId: this.studentId }),
        navigatePlayAgain: () =>
          fadeAndStart(this, 'LevelScene', {
            levelNumber: this.levelNumber,
            studentId: this.studentId,
          }),
        navigateMenu: () =>
          fadeAndStart(this, 'LevelMapScene', {
            studentId: this.studentId,
            postSession: true,
            levelNumber: this.levelNumber,
            completedScore: this.correctCount,
          }),
      }
    );
  }

  private animateCounterBadge(): void {
    if (checkReduceMotion()) return;
    const badge = this.counterContainer;
    if (!badge) return;
    badge.setScale(1);
    this.tweens.add({
      targets: badge,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      ease: 'Cubic.easeOut',
      yoyo: true,
      onComplete: () => {
        badge.setScale(1);
      },
    });
  }

  preDestroy(): void {
    log.scene('destroy', { level: this.levelNumber });
    // R7: destroy all managed components to prevent memory leaks and dangling listeners.
    // Phaser auto-destroys child display objects, but custom classes that hold tweens,
    // timers, or DOM listeners (Mascot idleTween, FeedbackOverlay dismissTimer, hint
    // pulse tween) require explicit cleanup. killAll() catches any in-flight tween
    // (badge bounce, hint pulse) when the scene shuts down.
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.input.off('pointerdown', this.pointerdownHandler);
    this.levelVignette?.destroy();
    this.activeInteraction?.unmount();
    this.feedbackOverlay?.destroy();
    this.progressBar?.destroy();
    this.mascot?.destroy();
    this.hintButton?.destroy();
    this.submitButtonContainer?.destroy();
    AccessibilityAnnouncer.destroy();
    TestHooks.unmountAll();
    A11yLayer.unmountAll();
  }
}
