import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { backupToFile, restoreFromFile } from '@/persistence/backup';
import { db } from '@/persistence/db';

describe('Backup/Restore Coverage', () => {
  beforeEach(async () => {
    await db.students.clear();
    await db.sessions.clear();
    await db.deviceMeta.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('backupToFile handles session chunking', async () => {
    // Create 1001 sessions
    const sessions = [];
    for (let i = 0; i < 1005; i++) {
      sessions.push({
        id: `s${i}`,
        studentId: 'st1',
        startedAt: i,
        lastModifiedAt: i,
        status: 'completed',
        accuracy: 1,
        durationMs: 1000,
        questId: 'q1',
        totalQuestions: 10,
      });
    }
    await db.sessions.bulkAdd(sessions as any);

    const blob = await backupToFile();
    const text = await blob.text();
    const data = JSON.parse(text);

    expect(data.tables.sessions.length).toBe(1000);
  });

  it('restoreFromFile handles invalid JSON', async () => {
    const file = new File(['invalid json'], 'backup.json', { type: 'application/json' });
    await expect(restoreFromFile(file)).rejects.toThrow('backup.restore: invalid JSON');
  });

  it('restoreFromFile handles version mismatch', async () => {
    const content = JSON.stringify({
      version: 999,
      exportedAt: Date.now(),
      tables: { students: [] },
    });
    const file = new File([content], 'backup.json', { type: 'application/json' });
    await expect(restoreFromFile(file)).rejects.toThrow(
      'backup.restore: unsupported schema version'
    );
  });

  it('restoreFromFile handles PK collisions in tryAddAll', async () => {
    const student = {
      id: 'st1',
      displayName: 'Original',
      avatarConfig: {},
      gradeLevel: 1 as const,
      localOnly: true,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      syncState: 'local' as const,
    };
    await db.students.add(student as any);

    const backupContent = {
      version: 1,
      exportedAt: Date.now(),
      tables: {
        students: [{ ...student, displayName: 'Backup' }],
        sessions: [],
        attempts: [],
        skillMastery: [],
        deviceMeta: [],
        bookmarks: [],
        sessionTelemetry: [],
        hintEvents: [],
        misconceptionFlags: [],
        progressionStat: [],
        levelProgression: [],
        streakRecord: [],
        telemetryEvents: [],
      },
    };
    const file = new File([JSON.stringify(backupContent)], 'backup.json', {
      type: 'application/json',
    });

    const result = await restoreFromFile(file);
    expect(result.skipped).toBe(1);

    const stored = await db.students.get('st1');
    expect(stored?.displayName).toBe('Original'); // Not overwritten
  });

  it('restoreFromFile handles deviceMeta merge (newer live)', async () => {
    const installId = 'inst1';
    await db.deviceMeta.add({
      installId,
      lastBackupAt: 2000,
      lastRestoredAt: null,
      syncState: 'local',
      schemaVersion: 1,
      contentVersion: '1.0',
      pendingSyncCount: 0,
      onboardingComplete: false,
      preferences: {
        audio: true,
        volume: 0.8,
        reduceMotion: false,
        highContrast: false,
        ttsLocale: 'en-US',
        ttsEnabled: true,
        largeTouchTargets: false,
        telemetryConsent: false,
        persistGranted: true,
      },
    } as any);

    const backupContent = {
      version: 1,
      exportedAt: Date.now(),
      tables: {
        students: [],
        sessions: [],
        attempts: [],
        skillMastery: [],
        bookmarks: [],
        sessionTelemetry: [],
        hintEvents: [],
        misconceptionFlags: [],
        progressionStat: [],
        levelProgression: [],
        streakRecord: [],
        telemetryEvents: [],
        deviceMeta: [
          {
            installId,
            lastBackupAt: 1000,
            syncState: 'local',
            schemaVersion: 1,
            contentVersion: '1.0',
            pendingSyncCount: 0,
          },
        ],
      },
    };
    const file = new File([JSON.stringify(backupContent)], 'backup.json', {
      type: 'application/json',
    });

    await restoreFromFile(file);
    const stored = await db.deviceMeta.get(installId);
    expect(stored?.lastBackupAt).toBe(2000); // Live was newer
  });

  it('restoreFromFile handles deviceMeta merge (newer backup)', async () => {
    const installId = 'inst2';
    await db.deviceMeta.add({
      installId,
      lastBackupAt: 1000,
      lastRestoredAt: null,
      syncState: 'local',
      schemaVersion: 1,
      contentVersion: '1.0',
      pendingSyncCount: 0,
      onboardingComplete: false,
      preferences: {
        audio: true,
        volume: 0.8,
        reduceMotion: false,
        highContrast: false,
        ttsLocale: 'en-US',
        ttsEnabled: true,
        largeTouchTargets: false,
        telemetryConsent: false,
        persistGranted: true,
      },
    } as any);

    const backupContent = {
      version: 1,
      exportedAt: Date.now(),
      tables: {
        students: [],
        sessions: [],
        attempts: [],
        skillMastery: [],
        bookmarks: [],
        sessionTelemetry: [],
        hintEvents: [],
        misconceptionFlags: [],
        progressionStat: [],
        levelProgression: [],
        streakRecord: [],
        telemetryEvents: [],
        deviceMeta: [
          {
            installId,
            lastBackupAt: 3000,
            syncState: 'local',
            schemaVersion: 1,
            contentVersion: '1.0',
            pendingSyncCount: 0,
          },
        ],
      },
    };
    const file = new File([JSON.stringify(backupContent)], 'backup.json', {
      type: 'application/json',
    });

    await restoreFromFile(file);
    const stored = await db.deviceMeta.get(installId);
    expect(stored?.lastBackupAt).toBe(3000); // Backup was newer
  });
});
