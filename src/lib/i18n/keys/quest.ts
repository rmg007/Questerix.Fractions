/**
 * Quest microcopy — per ux-elevation.md §4 ("The Quest Persona Bible").
 *
 * Voice rules (enforced by copyLinter + persona/quest validateQuestLine):
 *   - K-2 reading level (target FK 1.5, hard cap 2.0)
 *   - ≤ 7 words per sentence (most ≤ 5)
 *   - One- or two-syllable words where possible
 *   - Concrete nouns over abstract
 *   - Present tense, active voice
 *   - Never starts with "Don't" or "No"
 *   - Never uses generic praise ("Good job!"), flat negatives ("Wrong."),
 *     or the verbose register ("Welcome to Questerix Fractions...")
 *
 * Player display name appears at most once per session (at session-complete);
 * if missing, default to "friend." (see persona/quest.ts).
 *
 * All entries here are tone: 'persona-quest'. Region names live alongside
 * with tone: 'persona-quest', properNoun: true so they pass the catalog lint.
 */

import { registerCatalog, type Catalog } from '../catalog';

const QUEST_COPY: Catalog = {
  // ── First meeting (greeting) ───────────────────────────────────────────
  'quest.greet.first': {
    text: "Hi! I'm Quest.",
    notes: 'First-ever meeting on the menu screen. Short, warm, no exclamation pile-up.',
    tone: 'persona-quest',
  },
  'quest.greet.return': {
    text: 'Hi again!',
    notes: 'Returning student — Quest does NOT use the player name on return.',
    tone: 'persona-quest',
  },

  // ── Correct answer feedback (names what was right) ────────────────────
  'quest.feedback.correct.half': {
    text: "Yes! That's a half.",
    notes: 'Correct on a halves question. Names the fraction.',
    tone: 'persona-quest',
  },
  'quest.feedback.correct.third': {
    text: "Yes! That's a third.",
    tone: 'persona-quest',
  },
  'quest.feedback.correct.fourth': {
    text: "Yes! That's a fourth.",
    notes: 'Use "fourth" not "quarter" for K-2 reading-level alignment.',
    tone: 'persona-quest',
  },
  'quest.feedback.correct.equal': {
    text: 'Yes! Equal parts.',
    notes: 'For Equal-or-Not / partitioning prompts.',
    tone: 'persona-quest',
  },

  // ── Wrong answer feedback (gentle, observational) ─────────────────────
  'quest.feedback.wrong.parts': {
    text: 'Try again. I see {count, plural, one {one part} other {# parts}}.',
    notes: 'Observational, not negative. Names what Quest sees.',
    tone: 'persona-quest',
  },
  'quest.feedback.wrong.unequal': {
    text: 'Try again. The parts are not equal.',
    notes:
      'Used when the player accepts visibly-unequal divisions. Avoids "different" (3 syllables, pushes FK > 2).',
    tone: 'persona-quest',
  },

  // ── Hint (models thinking, never gives the answer) ────────────────────
  'quest.hint.split2': {
    text: 'Hmm. I can split this in two.',
    tone: 'persona-quest',
  },
  'quest.hint.split3': {
    text: 'Hmm. I can split this in three.',
    tone: 'persona-quest',
  },
  'quest.hint.split4': {
    text: 'Hmm. I can split this in four.',
    tone: 'persona-quest',
  },

  // ── Hint (other archetypes — verbal / visual / worked-example) ────────
  // Three tiers per archetype mirror src/components/HintLadder.ts so each
  // ladder rung escalates inside Quest's voice. All entries are checked by
  // questCatalog.test.ts (FK ≤ 2.0, ≤ 7 words/sentence, persona patterns).
  'quest.hint.compare.verbal': {
    text: 'Which one is bigger? Take a look.',
    notes: 'Tier 1 hint for compare archetype. Verbal nudge, no answer.',
    tone: 'persona-quest',
  },
  'quest.hint.compare.visual': {
    text: 'I can draw both. Then I see.',
    notes: 'Tier 2 hint for compare. Models drawing both as pictures.',
    tone: 'persona-quest',
  },
  'quest.hint.compare.worked': {
    text: 'Same bottom? Top number wins.',
    notes: 'Tier 3 hint for compare. Worked-example rule.',
    tone: 'persona-quest',
  },

  'quest.hint.equal_or_not.verbal': {
    text: 'Look at each part. Same size?',
    notes: 'Tier 1 hint for equal_or_not. Verbal nudge to compare parts.',
    tone: 'persona-quest',
  },
  'quest.hint.equal_or_not.visual': {
    text: 'I can stack them. Then I see.',
    notes: 'Tier 2 hint for equal_or_not. Models stacking parts to compare.',
    tone: 'persona-quest',
  },
  'quest.hint.equal_or_not.worked': {
    text: 'Equal parts match. Same size each.',
    notes: 'Tier 3 hint for equal_or_not. Worked-example rule.',
    tone: 'persona-quest',
  },

  'quest.hint.order.verbal': {
    text: 'Which is smallest? Pick that one first.',
    tone: 'persona-quest',
  },
  'quest.hint.order.visual': {
    text: 'I can draw each piece. Then sort.',
    tone: 'persona-quest',
  },
  'quest.hint.order.worked': {
    text: 'Small, middle, big. Line them up.',
    tone: 'persona-quest',
  },

  'quest.hint.benchmark.verbal': {
    text: 'Near zero? Near half? Or near one?',
    notes: 'Tier 1 hint for benchmark. Three short questions stay under 7w each.',
    tone: 'persona-quest',
  },
  'quest.hint.benchmark.visual': {
    text: 'Half is the middle. Look there.',
    tone: 'persona-quest',
  },
  'quest.hint.benchmark.worked': {
    text: 'Tiny top? Near zero. Big top? Near one.',
    tone: 'persona-quest',
  },

  'quest.hint.label.verbal': {
    text: 'Count the shaded ones. Then count all.',
    tone: 'persona-quest',
  },
  'quest.hint.label.visual': {
    text: 'Top is shaded. Bottom is all parts.',
    tone: 'persona-quest',
  },
  'quest.hint.label.worked': {
    text: 'Write shaded over total.',
    notes: '4 words — under MIN_WORDS_FOR_FK so FK gate is skipped.',
    tone: 'persona-quest',
  },

  'quest.hint.make.verbal': {
    text: 'Shade just the top number.',
    tone: 'persona-quest',
  },
  'quest.hint.make.visual': {
    text: 'Bottom is total. Top is to shade.',
    tone: 'persona-quest',
  },
  'quest.hint.make.worked': {
    text: 'Two of four? Shade two parts.',
    tone: 'persona-quest',
  },

  'quest.hint.snap_match.verbal': {
    text: 'Find the picture that fits.',
    tone: 'persona-quest',
  },
  'quest.hint.snap_match.visual': {
    text: 'Count shaded. Match the top number.',
    tone: 'persona-quest',
  },
  'quest.hint.snap_match.worked': {
    text: 'Three of four shaded. Match three over four.',
    tone: 'persona-quest',
  },

  // ── Tricky / 3-wrong recovery (offers ramp-down per §9 T29) ───────────
  'quest.tricky.offerRamp': {
    text: 'This one is tricky. Want a smaller one?',
    notes: 'Offered after 3 wrong in a row. Never says "Don\'t give up."',
    tone: 'persona-quest',
  },

  // ── Session complete (one-time name use per §4) ───────────────────────
  'quest.complete.named': {
    text: 'We made it whole, {name}!',
    notes:
      'Only Quest line that uses the player name. If name is missing the caller substitutes "friend".',
    tone: 'persona-quest',
  },

  // ── Locked region ─────────────────────────────────────────────────────
  'quest.locked.region': {
    text: "Let's finish {region} first.",
    notes:
      '{region} resolves through the region.* catalog keys; never say "Locked." or "Come back later."',
    tone: 'persona-quest',
  },

  // ── Frustration recovery vocabulary (§4 + §9 T29) ─────────────────────
  'quest.frustration.slowdown': {
    text: "Let's slow down.",
    tone: 'persona-quest',
  },
  'quest.frustration.tryShorter': {
    text: 'Want to try a smaller one?',
    tone: 'persona-quest',
  },
  'quest.frustration.show': {
    text: 'I can show you.',
    tone: 'persona-quest',
  },
  'quest.frustration.breath': {
    text: 'Take a breath.',
    tone: 'persona-quest',
  },
  'quest.frustration.return': {
    text: 'We can come back to this.',
    tone: 'persona-quest',
  },

  // ── Region names (proper nouns, mentioned in §6 misconception table) ──
  'region.halvesForest': {
    text: 'Halves Forest',
    notes: 'Continuous-area region (cookies, pies). 1-syllable + 2-syllable for K-2 readability.',
    tone: 'persona-quest',
    properNoun: true,
  },
  'region.quartersBay': {
    text: 'Quarters Bay',
    notes: 'Discrete-collection region (boats). Reinforces same fraction in discrete form.',
    tone: 'persona-quest',
    properNoun: true,
  },
  'region.compareBridge': {
    text: 'Compare Bridge',
    notes: 'Side-by-side comparison region. Fights whole-number bias.',
    tone: 'persona-quest',
    properNoun: true,
  },
  'region.equalMeadow': {
    text: 'Equal Meadow',
    notes: 'Equal-parts judgment region. Includes intentionally-unequal divisions.',
    tone: 'persona-quest',
    properNoun: true,
  },
  'region.numberLineRiver': {
    text: 'Number Line River',
    notes: '3-word proper noun (max). Number-line placement region.',
    tone: 'persona-quest',
    properNoun: true,
  },
};

registerCatalog(QUEST_COPY);

/** Re-exported for tests that want to introspect just this slice. */
export const QUEST_CATALOG = QUEST_COPY;
