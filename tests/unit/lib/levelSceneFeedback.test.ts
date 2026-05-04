/**
 * Unit tests for levelSceneFeedback — determines feedback kind and generates text.
 */

import { describe, it, expect } from 'vitest';
import { determineFeedbackKind, generateFeedbackText } from '@/lib/levelSceneFeedback';
import type { ValidatorResult } from '@/types';

describe('levelSceneFeedback', () => {
  describe('determineFeedbackKind', () => {
    it('returns "correct" for outcome = correct', () => {
      const result: ValidatorResult = {
        outcome: 'correct',
        score: 1,
        misconception: null,
      };

      const kind = determineFeedbackKind(result);

      expect(kind).toBe('correct');
    });

    it('returns "incorrect" for outcome = incorrect', () => {
      const result: ValidatorResult = {
        outcome: 'incorrect',
        score: 0,
        misconception: 'MC-*',
      };

      const kind = determineFeedbackKind(result);

      expect(kind).toBe('incorrect');
    });

    it('returns "close" for outcome = close', () => {
      const result: ValidatorResult = {
        outcome: 'close',
        score: 0.5,
        misconception: null,
      };

      const kind = determineFeedbackKind(result);

      expect(kind).toBe('close');
    });

    it('handles undefined outcome gracefully', () => {
      const result: ValidatorResult = {
        outcome: undefined,
        score: 0,
        misconception: null,
      };

      const kind = determineFeedbackKind(result);

      expect(kind).toBeDefined();
    });
  });

  describe('generateFeedbackText', () => {
    it('generates positive feedback for correct', () => {
      const text = generateFeedbackText({
        kind: 'correct',
        score: 1,
        misconception: null,
      });

      expect(text).toBeDefined();
      expect(text.length).toBeGreaterThan(0);
    });

    it('generates encouraging feedback for incorrect', () => {
      const text = generateFeedbackText({
        kind: 'incorrect',
        score: 0,
        misconception: 'MC-*',
      });

      expect(text).toBeDefined();
      expect(text.length).toBeGreaterThan(0);
    });

    it('generates partial credit feedback for close', () => {
      const text = generateFeedbackText({
        kind: 'close',
        score: 0.5,
        misconception: null,
      });

      expect(text).toBeDefined();
      expect(text.length).toBeGreaterThan(0);
    });

    it('tailors feedback based on misconception flag', () => {
      const textWithMC = generateFeedbackText({
        kind: 'incorrect',
        score: 0,
        misconception: 'MC-PHB-101', // specific misconception
      });

      const textWithoutMC = generateFeedbackText({
        kind: 'incorrect',
        score: 0,
        misconception: null,
      });

      // With misconception should reference it
      expect(textWithMC).not.toBe(textWithoutMC);
    });

    it('keeps feedback under K-2 reading level', () => {
      const text = generateFeedbackText({
        kind: 'correct',
        score: 1,
        misconception: null,
      });

      // Should be max ~7 words per sentence
      const sentences = text.split(/[.!?]+/);
      const allShort = sentences.every((s) => s.trim().split(/\s+/).length <= 7);

      expect(allShort).toBe(true);
    });
  });
});
