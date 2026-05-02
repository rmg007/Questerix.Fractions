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
// eslint-disable-next-line import/order
import { level01HintCopy, level01HintKeys } from '@/lib/mascotCopy';
// eslint-disable-next-line import/order
import type { HintTier } from '@/types/hint';

type AnyScene = Level01Scene & {
  questFeedbackText: (kind: 'correct' | 'incorrect' | 'close') => string | null;
  questHintText: (tier: HintTier) => string;
  studentDisplayName: string | null;
  currentArchetype: string;
};

function makeScene(): AnyScene {
  return Object.create(Level01Scene.prototype) as AnyScene;
}

describe('Level01Scene Quest wiring (T28 — introductory level)', () => {
  let scene: AnyScene;

  beforeEach(() => {
    scene = makeScene();
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
    it('returns the unequal Quest line verbatim when archetype is partition (default)', () => {
      scene.currentArchetype = 'partition';
      expect(scene.questFeedbackText('incorrect')).toBe('Try again. The parts are not equal.');
    });

    it('matches the catalog entry directly for partition archetype', () => {
      scene.currentArchetype = 'partition';
      expect(scene.questFeedbackText('incorrect')).toBe(getCopy('quest.feedback.wrong.unequal'));
    });

    it('returns the unequal fallback for unknown archetypes', () => {
      scene.currentArchetype = 'unknown_archetype';
      expect(scene.questFeedbackText('incorrect')).toBe(getCopy('quest.feedback.wrong.unequal'));
    });

    it('returns per-archetype wrong-answer lines for all 6 non-partition archetypes', () => {
      const cases: Array<[string, string]> = [
        ['compare', 'Try again. Look at both again.'],
        ['order', 'Try again. Check the sizes.'],
        ['benchmark', 'Try again. Think near the half.'],
        ['label', 'Try again. Count the parts again.'],
        ['make', 'Try again. Count the shaded parts.'],
        ['snap_match', 'Try again. Those do not match.'],
      ];
      for (const [archetype, expected] of cases) {
        scene.currentArchetype = archetype;
        expect(scene.questFeedbackText('incorrect')).toBe(expected);
      }
    });

    it('returns the equal_or_not line for equal_or_not archetype', () => {
      scene.currentArchetype = 'equal_or_not';
      expect(scene.questFeedbackText('incorrect')).toBe(
        getCopy('quest.feedback.wrong.equal_or_not')
      );
    });

    it('each archetype-specific line matches its catalog entry directly', () => {
      const archetypes = ['compare', 'order', 'benchmark', 'label', 'make', 'snap_match'];
      for (const archetype of archetypes) {
        scene.currentArchetype = archetype;
        expect(scene.questFeedbackText('incorrect')).toBe(
          getCopy(`quest.feedback.wrong.${archetype}`)
        );
      }
    });
  });

  describe('questFeedbackText — close/partial answer', () => {
    it('returns null so FeedbackOverlay uses its built-in default', () => {
      expect(scene.questFeedbackText('close')).toBeNull();
    });
  });

  describe('questHintText', () => {
    it('returns a distinct line for each hint tier', () => {
      const verbal = scene.questHintText('verbal');
      const visual = scene.questHintText('visual_overlay');
      const worked = scene.questHintText('worked_example');
      expect(verbal).not.toBe(visual);
      expect(visual).not.toBe(worked);
      expect(verbal).not.toBe(worked);
    });

    it('matches the catalog entry for each tier directly', () => {
      expect(scene.questHintText('verbal')).toBe(getCopy(level01HintKeys.verbal));
      expect(scene.questHintText('visual_overlay')).toBe(getCopy(level01HintKeys.visual_overlay));
      expect(scene.questHintText('worked_example')).toBe(getCopy(level01HintKeys.worked_example));
    });

    it('returns the exact strings required by the product spec', () => {
      expect(scene.questHintText('verbal')).toBe('Try moving the line a little.');
      expect(scene.questHintText('visual_overlay')).toBe('Think about where halfway is.');
      expect(scene.questHintText('worked_example')).toBe(
        'The answer is right around here — give it a try!'
      );
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
