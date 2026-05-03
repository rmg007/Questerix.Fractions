/**
 * Level01Scene — partition_halves activity for Level 1.
 * Student drags a line to split a shape into 2 equal parts.
 * per level-01.md §4.3 (partition_halves mechanic)
 * per interaction-model.md §1–§4 (drag vocab, feedback timing, hint ladder)
 * per runtime-architecture.md §6 (end-to-end lifecycle)
 * per design-language.md §2–§6 (palette, motion)
 * per C9 — 5 problems minimum per session
 */

import * as Phaser from 'phaser';
import { drawAdventureBackground, HINT_TEXT_STYLE, BODY_FONT } from './utils/levelTheme';
import { TestHooks } from './utils/TestHooks';
import { A11yLayer } from '../components/A11yLayer';
import { DragHandle } from '../components/DragHandle';
import { FeedbackOverlay } from '../components/FeedbackOverlay';
import { HintLadder } from '../components/HintLadder';
import { ProgressBar } from '../components/ProgressBar';
import { AccessibilityAnnouncer } from '../components/AccessibilityAnnouncer';
import type { ValidatorResult, QuestionTemplate } from '@/types';
import type { PartitionInput } from '../validators/partition';
import { tts } from '../audio/TTSService';
import { log } from '../lib/log';
import { fadeAndStart } from './utils/sceneTransition';
import { checkReduceMotion } from '../lib/preferences';
import { Mascot } from '../components/Mascot';
import { withSpan } from '../lib/observability/withSpan';
import { SPAN_NAMES } from '../lib/observability/span-names';
import { MathRandomRng } from '../lib/adapters';
import {
  openSessionOrResume,
  closeSessionWithSummary,
  persistLevelCompletion,
  checkAllLevelsComplete,
} from '../lib/level01SessionLifecycle';
import { recordAttemptAndMastery } from '../lib/attemptRecorder';
import { runSessionCompleteFlow } from '../lib/level01SessionComplete';
import {
  questFeedbackText as getQuestFeedback,
  questHintText as getQuestHint,
} from './Level01SceneFeedback';
import {
  createHeaderUI,
  createPromptUI,
  createHintTextUI,
  createHintButtonUI,
  createSubmitButtonUI,
} from './Level01SceneLayout';
import { ShapeRenderer } from './Level01SceneShapeRenderer';
import { HintSystem } from './Level01SceneHintSystem';
import { selectNextQuestion, type L01Question } from './Level01SceneSelection';
import { computePartitionInput, validateAnswer } from './Level01SceneValidation';
import { showStreakBanner } from './Level01SceneStreakBanner';
import {
  classifyOutcome,
  announceOutcome,
  streakMicrocopy,
  wrongAnswerMicrocopy,
} from './Level01SceneOutcomeFlow';
import {
  setupA11yActions,
  setupTestHooks,
  loadAudioPreferences,
  loadInitialMastery,
  loadTemplatesForLevel1,
} from './Level01SceneSetup';
import { createPartitionDragHandle } from './Level01SceneDragHandle';

// ── Canvas & layout constants ─────────────────────────────────────────────

const CW = 800;
const CH = 1280;

// Shape rendering region — centre of canvas
const SHAPE_CX = CW / 2;
const SHAPE_CY = 450;
const SHAPE_W = 400;

// Session goal per C9
const SESSION_GOAL = 5;

const INITIAL_HANDLE_OFFSET_PCT = 0.3;

interface Level01Data {
  studentId: string | null;
  resume?: boolean;
}

export class Level01Scene extends Phaser.Scene {
  private studentId: string | null = null;
  private sessionId: string | null = null;
  private questionIndex: number = 0;
  private attemptCount: number = 0;
  private wrongCount: number = 0;
  private inputLocked: boolean = false;
  private resume: boolean = false;
  private questionStartTime: number = 0;
  private responseTimes: number[] = [];
  private correctCount: number = 0;
  private totalQuestionsAttempted: number = 0;
  private correctStreak: number = 0;
  private currentQuestionHintIds: string[] = [];
  private currentArchetype: string = 'partition';
  private currentMasteryEstimate: number = 0.1;
  private currentSnapPct: number = 0.15;
  private usedQuestionIds = new Set<string>();
  private currentQuestion!: L01Question;
  private templatePool: QuestionTemplate[] = [];
  private calibrationState: import('../engine/calibration').CalibrationState | null = null;
  private recentOutcomes: boolean[] = [];
  private feedbackOverlay!: FeedbackOverlay;
  private progressBar!: ProgressBar;
  private hintLadder!: HintLadder;
  private dragHandle!: DragHandle;
  private mascot!: Mascot;
  private shapeRenderer!: ShapeRenderer;
  private hintSystem!: HintSystem;
  private questionCounterText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private hintButton!: Phaser.GameObjects.Container;
  private submitButtonContainer!: Phaser.GameObjects.Container;
  private handlePos: number = SHAPE_CX;

  constructor() {
    super({ key: 'Level01Scene' });
  }

  init(data: Level01Data): void {
    this.studentId = data.studentId ?? null;
    this.resume = data.resume ?? false;
    this.questionIndex = 0;
    this.attemptCount = 0;
    this.wrongCount = 0;
    this.inputLocked = false;
    this.currentMasteryEstimate = 0.1;
    this.currentSnapPct = 0.15;
    this.usedQuestionIds = new Set<string>();
    this.calibrationState = null;
    this.recentOutcomes = [];
    log.scene('init', { studentId: this.studentId, resume: this.resume });
  }

  async create(): Promise<void> {
    return withSpan(
      SPAN_NAMES.SCENE.CREATE,
      { 'scene.name': 'Level01Scene', 'scene.level': 1 },
      () => this._createImpl()
    );
  }

  private async _createImpl(): Promise<void> {
    log.scene('create_start');
    // Clear any stale sentinels from prior scenes
    TestHooks.unmountAll();

    // Adventure sky background — matches the MenuScene world
    drawAdventureBackground(this, CW, CH);

    // Fade in from black on arrival
    try {
      if (!checkReduceMotion()) {
        this.cameras.main.fadeIn(300, 0, 0, 0);
      }
    } catch {
      /* ignore */
    }

    this.templatePool = await loadTemplatesForLevel1();

    try {
      await this.openSession();
    } catch (err) {
      log.error('SESS', 'create_fatal', { error: String(err) });
      AccessibilityAnnouncer.announce(
        'Sorry, we could not start your session. Please reload the page.'
      );
      this.add
        .text(CW / 2, CH / 2, 'Could not start session.\nPlease reload the page.', {
          fontSize: '24px',
          fontFamily: BODY_FONT,
          fontStyle: 'bold',
          color: '#b91c1c',
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: { x: 20, y: 14 },
          align: 'center',
          wordWrap: { width: 600 },
        })
        .setOrigin(0.5)
        .setDepth(100);
      return;
    }

    const mastery = await loadInitialMastery(this.studentId);
    if (mastery !== null) this.currentMasteryEstimate = mastery;

    // ── UI chrome ──────────────────────────────────────────────────────────
    const onBackConfirm = () => {
      void this.closeSession();
      fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId });
    };
    const { questionCounterText } = createHeaderUI(this, onBackConfirm, this.questionIndex);
    this.questionCounterText = questionCounterText;

    this.promptText = createPromptUI(this);
    const hintText = createHintTextUI(this, HINT_TEXT_STYLE);
    this.hintSystem = new HintSystem(this, hintText);
    this.hintButton = createHintButtonUI(this, () => this.onHintRequest());
    this.submitButtonContainer = createSubmitButtonUI(this, () => void this.onSubmit());

    this.progressBar = new ProgressBar({
      scene: this,
      x: CW / 2 - 200,
      y: CH - 100,
      width: 400,
      goal: SESSION_GOAL,
    });

    this.feedbackOverlay = new FeedbackOverlay({ scene: this });

    this.mascot = new Mascot(this, 80, 450, 0.75);
    this.mascot.setState('idle');

    this.shapeRenderer = new ShapeRenderer(this);

    setupA11yActions({
      onSubmit: () => void this.onSubmit(),
      onHint: () => this.onHintRequest(),
      onNudgeLeft: () => this._a11yNudge(-30),
      onNudgeRight: () => this._a11yNudge(30),
      onSnapCenter: () => {
        if (this.inputLocked) return;
        this.handlePos = SHAPE_CX;
        this.shapeRenderer.updatePartitionLine(SHAPE_CX, SHAPE_CY);
        (this.dragHandle as DragHandle | undefined)?.moveTo(SHAPE_CX, false);
        A11yLayer.announce('Partition placed at center.');
      },
      onBack: () => {
        void this.closeSession();
        fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId });
      },
    });

    setupTestHooks({
      onPartitionTarget: () => {
        if (!this.inputLocked) {
          this.handlePos = SHAPE_CX;
          this.shapeRenderer.updatePartitionLine(SHAPE_CX, SHAPE_CY);
        }
        void this.onSubmit();
      },
      onHintBtn: () => this.onHintRequest(),
      onSessionComplete: () => {
        // Simulate a fully-correct 5/5 session so the gate passes and
        // mascot reaches 'cheer-big' state — needed for E2E mascot smoke tests.
        this.attemptCount = 5;
        this.correctCount = 5;
        this.totalQuestionsAttempted = 5;
        void this.showSessionComplete();
      },
    });

    await loadAudioPreferences();

    log.scene('create_done');

    // T14: Any pointer input resets the idle timer so Quest stops escalating.
    this.input.on('pointerdown', () => {
      this.mascot?.resetIdleTimer();
      this.mascot?.startIdleTimer();
    });

    // Load first question
    this.loadQuestion(0);
  }

  private async openSession(): Promise<void> {
    const sid = this.studentId as import('@/types').StudentId | null;
    const result = await openSessionOrResume(sid, this.resume);
    this.sessionId = result ? String(result) : null;
  }

  // ── UI construction ──────────────────────────────────────────────────────

  private loadQuestion(index: number): void {
    this.questionIndex = index;
    const sel = selectNextQuestion(
      this.templatePool,
      this.usedQuestionIds,
      this.currentMasteryEstimate,
      MathRandomRng
    );
    this.currentQuestion = sel.question;
    this.currentArchetype = sel.archetype;
    this.currentSnapPct = sel.snapPct;
    this.wrongCount = 0;
    this.inputLocked = false;
    this.questionCounterText.setText(`${index + 1} / ${SESSION_GOAL}`);
    this.handlePos = SHAPE_CX - SHAPE_W * INITIAL_HANDLE_OFFSET_PCT;
    this.currentQuestionHintIds = [];
    this.questionStartTime = Date.now();
    this.hintLadder = new HintLadder(this.currentQuestion.difficultyTier);
    this.hintSystem.setLadder(this.hintLadder);
    this.promptText.setText(this.currentQuestion.promptText);

    log.q('load', {
      index,
      id: this.currentQuestion.id,
      tier: this.currentQuestion.difficultyTier,
      source: this.templatePool.length > 0 ? 'dexie' : 'synthetic',
    });

    tts.speak(this.currentQuestion.promptText);
    A11yLayer.announce(
      `Question ${index + 1} of ${SESSION_GOAL}. ${this.currentQuestion.promptText}`
    );

    this.shapeRenderer.drawShape(
      this.currentQuestion.shapeType,
      SHAPE_CY,
      this.handlePos,
      this.inputLocked,
      (x) => {
        this.handlePos = x;
        this.shapeRenderer.updatePartitionLine(x, SHAPE_CY);
        (this.dragHandle as DragHandle | undefined)?.moveTo(x, false);
      }
    );
    this.createDragHandle();
    this.mascot?.startIdleTimer();

    if (index === 0) {
      this.time.delayedCall(600, () => this.mascot?.showSpeechBubble("Ready? Let's go! 🚀", 2000));
    } else if (index === SESSION_GOAL - 1) {
      this.time.delayedCall(400, () =>
        this.mascot?.showSpeechBubble("Last one! You've got this!", 2000)
      );
    }
  }

  private createDragHandle(): void {
    (this.dragHandle as DragHandle | undefined)?.destroy();
    this.dragHandle = createPartitionDragHandle({
      scene: this,
      initialX: this.handlePos,
      snapMode: this.currentQuestion.snapMode,
      currentSnapPct: this.currentSnapPct,
      isInputLocked: () => this.inputLocked,
      onPositionChange: (pos) => {
        this.handlePos = pos;
        this.shapeRenderer.updatePartitionLine(pos, SHAPE_CY);
      },
    });
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private async onSubmit(): Promise<void> {
    if (this.inputLocked) return;
    this.inputLocked = true;
    this.submitButtonContainer?.setAlpha(0.5);

    if (this.currentQuestion.snapMode === 'axis') {
      const snapThreshold = SHAPE_W * this.currentSnapPct;
      if (Math.abs(this.handlePos - SHAPE_CX) <= snapThreshold) {
        this.handlePos = SHAPE_CX;
        this.shapeRenderer.updatePartitionLine(SHAPE_CX, SHAPE_CY);
      }
    }

    const { input, payload, leftArea, rightArea } = computePartitionInput(this.handlePos);
    log.valid('submit', {
      handleX: Math.round(this.handlePos),
      leftArea: Math.round(leftArea),
      rightArea: Math.round(rightArea),
      tolerance: this.currentQuestion.areaTolerance,
      questionId: this.currentQuestion.id,
    });

    const result = await validateAnswer(
      this.currentQuestion,
      this.templatePool,
      input,
      payload(this.currentQuestion.areaTolerance)
    );

    const responseMs = Date.now() - this.questionStartTime;
    this.responseTimes.push(responseMs);
    this.totalQuestionsAttempted++;
    if (result.outcome === 'correct') this.correctCount++;

    log.valid('result', {
      outcome: result.outcome,
      score: result.score,
      responseMs,
      questionId: this.currentQuestion.id,
      attemptNumber: this.wrongCount + 1,
    });

    await withSpan(
      SPAN_NAMES.QUESTION.SUBMIT,
      { 'question.archetype': 'partition', 'question.outcome': result.outcome, 'scene.level': 1 },
      () => this.recordAttempt(result, responseMs, input)
    );
    this.showOutcome(result);
  }

  private questFeedbackText(kind: 'correct' | 'incorrect' | 'close'): string | null {
    return getQuestFeedback(kind, this.currentArchetype as string | undefined);
  }

  private questHintText(tier: import('@/types').HintTier): string {
    return getQuestHint(tier);
  }

  private showOutcome(result: ValidatorResult): void {
    const kind = classifyOutcome(result.outcome);
    if (kind === 'correct') this.progressBar.setProgress(this.attemptCount + 1);

    const questText = this.questFeedbackText(kind);
    this.feedbackOverlay.show(
      kind,
      () => {
        this.inputLocked = false;
        this.submitButtonContainer?.setAlpha(1);
        if (kind === 'correct') this.onCorrectAnswer();
        else this.onWrongAnswer();
      },
      questText ?? undefined
    );

    if (kind === 'correct') {
      this.mascot?.setState('cheer');
      this.shapeRenderer.showCorrectFeedback(SHAPE_CY);
    } else if (kind === 'incorrect') {
      this.mascot?.setState('oops');
    }

    announceOutcome(kind, questText);
  }

  private onCorrectAnswer(): void {
    this.recentOutcomes.push(true);
    this.attemptCount++;
    this.correctStreak++;
    this.progressBar.setProgress(this.attemptCount);
    log.q('correct', {
      questionIndex: this.questionIndex,
      attemptCount: this.attemptCount,
      progress: `${this.attemptCount}/${SESSION_GOAL}`,
      wrongCountThisQ: this.wrongCount,
    });

    const streak = this.correctStreak;
    const streakLine = streakMicrocopy(streak);
    if (streakLine) {
      this.time.delayedCall(1700, () => this.mascot?.showSpeechBubble(streakLine, 2000));
    }
    if (streak === 3 || streak === 5) {
      this.time.delayedCall(1800, () => showStreakBanner(this, streak, this.mascot));
    }

    if (this.attemptCount >= SESSION_GOAL) {
      this.showSessionComplete();
    } else {
      this.loadQuestion(this.questionIndex + 1);
    }
  }

  private onWrongAnswer(): void {
    this.recentOutcomes.push(false);
    this.correctStreak = 0;
    this.wrongCount++;
    log.q('wrong', {
      questionIndex: this.questionIndex,
      wrongCount: this.wrongCount,
      questionId: this.currentQuestion.id,
    });

    const wrongLine = wrongAnswerMicrocopy(this.wrongCount);
    if (wrongLine) {
      this.time.delayedCall(1400, () => this.mascot?.showSpeechBubble(wrongLine, 2000));
    }
    if (this.wrongCount === 1) {
      this.shapeRenderer.showGhostGuide(SHAPE_CY);
    }

    const tier = this.hintLadder.tierForAttemptCount(this.wrongCount);
    if (tier) {
      const questMsg = this.questHintText(tier);
      this.hintSystem.showHintForTier(tier, questMsg, SHAPE_CY, this.inputLocked, (locked) => {
        this.inputLocked = locked;
      });
    }
    if (this.wrongCount === 3) {
      this.time.delayedCall(800, () => this.onHintRequest());
    }
    if (this.wrongCount >= 3) {
      this.hintSystem.pulseButton(this.hintButton);
    }

    this.inputLocked = false;
  }

  // ── Hint handling ────────────────────────────────────────────────────────

  private onHintRequest(): void {
    if (!this.currentQuestion) {
      this.time.delayedCall(100, () => this.onHintRequest());
      return;
    }
    this.hintLadder ??= new HintLadder(this.currentQuestion.difficultyTier);
    this.hintSystem.setLadder(this.hintLadder);
    const tier = this.hintLadder.next();
    log.hint('request', { tier, questionIndex: this.questionIndex, wrongCount: this.wrongCount });
    this.mascot?.setState('think');

    if (this.wrongCount <= 2) {
      this.mascot?.showSpeechBubble("Here's a secret... 🤫", 2000);
    }

    const hintMessage = this.questHintText(tier);
    this.hintSystem.showHintForTier(tier, hintMessage, SHAPE_CY, this.inputLocked, (locked) => {
      this.inputLocked = locked;
    });

    log.hint('show', { tier, message: hintMessage, questionIndex: this.questionIndex });
    TestHooks.setText('hint-text', hintMessage);

    void this.recordHintEvent(tier);
  }

  private async recordHintEvent(tier: import('@/types').HintTier): Promise<void> {
    const eventId = await this.hintSystem.recordHintEvent(tier, this.sessionId, this.questionIndex);
    if (eventId) {
      this.currentQuestionHintIds.push(eventId);
    }
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  private async recordAttempt(
    result: ValidatorResult,
    responseMs: number,
    input: PartitionInput
  ): Promise<void> {
    const sid = this.studentId as import('@/types').StudentId | null;
    const estimate = await recordAttemptAndMastery(
      sid,
      this.sessionId as import('@/types').SessionId | null,
      this.currentQuestion.id,
      this.questionIndex,
      this.wrongCount,
      result,
      responseMs,
      input,
      this.currentQuestionHintIds,
      this.currentQuestion.shapeType,
      this.currentQuestion.snapMode,
      this.currentQuestion.areaTolerance
    );
    if (estimate !== null) {
      this.currentMasteryEstimate = estimate;
    }
  }

  // ── Session complete ───────────────────────────────────────────────────────

  private async _allLevelsComplete(): Promise<boolean> {
    const sid = this.studentId as import('@/types').StudentId | null;
    return await checkAllLevelsComplete(sid);
  }

  private async showSessionComplete(): Promise<void> {
    this.inputLocked = true;
    await runSessionCompleteFlow({
      scene: this,
      studentId: this.studentId as import('@/types').StudentId | null,
      correctCount: this.correctCount,
      totalAttempts: this.totalQuestionsAttempted,
      responseTimes: this.responseTimes,
      attemptCount: this.attemptCount,
      recentOutcomes: this.recentOutcomes,
      calibrationState: this.calibrationState,
      mascot: this.mascot,
      persistLevelCompletion: () => this.persistLevelCompletion(),
      checkAllLevelsComplete: () => this._allLevelsComplete(),
    });
    await this.closeSession();
  }

  private async persistLevelCompletion(): Promise<void> {
    const sid = this.studentId as import('@/types').StudentId | null;
    await persistLevelCompletion(sid, this.correctCount);
  }

  private async closeSession(): Promise<void> {
    const sid = this.studentId as import('@/types').StudentId | null;
    await closeSessionWithSummary(
      this.sessionId as import('@/types').SessionId | null,
      sid,
      this.totalQuestionsAttempted,
      this.correctCount,
      this.responseTimes,
      this.currentMasteryEstimate
    );
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private _a11yNudge(delta: number): void {
    if (this.inputLocked) return;
    const minX = SHAPE_CX - SHAPE_W / 2;
    const maxX = SHAPE_CX + SHAPE_W / 2;
    const next = Phaser.Math.Clamp(this.handlePos + delta, minX, maxX);
    this.handlePos = next;
    this.shapeRenderer.updatePartitionLine(next, SHAPE_CY);
    (this.dragHandle as DragHandle | undefined)?.moveTo(next, false);
    const pct = Math.round(((next - minX) / SHAPE_W) * 100);
    A11yLayer.announce(`Partition at ${pct} percent across.`);
  }

  preDestroy(): void {
    this.time.removeAllEvents();
    log.scene('destroy');
    this.tweens.killAll();
    this.feedbackOverlay?.destroy();
    this.dragHandle?.destroy();
    this.progressBar?.destroy();
    this.hintLadder?.reset?.();
    this.mascot?.destroy();
    this.hintButton?.destroy();
    this.submitButtonContainer?.destroy();
    this.shapeRenderer?.cleanup();
    this.hintSystem?.destroy();
    AccessibilityAnnouncer.destroy();
    TestHooks.unmountAll();
    A11yLayer.unmountAll();
  }
}
