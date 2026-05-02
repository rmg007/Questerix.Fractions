/**
 * DeviceMeta repository — singleton with id="device".
 * Tracks backup timestamps, preferences, and sync state.
 * per persistence-spec.md §5 (bootstrap), §3.2 (persist grant)
 */

import { db } from '../db';
import { log } from '../../lib/log';
import type { DeviceMeta } from '../../types';

const DEVICE_ID = 'device';

const DEFAULT_META: DeviceMeta = {
  installId: DEVICE_ID,
  schemaVersion: 1,
  contentVersion: '0.0.0',
  preferences: {
    audio: true,
    volume: 0.8,
    reduceMotion: false,
    highContrast: false,
    ttsLocale: 'en-US',
    ttsEnabled: true,
    largeTouchTargets: false,
    telemetryConsent: false,
    persistGranted: false,
    unlockGateBypass: false,
  },
  lastBackupAt: null,
  lastRestoredAt: null,
  pendingSyncCount: 0,
  syncState: 'local',
  onboardingComplete: false,
};

/**
 * Read the legacy `questerix.onboardingSeen` localStorage flag. The v7
 * upgrade callback in db.ts handles the migration for installs that already
 * have a deviceMeta row, but fresh installs reach this lazy-create branch
 * with an empty table — the upgrade's `.modify()` was a no-op there. Honoring
 * the flag here closes that gap so e2e tests (and any user upgrading after a
 * DB wipe) skip onboarding consistently.
 */
function readLegacyOnboardingFlag(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('questerix.onboardingSeen') === '1';
  } catch {
    return false;
  }
}

export const deviceMetaRepo = {
  /**
   * Returns the singleton DeviceMeta, creating it lazily with defaults if absent.
   * per persistence-spec.md §5 (bootstrap §2)
   */
  async get(): Promise<DeviceMeta> {
    try {
      const existing = await db.deviceMeta.get(DEVICE_ID);
      if (existing) return existing;
      const seed: DeviceMeta = readLegacyOnboardingFlag()
        ? { ...DEFAULT_META, onboardingComplete: true }
        : { ...DEFAULT_META };
      try {
        await db.deviceMeta.add(seed);
        return seed;
      } catch (writeErr) {
        if (writeErr instanceof DOMException && writeErr.name === 'QuotaExceededError') {
          log.warn('DB', 'quota_exceeded', { table: 'deviceMeta' });
        }
        // Duplicate-key race: another caller created the row first. Re-read
        // so we return the canonical persisted values rather than our seed
        // (which could differ if the other caller used different defaults).
        const raced = await db.deviceMeta.get(DEVICE_ID);
        if (raced) return raced;
        return seed;
      }
    } catch (err) {
      return { ...DEFAULT_META };
    }
  },

  /**
   * Merge patch into the singleton row.
   */
  async update(patch: Partial<Omit<DeviceMeta, 'installId'>>): Promise<boolean> {
    try {
      // Ensure the singleton exists before updating
      await deviceMetaRepo.get();
      const updated = await db.deviceMeta.update(DEVICE_ID, patch);
      return updated > 0;
    } catch (err) {
      return false;
    }
  },

  /**
   * Whether the user has completed the onboarding flow on this device.
   * Replaces the `questerix.onboardingSeen` localStorage key (C5).
   */
  async getOnboardingComplete(): Promise<boolean> {
    try {
      const meta = await deviceMetaRepo.get();
      return meta.onboardingComplete === true;
    } catch {
      return false;
    }
  },

  /**
   * Mark the onboarding flow complete (or reset it) for this device.
   * Returns true on success.
   */
  async setOnboardingComplete(value: boolean): Promise<boolean> {
    return deviceMetaRepo.update({ onboardingComplete: value });
  },

  /**
   * Updates specific preference fields atomically via Dexie transaction.
   * Wraps the entire read-modify-write sequence in a transaction to ensure
   * concurrent updates from multiple callers (e.g., BootScene + Level01Scene)
   * don't lose updates (R16).
   */
  async updatePreferences(prefPatch: Partial<DeviceMeta['preferences']>): Promise<boolean> {
    try {
      return await db.transaction('rw', db.deviceMeta, async () => {
        // Atomically read-modify-write within the transaction.
        let existing = await db.deviceMeta.get(DEVICE_ID);
        if (!existing) {
          // Lazy create. Honor the legacy onboarding flag here too — when
          // BootScene's `updatePreferences({ persistGranted })` is the first
          // path to materialize the row (which is the common case on a fresh
          // install), `get()`'s legacy-flag branch never runs. Without this,
          // e2e specs that pre-seed `questerix.onboardingSeen=1` would still
          // see `onboardingComplete: false`.
          const seed: DeviceMeta = readLegacyOnboardingFlag()
            ? { ...DEFAULT_META, onboardingComplete: true }
            : { ...DEFAULT_META };
          try {
            await db.deviceMeta.add(seed);
            existing = seed;
          } catch (writeErr) {
            if (writeErr instanceof DOMException && writeErr.name === 'QuotaExceededError') {
              log.warn('DB', 'quota_exceeded', { table: 'deviceMeta' });
            }
            // Duplicate-key race: another caller created the row first.
            const raced = await db.deviceMeta.get(DEVICE_ID);
            existing = raced ?? seed;
          }
        }

        // Merge the patch into preferences and update.
        const updated = await db.deviceMeta.update(DEVICE_ID, {
          preferences: { ...existing.preferences, ...prefPatch },
        });
        return updated > 0;
      });
    } catch (err) {
      console.error('[deviceMetaRepo] updatePreferences failed:', err);
      return false;
    }
  },
};
