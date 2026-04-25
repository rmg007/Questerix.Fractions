/**
 * Hint types.
 * Three tiers map 1:1 to the escalation ladder in interaction-model.md §4.
 * per data-schema.md §2.9 (audit §2.1 fix)
 */

/** Maps to the 3-tier escalation ladder: verbal → visual_overlay → worked_example */
export type HintTier = 'verbal' | 'visual_overlay' | 'worked_example';

/** Runtime hint record (carries display content). */
export interface Hint {
  /** Format: 'hint:<activity-short>:<questionSeq>:<tier>' e.g. 'hint:ms:0042:1' */
  id: string;
  tier: HintTier;
  /** Verbal prompt text / TTS key. Present for all tiers. per data-schema.md §2.9 */
  prompt: string;
  /** Visual overlay payload. Present when tier === 'visual_overlay'. */
  overlay?: { kind: string; data: unknown };
  /** Worked example payload. Present when tier === 'worked_example'. */
  worked?: { steps: string[] };
}

/**
 * Static HintTemplate as stored in the curriculum bundle.
 * per data-schema.md §2.9 — includes point cost and escalation order.
 */
export interface HintTemplate {
  /** Format: 'hint:<activity-short>:<questionSeq>:<tier>' */
  id: string;
  questionTemplateId: string;
  /** 'verbal' | 'visual_overlay' | 'worked_example' — 1:1 with escalation tier */
  type: HintTier;
  /** 1 = verbal, 2 = visual_overlay, 3 = worked_example. per interaction-model.md §4 */
  order: 1 | 2 | 3;
  content: {
    text?: string;
    assetUrl?: string;
    ttsKey?: string;
  };
  /** Score deduction when this hint is used. per data-schema.md §2.9 */
  pointCost: number;
}
