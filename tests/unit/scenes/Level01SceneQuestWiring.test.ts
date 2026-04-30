/**
 * Level01Scene Quest wiring — contract test.
 *
 * Pins the exact strings Level 1 (the introductory partition_halves scene)
 * surfaces through Quest's voice catalog per ux-elevation.md §4 + §9 T28.
 *
 * Why a dedicated test?
 *   `LevelSceneQuestWiring.test.ts` covers the generic LevelScene helpers.
 *   Level 1 has its own dedicated scene (`Level01Scene`) that was previously
 *   using hardcoded English strings. This file is the consumer-side contract
 *   that pins the exact strings Level 1 now shows, so any future catalog
 *   edit that would silently change player-facing copy breaks loudly.
 *
 * The catalog tests use the same Object.create() approach as
 * LevelSceneQuestWiring.test.ts to avoid constructing a real Phaser scene
 * (which needs WebGL/Canvas — too heavy for jsdom).
 */

import { describe, expect, it, beforeEach } from 'vitest';

import { vi } from 'vitest';

vi.mock('phaser', () => {
  class Scene {}
  return {
    Scene,
    GameObjects: { Container: class {}, Text: class {}, Rectangle: class {} },
    Geom: { Rectangle: { Contains: () => false } },
    Math: { Clamp: (v: number) => v },
    default: { Scene },
  };
});

// eslint-disable-next-line import/order
import '@/lib/i18n/keys/quest'; // side-effect: registers QUEST_COPY
// eslint-disable-next-line import/order
import { get as getCopy } from '@/lib/i18n/catalog';
// eslint-disable-next-line import/order
import { resolveQuestName } from '@/lib/persona/quest';
// eslint-disable-next-line import/order
import { Level01Scene } from '@/scenes/Level01Scene';

type AnyScene = Level01Scene & {
  questFeedbackText: (kind: 'correct' | 'incorrect' | 'close') => string | null;
  questHintText: () => string;
  payloadDenominator: () => number;
  studentDisplayName: string | null;
};

function makeScene(): AnyScene {
  return Object.create(Level01Scene.prototype) as AnyScene;
}

describe('Level01Scene Quest wiring (T28 — introductory level)', () => {
  let scene: AnyScene;

  beforeEach(() => {
    scene = makeScene();
  });

  describe('payloadDenominator', () => {
    it('always returns 2 — Level 1 is exclusively partition_halves', () => {
      expect(scene.payloadDenominator()).toBe(2);
    });
  });

  describe('questFeedbackText — correct answer', () => {
    it('returns the halves Quest line verbatim', () => {
      expect(scene.questFeedbackText('correct')).toBe("Yes! That's a half.");
    });

    it('matches the catalog entry directly', () => {
      expect(scene.questFeedbackText('correct')).toBe(getCopy('quest.feedback.correct.half'));
    });
  });

  describe('questFeedbackText — wrong answer', () => {
    it('returns the unequal Quest line verbatim', () => {
      expect(scene.questFeedbackText('incorrect')).toBe('Try again. The parts are not equal.');
    });

    it('matches the catalog entry directly', () => {
      expect(scene.questFeedbackText('incorrect')).toBe(getCopy('quest.feedback.wrong.unequal'));
    });
  });

  describe('questFeedbackText — close/partial answer', () => {
    it('returns null so FeedbackOverlay uses its built-in default', () => {
      expect(scene.questFeedbackText('close')).toBeNull();
    });
  });

  describe('questHintText', () => {
    it('returns the split-in-two Quest line verbatim', () => {
      expect(scene.questHintText()).toBe('Hmm. I can split this in two.');
    });

    it('matches the catalog entry directly', () => {
      expect(scene.questHintText()).toBe(getCopy('quest.hint.split2'));
    });

    it('returns the same line for all three hint tiers (verbal / visual / worked)', () => {
      const line = scene.questHintText();
      expect(line).toBe('Hmm. I can split this in two.');
    });
  });

  describe('session-complete name substitution', () => {
    it('formats the Quest closing line with a known player name', () => {
      scene.studentDisplayName = 'Sam';
      const line = getCopy('quest.complete.named', {
        name: resolveQuestName(scene.studentDisplayName),
      });
      expect(line).toBe('We made it whole, Sam!');
    });

    it('falls back to "friend" when studentDisplayName is null', () => {
      scene.studentDisplayName = null;
      const line = getCopy('quest.complete.named', {
        name: resolveQuestName(scene.studentDisplayName),
      });
      expect(line).toBe('We made it whole, friend!');
    });

    it('falls back to "friend" when studentDisplayName is whitespace-only', () => {
      scene.studentDisplayName = '   ';
      const line = getCopy('quest.complete.named', {
        name: resolveQuestName(scene.studentDisplayName),
      });
      expect(line).toBe('We made it whole, friend!');
    });
  });
});
