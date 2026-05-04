/**
 * HintController — manages hint state, tier advancement, and display.
 * Extracted from LevelScene to reduce coupling and LOC.
 */

import * as Phaser from 'phaser';
import { HintLadder } from '../../components/HintLadder';
import type { QuestionTemplate, HintTier } from '@/types';
import { log } from '../../lib/log';
import { tracerService } from '../../lib/observability/tracer';
import { SPAN_NAMES } from '../../lib/observability/span-names';
import { get as getCopy } from '../../lib/i18n/catalog';
import {
  showHintForTier as showHintForTierFlow,
  pulseHintButton as pulseHintButtonFlow,
  type HintFlowContext,
  type HintFlowCallbacks,
} from '../../lib/levelSceneHintFlow';
import type { Mascot } from '../../components/Mascot';
import type { Interaction } from '../interactions/types';

export class HintController {
  private hintLadder: HintLadder | null = null;
  private currentQuestionHintIds: string[] = [];

  constructor(private scene: Phaser.Scene) {}

  reset(): void {
    this.hintLadder = null;
    this.currentQuestionHintIds = [];
  }

  getHintLadder(): HintLadder | null {
    return this.hintLadder;
  }

  setHintLadder(ladder: HintLadder | null): void {
    this.hintLadder = ladder;
  }

  getCurrentQuestionHintIds(): string[] {
    return this.currentQuestionHintIds;
  }

  setCurrentQuestionHintIds(ids: string[]): void {
    this.currentQuestionHintIds = ids;
  }

  questHintText(archetype: string, tier: HintTier): string | null {
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

  private currentTemplate: QuestionTemplate | null = null;

  setCurrentTemplate(template: QuestionTemplate | null): void {
    this.currentTemplate = template;
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

  onHintRequest(
    levelNumber: number,
    questionIndex: number,
    wrongCount: number,
    mascot: Mascot | null,
    showHintForTierCallback: (tier: HintTier) => Promise<void>
  ): void {
    if (!this.currentTemplate) {
      this.scene.time.delayedCall(100, () => {
        this.onHintRequest(levelNumber, questionIndex, wrongCount, mascot, showHintForTierCallback);
      });
      return;
    }
    this.hintLadder ??= new HintLadder(this.currentTemplate.difficultyTier);
    const tier = this.hintLadder.next();
    const span = tracerService.startSpan(SPAN_NAMES.HINT.REQUEST, {
      'hint.tier': tier,
      'scene.level': levelNumber,
      'question.archetype': this.currentTemplate?.archetype,
    });
    try {
      log.hint('request', {
        tier,
        level: levelNumber,
        questionIndex,
        wrongCount,
      });
      mascot?.setState('think');
      void showHintForTierCallback(tier);
    } finally {
      span.end();
    }
  }

  async showHintForTier(
    tier: HintTier,
    ctx: Omit<HintFlowContext, 'hintLadder'> & { hintLadder: HintLadder | null }
  ): Promise<void> {
    const fullCtx: HintFlowContext = {
      ...ctx,
      hintLadder: this.hintLadder,
    };
    const callbacks: HintFlowCallbacks = {
      setCurrentQuestionHintIds: (ids) => {
        this.setCurrentQuestionHintIds(ids);
      },
    };
    await showHintForTierFlow(tier, fullCtx, callbacks);
  }

  pulseHintButton(
    levelNumber: number,
    questionIndex: number,
    wrongCount: number,
    hintButton: Phaser.GameObjects.Container,
    hintTextGO: Phaser.GameObjects.Text,
    mascot: Mascot | null,
    activeInteraction: Interaction | null
  ): void {
    pulseHintButtonFlow({
      scene: this.scene,
      levelNumber,
      questionIndex,
      wrongCount,
      currentTemplate: this.currentTemplate,
      hintLadder: this.hintLadder,
      hintButton,
      hintTextGO,
      currentQuestionHintIds: this.currentQuestionHintIds,
      mascot,
      activeInteraction,
    });
  }
}
