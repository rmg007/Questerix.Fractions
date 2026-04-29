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
      expect(getCopy('quest.feedback.wrong.unequal')).toBe(
        'Try again. The parts are not equal.'
      );
    });

    it('renders the parts-counting Quest line with ICU plural', () => {
      expect(getCopy('quest.feedback.wrong.parts', { count: 1 })).toBe('Try again. I see one part.');
      expect(getCopy('quest.feedback.wrong.parts', { count: 3 })).toBe('Try again. I see 3 parts.');
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
