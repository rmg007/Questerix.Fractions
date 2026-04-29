/**
 * LevelScene Quest wiring — behavior-level integration test.
 *
 * Pairs with tests/unit/i18n/questWiring.test.ts (which pins catalog
 * strings) by exercising the *consumer* — LevelScene's private
 * `questFeedbackText` and `questHintText` helpers — to prove the runtime
 * code path actually returns the registered Quest copy for every
 * archetype, tier, and feedback kind shown on the level screen.
 *
 * Why bypass `super()`?
 *   `LevelScene extends Phaser.Scene`, and constructing a real Phaser
 *   scene needs a Game with a WebGL/Canvas context — too heavy for a
 *   jsdom unit. Instead we build an instance via `Object.create()` and
 *   set only the two fields the wiring helpers read (`currentTemplate`
 *   for archetype + payload). The helpers themselves are pure with
 *   respect to Phaser internals, so this is enough to test them honestly.
 */

import { describe, expect, it, vi } from 'vitest';

// Mock Phaser (real ESM crashes in jsdom on its WebGL/Canvas inverse-alpha
// probe). The wiring helpers we test never touch Scene runtime APIs — they
// read this.currentTemplate and call getCopy() — so a class stub is enough.
vi.mock('phaser', () => {
  class Scene {}
  return {
    Scene,
    GameObjects: { Container: class {}, Text: class {}, Rectangle: class {} },
    default: { Scene },
  };
});

// eslint-disable-next-line import/order
import '@/lib/i18n/keys/quest'; // side-effect: registers QUEST_COPY
// eslint-disable-next-line import/order
import { LevelScene } from '@/scenes/LevelScene';
// eslint-disable-next-line import/order
import type { HintTier } from '@/types';

type AnyScene = LevelScene & {
  currentTemplate: { archetype: string; payload?: Record<string, unknown> };
  questFeedbackText: (kind: 'correct' | 'incorrect') => string | null;
  questHintText: (archetype: string, tier: HintTier) => string | null;
};

/** Build a partial LevelScene with just enough state for the wiring helpers. */
function makeScene(archetype: string, payload: Record<string, unknown> = {}): AnyScene {
  const scene = Object.create(LevelScene.prototype) as AnyScene;
  scene.currentTemplate = { archetype, payload };
  return scene;
}

describe('LevelScene Quest wiring (behavior)', () => {
  describe('questFeedbackText — wrong answer', () => {
    it('returns the partition-shaped Quest line for any archetype on incorrect', () => {
      const scene = makeScene('partition', { targetPartitions: 2 });
      expect(scene.questFeedbackText('incorrect')).toBe('Try again. The parts are not equal.');
    });

    it('returns the same wrong line regardless of archetype (single fallback today)', () => {
      for (const a of ['compare', 'order', 'benchmark', 'label', 'make', 'snap_match']) {
        expect(makeScene(a).questFeedbackText('incorrect')).toBe(
          'Try again. The parts are not equal.'
        );
      }
    });
  });

  describe('questFeedbackText — correct answer', () => {
    it('names halves / thirds / fourths from the payload denominator', () => {
      expect(makeScene('partition', { targetPartitions: 2 }).questFeedbackText('correct')).toBe(
        "Yes! That's a half."
      );
      expect(makeScene('partition', { targetPartitions: 3 }).questFeedbackText('correct')).toBe(
        "Yes! That's a third."
      );
      expect(makeScene('partition', { targetPartitions: 4 }).questFeedbackText('correct')).toBe(
        "Yes! That's a fourth."
      );
    });

    it('walks alternative payload shapes (denominator / parts / totalParts)', () => {
      // payloadDenominator() walks targetPartitions, targetParts, denominator,
      // parts, totalParts in order — verify the fallback fields work too.
      expect(makeScene('label', { denominator: 4 }).questFeedbackText('correct')).toBe(
        "Yes! That's a fourth."
      );
      expect(makeScene('make', { parts: 3 }).questFeedbackText('correct')).toBe(
        "Yes! That's a third."
      );
      expect(makeScene('snap_match', { totalParts: 2 }).questFeedbackText('correct')).toBe(
        "Yes! That's a half."
      );
    });

    it('falls back to "Yes! Equal parts." when no denominator is in the payload', () => {
      expect(makeScene('partition', {}).questFeedbackText('correct')).toBe('Yes! Equal parts.');
      expect(makeScene('benchmark', {}).questFeedbackText('correct')).toBe('Yes! Equal parts.');
    });

    it('uses the equal-parts fallback for denominators outside 2/3/4 (e.g. 5, 6, 8)', () => {
      // Quest only names half/third/fourth; anything else routes to the
      // generic equal-parts line so we never speak unsupported nouns.
      for (const d of [5, 6, 8]) {
        expect(makeScene('partition', { targetPartitions: d }).questFeedbackText('correct')).toBe(
          'Yes! Equal parts.'
        );
      }
    });
  });

  describe('questHintText — partition / equal_or_not (denominator-driven)', () => {
    it('returns split2/3/4 lines per the payload denominator on every tier', () => {
      const tiers: HintTier[] = ['verbal', 'visual_overlay', 'worked_example'];
      for (const tier of tiers) {
        expect(
          makeScene('partition', { targetPartitions: 2 }).questHintText('partition', tier)
        ).toBe('Hmm. I can split this in two.');
        expect(
          makeScene('equal_or_not', { targetPartitions: 3 }).questHintText('equal_or_not', tier)
        ).toBe('Hmm. I can split this in three.');
        expect(
          makeScene('partition', { targetPartitions: 4 }).questHintText('partition', tier)
        ).toBe('Hmm. I can split this in four.');
      }
    });

    it('returns null for partition denominators outside 2/3/4 (caller falls back)', () => {
      expect(
        makeScene('partition', { targetPartitions: 5 }).questHintText('partition', 'verbal')
      ).toBeNull();
      expect(makeScene('partition', {}).questHintText('partition', 'verbal')).toBeNull();
    });
  });

  describe('questHintText — non-partition archetypes (tiered)', () => {
    // Each entry: archetype → [verbal, visual_overlay, worked_example]
    // The strings here are the same ones pinned in questWiring.test.ts so
    // the catalog and consumer stay in lockstep.
    const cases: Array<[string, [string, string, string]]> = [
      [
        'compare',
        [
          'Which one is bigger? Take a look.',
          'I can draw both. Then I see.',
          'Same bottom? Top number wins.',
        ],
      ],
      [
        'order',
        [
          'Which is smallest? Pick that one first.',
          'I can draw each piece. Then sort.',
          'Small, middle, big. Line them up.',
        ],
      ],
      [
        'benchmark',
        [
          'Near zero? Near half? Or near one?',
          'Half is the middle. Look there.',
          'Tiny top? Near zero. Big top? Near one.',
        ],
      ],
      [
        'label',
        [
          'Count the shaded ones. Then count all.',
          'Top is shaded. Bottom is all parts.',
          'Write shaded over total.',
        ],
      ],
      [
        'make',
        [
          'Shade just the top number.',
          'Bottom is total. Top is to shade.',
          'Two of four? Shade two parts.',
        ],
      ],
      [
        'snap_match',
        [
          'Find the picture that fits.',
          'Count shaded. Match the top number.',
          'Three of four shaded. Match three over four.',
        ],
      ],
    ];

    it.each(cases)(
      '%s — verbal/visual_overlay/worked_example return Quest catalog lines',
      (archetype, [verbal, visual, worked]) => {
        const scene = makeScene(archetype);
        expect(scene.questHintText(archetype, 'verbal')).toBe(verbal);
        expect(scene.questHintText(archetype, 'visual_overlay')).toBe(visual);
        expect(scene.questHintText(archetype, 'worked_example')).toBe(worked);
      }
    );

    it('returns null for an unknown archetype (caller falls back)', () => {
      const scene = makeScene('mystery_archetype');
      expect(scene.questHintText('mystery_archetype', 'verbal')).toBeNull();
    });
  });

  describe('questHintText — dynamic-key guard', () => {
    it('returns null (no throw) when a Quest dynamic key is missing', async () => {
      const { _resetForTests, registerCatalog } = await import('@/lib/i18n/catalog');
      _resetForTests();
      registerCatalog({
        'quest.hint.split2': { text: 'x', tone: 'persona-quest' },
        'quest.hint.split3': { text: 'x', tone: 'persona-quest' },
        'quest.hint.split4': { text: 'x', tone: 'persona-quest' },
      });
      const scene = makeScene('compare');
      expect(() => scene.questHintText('compare', 'verbal')).not.toThrow();
      expect(scene.questHintText('compare', 'verbal')).toBeNull();

      _resetForTests();
      const { QUEST_CATALOG } = await import('@/lib/i18n/keys/quest');
      registerCatalog(QUEST_CATALOG);
    });
  });
});
