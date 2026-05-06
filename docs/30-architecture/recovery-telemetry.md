# Recovery Telemetry

## Overview

`RecoveryBus` emits an OpenTelemetry span for every fatal error it processes.
Emission is **env-gated** — a noop in default builds (C1 safe). To enable remote
export, set `VITE_OTLP_URL` at build time.

## In-memory log

Every call to `RecoveryBus.report()` appends a `RecoveryLogEntry` to the module-level
`_log` array. The log survives for the lifetime of the page session and is readable via
`getRecoveryLog()` (exported from `src/lib/recovery/recoveryBus.ts`).

```ts
export interface RecoveryLogEntry extends RecoveryReport {
  ts: number;     // Unix ms timestamp when report() was called
  routed: boolean; // true once routeToScene() processes this entry
}
```

## OTel span schema

Span name: `recovery.event`

| Attribute          | Type   | Example                        |
| ------------------ | ------ | ------------------------------ |
| `recovery.kind`    | string | `"scene-throw"`, `"db-corrupt"` |
| `recovery.scene`   | string | `"Level01Scene"` (optional)     |
| `recovery.error`   | string | Error message text              |

## Debug overlay

Add `?debug=recovery` to the URL to mount a fixed panel showing the live
in-memory log. Updates every 2 seconds. Purely local — no network requests.

## Enabling remote telemetry

```bash
VITE_OTLP_URL=http://your-collector:4318 npm run build
```

The `tracerService` initialises the OTLP HTTP exporter only when `VITE_OTLP_URL`
is set. Default MVP builds: span is created and immediately ended with no exporter
configured — zero egress per C1.

## COPPA / C1 compliance

- No PII is included in span attributes.
- Default builds emit nothing to external services.
- `recovery.error` is the raw JavaScript `Error.message` — never include user input in error messages passed to RecoveryBus.
