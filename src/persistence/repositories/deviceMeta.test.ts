import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { deviceMetaRepo } from './deviceMeta';

describe('deviceMetaRepo', () => {
  beforeEach(async () => {
    // Reset DB for each test if using fake-indexeddb
    await db.deviceMeta.clear();
  });

  it('should persist persistGranted preference', async () => {
    // Initial state
    const meta1 = await deviceMetaRepo.get();
    expect(meta1.preferences.persistGranted).toBe(false);

    // Update
    await deviceMetaRepo.updatePreferences({ persistGranted: true });

    // Verify
    const meta2 = await deviceMetaRepo.get();
    expect(meta2.preferences.persistGranted).toBe(true);

    // Double verify directly from DB
    const dbRow = await db.deviceMeta.get('device');
    expect(dbRow?.preferences.persistGranted).toBe(true);
  });

  it('should persist ttsEnabled preference and default to true', async () => {
    // Initial state — TTS should default to true
    const meta1 = await deviceMetaRepo.get();
    expect(meta1.preferences.ttsEnabled).toBe(true);

    // Update to false
    await deviceMetaRepo.updatePreferences({ ttsEnabled: false });

    // Verify
    const meta2 = await deviceMetaRepo.get();
    expect(meta2.preferences.ttsEnabled).toBe(false);

    // Double verify directly from DB
    const dbRow = await db.deviceMeta.get('device');
    expect(dbRow?.preferences.ttsEnabled).toBe(false);
  });

  it('should allow independent toggling of audio and ttsEnabled', async () => {
    // Both should default to true
    const meta1 = await deviceMetaRepo.get();
    expect(meta1.preferences.audio).toBe(true);
    expect(meta1.preferences.ttsEnabled).toBe(true);

    // Turn off audio but keep TTS enabled
    await deviceMetaRepo.updatePreferences({ audio: false });

    // Verify audio is off but TTS is still on in preferences
    const meta2 = await deviceMetaRepo.get();
    expect(meta2.preferences.audio).toBe(false);
    expect(meta2.preferences.ttsEnabled).toBe(true);

    // Turn off TTS but audio is still off
    await deviceMetaRepo.updatePreferences({ ttsEnabled: false });

    // Verify both are off
    const meta3 = await deviceMetaRepo.get();
    expect(meta3.preferences.audio).toBe(false);
    expect(meta3.preferences.ttsEnabled).toBe(false);
  });
});
