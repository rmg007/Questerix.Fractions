/**
 * Unit tests for src/lib/recovery/recoveryBus.ts
 *
 * Verifies that:
 * 1. RecoveryBus.report() dispatches to game registry events when the game
 *    is registered, or falls back to window CustomEvent.
 * 2. RecoveryBus.routeToScene() starts DBRecoveryScene for 'db-corrupt' and
 *    RecoveryScene for all other kinds.
 * 3. registerGame() wires the game reference used by report() and routeToScene().
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock errorReporter ───────────────────────────────────────────────────────
vi.mock('../../../src/lib/observability', () => ({
  errorReporter: {
    report: vi.fn(),
  },
}));

// Import after mock so the mock is applied
import { RecoveryBus, registerGame } from '../../../src/lib/recovery/recoveryBus';
import type { RecoveryReport } from '../../../src/lib/recovery/recoveryBus';

describe('RecoveryBus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the internal _game reference between tests by registering null
    registerGame(null);
  });

  describe('report()', () => {
    it('dispatches window CustomEvent when game is not registered', () => {
      const dispatched: CustomEvent[] = [];
      const originalDispatch = window.dispatchEvent.bind(window);
      const spy = vi.spyOn(window, 'dispatchEvent').mockImplementation((ev) => {
        if (ev instanceof CustomEvent && ev.type === 'qf:recovery') {
          dispatched.push(ev as CustomEvent);
        }
        return originalDispatch(ev);
      });

      const report: RecoveryReport = {
        kind: 'scene-throw',
        error: new Error('test error'),
        scene: 'Level01Scene',
      };

      RecoveryBus.report(report);

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0]!.detail).toEqual(report);

      spy.mockRestore();
    });

    it('emits via game registry events when game is registered', () => {
      const emitted: unknown[] = [];
      const mockGame = {
        registry: {
          events: {
            emit: (key: string, data: unknown) => {
              emitted.push({ key, data });
            },
          },
        },
        scene: { start: vi.fn() },
      };

      registerGame(mockGame);

      const report: RecoveryReport = {
        kind: 'preload',
        error: new Error('load failed'),
      };

      RecoveryBus.report(report);

      expect(emitted).toHaveLength(1);
      expect((emitted[0] as any).key).toBe('recovery:report');
      expect((emitted[0] as any).data).toEqual(report);
    });
  });

  describe('routeToScene()', () => {
    it('starts DBRecoveryScene for db-corrupt kind', () => {
      const startSpy = vi.fn();
      registerGame({
        registry: { events: { emit: vi.fn() } },
        scene: { start: startSpy },
      });

      RecoveryBus.routeToScene({
        kind: 'db-corrupt',
        error: new Error('corrupt'),
      });

      expect(startSpy).toHaveBeenCalledWith('DBRecoveryScene', expect.any(Object));
    });

    it('starts RecoveryScene for scene-throw kind', () => {
      const startSpy = vi.fn();
      registerGame({
        registry: { events: { emit: vi.fn() } },
        scene: { start: startSpy },
      });

      RecoveryBus.routeToScene({
        kind: 'scene-throw',
        error: new Error('scene error'),
        scene: 'LevelScene',
      });

      expect(startSpy).toHaveBeenCalledWith('RecoveryScene', expect.any(Object));
    });

    it('starts RecoveryScene for preload kind', () => {
      const startSpy = vi.fn();
      registerGame({
        registry: { events: { emit: vi.fn() } },
        scene: { start: startSpy },
      });

      RecoveryBus.routeToScene({
        kind: 'preload',
        error: new Error('load error'),
      });

      expect(startSpy).toHaveBeenCalledWith('RecoveryScene', expect.any(Object));
    });

    it('starts RecoveryScene for curriculum-fail kind', () => {
      const startSpy = vi.fn();
      registerGame({
        registry: { events: { emit: vi.fn() } },
        scene: { start: startSpy },
      });

      RecoveryBus.routeToScene({
        kind: 'curriculum-fail',
        error: new Error('schema error'),
      });

      expect(startSpy).toHaveBeenCalledWith('RecoveryScene', expect.any(Object));
    });

    it('starts RecoveryScene for unknown kind', () => {
      const startSpy = vi.fn();
      registerGame({
        registry: { events: { emit: vi.fn() } },
        scene: { start: startSpy },
      });

      RecoveryBus.routeToScene({
        kind: 'unknown',
        error: new Error('unknown error'),
      });

      expect(startSpy).toHaveBeenCalledWith('RecoveryScene', expect.any(Object));
    });

    it('does nothing when game is not registered', () => {
      // No game registered — routeToScene should be a no-op
      expect(() => {
        RecoveryBus.routeToScene({
          kind: 'scene-throw',
          error: new Error('no game'),
        });
      }).not.toThrow();
    });
  });
});
