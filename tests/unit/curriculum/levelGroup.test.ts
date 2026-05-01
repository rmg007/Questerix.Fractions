/**
 * Unit tests for the shared `deriveLevelGroup` helper.
 *
 * Covers every level (L1–L9) and the malformed-ID warn-and-default branch.
 * Per PLANS/code-quality-2026-05-01.md Phase 8.5 + harden-and-polish R14.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deriveLevelGroup, type LevelGroup } from '@/curriculum/levelGroup';

describe('deriveLevelGroup', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('canonical IDs', () => {
    const cases: ReadonlyArray<readonly [string, LevelGroup]> = [
      ['q:pt:L1:0001', '01-02'],
      ['q:pt:L2:0042', '01-02'],
      ['q:id:L3:0001', '03-05'],
      ['q:id:L4:0099', '03-05'],
      ['q:cm:L5:0123', '03-05'],
      ['q:cm:L6:0001', '06-09'],
      ['q:or:L7:0050', '06-09'],
      ['q:or:L8:0007', '06-09'],
      ['q:ex:L9:0900', '06-09'],
    ];

    for (const [id, expected] of cases) {
      it(`maps ${id} → ${expected}`, () => {
        expect(deriveLevelGroup(id)).toBe(expected);
        expect(warnSpy).not.toHaveBeenCalled();
      });
    }
  });

  describe('boundary behavior', () => {
    it('treats L2 as the upper edge of 01-02', () => {
      expect(deriveLevelGroup('q:x:L2:0001')).toBe('01-02');
    });

    it('treats L3 as the lower edge of 03-05', () => {
      expect(deriveLevelGroup('q:x:L3:0001')).toBe('03-05');
    });

    it('treats L5 as the upper edge of 03-05', () => {
      expect(deriveLevelGroup('q:x:L5:0001')).toBe('03-05');
    });

    it('treats L6 as the lower edge of 06-09', () => {
      expect(deriveLevelGroup('q:x:L6:0001')).toBe('06-09');
    });
  });

  describe('case-insensitive prefix', () => {
    it('accepts lowercase l<N>:', () => {
      expect(deriveLevelGroup('q:x:l4:0001')).toBe('03-05');
    });
  });

  describe('out-of-range levels (defensive)', () => {
    // The function is total: any level > 5 falls through to '06-09'.
    it('returns 06-09 for levels above 9', () => {
      expect(deriveLevelGroup('q:x:L10:0001')).toBe('06-09');
      expect(deriveLevelGroup('q:x:L99:0001')).toBe('06-09');
    });
  });

  describe('malformed IDs', () => {
    it('warns and defaults to 01-02 when no L<N>: pattern is present', () => {
      const result = deriveLevelGroup('not-a-template-id');
      expect(result).toBe('01-02');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toMatch(/Failed to extract level/);
    });

    it('warns and defaults to 01-02 for empty input', () => {
      const result = deriveLevelGroup('');
      expect(result).toBe('01-02');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('warns and defaults when the L marker is missing the colon', () => {
      // Regex requires `L\d+:` — `L3` alone should not match.
      const result = deriveLevelGroup('q:x:L3-0001');
      expect(result).toBe('01-02');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
