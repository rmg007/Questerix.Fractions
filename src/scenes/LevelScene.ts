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
  createHintCircleButton,
  HINT_TEXT_STYLE,
  TITLE_FONT,
  BODY_FONT,
  NAVY_HEX,
  NAVY,
  SKY_BG,
  PATH_BLUE,
  OPTION_BG,
  ACTION_FILL,
} from './utils/levelTheme';
import { TestHooks } from './utils/TestHooks';
import { A11yLayer } from '../components/A11yLayer';
import { FeedbackOverlay, type FeedbackKind } from '../components/FeedbackOverlay';
import { SessionCompleteOverlay } from '../components/SessionCompleteOverlay';
import { HintLadder } from '../components/HintLadder';
import { ProgressBar } from '../components/ProgressBar';
import { AccessibilityAnnouncer } from '../components/AccessibilityAnnouncer';
import { getInteractionForArchetype } from './utils/levelRouter';
import type { Interaction } from './interactions/types';
import type { QuestionTemplate, ValidatorResult } from '@/types';
import { MenuScene } from './MenuScene';
import { tts } from '../audio/TTSService';
import { sfx } from '../audio/SFXService';
import { log } from '../lib/log';
import { Mascot } from '../components/Mascot';
// Quest microcopy catalog (registered at boot via src/main.ts).
// Per ux-elevation §9 T28 — the level screen routes its hint, feedback,
// and session-complete copy through `getCopy('quest.…')` so Quest's voice
// stays consistent and localizable without scene-side string literals.
import { get as getCopy } from '../lib/i18n/catalog';
import { fadeAndStart } from './utils/sceneTransition';
import { checkReduceMotion } from '../lib/preferences';
import { getLastCurriculumLoadFailure, clearLastCurriculumLoadFailure } from '../curriculum/loader';
import { withSpan } from '../lib/observability/withSpan';
import { tracerService } from '../lib/observability/tracer';
import { SPAN_NAMES } from '../lib/observability/span-names';

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
  private latestMasteryEstimate: number = 0;
  private questionStartTime: number = 0;
  private currentRoundEvents: import('@/types').ProgressionEvent[] = [];

  // Fix G-E3: hint events linked to attempt records (Dexie auto-increment numbers)
  private currentQuestionHintIds: number[] = [];

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
    this.latestMasteryEstimate = 0;
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

  /**
   * Render a non-blocking toast informing the player that this level isn't
   * available offline. Auto-dismisses to MenuScene after ~3.5s. No existing
   * toast component lives in `src/components/` yet, so we paint the panel
   * directly with Phaser primitives — keeps the diff small while still
   * giving a clear, kid-friendly affordance.
   */
  private showOfflineCurriculumToast(): void {
    const cx = CW / 2;
    const cy = CH / 2;
    const TOAST_DEPTH = 2000;
    const message = "This level isn't available offline yet — please connect to download";

    const panel = this.add
      .rectangle(cx, cy, CW - 80, 220, NAVY, 0.94)
      .setDepth(TOAST_DEPTH)
      .setStrokeStyle(3, PATH_BLUE, 1);

    const text = this.add
      .text(cx, cy, message, {
        fontSize: '24px',
        fontFamily: BODY_FONT,
        color: '#FFFFFF',
        align: 'center',
        wordWrap: { width: CW - 140 },
      })
      .setOrigin(0.5)
      .setDepth(TOAST_DEPTH + 1);

    // Test sentinel + a11y mirror so screen readers and Playwright pick it up.
    TestHooks.mountSentinel('offline-curriculum-toast');
    TestHooks.setText('offline-curriculum-toast', message);

    const dismiss = (): void => {
      panel.destroy();
      text.destroy();
      TestHooks.unmount('offline-curriculum-toast');
      fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId });
    };

    this.time.delayedCall(3500, dismiss);
  }

  // ── Template loading ────────────────────────────────────────────────────────

  private async loadTemplates(): Promise<void> {
    log.tmpl('load_start', { level: this.levelNumber });
    try {
      const { questionTemplateRepo } = await import('../persistence/repositories/questionTemplate');
      const all = await questionTemplateRepo.getByLevel(
        this.levelNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
      );
      log.tmpl('dexie_raw', {
        level: this.levelNumber,
        totalReturned: all.length,
        archetypes: [...new Set(all.map((t) => t.archetype))],
      });
      // Deduplicate by archetype rotation: pick up to SESSION_GOAL distinct templates
      const seen = new Set<string>();
      const picked: QuestionTemplate[] = [];
      for (const t of all) {
        if (!seen.has(t.id) && picked.length < SESSION_GOAL) {
          seen.add(t.id);
          picked.push(t);
        }
      }
      this.templatePool = picked;
      if (this.templatePool.length > 0) {
        log.tmpl('load_ok', {
          level: this.levelNumber,
          count: this.templatePool.length,
          ids: this.templatePool.map((t) => t.id),
          archetypes: [...new Set(this.templatePool.map((t) => t.archetype))],
        });
      } else {
        log.tmpl('load_empty', { level: this.levelNumber, fallback: 'synthetic' });
      }
    } catch (err) {
      log.warn('TMPL', 'load_error', {
        level: this.levelNumber,
        error: String(err),
        fallback: 'synthetic',
      });
      this.templatePool = [];
    }
  }

  // ── Question loading ─────────────────────────────────────────────────────────

  private loadQuestion(index: number): void {
    this.questionIndex = index;
    this.wrongCount = 0;
    this.inputLocked = false;
    this.lastPayload = null;
    this.currentQuestionHintIds = [];
    this.currentRoundEvents = [];

    // Ensure chrome submit button is visible at start of each question.
    // Interaction mount might hide it (e.g. for 'identify' archetype).
    this.submitButtonContainer?.setVisible(true);

    // Unmount previous interaction
    this.activeInteraction?.unmount();
    this.activeInteraction = null;

    // Pick template
    if (this.templatePool.length > 0) {
      this.currentTemplate = this.templatePool[index % this.templatePool.length]!;
    } else {
      // Synthetic fallback for partition archetype (keeps game playable)
      this.currentTemplate = this.makeFallbackTemplate();
    }

    this.hintLadder = new HintLadder(this.currentTemplate.difficultyTier);
    this.hintTextGO.setVisible(false);
    this.promptText.setText(this.currentTemplate.prompt.text);
    this.questionCounterText.setText(`${index + 1} / ${SESSION_GOAL}`);
    this.animateCounterBadge();
    log.q('load', {
      index,
      id: this.currentTemplate.id,
      archetype: this.currentTemplate.archetype,
      tier: this.currentTemplate.difficultyTier,
      prompt: this.currentTemplate.prompt.text,
      validatorId: this.currentTemplate.validatorId,
      source: this.templatePool.length > 0 ? 'dexie' : 'synthetic',
    });

    // T4: speak prompt aloud via TTS — gated only by ttsEnabled preference
    // (already loaded into TTSService.setEnabled() in create()). No reduceMotion gate.
    tts.speak(this.currentTemplate.prompt.text);

    // Announce question to assistive tech (separate from audio TTS)
    A11yLayer.announce(
      `Level ${this.levelNumber}, question ${index + 1} of ${SESSION_GOAL}. ${this.currentTemplate.prompt.text}`
    );

    // Fix G-E4: record when this question started for response-time tracking
    this.questionStartTime = Date.now();

    // Instantiate and mount interaction
    const interaction = getInteractionForArchetype(
      this.currentTemplate.archetype,
      this.currentTemplate.validatorId
    );
    this.activeInteraction = interaction;
    interaction.mount({
      scene: this,
      template: this.currentTemplate,
      centerX: CW / 2,
      centerY: CH / 2 - 80,
      width: CW,
      height: CH,
      onCommit: (payload) => void this.onCommit(payload),
      pushEvent: (event) => this.currentRoundEvents.push(event),
    });

    // Fix duplicate button: IdentifyInteraction renders its own internal "Check" button.
    this.submitButtonContainer?.setVisible(this.currentTemplate?.archetype !== 'identify');

    // T14: Reset & restart idle escalation timer for this question.
    this.mascot?.startIdleTimer();

    // T16: Quest microcopy at question-load moments
    if (index === 0) {
      this.time.delayedCall(600, () => this.mascot?.showSpeechBubble('Ready? Let\'s go! 🚀', 2000));
    } else if (index === SESSION_GOAL - 1) {
      this.time.delayedCall(400, () => this.mascot?.showSpeechBubble('Last one! You\'ve got this!', 2000));
    }
  }

  private static readonly LEVEL_FALLBACK_OVERRIDES: Record<
    number,
    {
      archetype: import('@/types').ArchetypeId;
      payload: any;
      validatorId: import('@/types').ValidatorId;
      prompt: string;
    }
  > = {
    1: {
      archetype: 'partition',
      payload: {
        shapeType: 'rectangle',
        targetPartitions: 2,
        snapMode: 'axis',
        areaTolerance: 0.05,
      },
      validatorId: 'validator.partition.equalAreas' as import('@/types').ValidatorId,
      prompt: 'Cut the shape into 2 equal parts.',
    },
    2: {
      archetype: 'partition',
      payload: {
        shapeType: 'rectangle',
        targetPartitions: 3,
        snapMode: 'free',
        areaTolerance: 0.08,
      },
      validatorId: 'validator.partition.equalAreas' as import('@/types').ValidatorId,
      prompt: 'Cut the shape into 3 equal parts.',
    },
    3: {
      archetype: 'equal_or_not',
      payload: {
        partitionLines: [
          [
            [0.5, 0],
            [0.5, 1],
          ],
        ],
      },
      validatorId: 'validator.equal_or_not.areaTolerance' as import('@/types').ValidatorId,
      prompt: 'Are these two parts equal?',
    },
  };

  private makeFallbackTemplate(): QuestionTemplate {
    const override = LevelScene.LEVEL_FALLBACK_OVERRIDES[this.levelNumber];

    if (override) {
      return {
        id: `q:ph:L${this.levelNumber}:fallback` as import('@/types').QuestionTemplateId,
        archetype: override.archetype,
        prompt: { text: override.prompt, ttsKey: '' },
        payload: override.payload,
        correctAnswer: override.archetype === 'equal_or_not' ? true : null,
        validatorId: override.validatorId,
        skillIds: [],
        misconceptionTraps: [],
        difficultyTier: 'easy',
      };
    }

    return {
      id: `q:ph:L${this.levelNumber}:fallback` as import('@/types').QuestionTemplateId,
      archetype: 'partition',
      prompt: { text: 'Cut this shape into two equal parts.', ttsKey: '' },
      payload: {
        shapeType: 'rectangle',
        targetPartitions: 2,
        snapMode: 'axis',
        areaTolerance: 0.05,
      },
      correctAnswer: null,
      validatorId: 'validator.partition.equalAreas' as import('@/types').ValidatorId,
      skillIds: [],
      misconceptionTraps: [],
      difficultyTier: 'easy',
    };
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
    this.hintButton = createHintCircleButton(
      this,
      CW - 60,
      270,
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
    this.submitButtonContainer = createActionButton(
      this,
      CW / 2,
      CH - 180,
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

  /**
   * Called by interactions via onCommit.
   * Also used by the submit button which re-triggers with last payload.
   */
  private lastPayload: unknown = null;

  private async onCommit(payload: unknown): Promise<void> {
    if (this.inputLocked) return;
    log.input('interaction_commit', {
      level: this.levelNumber,
      archetype: this.currentTemplate?.archetype,
      payload,
    });
    this.lastPayload = payload;
    await this.onSubmit();
  }

  private async onSubmit(): Promise<void> {
    if (this.inputLocked || this.lastPayload === null) return;
    this.inputLocked = true;
    this.submitButtonContainer?.setAlpha(0.5);

    log.valid('submit', {
      level: this.levelNumber,
      questionId: this.currentTemplate.id,
      archetype: this.currentTemplate.archetype,
      validatorId: this.currentTemplate.validatorId,
      payload: this.lastPayload,
    });

    const startedAt = Date.now();
    let result: ValidatorResult;

    try {
      const { getValidator } = await import('../validators/registry');
      const validator = getValidator(this.currentTemplate.validatorId);
      if (validator) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = (validator as { fn: (i: any, p: any) => ValidatorResult }).fn(
          this.lastPayload,
          this.currentTemplate.payload
        );
      } else {
        // Fallback: partition validator
        const { partitionEqualAreas } = await import('../validators/partition');
        result = partitionEqualAreas.fn(
          this.lastPayload as import('../validators/partition').PartitionInput,
          this.currentTemplate.payload as import('../validators/partition').PartitionPayload
        );
      }
    } catch (err) {
      log.error('VALID', 'validator_error', {
        error: String(err),
        questionId: this.currentTemplate.id,
      });
      result = { outcome: 'incorrect', score: 0, feedback: 'validator_error' };
    }

    const responseMs = Date.now() - startedAt;
    const totalResponseMs = Date.now() - this.questionStartTime;
    this.responseTimes.push(totalResponseMs);

    log.valid('result', {
      outcome: result.outcome,
      score: result.score,
      feedback: result.feedback,
      validatorMs: responseMs,
      totalResponseMs,
      questionId: this.currentTemplate.id,
      attemptNumber: this.wrongCount + 1,
    });

    await withSpan(
      SPAN_NAMES.QUESTION.SUBMIT,
      {
        'question.archetype': this.currentTemplate.archetype,
        'question.outcome': result.outcome,
        'scene.level': this.levelNumber,
      },
      () => this.recordAttempt(result, responseMs)
    );
    this.showOutcome(result);
  }

  private showOutcome(result: ValidatorResult): void {
    const kind =
      result.outcome === 'correct'
        ? 'correct'
        : result.outcome === 'partial'
          ? 'close'
          : 'incorrect';

    if (kind === 'correct') {
      this.progressBar.setProgress(this.attemptCount + 1);
    }

    // Quest-voiced feedback per ux-elevation §9 T28. The catalog only
    // ships Quest copy for `correct` and `incorrect`; `close` (partial)
    // has no Quest line yet so we let FeedbackOverlay fall back to its
    // baked-in default ("Almost! Adjust a little.").
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
      // T13: Trigger color-fill + fraction labels on partition shape
      this.activeInteraction?.showCorrectFeedback?.();
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
    AccessibilityAnnouncer.announce(announcement);
  }

  /**
   * Quest-voiced feedback for the outcome. correct picks the denominator-
   * named line (halves/thirds/fourths, else equal); incorrect switches on
   * archetype (like questHintText) so Quest speaks to what the question
   * actually asked. null for partial/close outcomes.
   */
  private questFeedbackText(kind: FeedbackKind): string | null {
    if (kind === 'correct') {
      const d = this.payloadDenominator();
      switch (d) {
        case 2:
          return getCopy('quest.feedback.correct.half');
        case 3:
          return getCopy('quest.feedback.correct.third');
        case 4:
          return getCopy('quest.feedback.correct.fourth');
        default:
          return getCopy('quest.feedback.correct.equal');
      }
    }
    if (kind === 'incorrect') {
      const archetype = this.currentTemplate?.archetype as string | undefined;
      switch (archetype) {
        case 'equal_or_not':
        case 'compare':
        case 'order':
        case 'benchmark':
        case 'label':
        case 'make':
        case 'snap_match':
          try {
            return getCopy(`quest.feedback.wrong.${archetype}`);
          } catch {
            return getCopy('quest.feedback.wrong.unequal');
          }
        default:
          return getCopy('quest.feedback.wrong.unequal');
      }
    }
    return null;
  }

  /**
   * Quest-voiced hint for archetype + tier, or null to let the caller's
   * strategy-tier fallback run. partition is denominator-shaped; other
   * archetypes use .verbal/.visual/.worked to mirror HintLadder's three
   * tiers. See src/lib/i18n/keys/quest.ts.
   */
  private questHintText(archetype: string, tier: import('@/types').HintTier): string | null {
    // partition is denominator-shaped (the hint *is* "I can split this in N").
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
    // verbal / visual_overlay / worked_example → .verbal / .visual / .worked
    const suffix = tier === 'verbal' ? 'verbal' : tier === 'visual_overlay' ? 'visual' : 'worked';
    switch (archetype) {
      case 'equal_or_not':
      case 'compare':
      case 'order':
      case 'benchmark':
      case 'label':
      case 'make':
      case 'snap_match':
        // Dynamic key — guard runtime miss so a stray catalog edit can't
        // crash the level screen. Caller falls back to strategy-tier copy.
        try {
          return getCopy(`quest.hint.${archetype}.${suffix}`);
        } catch {
          return null;
        }
      default:
        return null;
    }
  }

  /**
   * Best-effort denominator extraction from the current question template's
   * payload. Walks the field names actually used by current payloads —
   * partition templates carry `targetPartitions` (see
   * `src/validators/partition.ts`), other archetypes vary. Listing the
   * exhaustive set here keeps the lookup robust without coupling LevelScene
   * to per-archetype payload schemas.
   */
  private payloadDenominator(): number | null {
    const payload = this.currentTemplate?.payload as Record<string, unknown> | undefined;
    if (!payload) return null;
    for (const key of ['targetPartitions', 'targetParts', 'denominator', 'parts', 'totalParts']) {
      const v = payload[key];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
    }
    return null;
  }

  private onCorrectAnswer(): void {
    // T13: flash color fill + fraction labels on the shape for partition questions
    this.activeInteraction?.showCorrectFeedback?.();

    this.attemptCount++;
    this.correctCount++; // Fix G-E4: track correct answers separately
    this.correctStreak++;
    this.progressBar.setProgress(this.attemptCount);
    this.lastPayload = null;
    log.q('correct', {
      level: this.levelNumber,
      questionIndex: this.questionIndex,
      attemptCount: this.attemptCount,
      progress: `${this.attemptCount}/${SESSION_GOAL}`,
      wrongCountThisQ: this.wrongCount,
    });

    // T16: Quest streak microcopy (after FeedbackOverlay fades ~1600ms)
    const streak = this.correctStreak;
    const streakLine =
      streak === 1 ? 'Nice one!' : streak === 2 ? "You've got this!" : streak >= 3 ? 'On fire! 🔥' : null;
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
      this.loadQuestion(this.questionIndex + 1);
    }
  }

  /** T12: Slide a streak milestone banner in from the top of the screen. */
  private showStreakBanner(streak: number): void {
    const bannerText = streak >= 5 ? 'UNSTOPPABLE! ⭐' : '3 in a row! 🔥';
    const bannerBg = streak >= 5 ? 0xffd700 : ACTION_FILL;

    const PILL_W = 520, PILL_H = 88, PILL_R = 44;
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
    this.correctStreak = 0;
    this.wrongCount++;
    this.inputLocked = false;
    this.lastPayload = null;
    log.q('wrong', {
      level: this.levelNumber,
      questionIndex: this.questionIndex,
      wrongCount: this.wrongCount,
      questionId: this.currentTemplate.id,
    });

    // T16: Quest wrong-answer microcopy
    if (this.wrongCount === 1) {
      this.time.delayedCall(1400, () => this.mascot?.showSpeechBubble('Oops! Try again 💪', 2000));
    } else if (this.wrongCount === 2) {
      this.time.delayedCall(1400, () =>
        this.mascot?.showSpeechBubble("Almost... I'll give you a hint!", 2000)
      );
    }

    // T8: show ghost midpoint guide after first wrong attempt on partition questions
    if (this.wrongCount === 1) {
      this.activeInteraction?.showGhostGuide?.();
    }

    const tier = this.hintLadder.tierForAttemptCount(this.wrongCount);
    if (tier) {
      this.showHintForTier(tier);
    }
    if (this.wrongCount >= 3) {
      this.pulseHintButton();
    }
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
    // T16: Quest hint microcopy (only on first/second hint shown per question)
    if (this.wrongCount <= 2) {
      this.mascot?.showSpeechBubble('Here\'s a secret... 🤫', 2000);
    }

    const archetype = this.currentTemplate?.archetype ?? 'partition';
    let msg = '';

    // Quest-voiced hint per ux-elevation §9 T28. The catalog ships hint
    // copy for every level-router archetype today (partition uses
    // split2/3/4; the other seven — equal_or_not, compare, order,
    // benchmark, label, make, snap_match — have verbal/visual/worked
    // tiers). The strategy-tiered fallback below remains the safety net
    // for any future archetype that hasn't been Quest-voiced yet.
    const questMsg = this.questHintText(archetype, tier);
    if (questMsg !== null) {
      msg = questMsg;
    }

    // Fallback: questHintText returned null (unknown archetype or partition
    // with unsupported denominator). Route through generic catalog keys so
    // all displayed hints come from Quest's voice.
    if (msg === '') {
      const suffix = tier === 'verbal' ? 'verbal' : tier === 'visual_overlay' ? 'visual' : 'worked';
      try {
        msg = getCopy(`quest.hint.fallback.${suffix}`);
      } catch {
        // Catalog unavailable (e.g. test teardown reset) — use the stable
        // safe key so no player-facing text is a hardcoded literal.
        log.warn('HINT', 'fallback_catalog_miss', { tier, archetype });
        msg = getCopy('quest.hint.fallback.safe');
      }
    }

    this.hintTextGO.setText(msg);
    this.hintTextGO.setVisible(true);
    TestHooks.setText('hint-text', msg);
    log.hint('show', { tier, message: msg, level: this.levelNumber, archetype });

    if (tier === 'visual_overlay') {
      this.activeInteraction?.showVisualOverlay?.();
    }

    // C7.8: Record hint event with score penalty per interaction-model.md §4.1
    // Penalty: 5 pts (T1), 15 pts (T2), 30 pts (T3)
    if (this.sessionId) {
      try {
        const { hintEventRepo } = await import('../persistence/repositories/hintEvent');
        const pointCost = tier === 'verbal' ? 5 : tier === 'visual_overlay' ? 15 : 30;
        const ev = await hintEventRepo.record({
          attemptId: '' as unknown as import('@/types').AttemptId, // Will be linked post-submission
          hintId: `hint.${this.currentTemplate.archetype}.${tier}`,
          tier,
          shownAt: Date.now(),
          acceptedByStudent: true,
          pointCostApplied: pointCost,
          syncState: 'local',
        });
        if (ev?.id) this.currentQuestionHintIds.push(ev.id);
      } catch (err) {
        console.warn('[LevelScene] Could not record hint event:', err);
      }
    }
  }

  private pulseHintButton(): void {
    if (checkReduceMotion()) return;
    this.tweens.add({
      targets: this.hintButton,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      yoyo: true,
      repeat: 2,
    });
  }

  // ── Persistence ──────────────────────────────────────────────────────────────

  private async openSession(): Promise<void> {
    if (!this.studentId) return;
    try {
      // C7.5-C7.6: Record lastUsedStudentId for session resumption
      const { lastUsedStudent } = await import('../persistence/lastUsedStudent');
      lastUsedStudent.set(this.studentId as import('@/types').StudentId);

      // Resolve the Quest-facing display name once, here, before any
      // gameplay can fire `showSessionComplete()`. Failures are non-fatal —
      // `resolveQuestName(null)` falls back to "friend" at render time.
      try {
        const { studentRepo } = await import('../persistence/repositories/student');
        const student = await studentRepo.get(this.studentId as import('@/types').StudentId);
        this.studentDisplayName = student?.displayName ?? null;
      } catch (err) {
        log.warn('SESS', 'displayname_lookup_error', { error: String(err) });
        this.studentDisplayName = null;
      }

      const { sessionRepo } = await import('../persistence/repositories/session');
      const id = crypto.randomUUID() as import('@/types').SessionId;
      const session = await sessionRepo.create({
        id,
        studentId: this.studentId as import('@/types').StudentId,
        activityId: `level_${this.levelNumber}` as import('@/types').ActivityId,
        levelNumber: this.levelNumber,
        scaffoldLevel: 1,
        startedAt: Date.now(),
        endedAt: null,
        totalAttempts: 0,
        correctAttempts: 0,
        accuracy: null,
        avgResponseMs: null,
        xpEarned: 0,
        scaffoldRecommendation: null,
        endLevel: this.levelNumber,
        device: {
          type: 'unknown',
          viewport: { width: window.innerWidth, height: window.innerHeight },
        },
        syncState: 'local',
      });
      if (session) {
        this.sessionId = session.id;
        log.sess('open_ok', {
          sessionId: this.sessionId,
          level: this.levelNumber,
          activityId: `level_${this.levelNumber}`,
        });
      } else {
        // Quota exceeded — volatile mode, session not persisted
        log.warn('SESS', 'open_quota', { level: this.levelNumber });
      }
    } catch (err) {
      log.warn('SESS', 'open_error', { level: this.levelNumber, error: String(err) });
    }
  }

  private async recordAttempt(result: ValidatorResult, responseMs: number): Promise<void> {
    if (!this.studentId || !this.sessionId) return;

    const studentIdTyped = this.studentId as import('@/types').StudentId;
    const sessionIdTyped = this.sessionId as import('@/types').SessionId;

    // Phase 6.3: wrap attempt + mastery in a single Dexie transaction so
    // partial state (attempt persisted but mastery not updated, or vice versa)
    // is impossible. Misconception detection stays separate / best-effort —
    // detector failures must not roll back the attempt itself.
    try {
      const { db } = await import('../persistence/db');
      const { attemptRepo } = await import('../persistence/repositories/attempt');
      const { skillMasteryRepo } = await import('../persistence/repositories/skillMastery');
      const { updateMastery, DEFAULT_PRIORS, MASTERY_THRESHOLD } = await import('../engine/bkt');

      const outcome: import('@/types').AttemptOutcome =
        result.outcome === 'correct' ? 'EXACT' : result.outcome === 'partial' ? 'CLOSE' : 'WRONG';
      const attemptId = crypto.randomUUID() as import('@/types').AttemptId;
      const isCorrect = result.outcome === 'correct';
      const skillIds = this.currentTemplate.skillIds ?? [];
      const skillId = (skillIds[0] ??
        `skill.level_${this.levelNumber}`) as import('@/types').SkillId;

      log.atmp('record_start', {
        attemptId,
        outcome,
        responseMs,
        questionId: this.currentTemplate.id,
        hintsUsed: this.currentQuestionHintIds.length,
      });

      await db.transaction('rw', [db.attempts, db.skillMastery], async () => {
        await attemptRepo.record({
          id: attemptId,
          sessionId: sessionIdTyped,
          studentId: studentIdTyped,
          questionTemplateId: this.currentTemplate.id,
          archetype: this.currentTemplate.archetype,
          roundNumber: this.questionIndex + 1,
          attemptNumber: Math.min(this.wrongCount + 1, 4) as 1 | 2 | 3 | 4,
          startedAt: Date.now() - responseMs,
          submittedAt: Date.now(),
          responseMs,
          studentAnswerRaw: this.lastPayload,
          correctAnswerRaw: null,
          outcome,
          errorMagnitude: null,
          pointsEarned: result.score,
          hintsUsedIds: [...this.currentQuestionHintIds],
          hintsUsed: [],
          roundEvents: [...this.currentRoundEvents],
          flaggedMisconceptionIds: [],
          validatorPayload: result,
          syncState: 'local',
        });

        // Fix G-E1: update BKT mastery after every attempt — same transaction
        // as the attempt write so they are atomic.
        const existing = await skillMasteryRepo.get(studentIdTyped, skillId);
        const prev: import('@/types').SkillMastery = existing ?? {
          studentId: studentIdTyped,
          skillId,
          compositeKey: [studentIdTyped, skillId],
          masteryEstimate: DEFAULT_PRIORS.pInit,
          state: 'NOT_STARTED',
          consecutiveCorrectUnassisted: 0,
          totalAttempts: 0,
          correctAttempts: 0,
          lastAttemptAt: Date.now(),
          masteredAt: null,
          decayedAt: null,
          syncState: 'local',
        };
        const updated = updateMastery(prev, isCorrect);
        const withMeta: import('@/types').SkillMastery = {
          ...updated,
          compositeKey: [studentIdTyped, skillId],
          lastAttemptAt: Date.now(),
          masteredAt:
            updated.masteryEstimate >= MASTERY_THRESHOLD && !prev.masteredAt
              ? Date.now()
              : (prev.masteredAt ?? null),
          decayedAt: prev.decayedAt ?? null,
          syncState: 'local',
        };
        log.bkt('mastery_update', {
          skill: skillId,
          isCorrect,
          prevEstimate: +prev.masteryEstimate.toFixed(4),
          nextEstimate: +withMeta.masteryEstimate.toFixed(4),
          state: withMeta.state,
          totalAttempts: withMeta.totalAttempts,
          correctAttempts: withMeta.correctAttempts,
          justMastered: !!withMeta.masteredAt && !prev.masteredAt,
        });
        await skillMasteryRepo.upsert(withMeta);
        this.latestMasteryEstimate = withMeta.masteryEstimate;
      });
    } catch (err) {
      // Transaction rolled back. Don't run detectors on a non-durable attempt.
      log.error('ATMP', 'record_failed', { error: String(err) });
      return;
    }

    // C7.2: Run misconception detectors and upsert flags. Best-effort —
    // detector failures must not roll back the attempt+mastery transaction
    // above (per Phase 6.3 design). Wrapped in its own transaction so the
    // flag writes are atomic with each other.
    try {
      const { db } = await import('../persistence/db');
      const { attemptRepo } = await import('../persistence/repositories/attempt');
      const recentAttempts = await attemptRepo.listForStudent(
        this.studentId as import('@/types').StudentId
      );
      // Limit to recent 10 for performance
      const limitedAttempts = recentAttempts.slice(-10);
      const { runAllDetectors } = await import('../engine/misconceptionDetectors');
      const { SystemClock, CryptoUuidGenerator, ConsoleEngineLogger } =
        await import('../lib/adapters');
      const flags = await runAllDetectors(limitedAttempts, this.levelNumber, {
        clock: SystemClock,
        ids: CryptoUuidGenerator,
        logger: ConsoleEngineLogger,
      });

      if (flags.length > 0) {
        const { misconceptionFlagRepo } =
          await import('../persistence/repositories/misconceptionFlag');
        await db.transaction('rw', [db.misconceptionFlags], async () => {
          for (const flag of flags) {
            await misconceptionFlagRepo.upsert(flag);
          }
        });
        log.misc('flags_detected', {
          count: flags.length,
          ids: flags.map((f) => f.misconceptionId),
        });
      }
    } catch (err) {
      log.warn('MISC', 'detection_error', { error: String(err) });
    }
  }

  // ── Session complete ─────────────────────────────────────────────────────────

  private showSessionComplete(): void {
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

    // Persist level completion so the next level unlocks in the chooser (G-C3/S4-T4).
    MenuScene.markLevelComplete(this.levelNumber, this.studentId);

    // G-5: unlock next level in IndexedDB progressionStat
    void this.persistLevelCompletion();

    const nextLevel =
      this.levelNumber < 9 ? ((this.levelNumber + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) : null;

    // T11: Scaffold recommendation based on accuracy
    const totalAttempts = this.responseTimes.length;
    const sessionAccuracy = totalAttempts > 0 ? this.correctCount / totalAttempts : 0;
    const scaffoldRec: 'advance' | 'stay' | 'regress' =
      sessionAccuracy >= 0.8 ? 'advance' : sessionAccuracy < 0.4 ? 'regress' : 'stay';

    // T15: Perfect session — all correct, no extra attempts
    const isPerfect = this.correctCount >= SESSION_GOAL && totalAttempts === SESSION_GOAL;

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
      ...(nextLevel !== null
        ? {
            onNextLevel: () => {
              fadeAndStart(this, 'LevelScene', {
                levelNumber: nextLevel,
                studentId: this.studentId,
              });
            },
          }
        : {}),
      onPlayAgain: () => {
        fadeAndStart(this, 'LevelScene', {
          levelNumber: this.levelNumber,
          studentId: this.studentId,
        });
      },
      onMenu: () => {
        fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId });
      },
    });

    // T16: Quest session-complete speech line
    const completeLine =
      scaffoldRec === 'advance' ? 'I knew you could do it! ⭐' : 'Great practice! Keep going!';
    this.time.delayedCall(800, () => this.mascot?.showSpeechBubble(completeLine, 3000));

    // Move Quest beside the trophy card (right of centre, above the heading at
    // overlay-y=420) and raise its depth above the overlay (depth 50).
    // x = CW - 120 keeps Quest inside the right edge; y = 400 sits between
    // the trophy emoji (overlay-y=320) and the level heading (overlay-y=420).
    if (this.mascot) {
      this.mascot.setDepth(60);
      this.mascot.reposition(CW - 120, 400);
      this.mascot.setState('cheer-big');
    }

    void this.closeSession();
  }

  /**
   * G-5: Write (or update) a ProgressionStat row in IndexedDB marking this level
   * as completed and advancing highestLevelReached to levelNumber + 1.
   * This is a best-effort write — persistence failure never blocks gameplay.
   */
  private async persistLevelCompletion(): Promise<void> {
    if (!this.studentId) return;
    try {
      const { progressionStatRepo } = await import('../persistence/repositories/progressionStat');
      const { ActivityId } = await import('../types/branded');
      const studentIdTyped = this.studentId as import('@/types').StudentId;
      const activityId = ActivityId(`level_${this.levelNumber}`);
      const nextLevel = Math.min(this.levelNumber + 1, 9);

      const existing = await progressionStatRepo.get(studentIdTyped, activityId);
      const now = Date.now();
      const updated: import('@/types').ProgressionStat = {
        studentId: studentIdTyped,
        activityId,
        currentLevel: nextLevel,
        highestLevelReached: Math.max(nextLevel, existing?.highestLevelReached ?? nextLevel),
        sessionsAtCurrentLevel: 0,
        totalSessions: (existing?.totalSessions ?? 0) + 1,
        totalXp: (existing?.totalXp ?? 0) + this.correctCount * 10,
        lastSessionAt: now,
        consecutiveRegressEvents: existing?.consecutiveRegressEvents ?? 0,
        syncState: 'local',
      };
      await progressionStatRepo.upsert(updated);
      log.scene('progression_stat_upserted', {
        level: this.levelNumber,
        nextLevel,
        activityId,
        totalSessions: updated.totalSessions,
      });
    } catch (err) {
      log.warn('PROG', 'progression_stat_error', { level: this.levelNumber, error: String(err) });
    }
  }

  private async closeSession(): Promise<void> {
    if (!this.sessionId) return;
    try {
      const { sessionRepo } = await import('../persistence/repositories/session');

      // Fix G-E4: compute real accuracy and avg response time
      const accuracy = this.attemptCount > 0 ? this.correctCount / this.attemptCount : 1;
      const avgResponseMs =
        this.responseTimes.length > 0
          ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
          : null;

      const summary = {
        endedAt: Date.now(),
        totalAttempts: this.responseTimes.length,
        correctAttempts: this.correctCount,
        accuracy,
        avgResponseMs,
        xpEarned: this.correctCount * 10,
        scaffoldRecommendation: (this.latestMasteryEstimate >= 0.85
          ? 'advance'
          : this.latestMasteryEstimate > 0 &&
              this.responseTimes.length >= 5 &&
              this.correctCount / this.responseTimes.length < 0.4
            ? 'regress'
            : 'stay') as 'advance' | 'stay' | 'regress',
        endLevel: this.levelNumber,
      };
      log.sess('close', { sessionId: this.sessionId, level: this.levelNumber, ...summary });
      await sessionRepo.close(this.sessionId as import('@/types').SessionId, summary);
    } catch (err) {
      log.warn('SESS', 'close_error', { level: this.levelNumber, error: String(err) });
    }
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
