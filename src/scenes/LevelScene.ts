/**
 * LevelScene — generic config-driven scene for levels 1–9.
 * Receives `{ levelNumber: 1..9 }` via init(), loads templates from Dexie,
 * and drives one Interaction per question.
 * per runtime-architecture.md §6, C3 MVP (L1–L9), activity-archetypes.md §1–§10
 */

import * as Phaser from 'phaser';
import {
  drawAdventureBackground,
  createActionButton,
  createHintPillButton,
  HINT_TEXT_STYLE,
  TITLE_FONT,
  BODY_FONT,
  NAVY_HEX,
  NAVY,
  SKY_BG,
  PATH_BLUE,
  OPTION_BG,
} from './utils/levelTheme';
import { TestHooks } from './utils/TestHooks';
import { A11yLayer } from '../components/A11yLayer';
import { FeedbackOverlay, type FeedbackKind } from '../components/FeedbackOverlay';
import { SessionCompleteOverlay } from '../components/SessionCompleteOverlay';
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
  private questionCounterText!: Phaser.GameObjects.Text;
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

    // Adventure sky background — matches the MenuScene world
    drawAdventureBackground(this, CW, CH);

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

    this.loadQuestion(0);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mascot: this.mascot as any,
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
    // White card banner spanning the top — matches the adventure card style
    const headerG = this.add.graphics().setDepth(4);
    headerG.fillStyle(OPTION_BG, 0.95);
    headerG.fillRoundedRect(10, 10, CW - 20, 92, 20);
    headerG.lineStyle(3, NAVY, 1);
    headerG.strokeRoundedRect(10, 10, CW - 20, 92, 20);

    // Level title — centred, Fredoka One
    this.add
      .text(CW / 2, 60, `Level ${this.levelNumber}`, {
        fontSize: '32px',
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
        stroke: '#FFFFFF',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Back pill — left side
    const BACK_W = 118,
      BACK_H = 52;
    const backG = this.add.graphics().setDepth(5);
    backG.fillStyle(SKY_BG, 1);
    backG.fillRoundedRect(18, 34, BACK_W, BACK_H, 14);
    backG.lineStyle(2, NAVY, 1);
    backG.strokeRoundedRect(18, 34, BACK_W, BACK_H, 14);

    const backBtn = this.add
      .text(18 + BACK_W / 2, 34 + BACK_H / 2, '← Menu', {
        fontSize: '17px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-BACK_W / 2, -BACK_H / 2, BACK_W, BACK_H),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });

    let menuConfirmPending = false;
    let menuConfirmTimer: Phaser.Time.TimerEvent | null = null;

    const resetMenuBtn = () => {
      menuConfirmPending = false;
      menuConfirmTimer = null;
      backBtn.setText('← Menu').setColor(NAVY_HEX);
    };

    backBtn.on('pointerup', () => {
      if (!menuConfirmPending) {
        menuConfirmPending = true;
        backBtn.setText('Leave? ✕').setColor('#b45309');
        menuConfirmTimer = this.time.delayedCall(2000, resetMenuBtn);
        this.input.once('pointerdown', (ptr: Phaser.Input.Pointer, _objs: unknown[]) => {
          const btnBounds = backBtn.getBounds();
          if (!Phaser.Geom.Rectangle.Contains(btnBounds, ptr.x, ptr.y)) {
            menuConfirmTimer?.remove(false);
            resetMenuBtn();
          }
        });
      } else {
        menuConfirmTimer?.remove(false);
        log.input('back_to_menu', {
          level: this.levelNumber,
          questionIndex: this.questionIndex,
          attemptCount: this.attemptCount,
        });
        fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId });
      }
    });

    // Question counter pill — right side, mirrors the back button
    const CTR_W = 140,
      CTR_H = 52;
    const ctrX = CW - 18 - CTR_W;
    const ctrY = 34;
    const ctrG = this.add.graphics().setDepth(5);
    ctrG.fillStyle(SKY_BG, 1);
    ctrG.fillRoundedRect(ctrX, ctrY, CTR_W, CTR_H, 14);
    ctrG.lineStyle(2, NAVY, 1);
    ctrG.strokeRoundedRect(ctrX, ctrY, CTR_W, CTR_H, 14);

    this.questionCounterText = this.add
      .text(ctrX + CTR_W / 2, ctrY + CTR_H / 2, `1 / ${SESSION_GOAL}`, {
        fontSize: '22px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(6);
  }

  private createPromptArea(): void {
    // Question prompt card — white with PATH_BLUE border, matching adventure cards
    const promptG = this.add.graphics().setDepth(4);
    promptG.fillStyle(OPTION_BG, 1);
    promptG.fillRoundedRect(60, 114, CW - 120, 100, 18);
    promptG.lineStyle(3, PATH_BLUE, 1);
    promptG.strokeRoundedRect(60, 114, CW - 120, 100, 18);

    this.promptText = this.add
      .text(CW / 2, 164, '', {
        fontSize: '28px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
        align: 'center',
        wordWrap: { width: CW - 180 },
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  private createHintArea(): void {
    this.hintTextGO = this.add
      .text(CW / 2, CH - 280, '', HINT_TEXT_STYLE)
      .setOrigin(0.5)
      .setDepth(5)
      .setVisible(false);
  }

  private createHintButton(): void {
    // Phase 3 layout pass (S): amber pill button 100×60 px, centered at y≈720
    this.hintButton = createHintPillButton(
      this,
      CW / 2,
      720,
      () => {
        log.input('hint_button_tap', {
          level: this.levelNumber,
          questionIndex: this.questionIndex,
          wrongCount: this.wrongCount,
        });
        this.onHintRequest();
      },
      10
    );
  }

  private createSubmitButton(): void {
    // Phase 3 layout pass (S): check button repositioned to y≈820 in layout arc
    this.submitButtonContainer = createActionButton(
      this,
      CW / 2,
      820,
      'Check ✓',
      () => {
        log.input('check_button_tap', {
          level: this.levelNumber,
          lastPayload: this.lastPayload,
          inputLocked: this.inputLocked,
          questionIndex: this.questionIndex,
        });
        void this.onSubmit();
      },
      10
    );
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mascot: this.mascot as any,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mascot: this.mascot as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeInteraction: this.activeInteraction as any,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mascot: this.mascot as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeInteraction: this.activeInteraction as any,
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
    this.inputLocked = true;
    const accuracy =
      this.attemptCount > 0 ? +(this.correctCount / this.attemptCount).toFixed(3) : null;
    const avgResponseMs =
      this.responseTimes.length > 0
        ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
        : null;
    log.scene('session_complete', {
      level: this.levelNumber,
      attemptCount: this.attemptCount,
      correctCount: this.correctCount,
      accuracy,
      avgResponseMs,
    });

    // Phase 2a (D-1): gate next-level unlock on correctCount/never-stuck/researcher
    const { evaluateUnlockGate } = await import('../lib/unlockGate');
    const gate = await evaluateUnlockGate({
      studentId: this.studentId,
      levelNumber: this.levelNumber,
      correctCount: this.correctCount,
    });
    if (gate.passed) MenuScene.markLevelComplete(this.levelNumber, this.studentId);
    if (gate.passed) void this.persistLevelCompletion();

    const nextLevel =
      this.levelNumber < 9 ? ((this.levelNumber + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) : null;

    // T11: Scaffold recommendation. Gate failure forces 'stay' regardless of accuracy.
    const totalAttempts = this.responseTimes.length;
    const acc = totalAttempts > 0 ? this.correctCount / totalAttempts : 0;
    let scaffoldRec: 'advance' | 'stay' | 'regress' = 'stay';
    if (gate.passed && acc >= 0.8) scaffoldRec = 'advance';
    else if (gate.passed && acc < 0.4) scaffoldRec = 'regress';
    const isPerfect = gate.passed && acc === 1 && totalAttempts === SESSION_GOAL;

    new SessionCompleteOverlay({
      scene: this,
      levelNumber: this.levelNumber,
      correctCount: this.correctCount,
      totalAttempts,
      width: CW,
      height: CH,
      scaffoldRecommendation: scaffoldRec,
      nextLevelNumber: scaffoldRec === 'advance' && nextLevel !== null ? nextLevel : null,
      isPerfect,
      ...(gate.passed && nextLevel !== null
        ? { onNextLevel: () => fadeAndStart(this, 'LevelScene', { levelNumber: nextLevel, studentId: this.studentId }) } // prettier-ignore
        : {}),
      onPlayAgain: () =>
        fadeAndStart(this, 'LevelScene', {
          levelNumber: this.levelNumber,
          studentId: this.studentId,
        }),
      onMenu: () =>
        fadeAndStart(this, 'LevelMapScene', {
          studentId: this.studentId,
          postSession: true,
          levelNumber: this.levelNumber,
          completedScore: this.correctCount,
        }),
    });

    // T16: Quest session-complete speech line
    let completeLine = 'Great practice! Keep going!';
    if (!gate.passed) completeLine = "Let's practice a little more!";
    else if (scaffoldRec === 'advance') completeLine = 'I knew you could do it! ⭐';
    this.time.delayedCall(800, () => this.mascot?.showSpeechBubble(completeLine, 3000));

    if (this.mascot) {
      this.mascot.setDepth(60);
      this.mascot.reposition(CW - 120, 400);
      this.mascot.setState(gate.passed ? 'cheer-big' : 'idle');
    }

    void this.closeSession();
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
    const badge = this.questionCounterText;
    badge.setScale(1);
    this.tweens.add({
      targets: badge,
      scaleX: 1.25,
      scaleY: 1.25,
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
