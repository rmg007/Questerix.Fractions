/**
 * Unit tests for src/persistence/integrity.ts
 *
 * Verifies that probe() correctly detects structural corruption in each
 * critical Dexie store and returns 'ok' for valid or empty data.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Inline mock factory (hoisting-safe) ───────────────────────────────────
// vi.mock is hoisted to the top of the file by Vitest, so the factory must
// not reference variables declared below. We capture a mutable reference via
// a function so each test can change what rows each store returns.

type FakeRow = Record<string, unknown> | undefined;

// Mutable per-store row holders — mutated by setStore() in each test.
const _rows: Record<string, FakeRow> = {
  students: undefined,
  sessions: undefined,
  attempts: undefined,
  skillMastery: undefined,
  deviceMeta: undefined,
};

// Mutable flag: when true, students.limit().first() throws instead of returning a row.
let _studentsThrows = false;

vi.mock('../../../src/persistence/db', () => {
  const makeStore = (key: string) => ({
    limit: (_n: number) => ({
      first: async () => {
        if (key === 'students' && _studentsThrows) {
          throw new Error('IDBObjectStore: object store has been deleted');
        }
        return _rows[key];
      },
    }),
  });

  return {
    db: {
      students: makeStore('students'),
      sessions: makeStore('sessions'),
      attempts: makeStore('attempts'),
      skillMastery: makeStore('skillMastery'),
      deviceMeta: makeStore('deviceMeta'),
    },
  };
});

// Import AFTER mock so the mock is applied
import { probe } from '../../../src/persistence/integrity';

/** Helper: set what a store's first row will be */
function setStore(name: string, row: FakeRow): void {
  _rows[name] = row;
}

describe('integrity.probe()', () => {
  beforeEach(() => {
    // Reset all stores to empty (fresh DB)
    for (const key of Object.keys(_rows)) {
      _rows[key] = undefined;
    }
    _studentsThrows = false;
  });

  it('returns "ok" for a fully empty database (fresh install)', async () => {
    const result = await probe();
    expect(result).toBe('ok');
  });

  it('returns "ok" when all stores have valid rows', async () => {
    setStore('students', { id: 'student-1', displayName: 'Player' });
    setStore('sessions', { id: 'session-1', studentId: 'student-1' });
    setStore('attempts', { id: 'attempt-1', sessionId: 'session-1' });
    setStore('skillMastery', { studentId: 'student-1', skillId: 'SK-01' });
    setStore('deviceMeta', { installId: 'device-abc' });

    const result = await probe();
    expect(result).toBe('ok');
  });

  describe('students store', () => {
    it('returns corrupt when student row has empty id', async () => {
      setStore('students', { id: '', displayName: 'Player' });
      const result = await probe();
      expect(result).not.toBe('ok');
      if (result !== 'ok') {
        expect(result.corrupt).toBe(true);
        expect(result.reason).toMatch(/students/);
      }
    });

    it('returns corrupt when student row has non-string id', async () => {
      setStore('students', { id: 42, displayName: 'Player' });
      const result = await probe();
      expect(result).not.toBe('ok');
    });
  });

  describe('sessions store', () => {
    it('returns corrupt when session row has missing studentId', async () => {
      setStore('sessions', { id: 'session-1' }); // no studentId
      const result = await probe();
      expect(result).not.toBe('ok');
      if (result !== 'ok') {
        expect(result.corrupt).toBe(true);
        expect(result.reason).toMatch(/sessions/);
      }
    });

    it('returns corrupt when session id is non-string', async () => {
      setStore('sessions', { id: null, studentId: 'student-1' });
      const result = await probe();
      expect(result).not.toBe('ok');
    });
  });

  describe('attempts store', () => {
    it('returns corrupt when attempt row has missing sessionId', async () => {
      setStore('attempts', { id: 'attempt-1' }); // no sessionId
      const result = await probe();
      expect(result).not.toBe('ok');
      if (result !== 'ok') {
        expect(result.corrupt).toBe(true);
        expect(result.reason).toMatch(/attempts/);
      }
    });
  });

  describe('skillMastery store', () => {
    it('returns corrupt when skillMastery row has missing skillId', async () => {
      setStore('skillMastery', { studentId: 'student-1' }); // no skillId
      const result = await probe();
      expect(result).not.toBe('ok');
      if (result !== 'ok') {
        expect(result.corrupt).toBe(true);
        expect(result.reason).toMatch(/skillMastery/);
      }
    });
  });

  describe('deviceMeta store', () => {
    it('returns corrupt when deviceMeta row has empty installId', async () => {
      setStore('deviceMeta', { installId: '' });
      const result = await probe();
      expect(result).not.toBe('ok');
      if (result !== 'ok') {
        expect(result.corrupt).toBe(true);
        expect(result.reason).toMatch(/deviceMeta/);
      }
    });
  });

  it('returns corrupt when a store throws (catches exception)', async () => {
    _studentsThrows = true;
    const result = await probe();
    expect(result).not.toBe('ok');
    if (result !== 'ok') {
      expect(result.corrupt).toBe(true);
      expect(result.reason).toMatch(/probe exception/);
    }
  });
});
