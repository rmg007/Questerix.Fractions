/**
 * DeviceMeta repository — singleton with id="device".
 * Tracks backup timestamps, preferences, and sync state.
 * per persistence-spec.md §5 (bootstrap), §3.2 (persist grant)
 */

import { db } from '../db';
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
    largeTouchTargets: false,
    telemetryConsent: false,
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
      await db.deviceMeta.add(DEFAULT_META);
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
   * Updates specific preference fields atomically using Dexie dot-notation.
   * Prevents race conditions where concurrent updates overwrite each other's preference merges.
   */
  async updatePreferences(prefPatch: Partial<DeviceMeta['preferences']>): Promise<boolean> {
    try {
      // Ensure the singleton exists
      await deviceMetaRepo.get();

      // Transform { audio: true } into { 'preferences.audio': true } for Dexie atomic update
      const atomicPatch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(prefPatch)) {
        atomicPatch[`preferences.${k}`] = v;
      }

      const updated = await db.deviceMeta.update(DEVICE_ID, atomicPatch);
      return updated > 0;
    } catch (err) {
      console.error('[deviceMetaRepo] updatePreferences failed:', err);
      return false;
    }
  },
};
