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

export const deviceMetaRepo = {
  /**
   * Returns the singleton DeviceMeta, creating it lazily with defaults if absent.
   * per persistence-spec.md §5 (bootstrap §2)
   */
  async get(): Promise<DeviceMeta> {
    try {
      const existing = await db.deviceMeta.get(DEVICE_ID);
      if (existing) return existing;
      try {
        await db.deviceMeta.add(DEFAULT_META);
      } catch (writeErr) {
        if (writeErr instanceof DOMException && writeErr.name === 'QuotaExceededError') {
          log.warn('DB', 'quota_exceeded', { table: 'deviceMeta' });
        }
        // Either quota or duplicate-key (race): fall through and return defaults
      }
      return { ...DEFAULT_META };
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
        // Ensure the singleton exists
        await deviceMetaRepo.get();

        // Transform { audio: true } into { 'preferences.audio': true } for Dexie atomic update
        const atomicPatch: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(prefPatch)) {
          atomicPatch[`preferences.${k}`] = v;
        }

        const updated = await db.deviceMeta.update(DEVICE_ID, atomicPatch);
        return updated > 0;
      });
    } catch (err) {
      console.error('[deviceMetaRepo] updatePreferences failed:', err);
      return false;
    }
  },
};
