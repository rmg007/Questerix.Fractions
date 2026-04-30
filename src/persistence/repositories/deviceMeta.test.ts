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
});
