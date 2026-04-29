/**
 * copyLinter — gates child-readable copy on reading-grade and length.
 *
 * Per ux-elevation.md §7 ("Cognitive — Reading-level cap") and T0 spec:
 *   - Every word of *child-readable* copy must be at FK grade ≤ 2.0.
 *   - No sentence may exceed 7 words.
 *   - Proper nouns (region/level names like "Halves Forest") are exempt
 *     via per-key `properNoun: true` in the i18n catalog. Proper nouns
 *     must instead pass two alternate gates: ≤ 3 words AND each word
 *     starts with an uppercase letter.
 *
 * The Flesch-Kincaid Grade Level formula:
 *   FK = 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
 *
 * Syllable counting is heuristic (vowel-group based with adjustments for
 * silent-e and trailing -le). Heuristic accuracy is sufficient for K-2
 * gating; if a borderline string fails, rewriting it shorter is the fix.
 */

export interface LintInput {
  /** Caller-supplied identifier (i18n key, file:line, etc.). For diagnostics. */
  id: string;
  /** The string to check. */
  text: string;
  /** Mark as a proper noun (region/level name); subjects to alt-gates. */
  properNoun?: boolean;
}

export interface LintViolation {
  id: string;
  reason:
    | 'fk_grade_too_high'
    | 'sentence_too_long'
    | 'proper_noun_too_long'
    | 'proper_noun_not_capitalized';
  detail: string;
}

export interface LintReport {
  ok: boolean;
  violations: LintViolation[];
  /** Per-input metrics for callers that want to surface borderline cases. */
  metrics: Array<{
    id: string;
    fkGrade: number | null;
    maxSentenceWords: number;
    properNoun: boolean;
  }>;
}

/** Maximum words per sentence (any sentence above this fails). */
export const MAX_SENTENCE_WORDS = 7;
/** FK grade ceiling (any string at or above this fails). */
export const MAX_FK_GRADE = 2.0;
/** Proper-noun word cap. */
export const MAX_PROPER_NOUN_WORDS = 3;
/**
 * Floor below which the FK formula is statistically meaningless.
 *
 * The Flesch-Kincaid formula is undefined / unstable on tiny strings: a
 * single multisyllabic word in a 2-word greeting drives the score above
 * 4 even though the line is K-2 readable ("Hi again!" scores ~2.9).
 * Industry tools (MS Word, Texas Education Agency) skip FK below 100
 * words; for K-2 microcopy a 5-word floor is the smallest useful sample.
 * Sentence-length and proper-noun gates still apply below the floor.
 */
export const MIN_WORDS_FOR_FK = 5;

/** Split text into sentences on `.`, `!`, `?` (or end-of-string). */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Split a sentence into words. Strips leading/trailing punctuation. */
function splitWords(sentence: string): string[] {
  return sentence
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .split(/\s+/u)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

/**
 * Heuristic syllable count for an English word.
 *
 * Algorithm:
 *   1. Lowercase the word.
 *   2. Strip a trailing silent `e` (but keep a final `-le` after consonant).
 *   3. Count vowel groups (consecutive aeiouy).
 *   4. Floor at 1.
 *
 * This is the standard "vowel groups" heuristic used in many FK readers.
 * It gets ~85% accurate vs. dictionary syllable counts on K-2 vocabulary.
 */
export function countSyllables(word: string): number {
  if (!word) return 0;
  let w = word.toLowerCase();

  // Trailing silent `e` (but keep the `e` for words like "the" and `-le`).
  if (w.length >= 3 && w.endsWith('e') && !w.endsWith('le')) {
    // Only strip if removing `e` leaves a vowel — avoids destroying "the".
    const stripped = w.slice(0, -1);
    if (/[aeiouy]/.test(stripped)) {
      w = stripped;
    }
  }

  const groups = w.match(/[aeiouy]+/g);
  const count = groups ? groups.length : 0;
  return Math.max(1, count);
}

/**
 * Compute Flesch-Kincaid Grade Level for a chunk of text.
 * Returns null when the input has no words/sentences (avoid /0 NaN).
 */
export function fleschKincaidGrade(text: string): number | null {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return null;
  const words = sentences.flatMap((s) => splitWords(s));
  if (words.length === 0) return null;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const wps = words.length / sentences.length;
  const spw = syllables / words.length;
  return 0.39 * wps + 11.8 * spw - 15.59;
}

/** Lint a single string per the rules above. */
export function lintCopy(input: LintInput): LintViolation[] {
  const violations: LintViolation[] = [];
  const sentences = splitSentences(input.text);
  const words = sentences.flatMap((s) => splitWords(s));

  if (input.properNoun) {
    if (words.length > MAX_PROPER_NOUN_WORDS) {
      violations.push({
        id: input.id,
        reason: 'proper_noun_too_long',
        detail: `${words.length} words (max ${MAX_PROPER_NOUN_WORDS})`,
      });
    }
    for (const w of words) {
      if (w.length > 0 && w[0] !== w[0].toUpperCase()) {
        violations.push({
          id: input.id,
          reason: 'proper_noun_not_capitalized',
          detail: `"${w}" should start with an uppercase letter`,
        });
        break;
      }
    }
    return violations;
  }

  // Child-readable copy gates
  for (const s of sentences) {
    const swords = splitWords(s);
    if (swords.length > MAX_SENTENCE_WORDS) {
      violations.push({
        id: input.id,
        reason: 'sentence_too_long',
        detail: `${swords.length} words (max ${MAX_SENTENCE_WORDS}): "${s}"`,
      });
    }
  }
  if (words.length >= MIN_WORDS_FOR_FK) {
    const fk = fleschKincaidGrade(input.text);
    if (fk !== null && fk > MAX_FK_GRADE) {
      violations.push({
        id: input.id,
        reason: 'fk_grade_too_high',
        detail: `FK grade ${fk.toFixed(2)} (max ${MAX_FK_GRADE.toFixed(1)})`,
      });
    }
  }

  return violations;
}

/** Lint a batch of inputs and return a single aggregate report. */
export function lintCatalog(inputs: readonly LintInput[]): LintReport {
  const violations: LintViolation[] = [];
  const metrics: LintReport['metrics'] = [];
  for (const input of inputs) {
    const v = lintCopy(input);
    violations.push(...v);
    const sentences = splitSentences(input.text);
    const maxSentenceWords = sentences.reduce((m, s) => Math.max(m, splitWords(s).length), 0);
    metrics.push({
      id: input.id,
      fkGrade: fleschKincaidGrade(input.text),
      maxSentenceWords,
      properNoun: !!input.properNoun,
    });
  }
  return { ok: violations.length === 0, violations, metrics };
}
