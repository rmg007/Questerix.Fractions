# recovery/ — RecoveryBus

Central singleton for routing fatal runtime errors to Phaser recovery scenes.

## Architecture

**Phaser-free.** This module has zero Phaser imports so it can be used in `main.ts`
(before Phaser loads) and from `src/persistence/` (which must not import Phaser).

## How report() works

1. Appends a `RecoveryLogEntry` to the module-level `_log` array.
2. Emits an OTel span (`recovery.event`) — **env-gated**, noop in default builds (C1 safe).
3. Forwards to `errorReporter.report()` — env-gated, noop unless Sentry DSN is set.
4. If a Phaser game is registered: emits `recovery:report` via `game.registry.events`.
   Otherwise: dispatches a `qf:recovery` CustomEvent on `window` as a pre-boot fallback.

`main.ts` wires up the `recovery:report` listener after `game.events.once('ready')` and
also listens for the `qf:recovery` window event to cover errors that fire before boot.

## Recovery kinds

| kind              | Routed to         |
| ----------------- | ----------------- |
| `db-corrupt`      | `DBRecoveryScene` |
| `scene-throw`     | `RecoveryScene`   |
| `preload`         | `RecoveryScene`   |
| `curriculum-fail` | `RecoveryScene`   |
| `unknown`         | `RecoveryScene`   |

## Debug overlay

Add `?debug=recovery` to the URL for a live in-memory log panel (2s refresh).

## Testing

Unit tests live at `tests/unit/recovery/recoveryBus.test.ts`.

**Important:** the `vi.mock` for `'../../../src/lib/observability'` must include
BOTH `errorReporter` AND `tracerService` — the latter is used for OTel span emission.
Missing `tracerService` in the mock causes `startSpan is not a function` at test time.
