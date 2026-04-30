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
} from './utils/levelTheme';
import { TestHooks } from './utils/TestHooks';
import { A11yLayer } from '../components/A11yLayer';
import { FeedbackOverlay, type FeedbackKind } from '../components/FeedbackOverlay';
import { HintLadder } from '../components/HintLadder';
import { ProgressBar } from '../components/ProgressBar';
import { AccessibilityAnnouncer } from '../components/AccessibilityAnnouncer';
import { getInteractionForArchetype } from './utils/levelRouter';
import type { Interaction } from './interactions/types';
import type { QuestionTemplate, ValidatorResult } from '@/types';
import { MenuScene } from './MenuScene';
import { tts } from '../audio/TTSService';
import { log } from '../lib/log';
// Quest microcopy catalog (registered at boot via src/main.ts).
// Per ux-elevation §9 T28 — the level screen routes its hint, feedback,
// and session-complete copy through `getCopy('quest.…')` so Quest's voice
// stays consistent and localizable without scene-side string literals.
import { get as getCopy } from '../lib/i18n/catalog';
import { resolveQuestName } from '../lib/persona/quest';

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
  /**
   * Cached Quest-facing display name for the active student. Resolved from
   * Dexie inside `openSession()` and consumed once per session by
   * `showSessionComplete()` (Quest names the player at most once per
   * §4 of the persona bible). Reset to `null` in `init()` so a previous
   * student's name cannot leak into a later anonymous session.
   */
  private studentDisplayName: string | null = null;

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
    log.scene('create_start', { level: this.levelNumber });
    TestHooks.unmountAll();

    // Adventure sky background — matches the MenuScene world
    drawAdventureBackground(this, CW, CH);

    // Load templates
    await this.loadTemplates();

    // Open session record
    await this.openSession();

    // Build chrome
    this.createHeader();
    this.createPromptArea();
    this.createHintArea();
    this.createHintButton();
    this.createSubmitButton();

    this.progressBar = new ProgressBar({
      scene: this,
      x: CW / 2 - 200,
      y: CH - 100,
      width: 400,
      goal: SESSION_GOAL,
    });

    this.feedbackOverlay = new FeedbackOverlay({ scene: this });

    // ── Accessibility: real DOM buttons mirror canvas controls (WCAG 4.1.2)
    A11yLayer.unmountAll();
    A11yLayer.mountAction('a11y-submit', 'Check my answer', () => {
      void this.onSubmit();
    });
    A11yLayer.mountAction('a11y-hint', 'Get a hint', () => {
      this.onHintRequest();
    });
    A11yLayer.mountAction('a11y-back', 'Back to main menu', () => {
      this.scene.start('MenuScene', { lastStudentId: this.studentId });
    });

    // Testid sentinels: mount generic `level-scene` + per-level `levelNN-scene`
    TestHooks.mountSentinel('level-scene');
    const levelId = `level${String(this.levelNumber).padStart(2, '0')}-scene`;
    TestHooks.mountSentinel(levelId);

    // hint-btn interactive overlay (upper-right ~y=160)
    TestHooks.mountInteractive(
      'hint-btn',
      () => {
        this.onHintRequest();
      },
      { width: '80px', height: '48px', top: '12.5%', left: 'calc(50% + 280px)' }
    );

    // hint-text sentinel (hidden until text set)
    TestHooks.mountSentinel('hint-text');

    // Fix TTS: load persisted preference before first question fires
    try {
      const { deviceMetaRepo } = await import('../persistence/repositories/deviceMeta');
      const meta = await deviceMetaRepo.get();
      tts.setEnabled(meta.preferences.audio ?? true);
    } catch (err) {
      // Graceful fallback — leave TTS in its default state
    }

    this.loadQuestion(0);
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
    this.currentQuestionHintIds = [];
    this.currentRoundEvents = [];

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
    const interaction = getInteractionForArchetype(this.currentTemplate.archetype, this.currentTemplate.validatorId);
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

    backBtn.on('pointerup', () => {
      log.input('back_to_menu', {
        level: this.levelNumber,
        questionIndex: this.questionIndex,
        attemptCount: this.attemptCount,
      });
      this.scene.start('MenuScene', { lastStudentId: this.studentId });
    });
  }

  private createPromptArea(): void {
    this.promptText = this.add
      .text(CW / 2, 160, '', {
        fontSize: '22px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
        align: 'center',
        wordWrap: { width: 640 },
        backgroundColor: 'rgba(255,255,255,0.75)',
        padding: { x: 14, y: 8 },
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
      160,
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
   * named line (halves/thirds/fourths, else equal); incorrect returns
   * the generic wrong line. null for partial/close outcomes.
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
      return getCopy('quest.feedback.wrong.unequal');
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
      this.showSessionComplete();
    } else {
      this.loadQuestion(this.questionIndex + 1);
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
      const suffix =
        tier === 'verbal' ? 'verbal' : tier === 'visual_overlay' ? 'visual' : 'worked';
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
    TestHooks.mountSentinel('completion-screen');

    this.add.rectangle(CW / 2, CH / 2, CW, CH, 0x1e3a8a, 0.45).setDepth(50);

    // Sky-blue card with navy border
    const cardG = this.add.graphics().setDepth(51);
    cardG.fillStyle(0xe0f2fe, 1);
    cardG.fillRoundedRect(CW / 2 - 280, CH / 2 - 220, 560, 440, 24);
    cardG.lineStyle(5, 0x1e3a8a, 1);
    cardG.strokeRoundedRect(CW / 2 - 280, CH / 2 - 220, 560, 440, 24);

    // Quest closes the session per ux-elevation §4: she names the player
    // *exactly once* per session, here. `resolveQuestName` falls back to
    // "friend" when no display name is on file.
    const completionLine = getCopy('quest.complete.named', {
      name: resolveQuestName(this.studentDisplayName),
    });

    this.add
      .text(CW / 2, CH / 2 - 150, '🎉 Session complete!', {
        fontSize: '36px',
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(52);

    this.add
      .text(CW / 2, CH / 2 - 60, completionLine, {
        fontSize: '24px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(52);

    this.add
      .text(CW / 2, CH / 2 - 20, `You finished ${this.attemptCount} problems!`, {
        fontSize: '20px',
        fontFamily: BODY_FONT,
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(52);

    // Persist level completion so the next level unlocks in the chooser (G-C3/S4-T4).
    MenuScene.markLevelComplete(this.levelNumber, this.studentId);

    // Amber "Keep going" action button
    // G-C7/G-UX6: advance to the next level. If already on the last level (9), go to menu.
    createActionButton(
      this,
      CW / 2,
      CH / 2 + 60,
      'Keep going ▶',
      () => {
        const nextLevel = this.levelNumber + 1;
        if (nextLevel > 9) {
          // All levels complete — congratulate and return to menu
          this.scene.start('MenuScene', { lastStudentId: this.studentId, allComplete: true });
        } else {
          this.scene.start('LevelScene', {
            levelNumber: nextLevel,
            studentId: this.studentId,
          });
        }
      },
      52
    );

    // Secondary "Back to menu" button
    this.makeModalBtn(CW / 2, CH / 2 + 160, 'Back to menu', () => {
      this.scene.start('MenuScene', { lastStudentId: this.studentId });
    });

    // Lead the screen-reader announcement with Quest's voice (the named
    // closing line) and append the factual problem count for context.
    AccessibilityAnnouncer.announce(
      `${completionLine} You finished ${this.attemptCount} problems.`
    );
    void this.closeSession();
  }

  private makeModalBtn(x: number, y: number, label: string, onTap: () => void): void {
    const W = 320,
      H = 56,
      R = 28;
    const g = this.add.graphics().setDepth(52);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(x - W / 2, y - H / 2, W, H, R);
    g.lineStyle(4, 0x1e3a8a, 1);
    g.strokeRoundedRect(x - W / 2, y - H / 2, W, H, R);
    this.add
      .text(x, y, label, {
        fontSize: '20px',
        fontFamily: BODY_FONT,
        fontStyle: 'bold',
        color: NAVY_HEX,
      })
      .setOrigin(0.5)
      .setDepth(53);
    this.add
      .rectangle(x, y, W, H, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(54)
      .on('pointerup', onTap);
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
        totalAttempts: this.attemptCount,
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

  // ── Utilities ────────────────────────────────────────────────────────────────

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

