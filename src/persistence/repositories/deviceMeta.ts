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
    reduceMotion: false,
    highContrast: false,
    ttsLocale: 'en-US',
    largeTouchTargets: false,
    persistGranted: false,
  },
  lastBackupAt: null,
  lastRestoredAt: null,
  pendingSyncCount: 0,
  syncState: 'local',
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
    } catch {
      return { ...DEFAULT_META };
    }
  },

  /**
   * Merge patch into the singleton row. Shallow-merges preferences sub-object.
   */
  async update(patch: Partial<Omit<DeviceMeta, 'installId'>>): Promise<boolean> {
    try {
      // Ensure the singleton exists before updating
      await deviceMetaRepo.get();
      const updated = await db.deviceMeta.update(DEVICE_ID, patch);
      return updated > 0;
    } catch {
      return false;
    }
  },

  async updatePreferences(prefPatch: Partial<DeviceMeta['preferences']>): Promise<boolean> {
    try {
      const current = await deviceMetaRepo.get();
      return deviceMetaRepo.update({
        preferences: { ...current.preferences, ...prefPatch },
      });
    } catch {
      return false;
    }
  },
};
