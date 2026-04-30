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
import { PartitionInteraction } from './interactions/PartitionInteraction';
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
  private responseTimes: number[] = [];
  private questionStartTime: number = 0;
  private currentRoundEvents: import('@/types').ProgressionEvent[] = [];

  // Fix G-E3: hint events linked to attempt records
  private currentQuestionHintIds: string[] = [];

  // Template pool
  private templatePool: QuestionTemplate[] = [];
  private currentTemplate!: QuestionTemplate;
  private recentTemplateIds = new Set<string>();
  private recentQueue: string[] = [];
  private studentMastery: Map<string, import('@/types').SkillMastery> = new Map();

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
    this.recentTemplateIds = new Set();
    this.recentQueue = [];
    this.studentMastery = new Map();
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
    log.scene('create_start', { level: this.levelNumber });
    TestHooks.unmountAll();

    // Adventure sky background — matches the MenuScene world
    drawAdventureBackground(this, CW, CH);

    // Fade in from black on arrival
    if (!this.checkReduceMotion()) {
      this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    // Load templates
    await this.loadTemplates();
    await this._loadStudentMastery();

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

    // Fix TTS: load persisted preference before first question fires
    try {
      const { deviceMetaRepo } = await import('../persistence/repositories/deviceMeta');
      const meta = await deviceMetaRepo.get();
      tts.setEnabled(meta.preferences.audio ?? true);
      sfx.setEnabled(meta.preferences.audio ?? true);
      const vol = meta.preferences.volume ?? 0.8;
      tts.setVolume(vol);
      sfx.setVolume(vol);
    } catch (err) {
      // Graceful fallback — leave TTS and SFX in their default state
    }

    void this.loadQuestion(0);
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

  private async _loadStudentMastery(): Promise<void> {
    if (!this.studentId) return;
    try {
      const { skillMasteryRepo } = await import('../persistence/repositories/skillMastery');
      const records = await skillMasteryRepo.getAllForStudent(
        this.studentId as import('@/types').StudentId
      );
      this.studentMastery = new Map(records.map((r) => [r.skillId, r]));
    } catch {
      // Silent fallback — selection degrades to random
    }
  }

  // ── Question loading ─────────────────────────────────────────────────────────

  private async loadQuestion(index: number): Promise<void> {
    this.questionIndex = index;
    this.wrongCount = 0;
    this.inputLocked = false;
    this.currentQuestionHintIds = [];
    this.currentRoundEvents = [];

    // Unmount previous interaction
    this.activeInteraction?.unmount();
    this.activeInteraction = null;

    // Pick template
    if (this.templatePool.length > 0) {
      const { selectNextQuestion } = await import('../engine/selection');
      const selected = selectNextQuestion({
        candidates: this.templatePool,
        studentMastery: this.studentMastery as Map<import('@/types').SkillId, import('@/types').SkillMastery>,
        recentTemplateIds: this.recentTemplateIds as Set<import('@/types').QuestionTemplateId>,
        preferUnmastered: true,
      });
      this.currentTemplate = selected ?? this.templatePool[0]!;
      if (selected) {
        this.recentQueue.push(selected.id);
        this.recentTemplateIds.add(selected.id);
        const { RECENCY_WINDOW } = await import('../engine/selection');
        if (this.recentQueue.length > RECENCY_WINDOW) {
          const removed = this.recentQueue.shift()!;
          this.recentTemplateIds.delete(removed);
        }
      }
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

    // G-UX3: speak prompt aloud via TTS (preference already loaded in create())
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
  }

  private makeFallbackTemplate(): QuestionTemplate {
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
      .text(CW / 2, 57, `Level ${this.levelNumber}`, {
        fontSize: '38px',
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Back pill — left side
    const BACK_W = 118,
      BACK_H = 52;
    const backG = this.add.graphics().setDepth(5);
    backG.fillStyle(SKY_BG, 1);
    backG.fillRoundedRect(18, 27, BACK_W, BACK_H, 14);
    backG.lineStyle(2, NAVY, 1);
    backG.strokeRoundedRect(18, 27, BACK_W, BACK_H, 14);

    const backBtn = this.add
      .text(18 + BACK_W / 2, 27 + BACK_H / 2, '← Menu', {
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

    backBtn.on('pointerup', () => {
      log.input('back_to_menu', {
        level: this.levelNumber,
        questionIndex: this.questionIndex,
        attemptCount: this.attemptCount,
      });
      fadeAndStart(this, 'MenuScene', { lastStudentId: this.studentId });
    });

    // Question counter pill — right side, mirrors the back button
    const CTR_W = 118,
      CTR_H = 52;
    const ctrX = CW - 18 - CTR_W;
    const ctrY = 27;
    const ctrG = this.add.graphics().setDepth(5);
    ctrG.fillStyle(SKY_BG, 1);
    ctrG.fillRoundedRect(ctrX, ctrY, CTR_W, CTR_H, 14);
    ctrG.lineStyle(2, NAVY, 1);
    ctrG.strokeRoundedRect(ctrX, ctrY, CTR_W, CTR_H, 14);

    this.questionCounterText = this.add
      .text(ctrX + CTR_W / 2, ctrY + CTR_H / 2, `1 / ${SESSION_GOAL}`, {
        fontSize: '17px',
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
        fontSize: '22px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
        align: 'center',
        wordWrap: { width: CW - 160 },
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

    await this.recordAttempt(result, responseMs);
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
    } else if (kind === 'incorrect') {
      this.mascot?.setState('think');
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
      case 'identify':
      case 'placement':
      case 'explain_your_order':
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
    this.attemptCount++;
    this.correctCount++; // Fix G-E4: track correct answers separately
    this.progressBar.setProgress(this.attemptCount);
    this.lastPayload = null;
    log.q('correct', {
      level: this.levelNumber,
      questionIndex: this.questionIndex,
      attemptCount: this.attemptCount,
      progress: `${this.attemptCount}/${SESSION_GOAL}`,
      wrongCountThisQ: this.wrongCount,
    });

    if (this.attemptCount >= SESSION_GOAL) {
      void this.showSessionComplete();
    } else {
      void this.loadQuestion(this.questionIndex + 1);
    }
  }

  private onWrongAnswer(): void {
    this.wrongCount++;
    this.inputLocked = false;
    this.lastPayload = null;
    log.q('wrong', {
      level: this.levelNumber,
      questionIndex: this.questionIndex,
      wrongCount: this.wrongCount,
      questionId: this.currentTemplate.id,
    });

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
    log.hint('request', {
      tier,
      level: this.levelNumber,
      questionIndex: this.questionIndex,
      wrongCount: this.wrongCount,
    });
    this.mascot?.setState('think');
    void this.showHintForTier(tier);
  }

  private async showHintForTier(tier: import('@/types').HintTier): Promise<void> {
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

    // Visual cut-line overlay for partition questions (thirds / quarters).
    // Draws dashed lines showing where the shape should be divided.
    if (tier === 'visual_overlay' && archetype === 'partition') {
      const payload = this.currentTemplate?.payload as { targetPartitions?: number } | undefined;
      const targetPartitions = payload?.targetPartitions;
      if (
        this.activeInteraction instanceof PartitionInteraction &&
        typeof targetPartitions === 'number' &&
        (targetPartitions === 3 || targetPartitions === 4)
      ) {
        this.activeInteraction.showCutLineHint(targetPartitions);
      }
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
        if (ev?.id) this.currentQuestionHintIds.push(ev.id as string);
      } catch (err) {
        console.warn('[LevelScene] Could not record hint event:', err);
      }
    }
  }

  private pulseHintButton(): void {
    if (this.checkReduceMotion()) return;
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
      const { nanoid } = await import('nanoid').catch(() => ({ nanoid: () => `s-${Date.now()}` }));
      const id = nanoid() as import('@/types').SessionId;
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
      this.sessionId = session.id;
      log.sess('open_ok', {
        sessionId: this.sessionId,
        level: this.levelNumber,
        activityId: `level_${this.levelNumber}`,
      });
    } catch (err) {
      log.warn('SESS', 'open_error', { level: this.levelNumber, error: String(err) });
    }
  }

  private async recordAttempt(result: ValidatorResult, responseMs: number): Promise<void> {
    if (!this.studentId || !this.sessionId) return;
    try {
      const { attemptRepo } = await import('../persistence/repositories/attempt');
      const { nanoid } = await import('nanoid').catch(() => ({ nanoid: () => `a-${Date.now()}` }));
      const outcome: import('@/types').AttemptOutcome =
        result.outcome === 'correct' ? 'EXACT' : result.outcome === 'partial' ? 'CLOSE' : 'WRONG';
      const attemptId = nanoid() as import('@/types').AttemptId;
      log.atmp('record_start', {
        attemptId,
        outcome,
        responseMs,
        questionId: this.currentTemplate.id,
        hintsUsed: this.currentQuestionHintIds.length,
      });
      await attemptRepo.record({
        id: attemptId,
        sessionId: this.sessionId as import('@/types').SessionId,
        studentId: this.studentId as import('@/types').StudentId,
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

      // Fix G-E1: update BKT mastery after every attempt
      try {
        const isCorrect = result.outcome === 'correct';
        const skillIds = this.currentTemplate.skillIds ?? [];
        const skillId = (skillIds[0] ??
          `skill.level_${this.levelNumber}`) as import('@/types').SkillId;
        const { skillMasteryRepo } = await import('../persistence/repositories/skillMastery');
        const { updateMastery, DEFAULT_PRIORS, MASTERY_THRESHOLD } = await import('../engine/bkt');

        const existing = await skillMasteryRepo.get(
          this.studentId as import('@/types').StudentId,
          skillId
        );
        const studentIdTyped = this.studentId as import('@/types').StudentId;
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
      } catch (err) {
        log.warn('BKT', 'mastery_update_error', { level: this.levelNumber, error: String(err) });
      }

      // C7.2: Run misconception detectors and upsert flags
      try {
        const recentAttempts = await attemptRepo.listForStudent(
          this.studentId as import('@/types').StudentId
        );
        // Limit to recent 10 for performance
        const limitedAttempts = recentAttempts.slice(-10);
        const { runAllDetectors } = await import('../engine/misconceptionDetectors');
        const flags = await runAllDetectors(limitedAttempts, this.levelNumber);

        if (flags.length > 0) {
          const { misconceptionFlagRepo } =
            await import('../persistence/repositories/misconceptionFlag');
          for (const flag of flags) {
            await misconceptionFlagRepo.upsert(flag);
          }
          log.misc('flags_detected', {
            count: flags.length,
            ids: flags.map((f) => f.misconceptionId),
          });
        }
      } catch (err) {
        log.warn('MISC', 'detection_error', { error: String(err) });
      }
    } catch (err) {
      log.error('ATMP', 'record_failed', { error: String(err) });
    }
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

    // Persist level completion so the next level unlocks in the chooser (G-C3/S4-T4).
    MenuScene.markLevelComplete(this.levelNumber, this.studentId);

    // Check if all 9 levels are now complete — show Quest Complete overlay
    const allDone = this._allLevelsComplete();
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
        this.mascot.reposition(CW - 120, 400);
        this.mascot.setState('celebrate');
      }
      void this.closeSession();
      return;
    }

    new SessionCompleteOverlay({
      scene: this,
      levelNumber: this.levelNumber,
      correctCount: this.correctCount,
      totalAttempts: this.responseTimes.length,
      width: CW,
      height: CH,
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

    // Move Quest beside the trophy card (right of centre, above the heading at
    // overlay-y=420) and raise its depth above the overlay (depth 50).
    // x = CW - 120 keeps Quest inside the right edge; y = 400 sits between
    // the trophy emoji (overlay-y=320) and the level heading (overlay-y=420).
    if (this.mascot) {
      this.mascot.setDepth(60);
      this.mascot.reposition(CW - 120, 400);
      // Issue #82 sub-item: trigger celebrate hop when session completes.
      this.mascot.setState('celebrate');
    }

    void this.closeSession();
  }

  private async closeSession(): Promise<void> {
    if (!this.sessionId) return;
    try {
      const { updateStreak } = await import('../lib/streak');
      updateStreak(this.studentId);
    } catch {
      // Non-critical
    }
    try {
      const { sessionRepo } = await import('../persistence/repositories/session');

      // Fix G-E4: compute real accuracy and avg response time
      const accuracy = this.responseTimes.length > 0 ? this.correctCount / this.responseTimes.length : 1;
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
        scaffoldRecommendation: 'stay' as const,
        endLevel: this.levelNumber,
      };
      log.sess('close', { sessionId: this.sessionId, level: this.levelNumber, ...summary });
      await sessionRepo.close(this.sessionId as import('@/types').SessionId, summary);
    } catch (err) {
      log.warn('SESS', 'close_error', { level: this.levelNumber, error: String(err) });
    }
  }

  private _allLevelsComplete(): boolean {
    try {
      const key = this.studentId ? `completedLevels:${this.studentId}` : 'completedLevels';
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const arr = JSON.parse(raw) as number[];
      return [1, 2, 3, 4, 5, 6, 7, 8, 9].every((n) => arr.includes(n));
    } catch {
      return false;
    }
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  /**
   * Plays a brief scale-bounce (1.0 → 1.25 → 1.0, ~200 ms) on the question
   * counter badge so young children notice it updating. Skipped when the OS
   * reports prefers-reduced-motion.
   */
  private animateCounterBadge(): void {
    if (this.checkReduceMotion()) return;
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

  private checkReduceMotion(): boolean {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  }

  preDestroy(): void {
    log.scene('destroy', { level: this.levelNumber });
    AccessibilityAnnouncer.destroy();
    this.activeInteraction?.unmount();
    TestHooks.unmountAll();
    A11yLayer.unmountAll();
  }
}

