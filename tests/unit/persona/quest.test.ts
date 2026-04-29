/**
 * Tests for the Quest persona constants + validators (ux-elevation §4 / T2).
 */

import { describe, expect, it } from 'vitest';
import {
  QUEST_IDENTITY,
  QUEST_VOICE,
  FORBIDDEN_PATTERNS,
  validateQuestLine,
  resolveQuestName,
} from '@/lib/persona/quest';

describe('QUEST_IDENTITY constants', () => {
  it('uses they/them pronoun', () => {
    expect(QUEST_IDENTITY.pronoun).toBe('they/them');
  });

  it('is a 5-point star at default size 80', () => {
    expect(QUEST_IDENTITY.form).toBe('5-point-star');
    expect(QUEST_IDENTITY.defaultSize).toBe(80);
  });

  it('uses the §4 palette references (gold body, coral cheeks, joy smile)', () => {
    // Only validate the structure — actual hex values come from colors.ts
    // and are tested there.
    expect(typeof QUEST_IDENTITY.bodyColor).toBe('string');
    expect(typeof QUEST_IDENTITY.cheekColor).toBe('string');
    expect(typeof QUEST_IDENTITY.joyColor).toBe('string');
    expect(QUEST_IDENTITY.bodyColor).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

describe('QUEST_VOICE rules', () => {
  it('caps at 7 words per sentence (matches §4)', () => {
    expect(QUEST_VOICE.maxWordsPerSentence).toBe(7);
    expect(QUEST_VOICE.preferredMaxWordsPerSentence).toBe(5);
  });

  it('targets FK 1.5 with hard cap 2.0 (matches §4 + copyLinter)', () => {
    expect(QUEST_VOICE.targetFleschKincaid).toBe(1.5);
    expect(QUEST_VOICE.maxFleschKincaid).toBe(2.0);
  });

  it('allows the player name at most once per session', () => {
    expect(QUEST_VOICE.maxNameUsagesPerSession).toBe(1);
  });

  it('declares idle Quest silent', () => {
    expect(QUEST_VOICE.idleSilent).toBe(true);
  });

  it('uses "friend" as the default name (never "user" or "kid")', () => {
    expect(QUEST_VOICE.defaultName).toBe('friend');
  });
});

describe('validateQuestLine — rejects every "Quest never says" example from §4', () => {
  // These are taken verbatim from the §4 table's right column.
  const forbidden: Array<{ label: string; line: string }> = [
    {
      label: 'verbose welcome',
      line: 'Welcome to Questerix Fractions, the educational adventure!',
    },
    { label: 'generic praise', line: 'Good job!' },
    { label: 'flat wrong', line: 'Wrong.' },
    { label: 'flat oops', line: 'Oops!' },
    { label: 'try harder', line: 'Try harder.' },
    { label: 'gives answer', line: 'The answer is 1/2.' },
    { label: 'don’t give up', line: "Don't give up!" },
    { label: "starts with don't", line: "Don't worry about it." },
    { label: 'starts with no', line: 'No, that is not right.' },
    { label: 'locked closed-door', line: 'Locked.' },
    { label: 'come back later', line: 'Come back later.' },
    { label: 'caregiver stars in child view', line: 'You earned 3 stars!' },
  ];

  for (const { label, line } of forbidden) {
    it(`rejects "${label}": "${line}"`, () => {
      const v = validateQuestLine(line);
      expect(v.length).toBeGreaterThan(0);
    });
  }
});

describe('validateQuestLine — accepts every "Quest says" example from §4', () => {
  const allowed: string[] = [
    "Hi! I'm Quest.",
    "Yes! That's a half.",
    'Try again. I see two parts.',
    'Hmm. I can split this in two.',
    'This one is tricky. Want a smaller one?',
    'We made it whole, friend!',
    "Let's finish Halves Forest first.",
  ];

  for (const line of allowed) {
    it(`accepts: "${line}"`, () => {
      expect(validateQuestLine(line)).toEqual([]);
    });
  }
});

describe('FORBIDDEN_PATTERNS', () => {
  it('every entry has a §4 reason annotation', () => {
    for (const entry of FORBIDDEN_PATTERNS) {
      expect(entry.reason).toMatch(/§4/);
      expect(entry.pattern).toBeInstanceOf(RegExp);
    }
  });
});

describe('resolveQuestName', () => {
  it('returns the trimmed display name when present', () => {
    expect(resolveQuestName('Sam')).toBe('Sam');
    expect(resolveQuestName('  Sam  ')).toBe('Sam');
  });

  it('falls back to "friend" when missing or blank', () => {
    expect(resolveQuestName(null)).toBe('friend');
    expect(resolveQuestName(undefined)).toBe('friend');
    expect(resolveQuestName('')).toBe('friend');
    expect(resolveQuestName('   ')).toBe('friend');
  });
});
