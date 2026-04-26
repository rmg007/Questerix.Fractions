/**
 * LevelScene — generic config-driven scene for levels 1–9.
 * Receives `{ levelNumber: 1..9 }` via init(), loads templates from Dexie,
 * and drives one Interaction per question.
 * per runtime-architecture.md §6, C3 MVP (L1–L9), activity-archetypes.md §1–§10
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from './utils/colors';
import { TestHooks } from './utils/TestHooks';
import { FeedbackOverlay } from '../components/FeedbackOverlay';
import { HintLadder } from '../components/HintLadder';
import { ProgressBar } from '../components/ProgressBar';
import { AccessibilityAnnouncer } from '../components/AccessibilityAnnouncer';
import { getInteractionForArchetype } from './utils/levelRouter';
import type { Interaction } from './interactions/types';
import type { QuestionTemplate, ValidatorResult } from '@/types';

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
    this.levelNumber  = data.levelNumber ?? 1;
    this.studentId    = data.studentId ?? null;
    this.questionIndex = 0;
    this.attemptCount  = 0;
    this.wrongCount    = 0;
    this.inputLocked   = false;
    this.activeInteraction = null;
  }

  async create(): Promise<void> {
    TestHooks.unmountAll();

    // Background
    this.add.rectangle(CW / 2, CH / 2, CW, CH, CLR.neutral0);

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

    // Testid sentinels: mount generic `level-scene` + per-level `levelNN-scene`
    TestHooks.mountSentinel('level-scene');
    const levelId = `level${String(this.levelNumber).padStart(2, '0')}-scene`;
    TestHooks.mountSentinel(levelId);

    // hint-btn interactive overlay (upper-right ~y=160)
    TestHooks.mountInteractive('hint-btn', () => {
      this.onHintRequest();
    }, { width: '80px', height: '48px', top: '12.5%', left: 'calc(50% + 280px)' });

    // hint-text sentinel (hidden until text set)
    TestHooks.mountSentinel('hint-text');

    this.loadQuestion(0);
  }

  // ── Template loading ────────────────────────────────────────────────────────

  private async loadTemplates(): Promise<void> {
    try {
      const { questionTemplateRepo } = await import('../persistence/repositories/questionTemplate');
      const all = await questionTemplateRepo.getByLevel(
        this.levelNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
      );
      console.info(`[LevelScene] getByLevel(${this.levelNumber}) returned ${all.length} templates`);
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
        console.info(`[LevelScene] Loaded ${this.templatePool.length} templates for level ${this.levelNumber}`);
      } else {
        console.warn(`[LevelScene] No templates found for level ${this.levelNumber} — using fallback`);
      }
    } catch (err) {
      console.warn('[LevelScene] Template fetch failed — volatile mode:', err);
      this.templatePool = [];
    }
  }

  // ── Question loading ─────────────────────────────────────────────────────────

  private loadQuestion(index: number): void {
    this.questionIndex = index;
    this.wrongCount = 0;
    this.inputLocked = false;

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

    // Instantiate and mount interaction
    const interaction = getInteractionForArchetype(this.currentTemplate.archetype);
    this.activeInteraction = interaction;
    interaction.mount({
      scene: this,
      template: this.currentTemplate,
      centerX: CW / 2,
      centerY: CH / 2 - 80,
      width: CW,
      height: CH,
      onCommit: (payload) => void this.onCommit(payload),
    });
  }

  private makeFallbackTemplate(): QuestionTemplate {
    return {
      id: `q:ph:L${this.levelNumber}:fallback` as import('@/types').QuestionTemplateId,
      archetype: 'partition',
      prompt: { text: 'Cut this shape into two equal parts.', ttsKey: '' },
      payload: { shapeType: 'rectangle', targetPartitions: 2, snapMode: 'axis', areaTolerance: 0.05 },
      correctAnswer: null,
      validatorId: 'validator.partition.equalAreas' as import('@/types').ValidatorId,
      skillIds: [],
      misconceptionTraps: [],
      difficultyTier: 'easy',
    };
  }

  // ── Header / chrome ─────────────────────────────────────────────────────────

  private createHeader(): void {
    this.add.text(CW / 2, 60, `Level ${this.levelNumber}`, {
      fontSize: '28px',
      fontFamily: '"Nunito", system-ui, sans-serif',
      fontStyle: 'bold',
      color: HEX.neutral900,
    }).setOrigin(0.5).setDepth(5);

    const backBtn = this.add.text(48, 60, '← Menu', {
      fontSize: '18px',
      fontFamily: '"Nunito", system-ui, sans-serif',
      color: HEX.neutral600,
    })
      .setOrigin(0.5)
      .setDepth(5)
      .setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-22, -22, 44, 44), // C6.2: explicit 44×44 hit area per C7
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });

    backBtn.on('pointerup', () => {
      this.scene.start('MenuScene', { lastStudentId: this.studentId });
    });
  }

  private createPromptArea(): void {
    this.promptText = this.add.text(CW / 2, 160, '', {
      fontSize: '22px',
      fontFamily: '"Nunito", system-ui, sans-serif',
      color: HEX.neutral900,
      align: 'center',
      wordWrap: { width: 640 },
    }).setOrigin(0.5).setDepth(5);
  }

  private createHintArea(): void {
    this.hintTextGO = this.add.text(CW / 2, CH - 280, '', {
      fontSize: '18px',
      fontFamily: '"Nunito", system-ui, sans-serif',
      color: HEX.primary,
      align: 'center',
      wordWrap: { width: 600 },
      backgroundColor: HEX.primarySoft,
      padding: { x: 16, y: 12 },
    }).setOrigin(0.5).setDepth(5).setVisible(false);
  }

  private createHintButton(): void {
    const x = CW - 80;
    const y = 160;
    const bg = this.add.rectangle(x, y, 80, 48, CLR.primarySoft).setDepth(5);
    const label = this.add.text(x, y, '?', {
      fontSize: '24px', fontFamily: '"Nunito", system-ui, sans-serif',
      fontStyle: 'bold', color: HEX.primary,
    }).setOrigin(0.5).setDepth(6);
    const hit = this.add.rectangle(x, y, 80, 48, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(7);
    hit.on('pointerup', () => this.onHintRequest());
    hit.on('pointerover', () => bg.setFillStyle(CLR.primary));
    hit.on('pointerout',  () => bg.setFillStyle(CLR.primarySoft));
    this.hintButton = this.add.container(0, 0, [bg, label, hit]);
  }

  private createSubmitButton(): void {
    const x = CW / 2;
    const y = CH - 180;
    const bg = this.add.graphics();
    const drawIdle = () => {
      bg.clear();
      bg.fillStyle(CLR.primary, 1);
      bg.fillRoundedRect(x - 160, y - 32, 320, 64, 12);
    };
    drawIdle();
    bg.setDepth(10);

    const lbl = this.add.text(x, y, 'Check', {
      fontSize: '24px', fontFamily: '"Nunito", system-ui, sans-serif',
      fontStyle: 'bold', color: HEX.neutral0,
    }).setOrigin(0.5).setDepth(11);

    const hit = this.add.rectangle(x, y, 320, 64, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(12);
    hit.on('pointerdown', () => {
      bg.clear();
      bg.fillStyle(CLR.primaryStrong, 1);
      bg.fillRoundedRect(x - 160, y - 32, 320, 64, 12);
    });
    hit.on('pointerout',  () => drawIdle());
    hit.on('pointerup',   () => { drawIdle(); void this.onSubmit(); });

    this.submitButtonContainer = this.add.container(0, 0, [bg, lbl, hit]);
  }

  // ── Commit / Validation ──────────────────────────────────────────────────────

  /**
   * Called by interactions via onCommit.
   * Also used by the submit button which re-triggers with last payload.
   */
  private lastPayload: unknown = null;

  private async onCommit(payload: unknown): Promise<void> {
    if (this.inputLocked) return;
    this.lastPayload = payload;
    await this.onSubmit();
  }

  private async onSubmit(): Promise<void> {
    if (this.inputLocked || this.lastPayload === null) return;
    this.inputLocked = true;
    this.submitButtonContainer?.setAlpha(0.5);

    const startedAt = Date.now();
    let result: ValidatorResult;

    try {
      const { getValidator } = await import('../validators/registry');
      const validator = getValidator(this.currentTemplate.validatorId);
      if (validator) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = (validator as { fn: (i: any, p: any) => ValidatorResult })
          .fn(this.lastPayload, this.currentTemplate.payload);
      } else {
        // Fallback: partition validator
        const { partitionEqualAreas } = await import('../validators/partition');
        result = partitionEqualAreas.fn(
          this.lastPayload as import('../validators/partition').PartitionInput,
          this.currentTemplate.payload as import('../validators/partition').PartitionPayload,
        );
      }
    } catch (err) {
      console.error('[LevelScene] Validator error:', err);
      result = { outcome: 'incorrect', score: 0, feedback: 'validator_error' };
    }

    const responseMs = Date.now() - startedAt;
    await this.recordAttempt(result, responseMs);
    this.showOutcome(result);
  }

  private showOutcome(result: ValidatorResult): void {
    const kind = result.outcome === 'correct'  ? 'correct'
      : result.outcome === 'partial'  ? 'close'
      : 'incorrect';

    if (kind === 'correct') {
      this.progressBar.setProgress(this.attemptCount + 1);
    }

    this.feedbackOverlay.show(kind, () => {
      this.inputLocked = false;
      this.submitButtonContainer?.setAlpha(1);
      if (kind === 'correct') {
        this.onCorrectAnswer();
      } else {
        this.onWrongAnswer();
      }
    });

    const announcement = kind === 'correct'   ? 'Correct! Great work.'
      : kind === 'close'      ? 'Almost! Try a tiny adjustment.'
      : 'Not quite — try again.';
    AccessibilityAnnouncer.announce(announcement);
  }

  private onCorrectAnswer(): void {
    this.attemptCount++;
    this.progressBar.setProgress(this.attemptCount);
    this.lastPayload = null;

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
    void this.showHintForTier(tier);
  }

  private async showHintForTier(tier: import('@/types').HintTier): Promise<void> {
    this.hintTextGO.setVisible(true);
    let msg = '';
    switch (tier) {
      case 'verbal':
        msg = 'Tip: Equal parts means each piece is the same size. Try the middle!';
        break;
      case 'visual_overlay':
        msg = 'Look for the center of the shape.';
        break;
      case 'worked_example':
        msg = 'Watch where to place the line, then try yourself.';
        break;
    }
    this.hintTextGO.setText(msg);
    TestHooks.setText('hint-text', msg);

    // C7.8: Record hint event with score penalty per interaction-model.md §4.1
    // Penalty: 5 pts (T1), 15 pts (T2), 30 pts (T3)
    if (this.sessionId) {
      try {
        const { hintEventRepo } = await import('../persistence/repositories/hintEvent');
        const pointCost = tier === 'verbal' ? 5 : tier === 'visual_overlay' ? 15 : 30;
        await hintEventRepo.record({
          attemptId: '' as unknown as import('@/types').AttemptId, // Will be linked post-submission
          hintId: `hint.${this.currentTemplate.archetype}.${tier}`,
          tier,
          shownAt: Date.now(),
          acceptedByStudent: true,
          pointCostApplied: pointCost,
          syncState: 'local',
        });
      } catch (err) {
        console.warn('[LevelScene] Could not record hint event:', err);
      }
    }
  }

  private pulseHintButton(): void {
    if (this.checkReduceMotion()) return;
    this.tweens.add({
      targets: this.hintButton,
      scaleX: 1.1, scaleY: 1.1,
      duration: 200, yoyo: true, repeat: 2,
    });
  }

  // ── Persistence ──────────────────────────────────────────────────────────────

  private async openSession(): Promise<void> {
    if (!this.studentId) return;
    try {
      // C7.5-C7.6: Record lastUsedStudentId for session resumption
      const { lastUsedStudent } = await import('../persistence/lastUsedStudent');
      lastUsedStudent.set(this.studentId as import('@/types').StudentId);

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
        device: { type: 'unknown', viewport: { width: window.innerWidth, height: window.innerHeight } },
        syncState: 'local',
      });
      this.sessionId = session.id;
    } catch (err) {
      console.warn('[LevelScene] Could not open session:', err);
    }
  }

  private async recordAttempt(result: ValidatorResult, responseMs: number): Promise<void> {
    if (!this.studentId || !this.sessionId) return;
    try {
      const { attemptRepo } = await import('../persistence/repositories/attempt');
      const { nanoid } = await import('nanoid').catch(() => ({ nanoid: () => `a-${Date.now()}` }));
      const outcome: import('@/types').AttemptOutcome =
        result.outcome === 'correct' ? 'EXACT' : result.outcome === 'partial' ? 'CLOSE' : 'WRONG';
      await attemptRepo.record({
        id: nanoid() as import('@/types').AttemptId,
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
        hintsUsedIds: [],
        hintsUsed: [],
        flaggedMisconceptionIds: [],
        validatorPayload: result,
        syncState: 'local',
      });

      // C7.2: Run misconception detectors and upsert flags
      try {
        const recentAttempts = await attemptRepo.listForStudent(
          this.studentId as import('@/types').StudentId,
        );
        // Limit to recent 10 for performance
        const limitedAttempts = recentAttempts.slice(-10);
        const { runAllDetectors } = await import('../engine/misconceptionDetectors');
        const flags = await runAllDetectors(limitedAttempts, this.levelNumber);

        if (flags.length > 0) {
          const { misconceptionFlagRepo } = await import('../persistence/repositories/misconceptionFlag');
          for (const flag of flags) {
            await misconceptionFlagRepo.upsert(flag);
          }
        }
      } catch (err) {
        console.warn('[LevelScene] Misconception detection error:', err);
      }
    } catch (err) {
      console.warn('[LevelScene] Could not record attempt:', err);
    }
  }

  // ── Session complete ─────────────────────────────────────────────────────────

  private showSessionComplete(): void {
    this.inputLocked = true;
    TestHooks.mountSentinel('completion-screen');

    this.add.rectangle(CW / 2, CH / 2, CW, CH, CLR.neutral900, 0.5).setDepth(50);
    this.add.rectangle(CW / 2, CH / 2, 560, 400, CLR.neutral50).setDepth(51);

    this.add.text(CW / 2, CH / 2 - 120, 'Session complete!', {
      fontSize: '36px', fontFamily: '"Nunito", system-ui, sans-serif',
      fontStyle: 'bold', color: HEX.success,
    }).setOrigin(0.5).setDepth(52);

    this.add.text(CW / 2, CH / 2 - 40, `You completed ${this.attemptCount} problems.`, {
      fontSize: '22px', fontFamily: '"Nunito", system-ui, sans-serif',
      color: HEX.neutral900,
    }).setOrigin(0.5).setDepth(52);

    this.makeModalBtn(CW / 2, CH / 2 + 80, 'Keep going', CLR.primary, HEX.neutral0, () => {
      this.attemptCount = 0;
      this.inputLocked  = false;
      this.loadQuestion(this.questionIndex + 1);
    });

    this.makeModalBtn(CW / 2, CH / 2 + 170, 'Back to menu', CLR.neutral100, HEX.neutral900, () => {
      this.scene.start('MenuScene', { lastStudentId: this.studentId });
    });

    AccessibilityAnnouncer.announce(`Session complete! You finished ${this.attemptCount} problems.`);
    void this.closeSession();
  }

  private makeModalBtn(
    x: number, y: number, label: string, bg: number, textColor: string, onTap: () => void,
  ): void {
    const g = this.add.graphics().setDepth(52);
    g.fillStyle(bg, 1);
    g.fillRoundedRect(x - 160, y - 28, 320, 56, 10);
    this.add.text(x, y, label, {
      fontSize: '20px', fontFamily: '"Nunito", system-ui, sans-serif',
      fontStyle: 'bold', color: textColor,
    }).setOrigin(0.5).setDepth(53);
    this.add.rectangle(x, y, 320, 56, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(54)
      .on('pointerup', onTap);
  }

  private async closeSession(): Promise<void> {
    if (!this.sessionId) return;
    try {
      const { sessionRepo } = await import('../persistence/repositories/session');
      await sessionRepo.close(this.sessionId as import('@/types').SessionId, {
        endedAt: Date.now(),
        totalAttempts: this.attemptCount,
        correctAttempts: this.attemptCount,
        accuracy: 1,
        avgResponseMs: null,
        xpEarned: this.attemptCount * 10,
        scaffoldRecommendation: 'stay',
        endLevel: this.levelNumber,
      });
    } catch (err) {
      console.warn('[LevelScene] Could not close session:', err);
    }
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  private checkReduceMotion(): boolean {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }

  preDestroy(): void {
    AccessibilityAnnouncer.destroy();
    this.activeInteraction?.unmount();
    TestHooks.unmountAll();
  }
}
