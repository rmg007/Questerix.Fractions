/**
 * Unit tests for preferences — accessibility preference cache (IndexedDB-backed).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PreferenceCache } from '@/lib/preferences';

describe('PreferenceCache', () => {
  let cache: PreferenceCache;

  beforeEach(async () => {
    cache = new PreferenceCache();
    await cache.clear();
  });

  afterEach(async () => {
    await cache.clear();
  });

  it('reads and writes reduce-motion preference', async () => {
    await cache.setReduceMotion(true);
    const value = await cache.getReduceMotion();

    expect(value).toBe(true);
  });

  it('reads and writes high-contrast preference', async () => {
    await cache.setHighContrast(true);
    const value = await cache.getHighContrast();

    expect(value).toBe(true);
  });

  it('defaults reduce-motion to false', async () => {
    const value = await cache.getReduceMotion();

    expect(value).toBe(false);
  });

  it('defaults high-contrast to false', async () => {
    const value = await cache.getHighContrast();

    expect(value).toBe(false);
  });

  it('persists across cache instances', async () => {
    await cache.setReduceMotion(true);

    const cache2 = new PreferenceCache();
    const value = await cache2.getReduceMotion();

    expect(value).toBe(true);
  });

  it('handles concurrent reads gracefully', async () => {
    await cache.setHighContrast(true);

    const results = await Promise.all([
      cache.getHighContrast(),
      cache.getHighContrast(),
      cache.getHighContrast(),
    ]);

    expect(results).toEqual([true, true, true]);
  });

  it('clears all preferences', async () => {
    await cache.setReduceMotion(true);
    await cache.setHighContrast(true);

    await cache.clear();

    expect(await cache.getReduceMotion()).toBe(false);
    expect(await cache.getHighContrast()).toBe(false);
  });

  it('handles corrupted cache gracefully', async () => {
    // Simulate corrupted state
    (cache as any).corrupted = true;

    const value = await cache.getReduceMotion();

    // Should fall back to default
    expect(value).toBe(false);
  });
});
