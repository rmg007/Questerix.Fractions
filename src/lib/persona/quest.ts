/**
 * Quest persona constants and validators.
 *
 * Per ux-elevation.md §4 ("The Quest Persona Bible"). This module is the
 * *non-copy* side of Quest — it pins the visual identity (form, palette
 * references), the voice rules, the forbidden-line patterns, and the
 * fallback-name behavior.
 *
 * The microcopy itself lives in src/lib/i18n/keys/quest.ts.
 */

import { HEX } from '@/scenes/utils/colors';

/** Identity — physical form and palette refs. */
export const QUEST_IDENTITY = {
  form: '5-point-star',
  /** Default visual size in logical units (~80 across). */
  defaultSize: 80,
  /** Body color: yellow-amber (matches HEX.gold / accentA). */
  bodyColor: HEX.gold,
  /** Eye whites. */
  eyeWhite: HEX.neutral0,
  /**
   * Pupil color — navy (matches the menu's NAVY token #1E3A8A).
   * Kept literal here because colors.ts does not currently export it.
   */
  pupilColor: '#1E3A8A',
  /** Pale-coral cheek dots (idle state). */
  cheekColor: HEX.coralCheek,
  /** Smile/cheek warming color when celebrating. */
  joyColor: HEX.joy,
  /** Pronoun (must translate cleanly). */
  pronoun: 'they/them',
} as const;

/**
 * Voice rules — enforced by lints in tests/unit/persona/quest.test.ts.
 * Keep in sync with §4 "Vocabulary range" + "What Quest says and never says".
 */
export const QUEST_VOICE = {
  maxWordsPerSentence: 7,
  preferredMaxWordsPerSentence: 5,
  targetFleschKincaid: 1.5,
  maxFleschKincaid: 2.0,
  defaultName: 'friend',
  /**
   * The player's name is allowed in Quest's speech at most this many times
   * per session. Per §4: "Player's display name appears at most once per
   * session in Quest's speech (at session-complete)."
   */
  maxNameUsagesPerSession: 1,
  /** Idle Quest is silent (no speech; only blink + bob). */
  idleSilent: true,
} as const;

/**
 * Forbidden patterns — anything matching one of these in a Quest line is a
 * persona violation. Each entry references the §4 table cell that lists the
 * offending phrase.
 */
export const FORBIDDEN_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  reason: string;
}> = [
  // First meeting — verbose register
  {
    pattern: /\bwelcome to\b/i,
    reason: '§4: avoid the "Welcome to Questerix Fractions" verbose register',
  },
  // Correct — generic praise
  {
    pattern: /\bgood job\b/i,
    reason: '§4: generic praise; name what was right instead',
  },
  // Wrong — flat negatives
  {
    pattern: /^wrong[.!?]?\s*$/i,
    reason: '§4: flat negative; use observational ("I see two parts.") instead',
  },
  {
    pattern: /^oops[.!?]?\s*$/i,
    reason: '§4: surprised negative; use observational instead',
  },
  {
    pattern: /\btry harder\b/i,
    reason: '§4: pressure phrase; offer ramp-down instead',
  },
  // Hint — never gives away
  {
    pattern: /\bthe answer is\b/i,
    reason: '§4: hints model thinking; never give the answer',
  },
  // Locked / closed-door framing
  {
    pattern: /^locked[.!?]?\s*$/i,
    reason: '§4: closed-door framing; use "Let\'s finish [region] first."',
  },
  {
    pattern: /\bcome back later\b/i,
    reason: '§4: closed-door framing; use "Let\'s finish [region] first."',
  },
  // 3-wrong recovery — pressure
  {
    pattern: /\b(don't|do not) give up\b/i,
    reason: '§4: pressure phrase; offer ramp-down instead',
  },
  // Voice rule: never starts with "Don't" or "No "
  {
    pattern: /^(don't|do not)\b/i,
    reason: '§4: Quest lines never start with "Don\'t"',
  },
  {
    pattern: /^no[\s,.!?]/i,
    reason: '§4: Quest lines never start with "No"',
  },
  // Caregiver stat leakage into the child view
  {
    pattern: /\byou earned\b[\s\S]*\bstars?\b/i,
    reason: "§4: stars belong in the caregiver chip, not in Quest's voice",
  },
];

export interface PersonaViolation {
  reason: string;
  matched: string;
}

/**
 * Validate a single Quest line. Returns an empty array when the line
 * passes all forbidden-pattern checks; otherwise returns one entry per
 * triggered pattern with the matching substring for diagnostics.
 *
 * NOTE: this complements (does not replace) the copyLinter's reading-grade
 * + sentence-length checks. Persona violation = "right shape, wrong words."
 */
export function validateQuestLine(text: string): PersonaViolation[] {
  const violations: PersonaViolation[] = [];
  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push({ reason, matched: match[0] });
    }
  }
  return violations;
}

/**
 * Resolve a player name for substitution into Quest's speech. Per §4:
 * "If display name is missing, default to 'friend.'"
 */
export function resolveQuestName(displayName: string | null | undefined): string {
  const trimmed = (displayName ?? '').trim();
  if (!trimmed) return QUEST_VOICE.defaultName;
  return trimmed;
}
