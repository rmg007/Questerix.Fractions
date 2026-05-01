/**
 * Preference cache — runtime storage for accessibility preferences.
 * Populated at boot from DeviceMetaRepo; updated when Settings changes.
 * per accessibility.md §4 (reduce motion), §6 (high contrast)
 */

import { deviceMetaRepo } from '../persistence/repositories/deviceMeta';

interface PreferenceCache {
  reduceMotion: boolean;
  highContrast: boolean;
  /**
   * Phase 2a (D-1) researcher escape hatch. When true the level-unlock gate
   * short-circuits and every "next level" advances. Toggled by triple-tapping
   * the SettingsScene version label.
   */
  unlockGateBypass: boolean;
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
      unlockGateBypass: meta.preferences.unlockGateBypass ?? false,
    };
    applyContrastMode(cache.highContrast);
  } catch (err) {
    // DB not ready — initialize defaults
    cache = {
      reduceMotion: false,
      highContrast: false,
      unlockGateBypass: false,
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
  if (updates.unlockGateBypass !== undefined) {
    cache!.unlockGateBypass = updates.unlockGateBypass;
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

/**
 * Phase 2a (D-1): runtime accessor for the researcher unlock-gate bypass.
 * Returns the cached value; falls back to false if the cache hasn't been
 * primed yet (e.g. in unit tests that never called initPreferences()).
 */
export function isUnlockGateBypassEnabled(): boolean {
  return cache?.unlockGateBypass ?? false;
}

/**
 * Phase 2a (D-1): toggle the researcher unlock-gate bypass and persist the
 * new value via deviceMetaRepo. Returns the resulting boolean so the caller
 * can render an immediate confirmation toast.
 */
export async function toggleUnlockGateBypass(): Promise<boolean> {
  if (!cache) await initPreferences();
  const next = !cache!.unlockGateBypass;
  cache!.unlockGateBypass = next;
  try {
    await deviceMetaRepo.updatePreferences({ unlockGateBypass: next });
  } catch {
    // Best-effort persistence — the in-memory cache still reflects the toggle
    // so the rest of the session honours the researcher's intent.
  }
  return next;
}
