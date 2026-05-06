/**
 * RecoveryBus — central router for unrecoverable runtime errors.
 *
 * Any code that catches a fatal exception calls `RecoveryBus.report(...)`.
 * The bus forwards to the env-gated errorReporter (dormant by default per C1)
 * and then pushes the game to RecoveryScene or DBRecoveryScene via the Phaser
 * game registry so scenes can react without importing Phaser directly.
 *
 * Architecture note: this module is Phaser-free so it can be imported from
 * main.ts (before Phaser loads) and from persistence/ (which must not import Phaser).
 */

import { errorReporter, tracerService } from '../observability';

export type RecoveryKind =
  | 'scene-throw' // An exception escaped from a scene's update/create callback
  | 'preload' // Asset loading failed after all retries
  | 'db-corrupt' // DB integrity probe detected corruption
  | 'curriculum-fail' // Curriculum schema validation failure
  | 'unknown'; // Catch-all

export interface RecoveryReport {
  kind: RecoveryKind;
  error: Error;
  /** Scene key that originated the error, if known. */
  scene?: string;
}

export interface RecoveryLogEntry extends RecoveryReport {
  ts: number;
  routed: boolean;
}

const _log: RecoveryLogEntry[] = [];

export function getRecoveryLog(): readonly RecoveryLogEntry[] {
  return _log;
}

/** Singleton Phaser.Game reference — set once by main.ts after boot. */
let _game: {
  scene?: {
    scenes?: Array<{
      events?: { emit?: (k: string, d: unknown) => void };
      scene?: { key?: string };
    }>;
    start?: (key: string, data?: unknown) => void;
  };
  registry?: { events?: { emit?: (k: string, d: unknown) => void } };
} | null = null;

export function registerGame(game: unknown): void {
  _game = game as typeof _game;
}

export const RecoveryBus = {
  /**
   * Report a fatal error. Forwards to errorReporter (env-gated) and routes
   * the game to RecoveryScene or DBRecoveryScene.
   */
  report(report: RecoveryReport): void {
    _log.push({ ...report, ts: Date.now(), routed: false });

    // Emit OTel span (env-gated, noop when VITE_OTLP_URL is unset — C1 safe)
    try {
      const attrs: Record<string, string> = { 'recovery.kind': report.kind };
      if (report.scene) attrs['recovery.scene'] = report.scene;
      attrs['recovery.error'] = report.error.message;
      const span = tracerService.startSpan('recovery.event', attrs);
      span.end();
    } catch {
      // Never let telemetry block the recovery path
    }

    // 1. Forward to error reporter (env-gated, dormant by default — C1 safe)
    errorReporter.report(report.error, {
      source: `recovery:${report.kind}`,
      scene: report.scene,
    });

    // 2. Route to the appropriate recovery scene via Phaser game registry events.
    //    We use a CustomEvent on window as a fallback for when the game isn't up yet.
    if (_game?.registry?.events?.emit) {
      _game.registry.events.emit('recovery:report', report);
    } else {
      window.dispatchEvent(new CustomEvent('qf:recovery', { detail: report }));
    }
  },

  /**
   * Route the Phaser game to the appropriate recovery scene.
   * Called from the scene manager (wired in main.ts after game starts).
   */
  routeToScene(report: RecoveryReport): void {
    if (!_game?.scene?.start) return;

    // Mark the matching log entry as routed
    for (let i = _log.length - 1; i >= 0; i--) {
      const e = _log[i];
      if (e && e.kind === report.kind && e.error === report.error) {
        e.routed = true;
        break;
      }
    }

    if (report.kind === 'db-corrupt') {
      _game.scene.start('DBRecoveryScene', report);
    } else {
      _game.scene.start('RecoveryScene', report);
    }
  },
};
