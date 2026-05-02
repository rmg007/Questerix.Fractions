import * as Phaser from 'phaser';
import { log } from './log';
import { get as getCopy } from './i18n/catalog';
import type { ValidatorResult, QuestionTemplate } from '@/types';
import { AccessibilityAnnouncer } from '@/components/AccessibilityAnnouncer';
import { ProgressBar } from '@/components/ProgressBar';
import { FeedbackOverlay, type FeedbackKind } from '@/components/FeedbackOverlay';
import { sfx } from '@/audio/SFXService';

const CW = 800;
const SESSION_GOAL = 5;

export interface OutcomeFlowContext {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mascot: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeInteraction: any;
}

export interface OutcomeFlowCallbacks {
  setWrongCount: (count: number) => void;
  setAttemptCount: (count: number) => void;
  setCorrectCount: (count: number) => void;
  setCorrectStreak: (streak: number) => void;
  setInputLocked: (locked: boolean) => void;
  setLastPayload: (payload: unknown) => void;
  loadQuestion: (index: number) => void;
  showSessionComplete: () => Promise<void>;
  setCurrentQuestionHintIds: (ids: string[]) => void;
  onHintRequest: () => Promise<void>;
  pulseHintButton: () => void;
}

function payloadDenominator(template: QuestionTemplate): number | null {
  const payload = template?.payload as Record<string, unknown> | undefined;
  if (!payload) return null;
  for (const key of ['targetPartitions', 'targetParts', 'denominator', 'parts', 'totalParts']) {
    const v = payload[key];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

function questFeedbackText(kind: FeedbackKind, template: QuestionTemplate): string | null {
  if (kind === 'correct') {
    const denominator = payloadDenominator(template);
    const denomKey =
      denominator === 2
        ? 'half'
        : denominator === 3
          ? 'third'
          : denominator === 4
            ? 'fourth'
            : 'equal';
    return getCopy(`quest.feedback.correct.${denomKey}`);
  }
  if (kind === 'incorrect') {
    const archetype = template?.archetype ?? 'unequal';
    try {
      return getCopy(`quest.feedback.wrong.${archetype}`);
    } catch {
      return getCopy('quest.feedback.wrong.unequal');
    }
  }
  return null;
}

export async function showOutcome(
  result: ValidatorResult,
  ctx: OutcomeFlowContext,
  callbacks: OutcomeFlowCallbacks
): Promise<void> {
  const kind: FeedbackKind =
    result.outcome === 'correct' ? 'correct' : result.outcome === 'partial' ? 'close' : 'incorrect';

  if (kind === 'correct') {
    ctx.progressBar.setProgress(ctx.attemptCount + 1);
  }

  const questText = questFeedbackText(kind, ctx.currentTemplate);

  ctx.feedbackOverlay.show(
    kind,
    () => {
      callbacks.setInputLocked(false);
      ctx.submitButtonContainer?.setAlpha(1);
      if (kind === 'correct') {
        void onCorrectAnswer(ctx, callbacks);
      } else {
        void onWrongAnswer(ctx, callbacks);
      }
    },
    questText ?? undefined
  );

  if (kind === 'correct') {
    ctx.mascot?.setState('cheer');
    ctx.activeInteraction?.showCorrectFeedback?.();
  } else if (kind === 'incorrect') {
    ctx.mascot?.setState('oops');
  }

  const announcement =
    questText ??
    (kind === 'correct'
      ? 'Correct! Great work.'
      : kind === 'close'
        ? 'Almost! Try a tiny adjustment.'
        : 'Not quite — try again.');
  AccessibilityAnnouncer.announce(announcement);
}

export async function onCorrectAnswer(
  ctx: OutcomeFlowContext,
  callbacks: OutcomeFlowCallbacks
): Promise<void> {
  ctx.activeInteraction?.showCorrectFeedback?.();

  const newAttemptCount = ctx.attemptCount + 1;
  const newCorrectCount = ctx.correctCount + 1;
  const newCorrectStreak = ctx.correctStreak + 1;

  callbacks.setAttemptCount(newAttemptCount);
  callbacks.setCorrectCount(newCorrectCount);
  callbacks.setCorrectStreak(newCorrectStreak);
  callbacks.setLastPayload(null);

  ctx.progressBar.setProgress(newAttemptCount);

  log.q('correct', {
    level: ctx.levelNumber,
    questionIndex: ctx.questionIndex,
    attemptCount: newAttemptCount,
    progress: `${newAttemptCount}/${SESSION_GOAL}`,
    wrongCountThisQ: ctx.wrongCount,
  });

  const streak = newCorrectStreak;
  const streakLine =
    streak === 1
      ? 'Nice one!'
      : streak === 2
        ? "You've got this!"
        : streak >= 3
          ? 'On fire! 🔥'
          : null;
  if (streakLine) {
    ctx.scene.time.delayedCall(1700, () => ctx.mascot?.showSpeechBubble(streakLine, 2000));
  }

  if (streak === 3 || streak === 5) {
    ctx.scene.time.delayedCall(1800, () => showStreakBanner(streak, ctx));
  }

  if (newAttemptCount >= SESSION_GOAL) {
    await callbacks.showSessionComplete();
  } else {
    callbacks.loadQuestion(ctx.questionIndex + 1);
  }
}

export async function onWrongAnswer(
  ctx: OutcomeFlowContext,
  callbacks: OutcomeFlowCallbacks
): Promise<void> {
  const newCorrectStreak = 0;
  const newWrongCount = ctx.wrongCount + 1;

  callbacks.setCorrectStreak(newCorrectStreak);
  callbacks.setWrongCount(newWrongCount);
  callbacks.setInputLocked(false);
  callbacks.setLastPayload(null);

  log.q('wrong', {
    level: ctx.levelNumber,
    questionIndex: ctx.questionIndex,
    wrongCount: newWrongCount,
    questionId: ctx.currentTemplate.id,
  });

  if (newWrongCount === 1) {
    ctx.scene.time.delayedCall(1400, () =>
      ctx.mascot?.showSpeechBubble('Oops! Try again 💪', 2000)
    );
  } else if (newWrongCount === 2) {
    ctx.scene.time.delayedCall(1400, () =>
      ctx.mascot?.showSpeechBubble("Almost... I'll give you a hint!", 2000)
    );
  }

  if (newWrongCount === 1) {
    ctx.activeInteraction?.showGhostGuide?.();
  }

  if (newWrongCount === 3) {
    ctx.scene.time.delayedCall(800, () => void callbacks.onHintRequest());
  }

  if (newWrongCount >= 3) {
    callbacks.pulseHintButton();
  }
}

function showStreakBanner(streak: number, ctx: OutcomeFlowContext): void {
  const ACTION_FILL = 0xff6b35;
  const NAVY_HEX = '#001f3f';
  const NAVY = 0x001f3f;
  const TITLE_FONT = 'Quicksand';

  const bannerText = streak >= 5 ? 'UNSTOPPABLE! ⭐' : '3 in a row! 🔥';
  const bannerBg = streak >= 5 ? 0xffd700 : ACTION_FILL;

  const PILL_W = 520,
    PILL_H = 88,
    PILL_R = 44;
  const cx = CW / 2;
  const startY = -PILL_H;
  const landY = 140;

  const g = ctx.scene.add.graphics().setDepth(90);
  g.fillStyle(bannerBg, 1);
  g.fillRoundedRect(cx - PILL_W / 2, startY - PILL_H / 2, PILL_W, PILL_H, PILL_R);
  g.lineStyle(3, NAVY, 0.4);
  g.strokeRoundedRect(cx - PILL_W / 2, startY - PILL_H / 2, PILL_W, PILL_H, PILL_R);

  const txt = ctx.scene.add
    .text(cx, startY, bannerText, {
      fontFamily: TITLE_FONT,
      fontSize: '32px',
      color: NAVY_HEX,
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(91);

  sfx.playStreak();
  ctx.mascot?.setState('cheer-big');

  const container = ctx.scene.add.container(0, 0, [g, txt]).setDepth(90);

  ctx.scene.tweens.add({
    targets: [g, txt],
    y: `+=${landY - startY}`,
    duration: 400,
    ease: 'Back.easeOut',
    onComplete: () => {
      ctx.scene.time.delayedCall(1600, () => {
        ctx.scene.tweens.add({
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
