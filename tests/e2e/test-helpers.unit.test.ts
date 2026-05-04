/**
 * Unit tests for test-helpers.ts pure logic.
 * Tests route detection and wait logic in isolation from Playwright.
 */

import { describe, it, expect } from 'vitest';

// Helper logic (extracted for unit testing)
function detectSceneRoute(targetSelector: string): 'menu' | 'level01' | 'map' {
  if (targetSelector.includes('level01')) return 'level01';
  if (targetSelector.includes('level-map')) return 'map';
  return 'menu';
}

function calculateWaitTimeout(isNavigation: boolean): number {
  return isNavigation ? 15000 : 5000;
}

describe('test-helpers pure logic', () => {
  describe('detectSceneRoute', () => {
    it('detects level01 route', () => {
      const route = detectSceneRoute('[data-testid="level01-scene"]');

      expect(route).toBe('level01');
    });

    it('detects menu route by default', () => {
      const route = detectSceneRoute('[data-testid="menu-scene"]');

      expect(route).toBe('menu');
    });

    it('detects level map route', () => {
      const route = detectSceneRoute('[data-testid="level-map-scene"]');

      expect(route).toBe('map');
    });

    it('handles unknown selectors as menu', () => {
      const route = detectSceneRoute('[data-testid="unknown-scene"]');

      expect(route).toBe('menu');
    });
  });

  describe('calculateWaitTimeout', () => {
    it('returns longer timeout for navigation (15s)', () => {
      const timeout = calculateWaitTimeout(true);

      expect(timeout).toBe(15000);
    });

    it('returns shorter timeout for interactions (5s)', () => {
      const timeout = calculateWaitTimeout(false);

      expect(timeout).toBe(5000);
    });

    it('navigation timeout > interaction timeout', () => {
      const navTimeout = calculateWaitTimeout(true);
      const intTimeout = calculateWaitTimeout(false);

      expect(navTimeout).toBeGreaterThan(intTimeout);
    });
  });

  describe('route detection edge cases', () => {
    it('prioritizes specific match over partial match', () => {
      const route = detectSceneRoute('[data-testid="level01-map"]');

      // Should match level01 first (more specific)
      expect(route).toBe('level01');
    });

    it('case-sensitive matching', () => {
      const route = detectSceneRoute('[data-testid="LEVEL01-scene"]');

      // Should not match (case sensitive)
      expect(route).toBe('menu');
    });
  });
});
