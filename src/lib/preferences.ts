/**
 * Preference cache — runtime storage for accessibility preferences.
 * Populated at boot from DeviceMetaRepo; updated when Settings changes.
 * per accessibility.md §4 (reduce motion), §6 (high contrast)
 */

import { deviceMetaRepo } from '../persistence/repositories/deviceMeta';

interface PreferenceCache {
  reduceMotion: boolean;
  highContrast: boolean;
}

let cache: PreferenceCache | null = null;

/**
 * Boot: fetch preferences from DeviceMetaRepo and cache locally.
 * Call once at app startup (e.g., in Game boot scene).
 */
export async function initPreferences(): Promise<void> {
  try {
    const meta = await deviceMetaRepo.get();
    cache = {
      reduceMotion: meta.preferences.reduceMotion ?? false,
      highContrast: meta.preferences.highContrast ?? false,
    };
    applyContrastMode(cache.highContrast);
  } catch (err) {
    // DB not ready — initialize defaults
    cache = {
      reduceMotion: false,
      highContrast: false,
    };
  }
}

/**
 * Runtime accessor for reduceMotion (OS + cache).
 * Returns true if either OS or cached preference is enabled.
 */
export function checkReduceMotion(): boolean {
  const osPrefers = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!cache) return osPrefers; // cache not initialised yet — fall back to OS only
  return osPrefers || cache.reduceMotion;
}

/**
 * Update cache when Settings changes.
 * Called by SettingsScene after deviceMetaRepo.updatePreferences().
 */
export async function updatePreferences(updates: Partial<PreferenceCache>): Promise<void> {
  if (!cache) await initPreferences();
  if (updates.reduceMotion !== undefined) {
    cache!.reduceMotion = updates.reduceMotion;
  }
  if (updates.highContrast !== undefined) {
    cache!.highContrast = updates.highContrast;
    applyContrastMode(updates.highContrast);
  }
}

/**
 * Apply high-contrast mode CSS class to <body> (C6.5).
 * When true, applies .qf-high-contrast class which uses colors-high-contrast.ts palette.
 */
function applyContrastMode(enabled: boolean): void {
  const body = document.body;
  if (enabled) {
    body.classList.add('qf-high-contrast');
  } else {
    body.classList.remove('qf-high-contrast');
  }
}

/**
 * Get current high contrast mode.
 */
export function isHighContrastEnabled(): boolean {
  return cache?.highContrast ?? false;
}
