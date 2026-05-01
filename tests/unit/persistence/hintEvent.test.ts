/**
 * Unit tests for hintEventRepo.
 * Uses fake-indexeddb (imported in tests/setup.ts) for a real Dexie instance in Node.
 *
 * NOTE: hintEvent.ts currently has a merge conflict marker in the worktree.
 * These tests target the HEAD (merged) version which uses:
 *   record() → returns HintEvent with numeric id
 *   linkToAttempt() → bulk-updates attemptId on given hint event ids
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/persistence/db';
import { hintEventRepo } from '../../../src/persistence/repositories/hintEvent';
import { AttemptId } from '../../../src/types/branded';
import type { HintEvent } from '../../../src/types';

// ── Test fixtures ─────────────────────────────────────────────────────────

const attemptId = AttemptId('attempt-uuid-001');
const otherAttemptId = AttemptId('attempt-uuid-002');

function makeHintEventInput(overrides: Partial<Omit<HintEvent, 'id'>> = {}): Omit<HintEvent, 'id'> {
  return {
    attemptId,
    hintId: 'hint:partition:tier1',
    tier: 1,
    shownAt: Date.now(),
    acceptedByStudent: true,
    pointCostApplied: 0,
    syncState: 'local',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('hintEventRepo', () => {
  beforeEach(async () => {
    await db.hintEvents.clear();
  });

  describe('record()', () => {
    it('returns a HintEvent with a numeric auto-increment id', async () => {
      const result = await hintEventRepo.record(makeHintEventInput());

      expect(result).toBeDefined();
      expect(typeof result.id).toBe('number');
      expect(result.id).toBeGreaterThan(0);
    });

    it('assigns incrementing ids for successive records', async () => {
      const r1 = await hintEventRepo.record(makeHintEventInput({ tier: 1 }));
      const r2 = await hintEventRepo.record(makeHintEventInput({ tier: 2 }));

      expect(r1.id).toBeLessThan(r2.id);
    });

    it('persists the event with the correct fields', async () => {
      const result = await hintEventRepo.record(makeHintEventInput({
        hintId: 'hint:identify:tier2',
        tier: 2,
        acceptedByStudent: false,
        pointCostApplied: 5,
      }));

      expect(result.hintId).toBe('hint:identify:tier2');
      expect(result.tier).toBe(2);
      expect(result.acceptedByStudent).toBe(false);
      expect(result.pointCostApplied).toBe(5);
      expect(result.syncState).toBe('local');
    });

    it('forces syncState to "local" regardless of input', async () => {
      const result = await hintEventRepo.record(
        makeHintEventInput({ syncState: 'synced' })
      );
      expect(result.syncState).toBe('local');
    });

    it('event is retrievable from the database after record()', async () => {
      const result = await hintEventRepo.record(makeHintEventInput());
      const rows = await db.hintEvents.toArray();

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(result.id);
    });
  });

  describe('linkToAttempt()', () => {
    it('updates attemptId on the specified hint event ids', async () => {
      const h1 = await hintEventRepo.record(makeHintEventInput({ attemptId }));
      const h2 = await hintEventRepo.record(makeHintEventInput({ attemptId }));

      await hintEventRepo.linkToAttempt([h1.id, h2.id], otherAttemptId);

      const updated1 = await db.hintEvents.get(h1.id);
      const updated2 = await db.hintEvents.get(h2.id);

      expect(updated1?.attemptId).toBe(otherAttemptId);
      expect(updated2?.attemptId).toBe(otherAttemptId);
    });

    it('does not update hint events not in the id list', async () => {
      const h1 = await hintEventRepo.record(makeHintEventInput({ attemptId }));
      const h2 = await hintEventRepo.record(makeHintEventInput({ attemptId }));

      // Only link h1
      await hintEventRepo.linkToAttempt([h1.id], otherAttemptId);

      const untouched = await db.hintEvents.get(h2.id);
      expect(untouched?.attemptId).toBe(attemptId); // unchanged
    });

    it('is idempotent — calling linkToAttempt twice with same ids does not throw', async () => {
      const h1 = await hintEventRepo.record(makeHintEventInput({ attemptId }));

      await hintEventRepo.linkToAttempt([h1.id], otherAttemptId);
      await expect(
        hintEventRepo.linkToAttempt([h1.id], otherAttemptId)
      ).resolves.toBeUndefined();
    });

    it('handles an empty ids array gracefully (no-op)', async () => {
      await expect(
        hintEventRepo.linkToAttempt([], otherAttemptId)
      ).resolves.toBeUndefined();
    });
  });

  describe('listForAttempt()', () => {
    it('returns hint events for the given attemptId', async () => {
      await hintEventRepo.record(makeHintEventInput({ attemptId, tier: 1 }));
      await hintEventRepo.record(makeHintEventInput({ attemptId, tier: 2 }));
      await hintEventRepo.record(makeHintEventInput({ attemptId: otherAttemptId, tier: 1 }));

      const results = await hintEventRepo.listForAttempt(attemptId);

      expect(results).toHaveLength(2);
      results.forEach((h) => expect(h.attemptId).toBe(attemptId));
    });

    it('returns an empty array for an attempt with no hint events', async () => {
      const results = await hintEventRepo.listForAttempt(AttemptId('nonexistent'));
      expect(results).toEqual([]);
    });
  });
});
