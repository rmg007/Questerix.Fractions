/**
 * Unit tests for unlockGate — level unlock evaluation logic.
 * Tests 60% raw score OR 3-session escape hatch OR researcher bypass.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLevelUnlock } from '@/lib/unlockGate';

describe('unlockGate', () => {
  it('unlocks level when raw score >= 60%', () => {
    const result = evaluateLevelUnlock({
      rawScore: 0.6,
      sessionFailureCount: 0,
      bypassResearcherGate: false,
    });

    expect(result).toBe(true);
  });

  it('unlocks level when raw score > 60%', () => {
    const result = evaluateLevelUnlock({
      rawScore: 0.85,
      sessionFailureCount: 0,
      bypassResearcherGate: false,
    });

    expect(result).toBe(true);
  });

  it('unlocks level when session failure count >= 3 (escape hatch)', () => {
    const result = evaluateLevelUnlock({
      rawScore: 0.2, // below threshold
      sessionFailureCount: 3,
      bypassResearcherGate: false,
    });

    expect(result).toBe(true);
  });

  it('unlocks level when researcher gate is enabled', () => {
    const result = evaluateLevelUnlock({
      rawScore: 0.0,
      sessionFailureCount: 0,
      bypassResearcherGate: true,
    });

    expect(result).toBe(true);
  });

  it('does not unlock level at boundary 59.9% without escape hatch', () => {
    const result = evaluateLevelUnlock({
      rawScore: 0.599,
      sessionFailureCount: 0,
      bypassResearcherGate: false,
    });

    expect(result).toBe(false);
  });

  it('does not unlock level at 0% without escape hatch', () => {
    const result = evaluateLevelUnlock({
      rawScore: 0,
      sessionFailureCount: 0,
      bypassResearcherGate: false,
    });

    expect(result).toBe(false);
  });

  it('handles undefined score as 0%', () => {
    const result = evaluateLevelUnlock({
      rawScore: undefined,
      sessionFailureCount: 0,
      bypassResearcherGate: false,
    });

    expect(result).toBe(false);
  });

  it('gates on failure count at exactly 3', () => {
    const result = evaluateLevelUnlock({
      rawScore: 0.1,
      sessionFailureCount: 3,
      bypassResearcherGate: false,
    });

    expect(result).toBe(true);
  });

  it('does not gate on failure count at 2', () => {
    const result = evaluateLevelUnlock({
      rawScore: 0.1,
      sessionFailureCount: 2,
      bypassResearcherGate: false,
    });

    expect(result).toBe(false);
  });
});
