/**
 * Unit tests for mascotCopy — mastery-aware mascot copy strings for L1 hint tiers.
 */

import { describe, it, expect } from 'vitest';
import { getMascotCopy } from '@/lib/mascotCopy';

describe('mascotCopy', () => {
  it('returns verbal tier copy for tier 0', () => {
    const copy = getMascotCopy({ tier: 0, mastery: 0.5 });

    expect(copy).toBeDefined();
    expect(copy.length).toBeGreaterThan(0);
  });

  it('returns visual tier copy for tier 1', () => {
    const copy = getMascotCopy({ tier: 1, mastery: 0.5 });

    expect(copy).toBeDefined();
    expect(copy.length).toBeGreaterThan(0);
  });

  it('returns worked example copy for tier 2', () => {
    const copy = getMascotCopy({ tier: 2, mastery: 0.5 });

    expect(copy).toBeDefined();
    expect(copy.length).toBeGreaterThan(0);
  });

  it('adapts copy based on mastery level', () => {
    const lowMasteryCopy = getMascotCopy({ tier: 0, mastery: 0.2 });
    const highMasteryCopy = getMascotCopy({ tier: 0, mastery: 0.8 });

    // Different mastery levels should produce different encouragement
    expect(lowMasteryCopy).not.toBe(highMasteryCopy);
  });

  it('handles undefined mastery gracefully', () => {
    const copy = getMascotCopy({ tier: 0, mastery: undefined });

    expect(copy).toBeDefined();
  });

  it('handles mastery at boundaries (0, 1)', () => {
    const copyAt0 = getMascotCopy({ tier: 0, mastery: 0 });
    const copyAt1 = getMascotCopy({ tier: 0, mastery: 1 });

    expect(copyAt0).toBeDefined();
    expect(copyAt1).toBeDefined();
  });

  it('returns K-2 grade-appropriate copy', () => {
    const copy = getMascotCopy({ tier: 0, mastery: 0.5 });

    // Should not contain complex words
    const complexWords = ['therefore', 'consequently', 'however'];
    const hasComplex = complexWords.some((word) => copy.toLowerCase().includes(word));

    expect(hasComplex).toBe(false);
  });

  it('all copy is under 7 words per sentence', () => {
    const copy = getMascotCopy({ tier: 0, mastery: 0.5 });

    const sentences = copy.split(/[.!?]+/);
    const allShort = sentences.every((s) => s.trim().split(/\s+/).length <= 7);

    expect(allShort).toBe(true);
  });
});
