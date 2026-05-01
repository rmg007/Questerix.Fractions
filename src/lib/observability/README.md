# observability/ — Conventions

Wrappers around OpenTelemetry (tracing) and Sentry (error reporting). Both are
**env-gated**: a default MVP build does no network egress. See `tracer.ts`
(needs `VITE_OTLP_URL`) and `errorReporter.ts` (needs a `dsn` passed to
`init()`).

This README documents the conventions that keep span names, attributes, and
severity routing consistent across the app. Phase 12 of
`PLANS/code-quality-2026-05-01.md` introduced these conventions; before that
spans were scattered string literals.

---

## Span names

All span names live in `span-names.ts` as a `SPAN_NAMES` const-object. Leaves
follow the `<domain>.<verb>` shape:

```ts
import { SPAN_NAMES } from '@/lib/observability/span-names';
import { tracerService } from '@/lib/observability';

const span = tracerService.startSpan(SPAN_NAMES.DB.QUERY, {
  'db.table': 'attempts',
});
```

Domains currently registered: `DB`, `SCENE`, `QUESTION`, `MASTERY`, `HINT`,
`TTS`. The `SpanName` helper type is the union of every leaf — use it on
function signatures that accept a span name so the compiler keeps the registry
exhaustive.

### Why a registry?

- **Searchability** — one file lists every span we emit; backend dashboards
  match the codebase.
- **No drift** — a typo in a string literal silently spawns a new span name in
  Sentry/OTLP. A typo against `SPAN_NAMES.DB.QURY` is a TypeScript error.
- **Refactorability** — renaming a span is one edit instead of N.

### Adding a new span

1. Pick a domain (or add a new one to `SPAN_NAMES` — keep them noun-shaped).
2. Add the leaf in `<verb>` form (lowercase, no punctuation):
   `SPAN_NAMES.QUESTION.SUBMIT = 'question.submit'`.
3. Import `SPAN_NAMES` at the call site. Never pass a bare string to
   `startSpan`.
4. Update `tests/unit/observability/span-names.test.ts` only if you change the
   shape; the format/duplicate guards run automatically against the whole
   tree.

---

## Span attribute naming

Attributes follow the same `<domain>.<key>` shape as span names. The domain
prefix is what makes attributes filterable in OTLP back-ends without
collisions.

| Attribute            | Notes                                                             |
| -------------------- | ----------------------------------------------------------------- |
| `db.table`           | Dexie table name (e.g. `attempts`, `skillMasteries`).             |
| `db.operation`       | One of `add`, `put`, `delete`, `get`, `query`, `mutate`.          |
| `scene.name`         | Phaser scene key (e.g. `Level01Scene`, `MenuScene`).              |
| `question.archetype` | One of the 10 activity archetype IDs (`partition`, `compare`, …). |
| `student.idHash`     | **Pseudonymized** student id. **Never** emit `student.id`.        |

`student.idHash` is the only sanctioned student attribute. The raw
`StudentId` is PII under COPPA-aligned rules; emit a stable hash instead. The
hashing helper lands with PR #18 (the syncService changes); until then, omit
the attribute entirely rather than emitting raw IDs.

If you need a new attribute, prefix it with the domain it belongs to and add a
row to the table above.

---

## Severity contract

`logger` exposes five severities. Routing is fixed:

| Severity | Console  | Local ring buffer (Dexie) | Sentry                                                    |
| -------- | -------- | ------------------------- | --------------------------------------------------------- |
| `fatal`  | always   | if consent granted        | **always** (no consent gate)                              |
| `error`  | always   | if consent granted        | if `errorReporter` initialized (consent gate is upstream) |
| `warn`   | always   | if consent granted        | never                                                     |
| `info`   | dev-only | if consent granted        | never                                                     |
| `debug`  | dev-only | if consent granted        | never                                                     |

- **`fatal`** is reserved for crashes that compromise the user's session
  (e.g. unrecoverable Dexie corruption, scene-graph desync, exception bubbled
  out of every catch). Calling `logger.fatal(...)` always invokes
  `errorReporter.report(...)`, which adds Sentry capture on top of the local
  log path — even if explicit consent has not been granted, since a fatal is
  by definition a session-ending event the user cannot opt out of.
- **`error`** is the normal failure path: handled exception, partial-state
  recovery, validator threw. Routes to Sentry only if `errorReporter` was
  initialized with a DSN (which itself only happens when the user has granted
  telemetry consent at the consent prompt).
- **`warn`** stays local. Emit when the app recovers but the recovery deserves
  a breadcrumb (e.g. cache miss, retry, schema fallback).
- **`info`** is for state-transition logging visible in dev consoles. Silenced
  in prod.

The contract is enforced by
`tests/unit/observability/severity-contract.test.ts`.

---

## How the env gates compose

```
DEFAULT BUILD:        VITE_OTLP_URL unset, no Sentry DSN
                      → tracer.init() returns early; no SDK loaded
                      → errorReporter.init() returns early; no Sentry loaded
                      → logger still writes to console + Dexie ring buffer

OBSERVABILITY BUILD:  VITE_OTLP_URL=https://… , dsn passed at runtime
                      → tracer loads OTel SDK lazily
                      → errorReporter loads @sentry/browser lazily
                      → spans + errors flow to back-ends
```

Both wrappers are still in the bundle in default builds (they count against
the 1 MB gzipped JS budget). Phase 7 of the code-quality plan tracks moving
the heavy SDK packages behind true lazy boundaries.

---

## Sampling

Tracing is sampled to keep volume tractable. The default ratio is **0.1**
(10% of traces emitted). Override with `VITE_SAMPLING_RATE` at build time —
valid range `[0, 1]`. Out-of-range values fall back to the default. Ratio
sampling is trace-id-based, so a single request either fully samples or
fully drops; child spans never get orphaned.

Sentry sampling is unrelated and lives in `errorReporter.ts`
(`sampleRate: 0.2` in prod).
