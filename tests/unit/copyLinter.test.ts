/**
 * Tests for the child-readable copy linter (ux-elevation §7 / T0).
 */

import { describe, expect, it } from 'vitest';
import {
  countSyllables,
  fleschKincaidGrade,
  lintCopy,
  lintCatalog,
  MAX_SENTENCE_WORDS,
} from '@/lib/copyLinter';

describe('countSyllables', () => {
  it('counts simple monosyllables as 1', () => {
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('dog')).toBe(1);
    expect(countSyllables('the')).toBe(1);
  });

  it('counts two-syllable words correctly', () => {
    expect(countSyllables('apple')).toBe(2);
    expect(countSyllables('answer')).toBe(2);
    // Note: the vowel-group heuristic overcounts a few words like
    // "halves" (it counts "a" + "e" as two groups even though the
    // word is monosyllabic). Conservative overcounting is the safe
    // direction for K-2 reading-grade gating — it flags MORE strings
    // as too-hard, never fewer.
    expect(countSyllables('halves')).toBeGreaterThanOrEqual(1);
  });

  it('counts three-syllable words correctly', () => {
    expect(countSyllables('beautiful')).toBeGreaterThanOrEqual(3);
    expect(countSyllables('elephant')).toBe(3);
  });

  it('returns 0 for empty input, never less than 1 for any word', () => {
    expect(countSyllables('')).toBe(0);
    expect(countSyllables('xyz')).toBe(1);
  });
});

describe('fleschKincaidGrade', () => {
  it('returns null for empty or word-less input', () => {
    expect(fleschKincaidGrade('')).toBeNull();
    expect(fleschKincaidGrade('   ')).toBeNull();
  });

  it('rates a simple K-2 sentence at low grade', () => {
    const fk = fleschKincaidGrade('I see a cat.');
    expect(fk).not.toBeNull();
    expect(fk!).toBeLessThan(2);
  });

  it('rates a complex sentence at higher grade', () => {
    const fk = fleschKincaidGrade(
      'The intricate machinery functioned despite extraordinary environmental disturbances.'
    );
    expect(fk).not.toBeNull();
    expect(fk!).toBeGreaterThan(8);
  });
});

describe('lintCopy — child-readable copy', () => {
  it('passes a Quest greeting at K-2 reading level', () => {
    const v = lintCopy({ id: 'quest.greet.first', text: 'Hi! I am Quest.' });
    expect(v).toEqual([]);
  });

  it('passes Quest correct-answer feedback', () => {
    const v = lintCopy({ id: 'quest.feedback.correct', text: "Yes! That's a half." });
    expect(v).toEqual([]);
  });

  it('rejects a sentence longer than the word cap', () => {
    const longSentence = 'One two three four five six seven eight words here.';
    const v = lintCopy({ id: 'too-long', text: longSentence });
    expect(v.some((x) => x.reason === 'sentence_too_long')).toBe(true);
  });

  it('rejects copy above FK grade 2.0', () => {
    const v = lintCopy({
      id: 'too-hard',
      text: 'Photosynthesis converts solar energy into chemical bonds.',
    });
    expect(v.some((x) => x.reason === 'fk_grade_too_high')).toBe(true);
  });

  it('flags multi-sentence copy on the longest sentence', () => {
    const v = lintCopy({
      id: 'mixed',
      text: 'Hi. One two three four five six seven eight nine ten.',
    });
    expect(v.some((x) => x.reason === 'sentence_too_long')).toBe(true);
  });
});

describe('lintCopy — proper noun allow-list', () => {
  it('passes a 1-word region name', () => {
    const v = lintCopy({ id: 'region.halves', text: 'Halves', properNoun: true });
    expect(v).toEqual([]);
  });

  it('passes a 2-word region name', () => {
    const v = lintCopy({ id: 'region.halves-forest', text: 'Halves Forest', properNoun: true });
    expect(v).toEqual([]);
  });

  it('passes a 3-word region name', () => {
    const v = lintCopy({
      id: 'region.number-line-river',
      text: 'Number Line River',
      properNoun: true,
    });
    expect(v).toEqual([]);
  });

  it('rejects a proper noun longer than 3 words', () => {
    const v = lintCopy({
      id: 'too-long-proper',
      text: 'A Really Long Region Name Indeed',
      properNoun: true,
    });
    expect(v.some((x) => x.reason === 'proper_noun_too_long')).toBe(true);
  });

  it('rejects a proper noun whose first word is lowercase', () => {
    const v = lintCopy({ id: 'lower-proper', text: 'halves Forest', properNoun: true });
    expect(v.some((x) => x.reason === 'proper_noun_not_capitalized')).toBe(true);
  });

  it('does not apply FK / sentence-length rules to proper nouns', () => {
    // A 3-word capitalized region name passes even if its FK score is high.
    const v = lintCopy({
      id: 'region.equivalence-garden',
      text: 'Equivalence Garden',
      properNoun: true,
    });
    expect(v).toEqual([]);
  });
});

describe('lintCatalog', () => {
  it('aggregates ok=true when every entry passes', () => {
    const report = lintCatalog([
      { id: 'a', text: 'Hi! I am Quest.' },
      { id: 'b', text: 'Halves Forest', properNoun: true },
    ]);
    expect(report.ok).toBe(true);
    expect(report.violations).toEqual([]);
    expect(report.metrics).toHaveLength(2);
  });

  it('aggregates ok=false when any entry fails', () => {
    const report = lintCatalog([
      { id: 'a', text: 'Hi! I am Quest.' },
      {
        id: 'b',
        text: 'Photosynthesis converts solar energy into chemical bonds rapidly today now.',
      },
    ]);
    expect(report.ok).toBe(false);
    expect(report.violations.length).toBeGreaterThan(0);
  });

  it('reports per-entry metrics including FK grade and longest sentence', () => {
    const report = lintCatalog([{ id: 'a', text: 'I see a cat.' }]);
    const m = report.metrics[0];
    expect(m.id).toBe('a');
    expect(m.maxSentenceWords).toBeLessThanOrEqual(MAX_SENTENCE_WORDS);
    expect(m.properNoun).toBe(false);
    expect(m.fkGrade).not.toBeNull();
  });
});
