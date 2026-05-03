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
import { HintLadder } from '../components/HintLadder';
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
import { get as getCopy } from '../lib/i18n/catalog';
import { getLastCurriculumLoadFailure, clearLastCurriculumLoadFailure } from '../curriculum/loader';
import { withSpan } from '../lib/observability/withSpan';
import { tracerService } from '../lib/observability/tracer';
import { SPAN_NAMES } from '../lib/observability/span-names';
import {
  openSessionForLevel,
  recordAttemptAndMasteryForLevel,
  closeSessionForLevel,
  persistLevelCompletionForLevel,
} from '../lib/levelSceneSession';
import { questFeedbackText as questFeedbackTextLib } from '../lib/levelSceneFeedback';
import {
  loadQuestion as loadQuestionFlow,
  submitQuestion,
  type QuestionFlowContext,
  type QuestionFlowCallbacks,
} from '../lib/levelSceneQuestionFlow';
import {
  showHintForTier as showHintForTierFlow,
  pulseHintButton as pulseHintButtonFlow,
  type HintFlowContext,
  type HintFlowCallbacks,
} from '../lib/levelSceneHintFlow';
import {
  showOutcome as showOutcomeFlow,
  type OutcomeFlowContext,
  type OutcomeFlowCallbacks,
} from '../lib/levelSceneOutcomeFlow';
import {
  makeFallbackTemplate as makeFallbackTemplateLib,
  loadTemplatesForLevel,
  showOfflineCurriculumToast as showOfflineCurriculumToastLib,
} from '../lib/levelSceneTemplates';
import { showSessionCompleteForLevel } from '../lib/levelSceneSessionComplete';
import { LevelVignette } from '../components/LevelVignette';
import {
  createHeader as createHeaderLib,
  createPromptArea as createPromptAreaLib,
  createHintArea as createHintAreaLib,
  createHintButton as createHintButtonLib,
  createSubmitButton as createSubmitButtonLib,
} from '../lib/levelSceneChrome';

// ── Canvas constants ────────────────────────────────────────────────────────

const CW = 800;
const CH = 1280;
const SESSION_GOAL = 5;

// ── Init data ────────────────────────────────────────────────────────────────

export interface LevelSceneData {
  levelNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  studentId?: string | null;
  resume?: boolean | undefined;
}

// ── Scene ────────────────────────────────────────────────────────────────────

export class LevelScene extends Phaser.Scene {
  // Init data
  protected levelNumber: number = 1;
  private studentId: string | null = null;
  private sessionId: string | null = null;
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

  // R3: hint events linked to attempt records via hintEventRepo.linkToAttempt() (UUID strings)
  private currentQuestionHintIds: string[] = [];

  // Template pool
  private templatePool: QuestionTemplate[] = [];
  private currentTemplate!: QuestionTemplate;

  // Current interaction
  private activeInteraction: Interaction | null = null;

  // UI components
  private feedbackOverlay!: FeedbackOverlay;
  private progressBar!: ProgressBar;
  private hintLadder!: HintLadder;
  private promptText!: Phaser.GameObjects.Text;
  private hintTextGO!: Phaser.GameObjects.Text;
  private hintButton!: Phaser.GameObjects.Container;
  private submitButtonContainer!: Phaser.GameObjects.Container;
  private mascot!: Mascot;
  private levelVignette: LevelVignette | null = null;
  private questionCounterText!: Phaser.GameObjects.Text;
  private counterContainer!: Phaser.GameObjects.Container;
  private updateCounter!: (answered: number, total: number) => void;
  protected studentDisplayName: string | null = null;

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
    this.responseTimes = [];
    this.questionStartTime = 0;
    this.inputLocked = false;
    this.activeInteraction = null;
    // Reset the cached display name on every scene init so a previous
    // student's name can't leak into a later anonymous session-complete
    // line. `openSession()` re-resolves it from Dexie when a studentId
    // is bound; otherwise `resolveQuestName(null)` falls back to "friend".
    this.studentDisplayName = null;
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

    // Load templates
    await this.loadTemplates();

    // Phase 11.2 — offline-curriculum affordance.
    // If the boot-time curriculum fetch failed AND we have no usable templates,
    // surface a user-facing toast and fall back to MenuScene rather than
    // entering the synthetic-fallback path silently.
    const loadFailure = getLastCurriculumLoadFailure();
    if (loadFailure && this.templatePool.length === 0) {
      log.warn('TMPL', 'offline_uncached', {
        level: this.levelNumber,
        reason: loadFailure.reason,
      });
      clearLastCurriculumLoadFailure();
      this.showOfflineCurriculumToast();
      return;
    }

    // Open session record
    await this.openSession();

    // Build chrome
    this.createHeader();
    this.createPromptArea();
    this.createHintArea();
    this.createHintButton();
    this.createSubmitButton();

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

    // ── Mascot — always-visible guide in top-right corner (smaller scale) ──
    this.mascot = new Mascot(this, 720, 160, 0.75);
    this.mascot.setState('idle');

    // ── Accessibility: real DOM buttons mirror canvas controls (WCAG 4.1.2)
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
    this.input.on('pointerdown', () => {
      this.mascot?.resetIdleTimer();
      this.mascot?.startIdleTimer();
    });

    // §3-E — play once-per-session level intro vignette, then start questions
    this.levelVignette = new LevelVignette(this, this.levelNumber);
    this.levelVignette.play(() => {
      this.levelVignette = null;
      this.loadQuestion(0);
    });
  }

  // ── Phase 11.2: offline-curriculum toast ────────────────────────────────────

  private showOfflineCurriculumToast(): void {
    showOfflineCurriculumToastLib(this, this.studentId, CW, CH);
  }

  // ── Template loading ────────────────────────────────────────────────────────

  private async loadTemplates(): Promise<void> {
    this.templatePool = await loadTemplatesForLevel(
      this.levelNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
    );
  }

  // ── Question loading ─────────────────────────────────────────────────────────

  private async loadQuestion(index: number): Promise<void> {
    const ctx: QuestionFlowContext = {
      scene: this,
      levelNumber: this.levelNumber,
      questionIndex: index,
      wrongCount: this.wrongCount,
      inputLocked: this.inputLocked,
      lastPayload: this.lastPayload,
      currentTemplate: this.currentTemplate,
      hintLadder: this.hintLadder ?? null,
      questionStartTime: this.questionStartTime,
      responseTimes: this.responseTimes,
      submitButtonContainer: this.submitButtonContainer,
      currentQuestionHintIds: this.currentQuestionHintIds,
      currentRoundEvents: this.currentRoundEvents,
      activeInteraction: this.activeInteraction,
      promptText: this.promptText,
      hintTextGO: this.hintTextGO,
      questionCounterText: this.questionCounterText,
      updateCounter: (n, t) => this.updateCounter(n, t),
      mascot: this.mascot,
    };
    const callbacks: QuestionFlowCallbacks = {
      recordAttempt: (result, responseMs) => this.recordAttempt(result, responseMs),
      showOutcome: (result) => this.showOutcome(result),
      makeFallbackTemplate: () => this.makeFallbackTemplate(),
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
      },
      setHintLadder: (h) => {
        this.hintLadder = h;
      },
      setQuestionStartTime: (t) => {
        this.questionStartTime = t;
      },
      setCurrentQuestionHintIds: (ids) => {
        this.currentQuestionHintIds = ids;
      },
      setCurrentRoundEvents: (events) => {
        this.currentRoundEvents = events;
      },
      setActiveInteraction: (i) => {
        this.activeInteraction = i;
      },
      addResponseTime: (ms) => {
        this.responseTimes.push(ms);
      },
    };
    await loadQuestionFlow(index, ctx, callbacks);
  }

  private makeFallbackTemplate(): QuestionTemplate {
    return makeFallbackTemplateLib(this.levelNumber);
  }

  // ── Header / chrome ─────────────────────────────────────────────────────────

  private createHeader(): void {
    const { questionCounterText, updateCounter, counterContainer } = createHeaderLib(
      this,
      this.levelNumber,
      {
        sessionGoal: SESSION_GOAL,
        onBackToMenu: () => fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId }),
        backLogContext: () => ({
          level: this.levelNumber,
          questionIndex: this.questionIndex,
          attemptCount: this.attemptCount,
        }),
      }
    );
    this.questionCounterText = questionCounterText;
    this.updateCounter = updateCounter;
    this.counterContainer = counterContainer;
  }

  private createPromptArea(): void {
    this.promptText = createPromptAreaLib(this);
  }

  private createHintArea(): void {
    this.hintTextGO = createHintAreaLib(this);
  }

  private createHintButton(): void {
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
  }

  private createSubmitButton(): void {
    this.submitButtonContainer = createSubmitButtonLib(this, {
      onTap: () => void this.onSubmit(),
      logContext: () => ({
        level: this.levelNumber,
        lastPayload: this.lastPayload,
        inputLocked: this.inputLocked,
        questionIndex: this.questionIndex,
      }),
    });
  }

  // ── Commit / Validation ──────────────────────────────────────────────────────

  private lastPayload: unknown = null;

  private async onSubmit(): Promise<void> {
    const ctx: QuestionFlowContext = {
      scene: this,
      levelNumber: this.levelNumber,
      questionIndex: this.questionIndex,
      wrongCount: this.wrongCount,
      inputLocked: this.inputLocked,
      lastPayload: this.lastPayload,
      currentTemplate: this.currentTemplate,
      hintLadder: this.hintLadder ?? null,
      questionStartTime: this.questionStartTime,
      responseTimes: this.responseTimes,
      submitButtonContainer: this.submitButtonContainer,
      currentQuestionHintIds: this.currentQuestionHintIds,
      currentRoundEvents: this.currentRoundEvents,
      activeInteraction: this.activeInteraction,
      promptText: this.promptText,
      hintTextGO: this.hintTextGO,
      questionCounterText: this.questionCounterText,
      updateCounter: (n, t) => this.updateCounter(n, t),
      mascot: this.mascot,
    };
    const callbacks: QuestionFlowCallbacks = {
      recordAttempt: (result, responseMs) => this.recordAttempt(result, responseMs),
      showOutcome: (result) => this.showOutcome(result),
      makeFallbackTemplate: () => this.makeFallbackTemplate(),
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
      },
      setHintLadder: (h) => {
        this.hintLadder = h;
      },
      setQuestionStartTime: (t) => {
        this.questionStartTime = t;
      },
      setCurrentQuestionHintIds: (ids) => {
        this.currentQuestionHintIds = ids;
      },
      setCurrentRoundEvents: (events) => {
        this.currentRoundEvents = events;
      },
      setActiveInteraction: (i) => {
        this.activeInteraction = i;
      },
      addResponseTime: (ms) => {
        this.responseTimes.push(ms);
      },
    };
    await submitQuestion(ctx, callbacks);
  }

  private showOutcome(result: ValidatorResult): void {
    const ctx: OutcomeFlowContext = {
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
      hintLadder: this.hintLadder ?? null,
      mascot: this.mascot,
      activeInteraction: this.activeInteraction,
    };
    const callbacks: OutcomeFlowCallbacks = {
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
      setCurrentQuestionHintIds: (ids) => {
        this.currentQuestionHintIds = ids;
      },
      onHintRequest: async () => {
        this.onHintRequest();
      },
      pulseHintButton: () => this.pulseHintButton(),
      showHintForTier: (tier) => {
        void this.showHintForTier(tier);
      },
    };
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

  questHintText(archetype: string, tier: import('@/types').HintTier): string | null {
    if (archetype === 'partition') {
      const d = this.payloadDenominator();
      switch (d) {
        case 2:
          return getCopy('quest.hint.split2');
        case 3:
          return getCopy('quest.hint.split3');
        case 4:
          return getCopy('quest.hint.split4');
        default:
          return null;
      }
    }
    const suffix = tier === 'verbal' ? 'verbal' : tier === 'visual_overlay' ? 'visual' : 'worked';
    switch (archetype) {
      case 'equal_or_not':
      case 'compare':
      case 'order':
      case 'benchmark':
      case 'label':
      case 'make':
      case 'snap_match':
        try {
          return getCopy(`quest.hint.${archetype}.${suffix}`);
        } catch {
          return null;
        }
      default:
        return null;
    }
  }

  questFeedbackText(kind: FeedbackKind): string | null {
    return questFeedbackTextLib(
      kind,
      this.currentTemplate?.archetype as string | undefined,
      this.payloadDenominator()
    );
  }

  // ── Hints ────────────────────────────────────────────────────────────────────

  private onHintRequest(): void {
    if (!this.currentTemplate) {
      this.time.delayedCall(100, () => this.onHintRequest());
      return;
    }
    this.hintLadder ??= new HintLadder(this.currentTemplate.difficultyTier);
    const tier = this.hintLadder.next();
    const span = tracerService.startSpan(SPAN_NAMES.HINT.REQUEST, {
      'hint.tier': tier,
      'scene.level': this.levelNumber,
      'question.archetype': this.currentTemplate?.archetype,
    });
    try {
      log.hint('request', {
        tier,
        level: this.levelNumber,
        questionIndex: this.questionIndex,
        wrongCount: this.wrongCount,
      });
      this.mascot?.setState('think');
      void this.showHintForTier(tier);
    } finally {
      span.end();
    }
  }

  private async showHintForTier(tier: import('@/types').HintTier): Promise<void> {
    const ctx: HintFlowContext = {
      scene: this,
      levelNumber: this.levelNumber,
      questionIndex: this.questionIndex,
      wrongCount: this.wrongCount,
      currentTemplate: this.currentTemplate,
      hintLadder: this.hintLadder,
      hintButton: this.hintButton,
      hintTextGO: this.hintTextGO,
      currentQuestionHintIds: this.currentQuestionHintIds,
      mascot: this.mascot,
      activeInteraction: this.activeInteraction,
    };
    const callbacks: HintFlowCallbacks = {
      setCurrentQuestionHintIds: (ids) => {
        this.currentQuestionHintIds = ids;
      },
    };
    await showHintForTierFlow(tier, ctx, callbacks);
  }

  private pulseHintButton(): void {
    pulseHintButtonFlow({
      scene: this,
      levelNumber: this.levelNumber,
      questionIndex: this.questionIndex,
      wrongCount: this.wrongCount,
      currentTemplate: this.currentTemplate,
      hintLadder: this.hintLadder,
      hintButton: this.hintButton,
      hintTextGO: this.hintTextGO,
      currentQuestionHintIds: this.currentQuestionHintIds,
      mascot: this.mascot,
      activeInteraction: this.activeInteraction,
    });
  }

  // ── Persistence ──────────────────────────────────────────────────────────────

  private async openSession(): Promise<void> {
    if (!this.studentId) return;
    try {
      const { studentRepo } = await import('@/persistence/repositories/student');
      const student = await studentRepo.get(this.studentId as import('@/types').StudentId);
      this.studentDisplayName = student?.displayName ?? null;
    } catch (err) {
      log.warn('SESS', 'displayname_lookup_error', { error: String(err) });
      this.studentDisplayName = null;
    }
    this.sessionId = await openSessionForLevel(
      this.studentId as import('@/types').StudentId,
      this.levelNumber
    );
  }

  private async recordAttempt(result: ValidatorResult, responseMs: number): Promise<void> {
    await recordAttemptAndMasteryForLevel(
      this.studentId as import('@/types').StudentId,
      this.sessionId as import('@/types').SessionId,
      this.levelNumber,
      this.currentTemplate,
      this.questionIndex,
      this.wrongCount,
      result,
      responseMs,
      this.lastPayload,
      this.currentQuestionHintIds,
      this.currentRoundEvents
    );
  }

  // ── Session complete ─────────────────────────────────────────────────────────

  private async showSessionComplete(): Promise<void> {
    await showSessionCompleteForLevel(
      {
        scene: this,
        levelNumber: this.levelNumber,
        studentId: this.studentId,
        attemptCount: this.attemptCount,
        correctCount: this.correctCount,
        responseTimes: this.responseTimes,
        canvasWidth: CW,
        canvasHeight: CH,
        mascot: this.mascot,
      },
      {
        setInputLocked: (l) => {
          this.inputLocked = l;
        },
        markLevelComplete: () => MenuScene.markLevelComplete(this.levelNumber, this.studentId),
        persistCompletion: () => this.persistLevelCompletion(),
        closeSession: () => this.closeSession(),
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

  /**
   * G-5: Write (or update) a ProgressionStat row in IndexedDB marking this level
   * as completed and advancing highestLevelReached to levelNumber + 1.
   * This is a best-effort write — persistence failure never blocks gameplay.
   */
  private async persistLevelCompletion(): Promise<void> {
    await persistLevelCompletionForLevel(
      this.studentId as import('@/types').StudentId,
      this.levelNumber,
      this.correctCount
    );
  }

  private async closeSession(): Promise<void> {
    await closeSessionForLevel(
      this.sessionId as import('@/types').SessionId,
      this.levelNumber,
      this.attemptCount,
      this.correctCount,
      this.responseTimes
    );
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  /**
   * Plays a brief scale-bounce (1.0 → 1.25 → 1.0, ~200 ms) on the question
   * counter badge so young children notice it updating. Skipped when the OS
   * reports prefers-reduced-motion.
   */
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
    this.tweens.killAll();
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
