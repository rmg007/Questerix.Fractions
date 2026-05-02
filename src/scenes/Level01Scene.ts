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
  ACTION_FILL,
} from './utils/levelTheme';
import { TestHooks } from './utils/TestHooks';
import { A11yLayer } from '../components/A11yLayer';
import { DragHandle } from '../components/DragHandle';
import { FeedbackOverlay } from '../components/FeedbackOverlay';
import { SessionCompleteOverlay } from '../components/SessionCompleteOverlay';
import { HintLadder } from '../components/HintLadder';
import { ProgressBar } from '../components/ProgressBar';
import { AccessibilityAnnouncer } from '../components/AccessibilityAnnouncer';
import type { ValidatorResult, QuestionTemplate } from '@/types';
import type { PartitionInput, PartitionPayload } from '../validators/partition';
import { tts } from '../audio/TTSService';
import { sfx } from '../audio/SFXService';
import { MenuScene } from './MenuScene';
import { log } from '../lib/log';
import { fadeAndStart } from './utils/sceneTransition';
import { checkReduceMotion } from '../lib/preferences';
import { Mascot } from '../components/Mascot';
import { withSpan } from '../lib/observability/withSpan';
import { tracerService } from '../lib/observability/tracer';
import { SPAN_NAMES } from '../lib/observability/span-names';
import {
  openSessionOrResume,
  closeSessionWithSummary,
  persistLevelCompletion,
  checkAllLevelsComplete,
} from '../lib/level01SessionLifecycle';
import { recordAttemptAndMastery } from '../lib/attemptRecorder';
import {
  questFeedbackText as getQuestFeedback,
  questHintText as getQuestHint,
} from './Level01SceneFeedback';

// ── Canvas & layout constants ─────────────────────────────────────────────

const CW = 800;
const CH = 1280;

// Shape rendering region — centre of canvas
const SHAPE_CX = CW / 2;
const SHAPE_CY = 450;
const SHAPE_W = 400;
const SHAPE_H = 520;

// Session goal per C9
const SESSION_GOAL = 5;

// Handle starts off-centre so the student must drag — otherwise the initial
// centre position is already the correct partition for halves and pressing
// Check passes without any interaction.
const INITIAL_HANDLE_OFFSET_PCT = 0.3;

// ── Question definition (inline for MVP — curriculum loader is out of scope) ─

interface L01Question {
  id: string;
  validatorId?: string;
  shapeType: 'rectangle' | 'circle';
  difficultyTier: 'easy' | 'medium' | 'hard';
  areaTolerance: number;
  /** Only axis mode snaps to true halves. per level-01.md §4.3 */
  snapMode: 'axis' | 'free';
  promptText: string;
}

const QUESTIONS: L01Question[] = [
  {
    id: 'q:ph:L1:0001',
    shapeType: 'rectangle',
    difficultyTier: 'easy',
    areaTolerance: 0.05,
    snapMode: 'axis',
    promptText: 'Cut this shape into two equal parts.',
  },
  {
    id: 'q:ph:L1:0002',
    shapeType: 'rectangle',
    difficultyTier: 'easy',
    areaTolerance: 0.05,
    snapMode: 'axis',
    promptText: 'Drag the line to make two equal parts.',
  },
  {
    id: 'q:ph:L1:0003',
    shapeType: 'rectangle',
    difficultyTier: 'medium',
    areaTolerance: 0.05,
    snapMode: 'free',
    promptText: 'Split the rectangle in half.',
  },
  {
    id: 'q:ph:L1:0004',
    shapeType: 'circle',
    difficultyTier: 'medium',
    areaTolerance: 0.05,
    snapMode: 'free',
    promptText: 'Cut this circle into two equal parts.',
  },
  {
    id: 'q:ph:L1:0008',
    shapeType: 'circle',
    difficultyTier: 'hard',
    areaTolerance: 0.03,
    snapMode: 'free',
    promptText: 'Cut this circle into two equal parts.',
  },
];

// ── Scene ──────────────────────────────────────────────────────────────────

interface Level01Data {
  studentId: string | null;
  resume?: boolean;
}

export class Level01Scene extends Phaser.Scene {
  // Session state
  private studentId: string | null = null;
  private sessionId: string | null = null;
  private questionIndex: number = 0;
  private attemptCount: number = 0; // total across session
  private wrongCount: number = 0; // wrong attempts on current question
  private inputLocked: boolean = false;
  private resume: boolean = false;

  // Fix 7 (G-E4): response-time and accuracy tracking
  private questionStartTime: number = 0;
  private responseTimes: number[] = [];
  private correctCount: number = 0;
  private totalQuestionsAttempted: number = 0;
  // T16: consecutive correct streak for microcopy
  private correctStreak: number = 0;

  // Fix 6 (G-E3): hint-event IDs accumulated per question (Dexie auto-increment numbers)
  private currentQuestionHintIds: string[] = []; // Hint event IDs (UUIDs) for linking after attempt creation (R3)

  // Archetype of the active question — set when loading from templatePool, else 'partition'
  private currentArchetype: string = 'partition';

  // BKT adaptation: loaded from DB on create(), updated after every attempt
  private currentMasteryEstimate: number = 0.1;
  // Dynamic snap tolerance — widens for low mastery (K-2 kids need forgiveness)
  private currentSnapPct: number = 0.15;
  // Prevent repeat questions within a session
  private usedQuestionIds = new Set<string>();

  // Current question — may come from DB pool or synthetic fallback
  private currentQuestion!: L01Question;
  /** Real templates fetched from Dexie. Empty → synthetic fallback. */
  private templatePool: QuestionTemplate[] = [];
  private calibrationState: import('../engine/calibration').CalibrationState | null = null;
  private recentOutcomes: boolean[] = [];

  // UI components
  private feedbackOverlay!: FeedbackOverlay;
  private progressBar!: ProgressBar;
  private hintLadder!: HintLadder;
  private dragHandle!: DragHandle;
  private mascot!: Mascot;

  // Counter badge
  private questionCounterText!: Phaser.GameObjects.Text;

  // Graphics
  private shapeGraphics!: Phaser.GameObjects.Graphics;
  private partitionLine!: Phaser.GameObjects.Graphics;
  /** T8: Ghost guide shown after first wrong answer */
  private ghostGuideGraphics: Phaser.GameObjects.Graphics | null = null;
  private ghostGuideLabel: Phaser.GameObjects.Text | null = null;
  /** T13: Color fill + fraction labels shown on correct answer */
  private correctFillGraphics: Phaser.GameObjects.Graphics | null = null;
  private fractionLabels: Phaser.GameObjects.Text[] = [];
  /** Transparent overlay over the shape — taps here move the partition line.
   * Provides a click-to-place affordance in addition to drag, so any input
   * method (mouse, touch, automated test tool) can position the partition. */
  private tapZone: Phaser.GameObjects.Rectangle | null = null;
  private promptText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private hintButton!: Phaser.GameObjects.Container;
  /** Submit button container — used by setInputLocked to toggle interactivity. */
  private submitButtonContainer!: Phaser.GameObjects.Container;

  // Track handle position for validation
  private handlePos: number = SHAPE_CX; // logical X (horizontal drag only in MVP)

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

    // ── Load real templates from Dexie (partition + identify pool for L1) ──
    // per runtime-architecture.md §4.1 — ActivityScene loads QuestionTemplates via repo
    log.tmpl('load_start', { level: 1 });
    try {
      const { questionTemplateRepo } = await import('../persistence/repositories/questionTemplate');
      const all = await questionTemplateRepo.getByLevel(1);
      // Fix 1 (BUG-01): only partition archetype — identify templates use a different mechanic
      this.templatePool = all.filter((t) => t.archetype === 'partition').slice(0, 5); // first 5 distinct templates for the session
      if (this.templatePool.length > 0) {
        log.tmpl('load_ok', {
          count: this.templatePool.length,
          source: 'dexie',
          ids: this.templatePool.map((t) => t.id),
        });
      } else {
        log.tmpl('load_empty', {
          source: 'dexie',
          fallback: 'synthetic',
          syntheticCount: QUESTIONS.length,
        });
      }
    } catch (err) {
      // Graceful degradation — synthetic content per runtime-architecture.md §10
      log.warn('TMPL', 'load_error', { error: String(err), fallback: 'synthetic' });
      this.templatePool = [];
    }

    // ── Open session in persistence ────────────────────────────────────────
    // per runtime-architecture.md §8 step 4 — new Session row on scene load
    // R6: catch session creation failures — show user-visible error, block play.
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
      // Block play — do not proceed with UI or question loading.
      return;
    }

    // ── Load current BKT mastery for adaptive question selection ───────────
    // Mastery estimate drives difficulty tier and snap tolerance for this session.
    if (this.studentId) {
      try {
        const { skillMasteryRepo } = await import('../persistence/repositories/skillMastery');
        const mastery = await skillMasteryRepo.get(
          this.studentId as import('@/types').StudentId,
          'skill.partition_halves' as import('@/types').SkillId
        );
        if (mastery) {
          this.currentMasteryEstimate = mastery.masteryEstimate;
          log.bkt('session_start_mastery', {
            estimate: +mastery.masteryEstimate.toFixed(4),
            state: mastery.state,
          });
        }
      } catch (err) {
        log.warn('BKT', 'initial_mastery_load_error', { error: String(err) });
      }
    }

    // ── UI chrome ──────────────────────────────────────────────────────────
    this.createHeader();
    this.createPromptArea();
    this.createHintArea();
    this.createHintButton();
    this.createSubmitButton();

    // Progress bar — N / 5 per C9
    this.progressBar = new ProgressBar({
      scene: this,
      x: CW / 2 - 200,
      y: CH - 100,
      width: 400,
      goal: SESSION_GOAL,
    });

    // Feedback overlay — per interaction-model.md §2 (<800ms)
    this.feedbackOverlay = new FeedbackOverlay({ scene: this });

    // ── Mascot — positioned left of shape (smaller scale) ──
    this.mascot = new Mascot(this, 80, 450, 0.75);
    this.mascot.setState('idle');

    // Shape graphics placeholder
    this.shapeGraphics = this.add.graphics().setDepth(5);
    this.partitionLine = this.add.graphics().setDepth(6);

    // ── Accessibility: real DOM buttons mirror canvas controls (WCAG 4.1.2)
    A11yLayer.unmountAll();
    A11yLayer.mountAction('a11y-submit', 'Check my answer', () => {
      void this.onSubmit();
    });
    A11yLayer.mountAction('a11y-hint', 'Get a hint', () => {
      this.onHintRequest();
    });
    A11yLayer.mountAction('a11y-move-left', 'Move partition line left', () => {
      this._a11yNudge(-30);
    });
    A11yLayer.mountAction('a11y-move-right', 'Move partition line right', () => {
      this._a11yNudge(30);
    });
    A11yLayer.mountAction('a11y-snap-center', 'Place partition at center for halves', () => {
      if (this.inputLocked) return;
      this.handlePos = SHAPE_CX;
      this.updatePartitionLine(SHAPE_CX);
      (this.dragHandle as DragHandle | undefined)?.moveTo(SHAPE_CX, false);
      A11yLayer.announce('Partition placed at center.');
    });
    A11yLayer.mountAction('a11y-back', 'Back to main menu', () => {
      void this.closeSession();
      fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId });
    });

    // ── Test hooks ─────────────────────────────────────────────────────────
    // NOTE: must run AFTER ProgressBar construction so progress-bar sentinel is not wiped
    TestHooks.mountSentinel('level01-scene');
    // partition-target: transparent button over shape centre — snaps handle to
    // the correct halves position then submits. Snapping ensures a deterministic
    // correct answer for e2e tests regardless of handle drag state.
    TestHooks.mountInteractive(
      'partition-target',
      () => {
        if (!this.inputLocked) {
          this.handlePos = SHAPE_CX;
          this.updatePartitionLine(SHAPE_CX);
        }
        void this.onSubmit();
      },
      { width: '120px', height: '120px', top: '35.16%', left: '50%' }
    );
    // hint-btn: transparent button over the hint button (centered, above check)
    TestHooks.mountInteractive(
      'hint-btn',
      () => {
        this.onHintRequest();
      },
      { width: '100px', height: '60px', top: '56.25%', left: '50%' }
    );
    // hint-text: starts hidden (no text). showHintForTier makes it visible.
    // Sentinel is a span with role=status; visibility toggled by data-visible attr.
    this.mountHintTextSentinel();
    // session-complete-btn: directly triggers showSessionComplete() so e2e tests
    // can assert the cheer-big mascot state without completing 5 questions.
    TestHooks.mountInteractive(
      'session-complete-btn',
      () => {
        void this.showSessionComplete();
      },
      { width: '10px', height: '10px', top: '2%', left: '2%' }
    );

    // T4: Load persisted preferences — TTS gated by its own flag, NOT reduceMotion.
    try {
      const { deviceMetaRepo } = await import('../persistence/repositories/deviceMeta');
      const meta = await deviceMetaRepo.get();
      const audioOn = meta.preferences.audio ?? true;
      sfx.setEnabled(audioOn);
      const ttsOn = audioOn && (meta.preferences.ttsEnabled ?? true);
      tts.setEnabled(ttsOn);
      const vol = meta.preferences.volume ?? 0.8;
      tts.setVolume(vol);
      sfx.setVolume(vol);
    } catch (_err) {
      // Graceful fallback — leave TTS and SFX in their default state
    }

    log.scene('create_done');

    // T14: Any pointer input resets the idle timer so Quest stops escalating.
    this.input.on('pointerdown', () => {
      this.mascot?.resetIdleTimer();
      this.mascot?.startIdleTimer();
    });

    // Load first question
    this.loadQuestion(0);
  }

  /** Mount hint-text sentinel; invisible until text is set via showHintForTier. */
  private mountHintTextSentinel(): void {
    // Use mountSentinel (opacity:0) — once text is set we switch to opacity:0.01
    // so Playwright's visibility check passes.
    TestHooks.mountSentinel('hint-text');
  }

  // ── Session persistence ──────────────────────────────────────────────────

  private async openSession(): Promise<void> {
    const sid = this.studentId as import('@/types').StudentId | null;
    const result = await openSessionOrResume(sid, this.resume);
    this.sessionId = result ? String(result) : null;
  }

  // ── UI construction ──────────────────────────────────────────────────────

  private createHeader(): void {
    // Level title — Fredoka One display font, matching MenuScene station labels
    this.add
      .text(CW / 2, 60, 'Level 1 — Halves', {
        fontSize: '32px',
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
        stroke: '#FFFFFF',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(5);

    const backBtn = this.add
      .text(52, 60, '← Menu', {
        fontSize: '18px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
        backgroundColor: 'rgba(255,255,255,0.75)',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-28, -20, 56, 40),
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
        // Any tap outside the button resets it
        this.input.once('pointerdown', (ptr: Phaser.Input.Pointer, _objs: unknown[]) => {
          const hitX = ptr.x;
          const hitY = ptr.y;
          const btnBounds = backBtn.getBounds();
          if (!Phaser.Geom.Rectangle.Contains(btnBounds, hitX, hitY)) {
            menuConfirmTimer?.remove(false);
            resetMenuBtn();
          }
        });
      } else {
        menuConfirmTimer?.remove(false);
        log.input('back_to_menu', {
          fromScene: 'Level01Scene',
          questionIndex: this.questionIndex,
          attemptCount: this.attemptCount,
        });
        fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId });
      }
    });

    // Question counter pill badge — sky-blue, matches LevelScene style
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
    this.promptText = this.add
      .text(CW / 2, 160, '', {
        fontSize: '28px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
        align: 'center',
        wordWrap: { width: 600 },
        backgroundColor: 'rgba(255,255,255,0.75)',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  private createHintArea(): void {
    this.hintText = this.add
      .text(CW / 2, 680, '', HINT_TEXT_STYLE)
      .setOrigin(0.5)
      .setDepth(5)
      .setVisible(false);
  }

  private createHintButton(): void {
    // Phase 3 layout pass (S): amber pill button 100×60 px, positioned above Check
    this.hintButton = createHintPillButton(
      this,
      CW / 2,
      720,
      () => {
        log.input('hint_button_tap', {
          questionIndex: this.questionIndex,
          wrongCount: this.wrongCount,
        });
        this.onHintRequest();
      },
      10
    );
  }

  private createSubmitButton(): void {
    this.submitButtonContainer = createActionButton(
      this,
      CW / 2,
      820,
      'Check ✓',
      () => {
        log.input('check_button_tap', {
          handlePos: this.handlePos,
          inputLocked: this.inputLocked,
          questionIndex: this.questionIndex,
          wrongCount: this.wrongCount,
        });
        this.onSubmit();
      },
      10
    );
  }

  // ── BKT-adaptive question selection ──────────────────────────────────────

  /** Map mastery estimate to a target difficulty tier. */
  private difficultyTierForMastery(estimate: number): 'easy' | 'medium' | 'hard' {
    if (estimate < 0.3) return 'easy';
    if (estimate < 0.65) return 'medium';
    return 'hard';
  }

  /**
   * Snap tolerance widens for low mastery so K-2 beginners experience success;
   * tightens as the student approaches mastery.
   */
  private snapPctForMastery(estimate: number): number {
    if (estimate < 0.3) return 0.2; // very forgiving
    if (estimate < 0.65) return 0.15; // standard
    return 0.1; // precise — student is near mastery
  }

  /**
   * Pick the next question using BKT mastery to target the right difficulty tier.
   * Prefers unused questions of the target tier; falls back to any unused question;
   * resets the used-set if all questions have been shown already.
   * Sets currentSnapPct and currentArchetype as side-effects.
   */
  private selectNextQuestion(): L01Question {
    this.currentSnapPct = this.snapPctForMastery(this.currentMasteryEstimate);
    const targetTier = this.difficultyTierForMastery(this.currentMasteryEstimate);

    if (this.templatePool.length === 0) {
      // Synthetic path — same fallback as before, but difficulty-aware
      const unused = QUESTIONS.filter((q) => !this.usedQuestionIds.has(q.id));
      const tiered = unused.filter((q) => q.difficultyTier === targetTier);
      const pool = tiered.length > 0 ? tiered : unused.length > 0 ? unused : QUESTIONS;
      const q = pool[Math.floor(Math.random() * pool.length)]!;
      this.usedQuestionIds.add(q.id);
      this.currentArchetype = 'partition';
      return q;
    }

    // Real template path — difficulty-tier selection from Dexie pool
    const unused = this.templatePool.filter((t) => !this.usedQuestionIds.has(t.id));
    const tiered = unused.filter((t) => t.difficultyTier === targetTier);
    const pool = tiered.length > 0 ? tiered : unused.length > 0 ? unused : this.templatePool;
    const tmpl = pool[Math.floor(Math.random() * pool.length)]!;
    this.usedQuestionIds.add(tmpl.id);
    this.currentArchetype = tmpl.archetype;

    const payload = tmpl.payload as Partial<PartitionPayload> & {
      shapeType?: 'rectangle' | 'circle';
    };
    const tolerance =
      tmpl.difficultyTier === 'easy'
        ? Math.max(payload.areaTolerance ?? 0, 0.1)
        : (payload.areaTolerance ?? 0.05);

    return {
      id: tmpl.id,
      validatorId: tmpl.validatorId,
      shapeType: payload.shapeType ?? 'rectangle',
      difficultyTier: tmpl.difficultyTier,
      areaTolerance: tolerance,
      snapMode: tmpl.difficultyTier === 'easy' ? 'axis' : 'free',
      promptText: tmpl.prompt.text,
    };
  }

  // ── Question loading ──────────────────────────────────────────────────────

  private loadQuestion(index: number): void {
    this.questionIndex = index;

    // BKT-adaptive selection: picks difficulty tier based on current mastery estimate.
    // selectNextQuestion() also updates currentSnapPct for this question.
    this.currentQuestion = this.selectNextQuestion();

    this.wrongCount = 0;
    this.inputLocked = false;

    // T8/T13: Destroy ghost guide and correct-fill overlays from previous question
    this.ghostGuideGraphics?.destroy();
    this.ghostGuideGraphics = null;
    this.ghostGuideLabel?.destroy();
    this.ghostGuideLabel = null;
    this.correctFillGraphics?.destroy();
    this.correctFillGraphics = null;
    this.fractionLabels.forEach((l) => l.destroy());
    this.fractionLabels = [];

    // Update question counter badge — use raw index so display is independent of
    // template-pool cycling (matches LevelScene behaviour)
    this.questionCounterText.setText(`${index + 1} / ${SESSION_GOAL}`);

    // Start off-centre so the partition is clearly unequal on load — student must drag.
    this.handlePos = SHAPE_CX - SHAPE_W * INITIAL_HANDLE_OFFSET_PCT;
    const initialPct = Math.round(((this.handlePos - (SHAPE_CX - SHAPE_W / 2)) / SHAPE_W) * 100);

    // Fix 6 (G-E3): reset per-question hint tracking
    this.currentQuestionHintIds = [];

    // Fix 7 (G-E4): record when this question was shown
    this.questionStartTime = Date.now();

    // Hint ladder resets per question per interaction-model.md §4.1
    this.hintLadder = new HintLadder(this.currentQuestion.difficultyTier);
    this.hintText.setVisible(false);

    this.promptText.setText(this.currentQuestion.promptText);

    log.q('load', {
      index,
      id: this.currentQuestion.id,
      shape: this.currentQuestion.shapeType,
      tier: this.currentQuestion.difficultyTier,
      snapMode: this.currentQuestion.snapMode,
      areaTolerance: this.currentQuestion.areaTolerance,
      prompt: this.currentQuestion.promptText,
      initialHandlePct: initialPct,
      source: this.templatePool.length > 0 ? 'dexie' : 'synthetic',
    });

    // Fix 8 (S3-T1): speak prompt aloud via TTS; gated on browser availability
    // TTSService.setEnabled() is controlled by SettingsScene preference; tts.isAvailable()
    // returns false when disabled, so no separate preference lookup is needed here.
    tts.speak(this.currentQuestion.promptText);

    // Announce question to assistive tech (separate from TTS — visual screen-readers vs audio)
    A11yLayer.announce(
      `Question ${index + 1} of ${SESSION_GOAL}. ${this.currentQuestion.promptText}`
    );

    this.drawShape();
    this.createDragHandle();

    // T14: Start idle-escalation timer each time a new question is presented.
    this.mascot?.startIdleTimer();

    // T16: Quest microcopy at question-load moments
    if (index === 0) {
      this.time.delayedCall(600, () => this.mascot?.showSpeechBubble("Ready? Let's go! 🚀", 2000));
    } else if (index === SESSION_GOAL - 1) {
      this.time.delayedCall(400, () =>
        this.mascot?.showSpeechBubble("Last one! You've got this!", 2000)
      );
    }
  }

  // ── Shape rendering ───────────────────────────────────────────────────────

  private drawShape(): void {
    this.shapeGraphics.clear();

    const { shapeType } = this.currentQuestion;

    if (shapeType === 'rectangle') {
      this.drawRectShape();
    } else {
      this.drawCircleShape();
    }

    this.updatePartitionLine(this.handlePos);
  }

  private drawRectShape(): void {
    const g = this.shapeGraphics;
    const x = SHAPE_CX - SHAPE_W / 2;
    const y = SHAPE_CY - SHAPE_H / 2;

    // Sky-tinted fill so the navy partition line is clearly visible against it
    g.fillStyle(SKY_BG, 0.55);
    g.fillRect(x, y, SHAPE_W, SHAPE_H);
    g.lineStyle(3, 0x1e3a8a, 0.6);
    g.strokeRect(x, y, SHAPE_W, SHAPE_H);

    // Tap-to-place: any pointerdown over the rectangle moves the partition line
    // to that x-coordinate. Works for clicks, taps, and the first frame of a drag.
    // Lower depth than the drag handle's hit zone so dragging the line still
    // takes precedence — but a click anywhere else on the rectangle still works.
    if (!this.tapZone) {
      this.tapZone = this.add
        .rectangle(SHAPE_CX, SHAPE_CY, SHAPE_W, SHAPE_H, 0x000000, 0)
        .setDepth(4) // below dragHandle hitZone
        .setInteractive({ useHandCursor: true });
      this.tapZone.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        if (this.inputLocked) return;
        const minX = SHAPE_CX - SHAPE_W / 2;
        const maxX = SHAPE_CX + SHAPE_W / 2;
        const clamped = Phaser.Math.Clamp(ptr.x, minX, maxX);
        this.handlePos = clamped;
        this.updatePartitionLine(clamped);
        // Move the visible drag handle to track the new position too
        const dh = this.dragHandle as DragHandle | undefined;
        dh?.moveTo(clamped, false);
        log.drag('tap-place', { x: Math.round(clamped) });
      });
    }
  }

  private drawCircleShape(): void {
    const g = this.shapeGraphics;

    g.fillStyle(SKY_BG, 0.55);
    g.fillCircle(SHAPE_CX, SHAPE_CY, SHAPE_W / 2);
    g.lineStyle(3, 0x1e3a8a, 0.6);
    g.strokeCircle(SHAPE_CX, SHAPE_CY, SHAPE_W / 2);
  }

  /** T8: Draw a faint ghost line at the shape's midpoint after the first wrong answer. */
  private showGhostGuide(): void {
    this.ghostGuideGraphics?.destroy();
    this.ghostGuideLabel?.destroy();

    const g = this.add.graphics().setDepth(8).setAlpha(0.28);
    this.ghostGuideGraphics = g;
    g.lineStyle(3, NAVY, 1);

    const top = SHAPE_CY - SHAPE_H / 2;
    const bottom = SHAPE_CY + SHAPE_H / 2;
    const dashLen = 12;
    const gapLen = 8;
    const cycle = dashLen + gapLen;
    let pos = 0;
    const len = bottom - top;
    while (pos < len) {
      const seg = Math.min(dashLen, len - pos);
      g.lineBetween(SHAPE_CX, top + pos, SHAPE_CX, top + pos + seg);
      pos += cycle;
    }

    this.ghostGuideLabel = this.add
      .text(SHAPE_CX + SHAPE_W / 2 + 6, SHAPE_CY, 'half', {
        fontFamily: BODY_FONT,
        fontSize: '14px',
        color: NAVY_HEX,
      })
      .setOrigin(0, 0.5)
      .setAlpha(0.35)
      .setDepth(8);
  }

  /** T13: On correct partition, color-fill the two halves and show fraction labels. */
  private showCorrectFeedback(): void {
    sfx.playSnap();

    // Level 1 is always halves (2 partitions)
    const n = 2;
    const left = SHAPE_CX - SHAPE_W / 2;
    const top = SHAPE_CY - SHAPE_H / 2;
    const partW = SHAPE_W / n;
    const colors: number[] = [ACTION_FILL, SKY_BG];

    const fillG = this.add.graphics().setDepth(5).setAlpha(0);
    this.correctFillGraphics = fillG;

    for (let i = 0; i < n; i++) {
      fillG.fillStyle(colors[i % n]!, 0.45);
      fillG.fillRect(left + partW * i, top, partW, SHAPE_H);
    }

    this.tweens.add({
      targets: fillG,
      alpha: 1,
      duration: 350,
      ease: 'Sine.easeOut',
    });

    // Fraction labels scale in 200ms after fill begins
    this.time.delayedCall(200, () => {
      for (let i = 0; i < n; i++) {
        const lx = left + partW * i + partW / 2;
        const label = this.add
          .text(lx, SHAPE_CY, `1/${n}`, {
            fontFamily: TITLE_FONT,
            fontSize: '28px',
            color: NAVY_HEX,
          })
          .setOrigin(0.5)
          .setDepth(9)
          .setScale(0.5);
        this.fractionLabels.push(label);
        this.tweens.add({
          targets: label,
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          ease: 'Back.easeOut',
        });
      }
    });
  }

  /**
   * Draw the partition line as a solid navy line with a white inner highlight —
   * clearly visible against the sky-tinted shape background.
   */
  private updatePartitionLine(handleX: number): void {
    const g = this.partitionLine;
    g.clear();

    const top = SHAPE_CY - SHAPE_H / 2 - 20;
    const bottom = SHAPE_CY + SHAPE_H / 2 + 20;

    // T3 fix: solid navy line, 10px thick for clarity
    g.lineStyle(10, NAVY, 1);
    g.lineBetween(handleX, top, handleX, bottom);
  }

  // ── Drag handle creation ──────────────────────────────────────────────────

  private createDragHandle(): void {
    // Destroy previous handle if any
    (this.dragHandle as DragHandle | undefined)?.destroy();

    const minX = SHAPE_CX - SHAPE_W / 2;
    const maxX = SHAPE_CX + SHAPE_W / 2;
    const snapThreshold = SHAPE_W * this.currentSnapPct; // BKT-adaptive per session mastery

    // Only snap in axis mode per level-01.md §4.3
    const snapTargets = this.currentQuestion.snapMode === 'axis' ? [SHAPE_CX] : [];

    let dragStartPos = this.handlePos;

    this.dragHandle = new DragHandle({
      scene: this,
      x: this.handlePos,
      y: SHAPE_CY,
      trackLength: SHAPE_H + 40,
      axis: 'horizontal',
      minPos: minX,
      maxPos: maxX,
      snapThreshold,
      snapTargets,
      onMove: (pos) => {
        if (!this.inputLocked) {
          if (this.handlePos === dragStartPos) {
            log.drag('start', {
              fromX: dragStartPos,
              fromPct: Math.round(((dragStartPos - minX) / SHAPE_W) * 100),
            });
          }
          this.handlePos = pos;
          this.updatePartitionLine(pos);
        }
      },
      onCommit: (pos) => {
        const pct = Math.round(((pos - minX) / SHAPE_W) * 100);
        const snapped = snapTargets.some((t) => Math.abs(t - pos) < 1);
        log.drag('commit', {
          handleX: Math.round(pos),
          pct,
          snappedToCenter: snapped,
          movedFrom: Math.round(dragStartPos),
        });
        dragStartPos = pos;
        this.handlePos = pos;
        this.updatePartitionLine(pos);
      },
    });
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private async onSubmit(): Promise<void> {
    if (this.inputLocked) return;

    // per interaction-model.md §2.1 — disable input until outcome animation completes
    this.inputLocked = true;
    this.submitButtonContainer?.setAlpha(0.5);

    // Snap-on-submit: if handle is within snap range and snap is enabled for this
    // question, magnetize to center before validating. Recovers from input methods
    // that don't fire Phaser dragend events (some touch/test harnesses).
    if (this.currentQuestion.snapMode === 'axis') {
      const snapThreshold = SHAPE_W * this.currentSnapPct; // BKT-adaptive
      if (Math.abs(this.handlePos - SHAPE_CX) <= snapThreshold) {
        this.handlePos = SHAPE_CX;
        this.updatePartitionLine(SHAPE_CX);
      }
    }

    // Compute areas from handle position
    // Horizontal line splits rectangle by X position
    const leftArea = this.handlePos - (SHAPE_CX - SHAPE_W / 2);
    const rightArea = SHAPE_CX + SHAPE_W / 2 - this.handlePos;
    const relativeDelta = Math.abs(leftArea - rightArea) / ((leftArea + rightArea) / 2);
    log.valid('submit', {
      handleX: Math.round(this.handlePos),
      handlePct: Math.round(((this.handlePos - (SHAPE_CX - SHAPE_W / 2)) / SHAPE_W) * 100),
      leftArea: Math.round(leftArea),
      rightArea: Math.round(rightArea),
      relativeDelta: +relativeDelta.toFixed(4),
      tolerance: this.currentQuestion.areaTolerance,
      questionId: this.currentQuestion.id,
    });

    const input: PartitionInput = { regionAreas: [leftArea, rightArea] };
    const payload: PartitionPayload = {
      targetPartitions: 2,
      areaTolerance: this.currentQuestion.areaTolerance,
    };

    let result: ValidatorResult;

    try {
      if (this.templatePool.length > 0) {
        // Use validator registry with the template's validatorId
        // per runtime-architecture.md §4.2 (ValidatorRegistry)
        const { getValidatorEntry } = await import('../validators/registry');
        const reg = this.currentQuestion.validatorId
          ? getValidatorEntry(this.currentQuestion.validatorId)
          : undefined;
        // Fall back to direct partition validator if ID not found in registry
        if (reg) {
          result = reg.fn(input, payload);
        } else {
          const { partitionEqualAreas } = await import('../validators/partition');
          result = partitionEqualAreas.fn(input, payload);
        }
      } else {
        const { partitionEqualAreas } = await import('../validators/partition');
        result = partitionEqualAreas.fn(input, payload);
      }
    } catch (err) {
      // R18: Surface validator errors visibly for debugging
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Level01Scene] Validator threw:', errorMsg);
      log.error('VALID', 'crash', { err: errorMsg, templateId: this.currentQuestion.id });
      result = { outcome: 'incorrect', score: 0, feedback: 'validator_error' };
    }

    // Fix 7 (G-E4): measure elapsed time from question-load to submit
    const responseMs = Date.now() - this.questionStartTime;
    this.responseTimes.push(responseMs);
    this.totalQuestionsAttempted++;
    if (result.outcome === 'correct') {
      this.correctCount++;
    }

    log.valid('result', {
      outcome: result.outcome,
      score: result.score,
      feedback: result.feedback,
      responseMs,
      questionId: this.currentQuestion.id,
      attemptNumber: this.wrongCount + 1,
    });

    // C6: persist before showing feedback. If recordAttempt fails (quota,
    // schema), the user must not see "Correct!" on a never-recorded answer.
    // Mirrors LevelScene.ts:560-561.
    await withSpan(
      SPAN_NAMES.QUESTION.SUBMIT,
      {
        'question.archetype': 'partition',
        'question.outcome': result.outcome,
        'scene.level': 1,
      },
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
    const kind =
      result.outcome === 'correct'
        ? 'correct'
        : result.outcome === 'partial'
          ? 'close'
          : 'incorrect';

    // Update progress bar immediately on correct so tests can check aria-valuenow
    // before the feedback overlay is dismissed.
    if (kind === 'correct') {
      this.progressBar.setProgress(this.attemptCount + 1);
    }

    // Quest-voiced feedback per ux-elevation §9 T28. Pass the Quest line
    // through to FeedbackOverlay so the overlay reads from Quest's voice
    // catalog instead of its baked-in English defaults. close/partial has
    // no Quest line yet, so FeedbackOverlay falls back to its own default.
    const questText = this.questFeedbackText(kind);

    this.feedbackOverlay.show(
      kind,
      () => {
        this.inputLocked = false;
        this.submitButtonContainer?.setAlpha(1);
        if (kind === 'correct') {
          this.onCorrectAnswer();
        } else {
          this.onWrongAnswer();
        }
      },
      questText ?? undefined
    );

    // Mascot reacts after the overlay is visible
    if (kind === 'correct') {
      this.mascot?.setState('cheer');
      // T13: Flash color fill + fraction labels immediately on correct confirm
      this.showCorrectFeedback();
    } else if (kind === 'incorrect') {
      this.mascot?.setState('oops');
    }

    // Mirror the visible feedback to the screen-reader announcer so the
    // assistive-tech experience stays in Quest's voice when one is set.
    const announcement =
      questText ??
      (kind === 'correct'
        ? 'Correct! Great work.'
        : kind === 'close'
          ? 'Almost! Try a tiny adjustment.'
          : 'Not quite — try again.');
    // Speak feedback aloud via TTS — essential for K-2 readers who can't
    // reliably parse text. tts.speak() cancels any ongoing prompt narration.
    tts.speak(announcement);
    AccessibilityAnnouncer.announce(announcement);
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

    // T16: Quest streak microcopy (shown after FeedbackOverlay fades, ~1600ms delay)
    const streak = this.correctStreak;
    const streakLine =
      streak === 1
        ? 'Nice one!'
        : streak === 2
          ? "You've got this!"
          : streak >= 3
            ? 'On fire! 🔥'
            : null;
    if (streakLine) {
      this.time.delayedCall(1700, () => this.mascot?.showSpeechBubble(streakLine, 2000));
    }

    // T12: Streak milestone banner at exactly 3 or 5 consecutive correct
    if (streak === 3 || streak === 5) {
      this.time.delayedCall(1800, () => this.showStreakBanner(streak));
    }

    if (this.attemptCount >= SESSION_GOAL) {
      this.showSessionComplete();
    } else {
      // Advance to next question
      this.loadQuestion(this.questionIndex + 1);
    }
  }

  /** T12: Slide in a streak milestone banner from the top of the screen. */
  private showStreakBanner(streak: number): void {
    const bannerText = streak >= 5 ? 'UNSTOPPABLE! ⭐' : '3 in a row! 🔥';
    const bannerBg = streak >= 5 ? 0xffd700 : ACTION_FILL;

    const PILL_W = 520,
      PILL_H = 88,
      PILL_R = 44;
    const cx = CW / 2;
    const startY = -PILL_H;
    const landY = 140;

    const g = this.add.graphics().setDepth(90);
    g.fillStyle(bannerBg, 1);
    g.fillRoundedRect(cx - PILL_W / 2, startY - PILL_H / 2, PILL_W, PILL_H, PILL_R);
    g.lineStyle(3, NAVY, 0.4);
    g.strokeRoundedRect(cx - PILL_W / 2, startY - PILL_H / 2, PILL_W, PILL_H, PILL_R);

    const txt = this.add
      .text(cx, startY, bannerText, {
        fontFamily: TITLE_FONT,
        fontSize: '32px',
        color: NAVY_HEX,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(91);

    sfx.playStreak();
    this.mascot?.setState('cheer-big');

    const container = this.add.container(0, 0, [g, txt]).setDepth(90);

    this.tweens.add({
      targets: [g, txt],
      y: `+=${landY - startY}`,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1600, () => {
          this.tweens.add({
            targets: [g, txt],
            y: `-=${landY - startY}`,
            duration: 350,
            ease: 'Back.easeIn',
            onComplete: () => {
              container.destroy();
            },
          });
        });
      },
    });
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

    // T16: Quest wrong-answer microcopy
    if (this.wrongCount === 1) {
      this.time.delayedCall(1400, () => this.mascot?.showSpeechBubble('Oops! Try again 💪', 2000));
    } else if (this.wrongCount === 2) {
      this.time.delayedCall(1400, () =>
        this.mascot?.showSpeechBubble("Almost... I'll give you a hint!", 2000)
      );
    }

    // T8: Show ghost midpoint guide after first wrong attempt
    if (this.wrongCount === 1) {
      this.showGhostGuide();
    }

    // Auto-escalate hint after wrong attempt per interaction-model.md §4 + §5.4
    const tier = this.hintLadder.tierForAttemptCount(this.wrongCount);
    if (tier) {
      this.showHintForTier(tier);
    }

    // T7: Auto-hint after 3rd wrong answer — give feedback time before hint appears
    if (this.wrongCount === 3) {
      this.time.delayedCall(800, () => this.onHintRequest());
    }

    // per interaction-model.md §5.4 — after 3 wrong, auto-pulse hint button
    if (this.wrongCount >= 3) {
      this.pulseHintButton();
    }

    this.inputLocked = false;
  }

  // ── Hint handling ─────────────────────────────────────────────────────────

  private onHintRequest(): void {
    // Fix 3 (BUG-04): hintLadder.next() advances the index each call (capped at max tier).
    // The HintLadder class owns this logic; we just ensure we call next() once per press.
    const tier = this.hintLadder.next();
    const span = tracerService.startSpan(SPAN_NAMES.HINT.REQUEST, {
      'hint.tier': tier,
      'scene.level': 1,
      'question.archetype': 'partition',
    });
    try {
      log.hint('request', { tier, questionIndex: this.questionIndex, wrongCount: this.wrongCount });
      this.mascot?.setState('think');
      void this.showHintForTierAndRecord(tier);
    } finally {
      span.end();
    }
  }

  /**
   * Show hint text or visual overlay based on tier, then persist a HintEvent.
   * Fix 3 (BUG-04): hintLadder.next() increments on each call — tiers advance correctly.
   * Fix 6 (G-E3): records event to hintEventRepo and pushes the returned ID into
   *   currentQuestionHintIds so recordAttempt() can attach it.
   * per interaction-model.md §4 (3 tiers: verbal, visual_overlay, worked_example)
   */
  private async showHintForTierAndRecord(tier: import('@/types').HintTier): Promise<void> {
    this.hintText.setVisible(true);

    // T16: Quest hint microcopy (only once per question — on first hint shown)
    if (this.wrongCount <= 2) {
      this.mascot?.showSpeechBubble("Here's a secret... 🤫", 2000);
    }

    // Quest-voiced hint per ux-elevation §9 T28. Each tier shows a distinct
    // line from the catalog (split2.verbal / .visual / .worked) so language
    // escalates alongside the visual escalation already in place.
    const hintMessage = this.questHintText(tier);
    this.hintText.setText(hintMessage);
    // Speak the hint aloud — hint text is invisible to K-2 readers who can't
    // yet decode it. tts.speak() cancels any ongoing speech before starting.
    tts.speak(hintMessage);

    switch (tier) {
      case 'verbal':
        // Tier 1 — verbal prompt per interaction-model.md §4
        break;

      case 'visual_overlay':
        // Tier 2 — faint center line overlay per interaction-model.md §4
        this.drawCenterOverlay();
        break;

      case 'worked_example':
        // Tier 3 — animated demo per interaction-model.md §4
        // per interaction-model.md §4.1 — Tier 3 never auto-completes; canvas resets after demo
        this.animateWorkedExample();
        break;
    }
    log.hint('show', { tier, message: hintMessage, questionIndex: this.questionIndex });
    // Mirror hint text to DOM sentinel for tests
    TestHooks.setText('hint-text', hintMessage);

    // R3: Persist hint event and collect ID for linking after attempt is created.
    // The attemptId is added later via hintEventRepo.linkToAttempt() in recordAttempt().
    if (this.sessionId) {
      try {
        const { hintEventRepo } = await import('../persistence/repositories/hintEvent');
        const pointCost = tier === 'verbal' ? 5 : tier === 'visual_overlay' ? 15 : 30;
        const event = await hintEventRepo.record({
          // Note: attemptId will be filled in by linkToAttempt() after attempt persists (R3)
          attemptId: '' as unknown as import('@/types').AttemptId,
          hintId: `hint.partition.${tier}`,
          tier,
          shownAt: Date.now(),
          acceptedByStudent: true,
          pointCostApplied: pointCost,
          syncState: 'local',
        });
        if (event) {
          this.currentQuestionHintIds.push(event.id);
          log.hint('record_ok', { hintId: `hint.partition.${tier}`, pointCost, eventId: event.id });
        } else {
          log.warn('HINT', 'record_quota', { hintId: `hint.partition.${tier}` });
        }
      } catch (err) {
        log.warn('HINT', 'record_error', { error: String(err) });
      }
    }
  }

  /**
   * Thin synchronous wrapper used by auto-escalation in onWrongAnswer().
   * Delegates to the async version (fire-and-forget is fine for display path).
   */
  private showHintForTier(tier: import('@/types').HintTier): void {
    void this.showHintForTierAndRecord(tier);
  }

  /** Tier 2: faint dashed center-line overlay. per interaction-model.md §4 */
  private drawCenterOverlay(): void {
    const overlay = this.add.graphics().setDepth(8).setAlpha(0.4);
    overlay.lineStyle(3, NAVY, 1);
    overlay.lineBetween(
      SHAPE_CX,
      SHAPE_CY - SHAPE_H / 2 - 20,
      SHAPE_CX,
      SHAPE_CY + SHAPE_H / 2 + 20
    );
    // Fade out after 3 seconds
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 400,
        onComplete: () => overlay.destroy(),
      });
    });
  }

  /**
   * Tier 3: animate handle to center, then reset for student attempt.
   * per interaction-model.md §4 — Tier 3 never auto-completes; per §7 reduced motion = static overlay.
   * per design-language.md §6.1 (partition demonstration 400–600ms)
   */
  private animateWorkedExample(): void {
    const reduceMotion = checkReduceMotion();

    if (reduceMotion) {
      // per design-language.md §6.4 — static overlay
      this.drawCenterOverlay();
      // Reset handle position after a brief pause
      this.time.delayedCall(1200, () => {
        this.handlePos = SHAPE_CX;
        this.dragHandle.moveTo(SHAPE_CX, false);
        this.updatePartitionLine(SHAPE_CX);
      });
      return;
    }

    // Animate handle to correct center position
    this.inputLocked = true;
    this.dragHandle.moveTo(SHAPE_CX, true); // 500ms animation

    this.time.delayedCall(700, () => {
      // Brief pause showing correct position, then reset for student attempt
      this.time.delayedCall(800, () => {
        this.handlePos = SHAPE_CX + SHAPE_W * 0.3; // deliberately off-center
        this.dragHandle.moveTo(this.handlePos, false);
        this.updatePartitionLine(this.handlePos);
        this.inputLocked = false;
        this.hintText.setText('Now you try! Drag the line to the middle.');
      });
    });
  }

  /** One-time pulse on the hint button per interaction-model.md §5.4 */
  private pulseHintButton(): void {
    const reduceMotion = checkReduceMotion();
    if (reduceMotion) return;

    this.tweens.add({
      targets: this.hintButton,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      yoyo: true,
      repeat: 2,
    });
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

  /** Show "Session complete" card after SESSION_GOAL correct answers. per C9, interaction-model.md §6.2 */
  private async showSessionComplete(): Promise<void> {
    this.inputLocked = true;
    log.scene('session_complete', {
      attemptCount: this.attemptCount,
      correctCount: this.correctCount,
      totalAttempted: this.totalQuestionsAttempted,
      accuracy:
        this.totalQuestionsAttempted > 0
          ? +(this.correctCount / this.totalQuestionsAttempted).toFixed(3)
          : null,
      avgResponseMs:
        this.responseTimes.length > 0
          ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
          : null,
    });

    // Phase 2a (D-1): gate Level-2 unlock on correctCount/never-stuck/researcher
    const { evaluateUnlockGate } = await import('../lib/unlockGate');
    const gate = await evaluateUnlockGate({
      studentId: this.studentId,
      levelNumber: 1,
      correctCount: this.correctCount,
    });
    if (gate.passed) MenuScene.markLevelComplete(1, this.studentId);
    if (gate.passed) await this.persistLevelCompletion();

    // Adaptive router: write suggested next level (simplified for L1 — no mastery tracking)
    try {
      const { decideNextLevel } = await import('../engine/router');
      const inCalibration = !!(this.calibrationState && this.calibrationState.remaining > 0);
      const suggestedLevel = decideNextLevel({
        currentLevel: 1 as import('@/types').LevelId,
        masteries: new Map(),
        prereqsMet: false,
        inCalibration,
        recentOutcomes: this.recentOutcomes.slice(-5),
      });
      // sessionStorage is acceptable for this routing hint — it's not progress data (C5).
      const suggestKey = this.studentId ? `suggestedLevel:${this.studentId}` : 'suggestedLevel';
      sessionStorage.setItem(suggestKey, String(suggestedLevel));
    } catch (err) {
      log.warn('ROUT', 'decision_error', { error: String(err) });
    }

    // Quest-complete check: if all 9 levels are now done, show grand overlay
    const allDone = await this._allLevelsComplete();
    if (allDone) {
      const { QuestCompleteOverlay } = await import('../components/QuestCompleteOverlay');
      new QuestCompleteOverlay({
        scene: this,
        width: CW,
        height: CH,
        onPlayAgainFromStart: () => {
          fadeAndStart(this, 'LevelScene', { levelNumber: 1, studentId: this.studentId });
        },
        onMenu: () => {
          fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId });
        },
      });
      if (this.mascot) {
        this.mascot.setDepth(60);
        this.mascot.reposition(700, 250);
        this.mascot.setState('celebrate');
      }
      await this.closeSession();
      return;
    }

    // T11: Scaffold rec; gate failure forces 'stay' (B2: no Level 0 to regress to).
    const total = this.totalQuestionsAttempted;
    const advance = gate.passed && total > 0 && this.correctCount / total >= 0.8;
    const scaffoldRec: 'advance' | 'stay' = advance ? 'advance' : 'stay';
    const isPerfect = gate.passed && this.correctCount >= SESSION_GOAL && total === SESSION_GOAL;

    new SessionCompleteOverlay({
      scene: this,
      levelNumber: 1,
      correctCount: this.correctCount,
      totalAttempts: this.totalQuestionsAttempted,
      width: CW,
      height: CH,
      scaffoldRecommendation: scaffoldRec,
      nextLevelNumber: scaffoldRec === 'advance' ? 2 : null,
      isPerfect,
      ...(gate.passed
        ? { onNextLevel: () => fadeAndStart(this, 'LevelScene', { levelNumber: 2, studentId: this.studentId }) } // prettier-ignore
        : {}),
      onPlayAgain: () => fadeAndStart(this, 'Level01Scene', { studentId: this.studentId }),
      onMenu: () =>
        fadeAndStart(this, 'LevelMapScene', {
          studentId: this.studentId,
          postSession: true,
          levelNumber: 1,
          completedScore: this.correctCount,
        }),
    });

    // T16: Quest session-complete speech line
    let completeLine = 'Great practice! Keep going!';
    if (!gate.passed) completeLine = "Let's practice a little more!";
    else if (advance) completeLine = 'I knew you could do it! ⭐';
    this.time.delayedCall(800, () => this.mascot?.showSpeechBubble(completeLine, 3000));

    if (this.mascot) {
      this.mascot.setDepth(60);
      this.mascot.reposition(700, 250);
      this.mascot.setState(gate.passed ? 'cheer-big' : 'idle');
    }

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

  /**
   * Keyboard/screen-reader nudge: move the partition line by `delta` logical px.
   * Clamps to shape bounds and updates the visible drag handle.
   */
  private _a11yNudge(delta: number): void {
    if (this.inputLocked) return;
    const minX = SHAPE_CX - SHAPE_W / 2;
    const maxX = SHAPE_CX + SHAPE_W / 2;
    const next = Phaser.Math.Clamp(this.handlePos + delta, minX, maxX);
    this.handlePos = next;
    this.updatePartitionLine(next);
    (this.dragHandle as DragHandle | undefined)?.moveTo(next, false);
    const pct = Math.round(((next - minX) / SHAPE_W) * 100);
    A11yLayer.announce(`Partition at ${pct} percent across.`);
  }

  // Called by Phaser when scene is shut down
  preDestroy(): void {
    this.time.removeAllEvents();
    log.scene('destroy');
    // R7: destroy all managed components to prevent memory leaks and dangling listeners.
    // Phaser auto-destroys child display objects, but custom classes that hold tweens,
    // timers, or DOM listeners (Mascot idleTween, FeedbackOverlay dismissTimer, etc.)
    // require explicit cleanup. killAll() catches any tween still in flight (worked-
    // example overlay, hint pulse, badge bounce) when the scene shuts down.
    this.tweens.killAll();
    this.feedbackOverlay?.destroy();
    this.dragHandle?.destroy();
    this.progressBar?.destroy();
    this.hintLadder?.reset?.();
    this.mascot?.destroy();
    this.hintButton?.destroy();
    this.submitButtonContainer?.destroy();
    AccessibilityAnnouncer.destroy();
    TestHooks.unmountAll();
    A11yLayer.unmountAll();
    this.tapZone?.destroy();
    this.tapZone = null;
  }
}
