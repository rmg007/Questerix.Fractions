/**
 * Quest wiring contract — pins the exact strings that LevelScene now
 * routes through `catalog.get('quest.…')` per ux-elevation.md §4 + §9 T28.
 *
 * Why a dedicated test?
 *   The Quest catalog itself is lint-checked by questCatalog.test.ts
 *   (every entry must pass copyLinter + persona forbidden-line gates).
 *   This file is the *consumer-side* contract: it asserts the EXACT
 *   strings the level screen now shows, so any future catalog edit that
 *   would silently change player-facing copy breaks loudly with a clear
 *   diff. It also documents the wiring decisions for reviewers.
 */

import { describe, expect, it } from 'vitest';
import '@/lib/i18n/keys/quest'; // side-effect: registers QUEST_COPY
import { get as getCopy } from '@/lib/i18n/catalog';
import { resolveQuestName } from '@/lib/persona/quest';

describe('LevelScene Quest wiring (T28)', () => {
  describe('wrong-answer feedback', () => {
    it('renders the partition-shaped Quest line verbatim', () => {
      // Acceptance criterion from .local/tasks/task-28.md:
      //   "wrong answer surfaces 'Try again. The parts are not equal.'"
      expect(getCopy('quest.feedback.wrong.unequal')).toBe('Try again. The parts are not equal.');
    });

    it('renders the parts-counting Quest line with ICU plural', () => {
      expect(getCopy('quest.feedback.wrong.parts', { count: 1 })).toBe(
        'Try again. I see one part.'
      );
      expect(getCopy('quest.feedback.wrong.parts', { count: 3 })).toBe('Try again. I see 3 parts.');
    });

    it('registers per-archetype wrong-answer lines for all 7 archetypes', () => {
      const cases: Array<[string, string]> = [
        ['equal_or_not', 'Try again. The parts are not equal.'],
        ['compare', 'Try again. Look at both again.'],
        ['order', 'Try again. Check the sizes.'],
        ['benchmark', 'Try again. Think near the half.'],
        ['label', 'Try again. Count the parts again.'],
        ['make', 'Try again. Count the shaded parts.'],
        ['snap_match', 'Try again. Those do not match.'],
      ];
      for (const [archetype, expected] of cases) {
        expect(getCopy(`quest.feedback.wrong.${archetype}`)).toBe(expected);
      }
    });
  });

  describe('correct-answer feedback', () => {
    it('names the fraction for halves / thirds / fourths', () => {
      expect(getCopy('quest.feedback.correct.half')).toBe("Yes! That's a half.");
      expect(getCopy('quest.feedback.correct.third')).toBe("Yes! That's a third.");
      expect(getCopy('quest.feedback.correct.fourth')).toBe("Yes! That's a fourth.");
    });

    it('uses the equal-parts fallback when no denominator is known', () => {
      expect(getCopy('quest.feedback.correct.equal')).toBe('Yes! Equal parts.');
    });
  });

  describe('partition hint (catalog-driven)', () => {
    it('returns "split in two/three/four" lines for the three supported denominators', () => {
      expect(getCopy('quest.hint.split2')).toBe('Hmm. I can split this in two.');
      expect(getCopy('quest.hint.split3')).toBe('Hmm. I can split this in three.');
      expect(getCopy('quest.hint.split4')).toBe('Hmm. I can split this in four.');
    });
  });

  describe('per-archetype hint ladder (verbal / visual / worked)', () => {
    // For every non-partition archetype routed by levelRouter the catalog
    // must register all three HintLadder tiers in Quest's voice. These
    // pinned strings are what LevelScene.questHintText() now returns.
    const cases: Array<[string, string, string, string]> = [
      [
        'compare',
        'Which one is bigger? Take a look.',
        'I can draw both. Then I see.',
        'Same bottom? Top number wins.',
      ],
      [
        'equal_or_not',
        'Look at each part. Same size?',
        'I can stack them. Then I see.',
        'Equal parts match. Same size each.',
      ],
      [
        'order',
        'Which is smallest? Pick that one first.',
        'I can draw each piece. Then sort.',
        'Small, middle, big. Line them up.',
      ],
      [
        'benchmark',
        'Near zero? Near half? Or near one?',
        'Half is the middle. Look there.',
        'Tiny top? Near zero. Big top? Near one.',
      ],
      [
        'label',
        'Count the shaded ones. Then count all.',
        'Top is shaded. Bottom is all parts.',
        'Write shaded over total.',
      ],
      [
        'make',
        'Shade just the top number.',
        'Bottom is total. Top is to shade.',
        'Two of four? Shade two parts.',
      ],
      [
        'snap_match',
        'Find the picture that fits.',
        'Count shaded. Match the top number.',
        'Three of four shaded. Match three over four.',
      ],
    ];

    it.each(cases)('%s — verbal/visual/worked tiers stay verbatim', (a, v1, v2, v3) => {
      expect(getCopy(`quest.hint.${a}.verbal`)).toBe(v1);
      expect(getCopy(`quest.hint.${a}.visual`)).toBe(v2);
      expect(getCopy(`quest.hint.${a}.worked`)).toBe(v3);
    });
  });

  describe('session-complete (one name use per session)', () => {
    it('substitutes the player name into the Quest closing line', () => {
      const named = getCopy('quest.complete.named', { name: resolveQuestName('Alex') });
      expect(named).toBe('We made it whole, Alex!');
    });

    it('falls back to "friend" when no display name is provided', () => {
      const named = getCopy('quest.complete.named', { name: resolveQuestName(null) });
      expect(named).toBe('We made it whole, friend!');
    });

    it('treats whitespace-only display names as missing', () => {
      const named = getCopy('quest.complete.named', { name: resolveQuestName('   ') });
      expect(named).toBe('We made it whole, friend!');
    });
  });
});
