import * as Phaser from 'phaser';
import { log } from './log';
import { get as getCopy } from './i18n/catalog';
import { checkReduceMotion } from './preferences';
import type { HintTier, QuestionTemplate } from '@/types';
import { HintLadder } from '@/components/HintLadder';
import { tracerService } from '@/lib/observability/tracer';
import { SPAN_NAMES } from '@/lib/observability/span-names';

export interface HintFlowContext {
  scene: Phaser.Scene;
  levelNumber: number;
  questionIndex: number;
  wrongCount: number;
  currentTemplate: QuestionTemplate;
  hintLadder: HintLadder;
  hintButton: Phaser.GameObjects.Container;
  hintTextGO: Phaser.GameObjects.Text;
  mascot: any;
  activeInteraction: any;
}

export interface HintFlowCallbacks {
  setCurrentQuestionHintIds: (ids: string[]) => void;
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

function questHintText(
  archetype: string,
  tier: HintTier,
  template: QuestionTemplate
): string | null {
  if (archetype === 'partition') {
    const d = payloadDenominator(template);
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

export async function onHintRequest(
  ctx: HintFlowContext,
  callbacks: HintFlowCallbacks
): Promise<void> {
  const tier = ctx.hintLadder.next();
  const span = tracerService.startSpan(SPAN_NAMES.HINT.REQUEST, {
    'hint.tier': tier,
    'scene.level': ctx.levelNumber,
    'question.archetype': ctx.currentTemplate?.archetype,
  });
  try {
    log.hint('request', {
      tier,
      level: ctx.levelNumber,
      questionIndex: ctx.questionIndex,
      wrongCount: ctx.wrongCount,
    });
    ctx.mascot?.setState('think');
    await showHintForTier(tier, ctx, callbacks);
  } finally {
    span.end();
  }
}

export async function showHintForTier(
  tier: HintTier,
  ctx: HintFlowContext,
  callbacks: HintFlowCallbacks
): Promise<void> {
  if (ctx.wrongCount <= 2) {
    ctx.mascot?.showSpeechBubble("Here's a secret... 🤫", 2000);
  }

  const archetype = ctx.currentTemplate?.archetype ?? 'partition';
  let msg = '';

  const questMsg = questHintText(archetype, tier, ctx.currentTemplate);
  if (questMsg !== null) {
    msg = questMsg;
  }

  if (msg === '') {
    const suffix = tier === 'verbal' ? 'verbal' : tier === 'visual_overlay' ? 'visual' : 'worked';
    try {
      msg = getCopy(`quest.hint.fallback.${suffix}`);
    } catch {
      log.warn('HINT', 'fallback_catalog_miss', { tier, archetype });
      msg = getCopy('quest.hint.fallback.safe');
    }
  }

  ctx.hintTextGO.setText(msg);
  ctx.hintTextGO.setVisible(true);
  log.hint('show', { tier, message: msg, level: ctx.levelNumber, archetype });

  if (tier === 'visual_overlay') {
    ctx.activeInteraction?.showVisualOverlay?.();
  }

  try {
    const { hintEventRepo } = await import('@/persistence/repositories/hintEvent');
    const pointCost = tier === 'verbal' ? 5 : tier === 'visual_overlay' ? 15 : 30;
    const ev = await hintEventRepo.record({
      attemptId: '' as unknown as import('@/types').AttemptId,
      hintId: `hint.${ctx.currentTemplate.archetype}.${tier}`,
      tier,
      shownAt: Date.now(),
      acceptedByStudent: true,
      pointCostApplied: pointCost,
      syncState: 'local',
    });
    if (ev?.id) {
      callbacks.setCurrentQuestionHintIds([ev.id]);
    }
  } catch (err) {
    console.warn('[levelSceneHintFlow] Could not record hint event:', err);
  }
}

export async function onWrongAnswerTriggerHint(
  tier: HintTier,
  ctx: HintFlowContext,
  callbacks: HintFlowCallbacks
): Promise<void> {
  await showHintForTier(tier, ctx, callbacks);
}

export function pulseHintButton(ctx: HintFlowContext): void {
  if (checkReduceMotion()) return;
  ctx.scene.tweens.add({
    targets: ctx.hintButton,
    scaleX: 1.1,
    scaleY: 1.1,
    duration: 200,
    yoyo: true,
    repeat: 2,
  });
}
