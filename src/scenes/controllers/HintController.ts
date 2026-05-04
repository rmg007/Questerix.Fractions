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
  type HintFlowCallbacks,
  type HintFlowContext,
} from '../../lib/levelSceneHintFlow';
import type { Mascot } from '../../components/Mascot';
import type { Interaction } from '../interactions/types';

export class HintController {
  private hintLadder: HintLadder | null = null;
  private currentQuestionHintIds: string[] = [];
  private currentTemplate: QuestionTemplate | null = null;

  constructor(private scene: Phaser.Scene) {}

  reset(): void {
    this.hintLadder = null;
    this.currentQuestionHintIds = [];
    this.currentTemplate = null;
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

  setCurrentTemplate(template: QuestionTemplate | null): void {
    this.currentTemplate = template;
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

  async showHintForTier(tier: HintTier, ctx: HintFlowContext): Promise<void> {
    const fullCtx: HintFlowContext = {
      ...ctx,
      ...(this.hintLadder !== null ? { hintLadder: this.hintLadder } : {}),
    };
    const callbacks: HintFlowCallbacks = {
      setCurrentQuestionHintIds: (ids: string[]) => {
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
      currentTemplate: this.currentTemplate as QuestionTemplate,
      hintLadder: this.hintLadder as HintLadder,
      hintButton,
      hintTextGO,
      currentQuestionHintIds: this.currentQuestionHintIds,
      mascot,
      activeInteraction,
    });
  }
}
