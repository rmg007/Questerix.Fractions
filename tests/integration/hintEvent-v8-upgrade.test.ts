/**
 * Repro: v7 → v8 upgrade for hintEvents.
 *
 * v7 declares `hintEvents: '++id, attemptId'` (auto-increment numeric primary key).
 * v8 changes it to `'id, attemptId'` (string primary key) and runs `.clear()` in upgrade.
 *
 * IndexedDB does NOT allow changing keyPath/autoIncrement of an existing object
 * store via `clear()`. The store keeps its old structure, and subsequent
 * `add({id: 'uuid'})` fails because the store still has keyPath '++id' (autoIncrement),
 * so it tries to use the auto-increment generator instead of the supplied id —
 * but the field name in the supplied object doesn't match what Dexie now expects.
 *
 * Fix: drop and recreate the store via two version bumps.
 */
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, it, expect } from 'vitest';

describe('hintEvents v7 → v8 keyPath migration', () => {
  it('a fresh v8 DB allows hintEventRepo.record() to add UUID-keyed rows', async () => {
    // Force a fresh DB name so this test does not collide.
    const dbName = `t-fresh-v8-${Math.random().toString(36).slice(2)}`;
    // Mirror the production schema enough to exercise the keyPath path.
    const db = new Dexie(dbName);
    db.version(7).stores({ hintEvents: '++id, attemptId' });
    db.version(8)
      .stores({ hintEvents: 'id, attemptId' })
      .upgrade(async (tx) => {
        await tx.table('hintEvents').clear();
      });
    await db.open();

    // Simulate hintEventRepo.record()
    const id = crypto.randomUUID();
    await db
      .table('hintEvents')
      .add({
        id,
        attemptId: '',
        tier: 'verbal',
        shownAt: 1,
        acceptedByStudent: true,
        pointCostApplied: 5,
        syncState: 'local',
      });
    const rows = await db.table('hintEvents').toArray();
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(id);
    db.close();
  });

  it('upgrading from v7 (with rows) to v8 still allows add() afterwards', async () => {
    const dbName = `t-upgrade-v8-${Math.random().toString(36).slice(2)}`;

    // Create v7 with one row.
    const v7 = new Dexie(dbName);
    v7.version(7).stores({ hintEvents: '++id, attemptId' });
    await v7.open();
    await v7.table('hintEvents').add({ attemptId: 'a', tier: 'verbal' });
    v7.close();

    // Reopen at v9, mirroring the production drop + recreate.
    const v8 = new Dexie(dbName);
    v8.version(7).stores({ hintEvents: '++id, attemptId' });
    v8.version(8).stores({ hintEvents: null });
    v8.version(9).stores({ hintEvents: 'id, attemptId' });
    await v8.open();

    const id = crypto.randomUUID();
    await v8
      .table('hintEvents')
      .add({
        id,
        attemptId: '',
        tier: 'verbal',
        shownAt: 1,
        acceptedByStudent: true,
        pointCostApplied: 5,
        syncState: 'local',
      });
    const rows = await v8.table('hintEvents').toArray();
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(id);
    v8.close();
  });
});
