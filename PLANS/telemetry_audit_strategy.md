# Telemetry & Observability Audit — Questerix Fractions

**Auditor:** Autonomous Observability Architect
**Date:** 2026-04-26
**Branch:** `main`
**Scope:** Runtime observability footprint across `src/main.ts`, `src/scenes/`, `src/persistence/`, `src/curriculum/`, `src/engine/`, `src/validators/`, `src/lib/`.

---

### 1. Current Telemetry Posture

* **Detected Tech Stack:** Phaser 4 (4.0.0) + TypeScript 6.0.3 client-side SPA, Vite 8.0.9 build, Vitest 1.0.0 unit + Playwright e2e, IndexedDB persistence via Dexie 4.4.2, optional PWA via `vite-plugin-pwa` / `workbox`. **No backend service**; all telemetry is browser-local. **No third-party APM, error-tracking, or log-aggregation library** is installed (verified by `package.json` dependency review — no `@sentry/*`, no `@datadog/*`, no `@opentelemetry/*`, no `bugsnag`, no `logrocket`). Two ad-hoc loggers exist:
  * `src/lib/log.ts` — categorical browser-styled console wrapper with twelve `SCENE / TMPL / Q / DRAG / INPUT / VALID / HINT / SESS / ATMP / BKT / MISC / PERF` channels and runtime filtering via `localStorage.LOG` or `?log=` query string.
  * `src/lib/logger.ts` — simple four-level (`debug / info / warn / error`) wrapper.
  Both write **only** to `console.*`. In `import.meta.env.PROD` builds `log.ts` returns early at `isEnabled` (line 47) and emits **nothing**, including warnings and errors; `logger.ts` silences `debug / info / warn` and forwards only `error` (line 18–20). Production therefore has zero observability sink for any error written through `log.error(...)`.
* **Critical Blind Spots:**
  1. **No production error sink at all.** Once a build is shipped, every `log.error(...)` call evaporates because `log.ts:47` short-circuits when `import.meta.env.PROD` is true. The error never leaves the browser.
  2. **No global `window.onerror` handler.** Only `unhandledrejection` is hooked, and the handler at `src/main.ts:7-14` *suppresses* matching errors via `event.preventDefault()` without recording them anywhere durable.
  3. **`sessionTelemetry` table is a dead-letter store.** The Dexie schema declares `sessionTelemetry` at `db.ts:50, 67, 80, 105, 136`, but the only reference in source is a *read* during backup export (`backup.ts:61`). No writer exists anywhere in `src/`. Every viewport, FPS, scene-transition, or device-capability metric the schema was designed to capture is never persisted.
  4. **No correlation-ID propagation across architectural layers.** `sessionId` exists as a domain entity but is not threaded through repository calls, validator dispatch, BKT updates, or detector invocations. There is no per-attempt `traceId` that links a single user submission to its cascade of writes (Attempt → SkillMastery → MisconceptionFlag) for forensic replay.
  5. **No structured / machine-readable log output.** The emit shape at `log.ts:85-91` is `console[fn](prefix, %cStyle, %cReset, data)` — pretty for devtools, opaque to a log aggregator. No JSON payload is ever serialised; no level / category / timestamp tuple is parseable from stdout capture.
  6. **No execution-time measurement of the data-access layer.** Every Dexie call in `src/persistence/repositories/*.ts` (17 files) and the bulk-seed transaction in `curriculum/seed.ts` runs without `performance.now()` brackets. Slow IndexedDB transactions on low-end tablets are invisible.
  7. **No execution-time measurement of validator dispatch.** `validatorRegistry.get(...).fn(input, payload)` at `Level01Scene.ts:652` and `LevelScene.ts:393` is the hot path for every user submission; latency is unmeasured.
  8. **No external-fetch telemetry.** `loadCurriculumBundle` (`loader.ts:138`) does not record HTTP status, payload size, parse duration, or fallback frequency to the embedded `bundle.json`.
  9. **No frame-budget instrumentation.** This is a 60-fps Phaser tablet game. There is no `requestAnimationFrame`-based FPS sampler, no `PerformanceObserver({ entryTypes: ['longtask'] })`, no Phaser `game.loop.actualFps` reporter. Janks > 50 ms on the partition-drag path are silent.
  10. **No memory or storage-quota telemetry.** `performance.memory` (Chromium), `navigator.deviceMemory`, and `navigator.storage.estimate()` are never read. The app has no signal of approaching the IndexedDB quota — the very failure mode `db.ts:158-200` was written to *prevent*, but does not *observe*.
  11. **Errors swallowed without context.** Catch blocks downgrade exceptions to `String(err)` (drops stack), discard the originating record (no question/template/student ID logged), or, in `lib/preferences.ts:28-34`, discard the error entirely with neither log nor re-throw.
  12. **No build / release version stamp on log records.** Even if logs were forwarded somewhere, there is no `app.version` / `git.sha` field to correlate a report to a deployment.

---

### 2. Actionable Findings

#### `src/lib/log.ts`

* **Deficiency:** Production-mode short-circuit silences all categories — including `log.error(...)` — by returning `false` from `isEnabled` whenever `import.meta.env.PROD` is true. The wrapper has no second sink (no remote shipper, no IndexedDB ring buffer, no `navigator.sendBeacon` flush) for errors that should survive the production build.
* **Location:** `isEnabled` line 47 (`if (import.meta.env.PROD) return false;`); `emit` lines 76–92 (single-sink dispatch to `console[fn]`); public API `log.error` line 110.
* **Risk:** Any production crash, validator exception, BKT update failure, or persistence write failure is unrecoverable post-hoc. Field bug reports cannot cite a stack trace; the team cannot detect a regression that ships in a release. The "centralized logger" gives teams the false confidence of structured emission while behaving as `/dev/null` in prod.

#### `src/lib/logger.ts`

* **Deficiency:** Same single-sink architecture as `log.ts`. Emits only to `console.*`; `debug`/`info`/`warn` are gated on `import.meta.env.DEV` and disappear in prod (lines 9–17). `error` is the only level that survives, and even that goes only to `console.error`.
* **Location:** Lines 6–20 (entire module).
* **Risk:** Two parallel logger implementations means two places to retrofit observability. Modules that imported `logger.ts` (per the SoC audit, `engine/calibration.ts:20` rolls its own to avoid both) will need a second migration.

#### `src/main.ts`

* **Deficiency:** Global `unhandledrejection` handler swallows storage-related errors with `event.preventDefault()` and never records them. Only `console.warn` is emitted (line 11), which is dropped in prod by both loggers above. There is no `window.addEventListener('error', ...)` handler at all — synchronous uncaught exceptions vanish.
* **Location:** Lines 7–14 (`unhandledrejection`); the `'error'` event listener is absent (verified by Grep — no matches for `window.onerror|addEventListener\s*\(\s*['"]error`).
* **Risk:** Storage-blocked iframe contexts (Replit preview, school-managed iPads with restrictive ITP policies) silently drop persistence-failure signals. Synchronous JS errors in Phaser scene callbacks (the most common form) bypass the handler entirely. Crash reports for the field will be impossible.

#### `src/main.ts` (boot path)

* **Deficiency:** Two top-level catch blocks log to `console` and proceed: `boot()` rejection at line 55–57, scene-import failure at lines 26–28. Neither persists the failure, sets a crash flag in IndexedDB, or notifies the user. The Phaser game still instantiates with `scenes = []` if scene imports fail.
* **Location:** Lines 26–28, 55–57.
* **Risk:** A botched bundle (missing scene chunk after a code-split misconfiguration) will produce a blank canvas with no recoverable signal. The next boot has no awareness that the previous one failed.

#### `src/scenes/Level01Scene.ts` — `recordAttempt`

* **Deficiency:** Three nested catch blocks at lines 997–999, 1019–1021, 1022–1024 reduce errors to `String(err)` (truncates stack) and emit through `log.warn`/`log.error`, both of which are no-ops in prod (see `log.ts` finding above). The originating attempt payload, question template ID, BKT prior state, and student ID are not captured beside the error.
* **Location:** `recordAttempt` body lines 911–1025; specifically the catch at 997 (BKT update), 1019 (misconception detection), and 1022 (outermost — the persistence write).
* **Risk:** A BKT propagation bug or a misconception-detector regression would corrupt mastery state silently. The student progresses through the curriculum on stale or wrong data, and the team has no trail to discover it. The 2026-04-27 architecture review (`G-E2`) flagged divergent BKT shapes between L1 and L2+ scenes; without instrumented errors the divergence would only be caught by manual play-test.

#### `src/scenes/Level01Scene.ts` and `src/scenes/LevelScene.ts` — `onSubmit` validator dispatch

* **Deficiency:** Validator function calls (`reg.fn(input, payload)`, `partitionEqualAreas.fn(...)`) are invoked without a `performance.now()` bracket. Their failures bubble into a catch block at `Level01Scene.ts:661-664` / `LevelScene.ts:399-402` that emits `console.error` / `log.error('VALID', 'validator_error', ...)` — the latter again no-op in prod — and downgrades the result to `'incorrect'` with `feedback: 'validator_error'`. The validator's input/payload, expected partition shape, and the student's gesture trace are not attached to the error record.
* **Location:** `Level01Scene.ts` lines 645–664 (validator dispatch and catch); `LevelScene.ts` lines 391–402.
* **Risk:** A validator bug that mis-grades a question is indistinguishable from a student answering wrong — the BKT pipeline ingests the false signal, and the student is presumed to be struggling on a concept they actually understood. Validator latency (especially for partition-drag with many candidate splits) can degrade silently below the perceived-instant 100 ms threshold.

#### `src/scenes/Level01Scene.ts` and `src/scenes/LevelScene.ts` — response-time measurement scope

* **Deficiency:** The only timing instrumentation in the scenes is `responseMs = Date.now() - this.questionStartTime` at `Level01Scene.ts:667` and the analogous line in `LevelScene.ts`. This conflates user-think-time, animation time, validator dispatch time, and persistence flush time into a single number that is then fed into BKT as `avgResponseMs` and into the `Attempt.responseMs` record.
* **Location:** `Level01Scene.ts:667`; `LevelScene.ts` (analogous in `recordAttempt`).
* **Risk:** A 200 ms validator regression and a 200 ms slower student are indistinguishable. The latency dimension of the engagement signal is contaminated. `Date.now()` (millisecond resolution, wall-clock, jumps with NTP corrections) is also the wrong primitive for sub-second timing — `performance.now()` (monotonic, sub-ms, immune to clock skew) should be used.

#### `src/persistence/db.ts` — `ensurePersistenceGranted`

* **Deficiency:** The persistence-grant negotiation logs only via `console.warn` and only in `import.meta.env.DEV`. Lines 181, 190, 196 emit warnings with `if (isDev && !alreadyWarned)`, which means production users on browsers that deny `navigator.storage.persist()` (the exact failure mode this function exists to detect) generate no signal. The `alreadyWarned` deduplication is also stored in `sessionStorage` — itself a storage API that may be the thing that's failing.
* **Location:** Lines 158–200 (`ensurePersistenceGranted`).
* **Risk:** iOS Safari ITP eviction or Firefox private-mode quota denial in production yields zero observable evidence. A teacher's report of "the kids' progress disappeared" cannot be traced to the eviction cause.

#### `src/persistence/repositories/*.ts` (all 17 files)

* **Deficiency:** Every Dexie call (`db.attempts.add`, `db.sessions.where(...).toArray`, `db.skillMastery.put`, etc.) is invoked without execution-time measurement. The repositories return raw Dexie promises and Dexie return types; there is no decorator or middleware that wraps them with `performance.now()`. There is also no metric for query result size (large `toArray()` calls are unbounded by row count).
* **Location:** Every method in `src/persistence/repositories/attempt.ts`, `session.ts`, `skillMastery.ts`, `student.ts`, `deviceMeta.ts`, `bookmark.ts`, `sessionTelemetry.ts`, `hintEvent.ts`, `misconceptionFlag.ts`, `progressionStat.ts`, plus the curriculum repositories `questionTemplate.ts`, `activity.ts`, `activityLevel.ts`, `fractionBank.ts`, `hint.ts`, `misconception.ts`, `skill.ts`, `standards.ts`. Representative example: `attempt.ts:33-35` (`listForSession` — `db.attempts.where('sessionId').equals(sessionId).toArray()`).
* **Risk:** A degenerate query (e.g. unindexed scan on a one-million-row backup restore on a low-end tablet) is invisible. Schema-version migrations, which run at `db.open()`, have no observability for upgrade duration.

#### `src/persistence/backup.ts` — `restore` `tryAddAll`

* **Deficiency:** Per-row try/catch at lines 147–161 distinguishes `ConstraintError` (skip) from other errors (re-throw), but emits no log on either branch. The `added` and `skipped` counters are returned to the caller (line 207), which is the only signal — the caller (`SettingsScene`) is free to display a toast but doesn't ship the result anywhere.
* **Location:** Lines 144–161 (`tryAddAll`); lines 192–194 (`console.info` on the deviceMeta merge — the only log in the entire restore).
* **Risk:** A partial restore that drops half the attempts due to constraint violations still appears successful from the user's perspective. The team has no audit trail of which rows were skipped.

#### `src/lib/preferences.ts` — `initPreferences`

* **Deficiency:** The catch block at lines 28–34 swallows the error with **no log call at all** — neither `console`, `log.*`, nor `logger.*`. The error is silently mapped to "default preferences."
* **Location:** Lines 21–35.
* **Risk:** A corrupt `deviceMeta` row (the only place preferences live) is indistinguishable from a first-boot empty state. A user who set high-contrast and reduce-motion will silently lose those settings on every boot until the row is repaired, and the team will see zero error signal.

#### `src/curriculum/loader.ts` — `loadCurriculumBundle`

* **Deficiency:** Network and parse failures are logged via `console.warn` / `console.error` only (lines 82, 119, 140, 153, 159, 164). No timing of `fetch()` (line 138), no measurement of `response.json()` parse duration (line 146), no count of payload bytes, no metric for fallback frequency to the embedded `bundle.json`.
* **Location:** Lines 134–168.
* **Risk:** A degrading CDN, a misconfigured cache header, or a `bundle.json` that drifts out of parity with `/curriculum/v1.json` will silently push every user into the embedded-fallback path. The team has no way to detect that the network bundle is dead in production.

#### `src/scenes/BootScene.ts` — boot sequence

* **Deficiency:** Three catch blocks (lines 51–54 persistence grant; 66–69 curriculum seed; 105–108 student bootstrap) log only to `console.warn`, capturing only `String(err)` in a few cases. No durable boot-failure log is written to IndexedDB. No total boot-duration metric is emitted (no `performance.mark('boot:start')` … `performance.measure('boot:total', ...)` pair).
* **Location:** Lines 24, 50, 53, 62–68, 76, 82, 91, 103, 105–107.
* **Risk:** A degraded boot (e.g. seed ran successfully but took 12 seconds on a low-end Chromebook) is indistinguishable from a healthy boot. The first-load PWA target (per design-language §8 / runtime-architecture §10 budget) cannot be empirically validated against field devices.

#### `src/curriculum/seed.ts` — `seedAllStores`

* **Deficiency:** The bulk transaction (per `seed.ts` body) executes thousands of inserts (curriculum templates, hints, fraction-bank rows) without any `performance.now()` bracket. Failures are caught at line 139 and logged to `console.error` (no-op in prod). Per-table insert counts are returned (line 129's success log), but cumulative duration and failure-row identity are not.
* **Location:** Lines 29 (warn on missing pack), 85 (info — first boot), 96 (info — seed result), 129 (info — seed completed), 141 (error — seed failed), 171 (info — wipe).
* **Risk:** A schema migration that bloats the seed payload silently extends boot time. Per-row failures during seed are indistinguishable from a clean seed once the catch fires — the entire bundle is dropped to "synthetic fallback" mode without diagnosis.

#### `src/scenes/MenuScene.ts` — font readiness

* **Deficiency:** `Promise.all([...font loads...]).catch(() => undefined)` at line 789 swallows font-load failures with no log, no telemetry, no fallback notification. The `await fonts.ready` that follows assumes success.
* **Location:** Lines 789–790.
* **Risk:** A font CDN failure or a malformed `@font-face` declaration produces silent FOUT/FOIT in production with no observable signal.

#### `src/engine/calibration.ts` — inline logger

* **Deficiency:** A bespoke `logger = { warn: (msg: string) => console.warn(...) }` object is declared at line 20 to dodge importing `lib/logger.ts`. This is a portability work-around (per `PLANS/portability_audit_findings.md` Category C), but observably it means calibration warnings cannot be redirected by any future log shipper without re-touching this module.
* **Location:** Line 20.
* **Risk:** Calibration drift (the BKT prior-tuning module) emits warnings that are isolated from any future telemetry pipeline.

#### `src/scenes/Level01Scene.ts:333` and `src/scenes/LevelScene.ts:623` — viewport telemetry

* **Deficiency:** The scenes record `viewport: { width: window.innerWidth, height: window.innerHeight }` into a `SessionTelemetry` object — but as the Critical Blind Spot #3 above documents, **this object is never written to the `sessionTelemetry` table.** The capture happens, the persistence does not.
* **Location:** `Level01Scene.ts:333`; `LevelScene.ts:623`.
* **Risk:** The schema field exists, the capture sites exist, but the wire is cut between them. Any future analysis ("what device sizes are our users on?") will return zero rows.

#### Cross-cutting — absence of correlation IDs across the cascade

* **Deficiency:** A single user submit triggers (a) validator dispatch, (b) `attemptRepo.add`, (c) `runAllDetectors`, (d) `misconceptionFlagRepo.create` per flag, (e) `bktUpdate`, (f) `skillMasteryRepo.put`. None of these calls share a per-cascade `traceId`. If `(e)` fails, you cannot link the failure back to the originating attempt without reasoning about wall-clock proximity in the logs.
* **Location:** `Level01Scene.recordAttempt` lines 911–1025; `LevelScene.recordAttempt` lines 635–743.
* **Risk:** Forensic replay of a corrupted student record requires manually correlating timestamps. With volatile-mode (`sessionId === null`) attempts, even that linkage breaks.

#### Cross-cutting — no resource metrics

* **Deficiency:** No code path reads `performance.memory.usedJSHeapSize` (Chromium), `navigator.deviceMemory`, `navigator.storage.estimate()`, or `navigator.connection.effectiveType`. No `PerformanceObserver` is registered. Phaser's `game.loop.actualFps` is never sampled.
* **Location:** Verified by Grep over `src/` — zero matches for `performance.now|performance.mark|performance.measure|performance.memory`. Zero matches for `PerformanceObserver`. Zero matches for `navigator.storage.estimate` outside the `persist`/`persisted` calls in `db.ts`.
* **Risk:** An iPad with 2 GB RAM running the app alongside ten other tabs will start dropping frames before any signal is emitted. Quota approach is invisible until `QuotaExceededError` is thrown — at which point the only handler is the suppressing `unhandledrejection` filter in `main.ts:7-14`.

---

### 3. Implementation Directive

* **Proposed Tooling:**
  1. **OpenTelemetry-JS** (`@opentelemetry/api`, `@opentelemetry/sdk-trace-web`, `@opentelemetry/sdk-metrics`, `@opentelemetry/instrumentation-fetch`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-metrics-otlp-http`) for traces and metrics. The SDK is the standards-aligned choice for a TypeScript browser SPA, supports OTLP/HTTP egress to any compatible collector (Tempo, Honeycomb, Grafana Cloud, AWS Distro, Datadog Agent), and survives backend swaps without code change. Use the `WebTracerProvider` with `BatchSpanProcessor` and a `navigator.sendBeacon`-aware exporter so spans are flushed on `pagehide`. Use `@opentelemetry/instrumentation-fetch` to auto-instrument `loadCurriculumBundle`'s fetch call without modifying source.
  2. **`@sentry/browser` 8.x** (or **`@bugsnag/js`** as an alternative) for error tracking. Sentry's Browser SDK gives a free tier suitable for an MVP, captures unhandled exceptions and unhandled rejections automatically, attaches a `release` (git SHA) tag for deploy correlation, and supports a `beforeSend` filter to redact PII (which Questerix has none of by C2, but is a defensible default). Co-existing with OTel is supported through Sentry's OTel Tracing layer or by writing both sinks side-by-side.
  3. **`web-vitals`** (`web-vitals` package on npm, ~1 KB gzipped) for runtime FPS/INP/CLS/LCP sampling. Pipe its callbacks into the OTel meter as a `Histogram` so the dashboards aggregate budgets across the device fleet.
  4. **`PerformanceObserver` directly** (no library) for `longtask` and `event` entry types. These are not yet wrapped by the web-vitals package and need a dozen lines.
  5. **A local IndexedDB ring buffer** (extend the existing Dexie schema with a `telemetryEvents` table, version 5) as the *durable*, offline-tolerant buffer behind the OTel/Sentry exporters. Critical because the app must function offline (PWA) and the network may be unavailable when an error fires. A background `requestIdleCallback` flush sweeps the buffer when connectivity returns. This is the missing primitive that turns the existing `sessionTelemetry` dead-letter store into a live store.
  6. **No tooling** is needed for correlation IDs — these are a codebase change. Use `crypto.randomUUID()` (already in use elsewhere) gated through the `IdGenerator` port that the portability audit (`PLANS/portability_audit_findings.md`, Category A finding 2) mandates.

* **Next Steps:**
  1. **Install dependencies:**
     ```bash
     npm install @sentry/browser web-vitals
     npm install @opentelemetry/api @opentelemetry/sdk-trace-web @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation-fetch @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-metrics-otlp-http @opentelemetry/context-zone
     ```
     None pull a Node-only transitive; all four OTel exporter/SDK packages are browser-targeted.
  2. **Bump the Dexie schema to version 5** in `src/persistence/db.ts`, adding:
     ```ts
     telemetryEvents: '++id, kind, severity, ts, traceId, [traceId+ts]',
     ```
     and write a `telemetryEventRepo` with `append(event)`, `drainBatch(maxN)`, `purgeOlderThan(ts)`. This is the durable buffer the exporters drain.
  3. **Create `src/lib/observability/`** with these files:
     * `tracer.ts` — instantiates `WebTracerProvider`, registers the `FetchInstrumentation`, exposes `getTracer('questerix.fractions')`. Reads OTLP endpoint from `import.meta.env.VITE_OTLP_ENDPOINT`; no-ops if unset.
     * `meter.ts` — instantiates `MeterProvider` with histograms `db.op.duration_ms`, `validator.dispatch.duration_ms`, `boot.phase.duration_ms`, `frame.fps`, `longtask.duration_ms`; counters `error.count`, `attempt.count`, `bundle.fallback.count`.
     * `errorReporter.ts` — initialises Sentry (`Sentry.init({ dsn, release: import.meta.env.VITE_GIT_SHA, environment: import.meta.env.MODE })`), exposes `reportError(err, context)`. The `context` object is the structured payload missed by today's catch blocks (attempt ID, template ID, student ID, span context).
     * `correlation.ts` — exposes `runWithTraceId(fn)` using OTel's `Context` API; every catch block in the codebase will read `getActiveSpan()?.spanContext().traceId` and attach it to the persisted error.
     * `vitalsBridge.ts` — wires `web-vitals`' `onINP`, `onLCP`, `onCLS`, `onFID`, plus a custom `requestAnimationFrame` FPS sampler (rolling 60-frame window) into the meter.
     * `longtaskObserver.ts` — `new PerformanceObserver((entries) => { ... }).observe({ type: 'longtask', buffered: true })` recording each entry into the `longtask.duration_ms` histogram with the attribution name as a tag.
     * `bufferedExporter.ts` — overrides the OTel/Sentry transports so spans/events go through `telemetryEventRepo.append` first, with a `requestIdleCallback`-driven flush that uses `navigator.sendBeacon` on `pagehide` and falls back to `fetch(..., { keepalive: true })`.
  4. **Rewrite `src/lib/log.ts` and `src/lib/logger.ts`** as factories per the portability audit's Category C directive. The new `Logger` interface (`debug, info, warn, error: (event: string, attrs: Record<string, unknown>) => void`) takes structured key-value attributes (not formatted strings). The factory takes `{ minLevel, sinks: Sink[] }` where `Sink` is an interface implemented by:
     * `ConsoleSink` (current behavior, dev only)
     * `IndexedDBSink` (writes to `telemetryEvents`)
     * `OtelLogsSink` (emits `LogRecord` through the OTel logs SDK once it stabilises; until then this sink is a no-op stub)
     The two production sinks (IndexedDB, OTel) ship in *all* builds, replacing the `import.meta.env.PROD` short-circuit at `log.ts:47`.
  5. **Replace `src/main.ts:7-14` global error handlers** with a paired install:
     ```ts
     window.addEventListener('error', (e) => reportError(e.error ?? new Error(e.message), { kind: 'window.error', filename: e.filename, lineno: e.lineno }));
     window.addEventListener('unhandledrejection', (e) => reportError(e.reason instanceof Error ? e.reason : new Error(String(e.reason)), { kind: 'unhandled_rejection' }));
     ```
     Move the storage-error suppression *into* `reportError`'s tag layer so the error is still recorded (with `severity: 'warn'`) rather than dropped.
  6. **Wrap the data-access layer.** Insert a thin instrumentation in `src/persistence/instrumentation.ts` that wraps each Dexie repository method with a span + histogram timer:
     ```ts
     export function instrument<T extends Record<string, (...args: any[]) => Promise<any>>>(name: string, repo: T): T { /* Proxy that times each method */ }
     ```
     Apply at the export site of every repository (`src/persistence/repositories/*.ts`). Records `db.op.duration_ms{table, op, result}` and emits a span named `db.{table}.{op}`.
  7. **Wrap the validator dispatch** at `Level01Scene.ts:645-664` and `LevelScene.ts:391-402`. Each `reg.fn(input, payload)` call becomes:
     ```ts
     const span = tracer.startSpan('validator.dispatch', { attributes: { templateId, validatorId } });
     const t0 = performance.now();
     try { result = reg.fn(input, payload); }
     catch (err) { reportError(err, { templateId, validatorId, input, payload }); throw err; }
     finally { meter.histogram('validator.dispatch.duration_ms').record(performance.now() - t0, { validatorId }); span.end(); }
     ```
     Replace `Date.now() - this.questionStartTime` with a `performance.now()`-based monotonic measurement.
  8. **Add boot-phase spans in `src/scenes/BootScene.ts`** wrapping each of: persistence-grant (lines 47–54), curriculum seed (lines 56–69), student bootstrap (lines 70–108). Each phase emits a span with attributes `{ phase, result, durationMs }` and increments a counter. Total boot duration becomes a derived metric.
  9. **Connect the dead-letter `sessionTelemetry` table.** Either (a) add the missing `sessionTelemetryRepo.create({ sessionId, viewport, ... })` call at the end of `openSession()` in both scenes, or (b) drop the field if it's no longer in scope. The audit assumes (a) is correct — the schema, the capture, and the table all exist; only the wire is missing.
  10. **Fix the silent swallow at `src/lib/preferences.ts:28-34`** by routing the catch through `reportError(err, { kind: 'preferences.init' })` and keeping the default-preferences fallback.
  11. **Thread a `traceId` through the attempt cascade.** `recordAttempt` opens a span at the top, propagates the `spanContext().traceId` into the persisted `Attempt.traceId` field (schema bump v6), and every downstream call (`bktUpdate`, `runAllDetectors`, `misconceptionFlagRepo.create`) attaches the same ID to its emitted span. The schema field gives forensic replay across the cascade.
  12. **Stamp every record with a release tag.** Read `import.meta.env.VITE_GIT_SHA` (set by Vite from `process.env.VITE_GIT_SHA`, populated in CI) and attach as a global resource attribute on the `WebTracerProvider` and `MeterProvider`, plus as a Sentry release. Inject via `vite.config.ts`:
     ```ts
     define: { 'import.meta.env.VITE_GIT_SHA': JSON.stringify(execSync('git rev-parse --short HEAD').toString().trim()) }
     ```
  13. **Update `src/main.ts`** to instantiate the providers as the **first** statement (before scene imports) so any failure during scene loading is captured. Order: (1) `initObservability()`, (2) `window.addEventListener('error'/'unhandledrejection')`, (3) `boot()`.
  14. **Add an opt-in privacy gate** at the BootScene boundary: persist a `DeviceMeta.preferences.telemetryConsent` flag (already a sibling of the existing reduce-motion / high-contrast preferences). Honour it at `bufferedExporter.ts` — if false, the IndexedDB buffer is still written (for in-app debugging) but the network flush is suppressed. Surfaces correctly with privacy.html (already in `public/`).
  15. **Verify** with three smoke tests:
      * `tests/integration/telemetry.boot.test.ts` — assert that booting under fake-indexeddb produces ≥ 3 boot-phase spans and one `boot.total` measurement.
      * `tests/integration/telemetry.attempt.test.ts` — submit an attempt against a synthetic validator, assert the persisted `Attempt.traceId` matches the span's `traceId`, and assert one `validator.dispatch.duration_ms` and one `db.op.duration_ms{table='attempts',op='add'}` record.
      * `tests/integration/telemetry.error.test.ts` — force a validator throw, assert one error reaches the IndexedDB ring buffer with `severity:'error'`, the originating template ID, and the trace ID.
  16. **Re-run this audit after the implementation lands.** Each numbered finding above is a closeable item; track them in the architecture-review document alongside `G-DB1`, `G-E2`, etc.

---

### 4. Deep-Dive Findings (Code-Level Forensics)

The first pass surfaced the absence-of-tooling story. This section enumerates the **antipatterns already in the source** that will neutralise any tooling that gets bolted on. Fixing the tooling without fixing these will produce an observability stack that "works" but receives no signal.

#### 4.1 The Bare-Catch Antipattern — 73+ sites, 27 files

* **Deficiency:** A grep for `^\s*\}\s*catch\s*\{` (a `catch` with no parameter, immediately followed by a brace — i.e. the error reference is *discarded at the language level*) yields 73 hits across 27 files. Every single one of these is a black hole: even a future telemetry shipper cannot retrofit logging into them, because the error reference does not exist in the catch's scope. The pattern is *more destructive than swallowing* — it is type-system-enforced erasure.
* **Location (full enumeration, all instances of `} catch {`):**
  * Persistence layer (50 sites — every dynamic-store and curriculum repository): `attempt.ts:28, 36, 47, 55, 69, 90`; `session.ts:19, 31, 40`; `skillMastery.ts:14, 26, 34, 42`; `student.ts:26, 34, 43, 51`; `bookmark.ts:18, 30, 38, 46`; `misconceptionFlag.ts:14, 22, 37, 49, 60, 69`; `progressionStat.ts:15, 23, 35, 43`; `hintEvent.ts:20`; `deviceMeta.ts:41, 55, 66`; `activity.ts:13, 21, 29, 37`; `activityLevel.ts:13, 25, 37`; `fractionBank.ts:13, 21, 29, 37`; `curriculumPack.ts:13, 21`; `skill.ts:13, 21, 29`; `hint.ts:14, 25`; `misconception.ts:13, 21`. Plus `db.ts:165, 173`; `lastUsedStudent.ts:17, 25, 33`; `backup.ts:131`.
  * Scenes (13 sites): `Level01Scene.ts:259, 1181`; `LevelScene.ts:152, 874`; `BootScene.ts` (none — uses `catch (err)` plus `console.warn`, see 4.5); `MenuScene.ts:343, 360, 381, 770, 801`; `SettingsScene.ts:257, 277`; `PreloadScene.ts:131`.
  * Components (6 sites): `AccessibilityAnnouncer.ts:55`; `SkipLink.ts:31, 77`; `FeedbackOverlay.ts:164`; `ProgressBar.ts:122`; `DragHandle.ts:219`.
  * Audio (2 sites): `TTSService.ts:35, 43`.
  * Logger itself (1 site): `lib/log.ts:41` — the logger that is supposed to *be* the observability primitive has its own bare-catch on filter resolution.
* **Risk:** Every Dexie read failure (which is how the persistence layer signals quota exhaustion, transaction abort, schema-migration race, `InvalidStateError` after a connection close, etc.) becomes a silent default value: `undefined`, `[]`, `0`, `false`. The student-facing UI has no way to distinguish "no data" from "data inaccessible due to a bug." The architecture review's `G-DB1` and `G-DB2` index-utilisation flags cannot be empirically verified because their failure modes are absorbed at the repository layer. This is the *single highest-leverage* observability remediation in the codebase: convert all 73 sites to `} catch (err) { reportError(err, { kind: 'repo.X.method' }); return <fallback>; }`.
* **Refactoring Directive:** Once the new structured `Logger` / `reportError` is in place per Section 3, sweep every file with a regex-aware codemod. The mechanical change is identical at every site — wrap the swallow with a structured emit including the originating method name, table, and any keys in scope. Add an ESLint rule (`@typescript-eslint/no-empty-function` plus a custom rule against `catch {` without a parameter) so the antipattern cannot return.

#### 4.2 Source maps are disabled in production builds

* **Deficiency:** `vite.config.ts` declares `build` (lines 78–91) with `target`, `outDir`, `assetsInlineLimit`, `chunkSizeWarningLimit`, and `rollupOptions.output.manualChunks`, but **no `sourcemap` entry**. Vite's default for `build.sourcemap` is `false`. Production bundles ship as minified, mangled JavaScript with no `.map` siblings.
* **Location:** `vite.config.ts:78-91`.
* **Risk:** Even if Sentry, OTel, or any other error tracker is installed tomorrow, every captured stack trace will look like `eM (a.js:1:24811)` instead of `recordAttempt (Level01Scene.ts:911)`. Field bug reports become un-actionable. This silently invalidates the entire investment in error tracking until source maps are turned on. **This is a one-line fix that gates the value of every other recommendation in Section 3.**
* **Refactoring Directive:**
  ```ts
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: 'hidden', // emit .map files but do not append a `//# sourceMappingURL=` comment to the bundle
    // ...
  }
  ```
  `'hidden'` keeps maps off the public CDN-facing JS while still producing them for upload to Sentry / OTel collector. Wire `@sentry/vite-plugin` (or the equivalent OTel collector upload step in CI) to upload the maps and immediately delete them from `dist/` before deploy. The CI hook is:
  ```bash
  npx sentry-cli sourcemaps upload --release "$GIT_SHA" dist/
  find dist -name '*.map' -delete
  ```

#### 4.3 Logger fragmentation: four parallel implementations + one dead-letter store

* **Deficiency:** Five distinct emission paths coexist:
  1. `src/lib/log.ts` — categorical, browser-styled, *off-in-PROD*.
  2. `src/lib/logger.ts` — four-level wrapper, *DEV-gated for `debug/info/warn`*.
  3. `src/engine/calibration.ts:20` — inline `{ warn: (msg) => console.warn(...) }` to avoid pulling in either logger (per the portability audit Category C, this is intentional but observably fragmenting).
  4. `src/scenes/BootScene.ts` — every emission uses raw `console.info` / `console.warn` / `console.error` (lines 24, 50, 53, 62, 64, 68, 76, 82, 103, 107). The Boot scene, the *first* code that runs on every load, never reaches the structured logger.
  5. `src/persistence/db.ts:181, 190, 196` and `curriculum/loader.ts:82, 119, 140, 153, 159, 164` and `curriculum/seed.ts:29, 85, 96, 129, 141, 171` — raw `console.*` for the entire bootstrap pipeline.
  Plus the **bare-catch sites in 4.1** are effectively a sixth path: emission to `/dev/null`.
* **Location:** As enumerated above. Total: ~40 raw `console.*` sites + 73 bare-catch sites + the four module implementations.
* **Risk:** Any future log-collection retrofit must hit five different abstractions. The portability audit's Category C finding (logger coupled to `import.meta.env.DEV` and globals) and the SoC audit's repeated note that the engine layer rolls its own logger to dodge the central one are the same pathology: there is no logger that is safe to depend on from every layer. The new structured `Logger` from Section 3 is the only durable fix; until it lands, **do not add a sixth log path** while integrating Sentry/OTel — instead, route Sentry / OTel through the *new* logger so all five existing paths converge.
* **Refactoring Directive:** Establish the new `Logger` interface and adapters per Section 3 step 4 first. Then in a single sweep, replace all raw `console.*` calls in `BootScene.ts`, `db.ts`, `loader.ts`, `seed.ts`, `main.ts`, and `calibration.ts` with the structured logger. Delete `src/lib/log.ts` and `src/lib/logger.ts` once the migration is complete (do not leave them as deprecated wrappers — that just creates a sixth path).

#### 4.4 `src/audio/TTSService.ts` — double swallow with explicit "swallow OK" comment

* **Deficiency:** Two bare-catch blocks at lines 35–37 and 43–45. The comments — `"Never throw — game must continue if TTS fails"` and `"safe to swallow"` — encode the wrong dichotomy: *not throwing* and *not logging* are independent decisions, but the code conflates them. If the underlying `speechSynthesis.speak()` throws (e.g. on iPad with audio routing contention), the error is gone and the user gets silent UX with zero diagnostic.
* **Location:** Lines 35–37 (`speak`), 43–45 (`stop`).
* **Risk:** The K-2 audience is heavily TTS-dependent (per `docs/30-architecture/accessibility.md §7`). A degraded TTS path is an accessibility regression that the team has no signal for. The AAA WCAG audit cited in `tests/a11y/` cannot detect the runtime failure, only the structural absence of audio.
* **Refactoring Directive:** Replace both bare catches with `} catch (err) { logger.warn('tts', 'speak_failed', { err: errToObject(err), text }); }`. Note: do **not** include the full `text` payload if it might contain student-authored content — but for K-2 prompts (which are curriculum-authored, not user-authored), text is safe and high-value for triage.

#### 4.5 `src/scenes/BootScene.ts` — raw `console.*` even though `lib/log.ts` exists

* **Deficiency:** The Boot scene was authored before, or in parallel with, `lib/log.ts`. It uses `console.info` / `console.warn` exclusively. The `[BootScene]` prefix is hand-rolled in every call. None of these emissions reach `log.ts`'s `SCENE` category — meaning a developer who sets `localStorage.LOG = 'SCENE'` to debug scene lifecycle gets *zero* output during the first ~500 ms of the app's life.
* **Location:** Lines 24, 50, 53, 62, 64, 68, 76, 82, 103, 107.
* **Risk:** The boot path is the most failure-prone phase of the app (per `runtime-architecture.md §10` failure-mode taxonomy: persistence-grant denial, seed failure, student-bootstrap failure, all colocated here). Developers debugging boot issues must either know to look at the raw console *and* the structured logger separately, or grep for `[BootScene]` in addition to the logger output. This is a friction tax that tooling will never pay back.
* **Refactoring Directive:** Sweep all ten sites to use `log.scene(...)`, `log.warn('SCENE', ...)`, `log.error('SCENE', ...)`. Once `lib/log.ts` is itself refactored per Section 3 step 4, the migration is the same edit either way.

#### 4.6 Dynamic `await import('nanoid').catch(() => ({ nanoid: () => `s-${Date.now()}` }))` hides chunk-load failures with broken-by-design fallback

* **Deficiency:** Three call sites (`BootScene.ts:91`, `Level01Scene.ts:313, 915`, `LevelScene.ts:604, 638`) attempt to dynamically import `nanoid`. Each catches a possible import failure and falls back to a function that returns `s-${Date.now()}` or `a-${Date.now()}`. The fallback (a) emits no signal that the import failed, and (b) generates IDs that are **not unique** under rapid succession — two attempts submitted within the same millisecond would collide on the same `a-...` ID, violating the `attempts` table's append-only invariant.
* **Location:** `BootScene.ts:91`; `Level01Scene.ts:313, 915`; `LevelScene.ts:604, 638`.
* **Risk:** A chunk-load failure (network blip during PWA cold-start, CDN regression, blocked import) cascades into ID collisions that violate persistence invariants — and the team has zero signal because the catch is silent. The `++id` auto-increment on the `attempts` table will overwrite the user-supplied `id` field for that row, masking the collision; but `bookmarks`, `sessions`, and `misconceptionFlags` are keyed by the supplied ID and *will* collide.
* **Refactoring Directive:** This is also flagged by the portability audit (Category D / Category A — `IdGenerator` port). The observability fix is to (a) log the failed import via the new `reportError`, (b) make the fallback collision-resistant (`${Date.now()}-${Math.floor(Math.random() * 1e6)}` at minimum, ideally `crypto.randomUUID()` since it is widely available now in the supported browser matrix). The portability fix (centralising ID generation behind a port) supersedes this; the observability remediation is just to ensure the failure is *visible* until the port lands.

#### 4.7 Phaser scene transitions are not observable

* **Deficiency:** `this.scene.start(...)` is called 18 times across the codebase (`BootScene.ts:121`, `PreloadScene.ts:124`, `MenuScene.ts:124, 131, 138, 243, 274, 460, 462`, `Level01Scene.ts:380, 1082, 1099`, `LevelScene.ts:296, 791, 793, 802`, `SettingsScene.ts:375`) plus one `scene.launch` (`MenuScene.ts:204`). None of these emit a span or a structured event recording the transition. The destination scene's `init()` runs, but there is no parent context that links "user clicked Level 3" to "LevelScene loaded templates 8s later."
* **Location:** As enumerated.
* **Risk:** Navigation funnel analysis is impossible. A user who repeatedly bounces between MenuScene and LevelScene without completing any level is indistinguishable from a happy user. The PWA install-conversion funnel (Boot → Preload → Menu → Level → Session-complete) has no observable handoff points.
* **Refactoring Directive:** Wrap `this.scene.start(...)` and `this.scene.launch(...)` in a thin helper at `src/scenes/utils/navigate.ts` that opens a span (`tracer.startSpan('scene.transition', { attributes: { from, to, payload }})`), invokes the original Phaser call, and ends the span on the next scene's `create()` completion (use `scene.events.once('create', () => span.end())`). Increment a counter `scene.transition.count{from, to}` for funnel analysis. Replace all 19 sites with `navigate(this, 'LevelScene', { ... })`.

#### 4.8 Workbox / PWA service worker has zero error reporting

* **Deficiency:** `vite.config.ts:18-28` configures `runtimeCaching` with a `CacheFirst` handler for `/curriculum/v\d+\.json` but no `setCatchHandler`, no `event.waitUntil` failure listener, no `workbox-window` `ready`/`waiting`/`controlling` event hooks. `workbox-window` is in `package.json` (lines 45, 62) but unused (per Grep — no imports of `workbox-window` outside the VitePWA plugin's own resolution).
* **Location:** `vite.config.ts:12-44`.
* **Risk:** The service worker mediates the offline-first PWA contract. Cache-population failures, version-mismatch ("a new version is waiting"), and updates that fail to activate are all invisible. The 30-day curriculum cache (`maxAgeSeconds: 30 * 86400`) means a stale curriculum can persist on a device for a month with the team unaware.
* **Refactoring Directive:**
  1. Add `setCatchHandler` to the Workbox runtime config to redirect failed precache fetches to a placeholder endpoint that the app can intercept and log.
  2. Use the existing `workbox-window` dependency to instantiate a `Workbox` in `main.ts` and hook its `installed`, `waiting`, `controlling`, and `redundant` events; route each through `reportError` / structured logger.
  3. Surface the "new version waiting" event as a UI toast (currently invisible — the `registerType: 'autoUpdate'` setting auto-applies on next reload but with no signal).

#### 4.9 `Level01Scene` vs `LevelScene` — divergent timing instrumentation

* **Deficiency:** `LevelScene.ts:404-405` measures **two** numbers (`validatorMs = Date.now() - startedAt` for the validator alone, `totalResponseMs = Date.now() - questionStartTime` for the full think-time-plus-validator). `Level01Scene.ts:667` measures **one** (`responseMs = Date.now() - questionStartTime`). Both write to the same `Attempt.responseMs` field. So the dataset for L1 attempts is contaminated with validator latency that is *isolated* in L2+ attempts. Any aggregate analysis ("how long does a partition question take vs. a comparison question") will see L1 systematically inflated by validator dispatch time.
* **Location:** `Level01Scene.ts:667`; `LevelScene.ts:404-413`.
* **Risk:** The architecture review's `G-E2` finding ("wired in LevelScene, not in Level01Scene") is part of a broader pattern: the two sibling scenes drift in measurement contract. With BKT and misconception detectors consuming `avgResponseMs` from the `sessions` table (computed by averaging `responseTimes`), the engine's *engagement signal itself* is L1-contaminated. Until the SoC audit's F-01/F-02 remediation collapses the two scenes into one, the divergent measurement creates a phantom L1 effect in any longitudinal analysis.
* **Refactoring Directive:** Hot-fix: add the `validatorMs` measurement to `Level01Scene.recordAttempt` to match `LevelScene` until the scenes merge. Persist *both* values to the schema (rename to `validatorDurationMs` and `responseDurationMs` for clarity; bump schema to v6). The hot-fix is ten lines; the structural fix is the F-01 use-case extraction.

#### 4.10 `src/engine/misconceptionDetectors.ts` — detector-level metrics are absent

* **Deficiency:** Each of the five detectors (`detectWHB01:14`, `detectWHB02:58`, `detectMAG01`, `detectPRX01`, `detectEOL01`) iterates over an attempt array and either returns a flag or `null`. There is no signal recording (a) how many attempts each detector evaluated, (b) what the false-positive vs true-positive split looks like (would need a feedback loop, but the per-run cardinality is recordable today), (c) how long each detector ran. The detectors are documented as "Pure math" but their *operational* characteristics — population, latency, flag rate per session — are dark.
* **Location:** Each detector function in `src/engine/misconceptionDetectors.ts`.
* **Risk:** A misconception detector that fires never (always returns `null`) due to a regression in its filter logic is indistinguishable from a healthy detector that simply hasn't observed the trap pattern yet. The team has no rate-of-flagging signal to detect "WHB-01 stopped firing after the v2.3 release."
* **Refactoring Directive:** Per the SoC audit's recommendation, the detectors should accept a `ports: { idGen, clock }` argument; extend that to `ports: { idGen, clock, meter }` and increment `misconception.detector.eval{detector}` on every call, `misconception.detector.flag{detector, misconceptionId}` on each return. Latency: `meter.histogram('misconception.detector.duration_ms').record(performance.now() - t0, { detector })`.

---

### 5. Tooling Decisions Refined (Confirmed Against Current SDK Docs)

The first pass listed packages by name; this section confirms the **current canonical imports** (verified against `@open-telemetry/opentelemetry-js`, `@getsentry/sentry-javascript`, and `@dexie/dexie.js` documentation as of 2026-04). The recommendations have not changed; specifics are tightened.

#### 5.1 OpenTelemetry JS — Browser Setup

The canonical browser setup (per the `opentelemetry-js` `examples/opentelemetry-web` and `experimental/packages/opentelemetry-browser-detector` READMEs) is:

```ts
// src/lib/observability/tracer.ts
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { resourceFromAttributes, detectResources } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { browserDetector } from '@opentelemetry/opentelemetry-browser-detector';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';

export async function initTracing(): Promise<void> {
  const otlpEndpoint = import.meta.env.VITE_OTLP_ENDPOINT;
  if (!otlpEndpoint) return; // no-op if telemetry not configured

  const baseResource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'questerix.fractions',
    [ATTR_SERVICE_VERSION]: import.meta.env.VITE_GIT_SHA ?? 'dev',
    'deployment.environment': import.meta.env.MODE,
  });
  const detected = await detectResources({ detectors: [browserDetector] });
  const resource = baseResource.merge(detected);

  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: otlpEndpoint }),
        { exportTimeoutMillis: 5_000, scheduledDelayMillis: 5_000 }
      ),
    ],
  });

  provider.register({ contextManager: new ZoneContextManager() });

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(), // automatic page-load timing — closes finding 4.7 partial
      new XMLHttpRequestInstrumentation(),
      new FetchInstrumentation(), // auto-instruments loader.ts:138 — closes loader finding
    ],
  });
}
```

`DocumentLoadInstrumentation` is critical and was not surfaced strongly enough in the first pass: it captures the navigation timing API (DNS, TCP, TLS, TTFB, DOMContentLoaded, load) for free, providing the boot-phase telemetry the audit flagged in finding 4.5 of Section 2 without manual instrumentation.

`ZoneContextManager` (from `@opentelemetry/context-zone`) preserves trace context across `setTimeout`, `Promise.then`, and Phaser tween callbacks — necessary because the attempt cascade in `recordAttempt` involves multiple awaited boundaries and async DOM events.

#### 5.2 Sentry Browser — COPPA-Safe Configuration

```ts
// src/lib/observability/errorReporter.ts
import * as Sentry from '@sentry/browser';

export function initErrorReporting(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    release: import.meta.env.VITE_GIT_SHA,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // COPPA: this is a K-2 educational app. Mask everything by default.
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
        // No network bodies — student data could appear in request payloads
        networkDetailAllowUrls: [],
      }),
    ],
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0, // never record happy-path sessions
    replaysOnErrorSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Honour DeviceMeta.preferences.telemetryConsent
      if (!getTelemetryConsentSync()) return null;
      // Strip any accidentally-captured studentId from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => ({
          ...b,
          data: b.data ? redactStudentId(b.data) : b.data,
        }));
      }
      return event;
    },
    sendDefaultPii: false, // do not auto-attach IP / cookies
  });
}

export function reportError(err: unknown, context: Record<string, unknown>): void {
  Sentry.captureException(err, { extra: context });
}
```

Three points worth flagging:
1. **`sendDefaultPii: false`** is the Sentry-side enforcement of the C2 / privacy-spec constraint that the app collects no PII.
2. **`replaysSessionSampleRate: 0`** disables happy-path session replay entirely — only error sessions are recorded, and even those at 10% sampling. This is the minimum-data posture a K-2 app should ship; the toggle to raise it must be a deliberate product decision after legal review.
3. **`beforeSend` honours the consent gate.** `getTelemetryConsentSync()` reads a cached value (the `DeviceMeta.preferences.telemetryConsent` flag, populated synchronously by `initPreferences()` during boot). This is the consent linchpin: until it returns true, every event is dropped before the SDK transports anything.

#### 5.3 Dexie Middleware — Centralised DB Instrumentation

The first pass recommended a per-repository Proxy. **Dexie's `db.use()` middleware and `table.hook(...)` API are a much cleaner primitive** for centralised instrumentation. From the Dexie docs:

```ts
// src/lib/observability/dexieMiddleware.ts
import type { Dexie } from 'dexie';
import { trace } from '@opentelemetry/api';
import { meter } from './meter';

const dbOpHistogram = meter.createHistogram('db.op.duration_ms', {
  description: 'Dexie operation latency',
  unit: 'ms',
});

export function instrumentDexie(db: Dexie): void {
  db.use({
    stack: 'dbcore',
    name: 'questerix-telemetry',
    create(downlevel) {
      return {
        ...downlevel,
        table(tableName: string) {
          const table = downlevel.table(tableName);
          const tracer = trace.getTracer('questerix.db');
          return {
            ...table,
            mutate: async (req) => {
              const span = tracer.startSpan(`db.${tableName}.${req.type}`, {
                attributes: { 'db.system': 'indexeddb', 'db.table': tableName, 'db.op': req.type },
              });
              const t0 = performance.now();
              try {
                const result = await table.mutate(req);
                dbOpHistogram.record(performance.now() - t0, {
                  table: tableName, op: req.type, result: 'ok',
                });
                return result;
              } catch (err) {
                dbOpHistogram.record(performance.now() - t0, {
                  table: tableName, op: req.type, result: 'error',
                });
                span.recordException(err as Error);
                throw err;
              } finally {
                span.end();
              }
            },
            // mirror for query/get/getMany/openCursor/count
          };
        },
      };
    },
  });
}
```

This single middleware covers **every** Dexie operation in **every** repository — replaces the 17-file Proxy retrofit with one file. It also captures operations that bypass the repositories (the bulk-seed transaction in `seed.ts`, the export `toArray` calls in `backup.ts`, the wipe/restore in `SettingsScene`).

Per-table `hook('creating' | 'reading' | 'updating' | 'deleting')` (per Dexie docs) is a higher-level layer over the same primitive — useful for adding `createdAt` / `updatedAt` timestamps if the team wants those, but `db.use()` is the right level for telemetry because it captures *every* operation type uniformly.

---

### 6. Privacy & COPPA Posture (Mandatory for K-2)

The audit's tooling recommendations introduce data egress (OTel collector, Sentry SaaS) where there was none before. For a K-2 educational app this is a regulated change. The following constraints are *prerequisites* for any of Section 3 / Section 5 going live, not decorations:

1. **Default deny.** The new `DeviceMeta.preferences.telemetryConsent` flag MUST default to `false`. The `BootScene` boundary reads it; if false, the IndexedDB ring buffer is still written (so an in-app debug screen can show recent events) but **no network exporter is initialised at all**. No DSN-level filtering — the SDKs are not even loaded.
2. **No PII fields, even hashed.** The codebase already enforces no real-name capture (per C2). The telemetry payloads must mirror this: replace `studentId` (which is a synthetic nanoid but is still a per-device identifier) with a per-session salted hash that rotates on each `closeSession`. Sentry's `sendDefaultPii: false`, `User: undefined`, and `tracesSampler` returning `0` for any span containing PII attributes are the enforcement points.
3. **Explicit parental disclosure.** `public/privacy.html` is the contract; it MUST be updated to enumerate exactly what fields ship if the consent flag is enabled. The current copy (per the file's existence in `public/`) was written before any telemetry was contemplated and assumes data stays on-device.
4. **Region-pin the collector.** OTel collector and Sentry project regions must be pinned to the user's school-district jurisdiction (US-East / EU-West typically). Sentry's `region` config and the OTel `OTLPTraceExporter`'s explicit `url` must point to a region-specific endpoint. No automatic geo-routing.
5. **Retention.** Collector + Sentry retention configured to ≤ 30 days for traces, ≤ 14 days for replays. K-2 student behaviour data is not a forensic asset to keep indefinitely. The IndexedDB ring buffer purge (`telemetryEventRepo.purgeOlderThan(ts)`) should run daily on `BootScene` and clear events older than 7 days regardless of upload status.
6. **No ad-network or analytics tags ever.** This is implicit but worth stating: GA, Mixpanel, Amplitude, Hotjar, Pendo, etc. are **not** appropriate for this audience. The choice of OTel + Sentry (both self-host-capable, both API-key-gated) is what makes the egress justifiable.

---

### 7. Phaser-Specific Telemetry Plan

The first pass listed FPS and longtask observers but did not address Phaser's own event surface. The following hooks should be wired during `initObservability()`:

```ts
// src/lib/observability/phaserBridge.ts
import * as Phaser from 'phaser';
import { meter } from './meter';
import { tracer } from './tracer';

const fpsHist = meter.createHistogram('frame.fps');
const sceneTransitionCounter = meter.createCounter('scene.transition.count');

export function instrumentGame(game: Phaser.Game): void {
  // Tab visibility — pause-from-blur is the most common "session ended" cause on iPad
  game.events.on(Phaser.Core.Events.HIDDEN, () => tracer.startSpan('game.hidden').end());
  game.events.on(Phaser.Core.Events.VISIBLE, () => tracer.startSpan('game.visible').end());

  // FPS sampler — every 60 frames record actualFps
  let frameCount = 0;
  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    if (++frameCount % 60 === 0) {
      fpsHist.record(game.loop.actualFps, { paused: game.loop.targetFps - game.loop.actualFps > 10 ? 'jank' : 'ok' });
    }
  });

  // Scene lifecycle — covers all 18 scene.start sites without per-call instrumentation
  game.scene.scenes.forEach((scene) => {
    scene.events.on(Phaser.Scenes.Events.CREATE, () => {
      sceneTransitionCounter.add(1, { scene: scene.scene.key, phase: 'create' });
    });
    scene.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      sceneTransitionCounter.add(1, { scene: scene.scene.key, phase: 'shutdown' });
    });
  });

  // Resize — viewport changes are otherwise dark
  game.scale.on(Phaser.Scale.Events.RESIZE, (gameSize: Phaser.Structs.Size) => {
    tracer.startSpan('game.resize', { attributes: { width: gameSize.width, height: gameSize.height } }).end();
  });
}
```

This single hook covers findings 4.7 (scene transitions), the `viewport` field of finding "viewport telemetry" in Section 2, and the absent FPS/visibility metrics of Section 1's blind spot #9 — all without per-call site edits.

Phaser's `Phaser.Loader.Events.LOAD_ERROR` and `LOAD_PROGRESS` should be hooked in `PreloadScene` to capture asset-pipeline failures (font, sprite, audio). Today these are silent.

---

### 8. Refined Implementation Order

The first-pass next-steps list mixed prerequisite work with downstream tooling. The correct phased order:

**Phase 0 — Make the building habitable (1 day, blocks everything else):**
1. Turn on source maps in `vite.config.ts` (`sourcemap: 'hidden'`).
2. Inject `VITE_GIT_SHA` and `VITE_SENTRY_DSN` / `VITE_OTLP_ENDPOINT` env vars (CI-gated, dev-defaulting to undefined).
3. Add ESLint rules: ban `} catch {` (no parameter), ban dynamic `import()` of `src/persistence/**` from `src/scenes/**` (per SoC audit F-09), ban raw `console.*` outside `src/lib/observability/**`.
4. Codemod sweep: convert all 73 bare-catch sites to `catch (err)` even if the body is `void err;` for now. This is preparatory — it makes the next phases possible.

**Phase 1 — Local durable buffer (2–3 days, no egress yet):**
1. Bump Dexie schema to v5; add `telemetryEvents` store and `telemetryEventRepo`.
2. Build `src/lib/observability/{logger.ts,errorReporter.ts}` with a `ConsoleSink` and `IndexedDBSink` only — no network.
3. Sweep all `console.*` and `log.*` / `logger.*` callers to the new logger. Delete `src/lib/log.ts` and `src/lib/logger.ts`.
4. Replace `main.ts:7-14` global handlers with `reportError`-routed equivalents that *do not* suppress.
5. Add a hidden-by-default debug screen at `SettingsScene` showing the last 100 buffered events. Useful for dogfooding before egress is wired.

**Phase 2 — Sentry (2 days, opt-in egress):**
1. `npm install @sentry/browser` + `@sentry/vite-plugin`.
2. Wire `initErrorReporting()` per Section 5.2. Default `telemetryConsent: false`.
3. Add a settings UI to flip `telemetryConsent`; update `privacy.html`.
4. Configure `@sentry/vite-plugin` to upload source maps in CI; delete `.map` files post-upload.
5. Smoke test: force a validator throw in dev with consent enabled, verify Sentry receives the event with un-minified stack.

**Phase 3 — OpenTelemetry traces (3 days):**
1. Install OTel browser packages per Section 5.1.
2. Wire `initTracing()` and `instrumentGame(game)` in `main.ts` after `Phaser.Game` instantiates.
3. Add `correlation.ts` and thread `traceId` through `recordAttempt` → repositories. Bump schema to v6 to add `Attempt.traceId`.
4. Add boot-phase spans in `BootScene._bootAsync`.

**Phase 4 — Dexie middleware (1 day):**
1. Add `instrumentDexie(db)` per Section 5.3. Single file. Removes the per-repo Proxy work entirely.
2. Verify all 73 (now `catch (err)`) blocks now reach `reportError` with the originating table/op attributes.

**Phase 5 — Metrics & resource telemetry (2 days):**
1. Install `web-vitals`; wire `vitalsBridge.ts` per Section 3 step 3.
2. Add `longtaskObserver.ts` and `frame.fps` sampler from Section 7.
3. Add `navigator.storage.estimate()` polling on `pagehide` and `BootScene` start.
4. Wire `sessionTelemetryRepo.create(...)` at the end of `openSession()` in both scenes — close the dead-letter store finding.

**Phase 6 — Hardening (ongoing):**
1. Build a synthetic test that submits attempts at 100 Hz and verifies no telemetry-side regression.
2. Add the three integration tests from Section 3 step 15.
3. Establish per-release SLO checks (boot p95 < 3s, FPS p10 ≥ 50, validator p95 < 50ms) gating CI green.

This ordering is intentional: each phase is independently shippable and has a verifiable outcome. Phases 0–2 can be done while the architecture-review and SoC audits' larger refactors are in flight, without blocking either.

---

### 9. Build, CI, and Release-Pipeline Observability (Out-of-App)

The first two passes covered runtime telemetry. This section covers the *delivery* pipeline — every gap here means a regression escapes to production before runtime telemetry could possibly catch it.

#### 9.1 `tsconfig.json` — strict flags deferred that widen the runtime catch surface

* **Deficiency:** Lines 25–26 explicitly defer `noUncheckedIndexedAccess` and `noPropertyAccessFromIndexSignature` ("Phase 10.1: stricter checks — deferred to Phase 12 pending codebase refactoring"). The codebase uses `arr[i]!` (the non-null assertion) in many hot paths, including the BKT and the selection algorithm (`selection.ts:87` returns `arr[Math.floor(Math.random() * arr.length)]!`). The compiler accepts these as `T`; at runtime they can be `undefined`.
* **Location:** `tsconfig.json:25-26`. Representative call sites: `selection.ts:87`; `bkt.ts:124-128` (state derivation); `LevelScene.ts:204` (`templatePool[index % templatePool.length]!`); virtually every `attempts[0]` reference in `misconceptionDetectors.ts`.
* **Risk:** Every `!` is a TypeError waiting for an empty-array edge case. Without `noUncheckedIndexedAccess`, the type system is no help — the bug surfaces at runtime as `Cannot read properties of undefined (reading 'masteryEstimate')`. With production source maps disabled (finding 4.2) and no error tracker installed, the field user sees a frozen scene with zero diagnostic. Telemetry becomes the *only* line of defence for a class of bugs the type system would have caught for free.
* **Refactoring Directive:** Flip `noUncheckedIndexedAccess: true` after a one-time codemod that converts every `arr[i]!` to either `arr[i] ?? <fallback>` or an explicit `if (i >= arr.length) reportError(...)`. This is mechanically tedious but high-leverage: it converts ~50 silent `undefined` paths into either type-safe defaults or observable errors. The tsconfig comment says "deferred to Phase 12" — observability work is the lever to make Phase 12 land.

#### 9.2 `.lighthouserc.json` — Lighthouse runs but enforces nothing

* **Deficiency:** The entire config is six lines: `staticDistDir: ./dist`, `numberOfRuns: 1`, `target: temporary-public-storage`. No `assert.preset`, no `assertions` block, no per-category thresholds. The lighthouse.yml workflow (`run: lhci autorun`) executes successfully no matter what scores come back.
* **Location:** `.lighthouserc.json` (entire file).
* **Risk:** Lighthouse is *theatre* without assertions. A PR that drops LCP from 1.5 s to 4.5 s passes CI green. A regression in interactivity (TBT > 600 ms) on a touch-first iPad app for K-2 students is invisible. The team is paying the LHCI compute cost and getting zero enforcement; an honest "we don't enforce performance" signal would be more valuable than a perpetually-passing run.
* **Refactoring Directive:**
  ```json
  {
    "ci": {
      "collect": { "staticDistDir": "./dist", "numberOfRuns": 3 },
      "assert": {
        "preset": "lighthouse:recommended",
        "assertions": {
          "categories:performance": ["error", { "minScore": 0.85 }],
          "categories:accessibility": ["error", { "minScore": 0.95 }],
          "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
          "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
          "total-blocking-time": ["error", { "maxNumericValue": 300 }],
          "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
          "interactive": ["error", { "maxNumericValue": 3500 }]
        }
      },
      "upload": { "target": "temporary-public-storage" }
    }
  }
  ```
  Numbers should be sourced from `docs/30-architecture/performance-budget.md §1` (the same spec the bundle-size gate cites). Tighten `numberOfRuns` to 3 to stabilise the assertion against jitter.

#### 9.3 Bundle-size gate is duplicated inline; `measure-bundle.mjs` exists but is unused in CI

* **Deficiency:** `ci.yml:54-61` and `deploy.yml:30-37` both run an inline shell script: `GZ=$(find dist -name '*.js' -exec gzip -c {} \; | wc -c); if [ "$GZ" -gt 1048576 ]; then exit 1; fi`. The script is duplicated verbatim. Meanwhile `scripts/measure-bundle.mjs` is a hand-built tool that does the same enforcement but with per-file breakdown — and CI doesn't call it. So the team has *two* implementations of the gate, divergence between them is silent, and the better-instrumented one runs nowhere.
* **Location:** `.github/workflows/ci.yml:54-61`; `.github/workflows/deploy.yml:30-37`; `scripts/measure-bundle.mjs:1-44`.
* **Risk:** A regression in either inline shell snippet (e.g. a path with spaces in `find`, a different `gzip` codec on a future runner) silently breaks the gate without producing a visible error — `wc -c` on no input returns `0`, which passes. The duplication means a budget bump (1 MB → 1.5 MB) requires editing three places (the two workflows and `measure-bundle.mjs`). When the three drift, the deploy and CI gates apply different thresholds.
* **Refactoring Directive:** Replace both inline gates with a single `npm run measure-bundle` invocation. The script already exits non-zero on overage (line 43). Move the threshold to a single environment variable read by `measure-bundle.mjs`, sourced from `docs/30-architecture/performance-budget.md`. Delete the duplicated shell. This also gives CI per-file breakdown output for free, which is what the comment in ci.yml ("Run: npx vite-bundle-visualizer to identify the offending chunk") admits is missing.

#### 9.4 `deploy.yml` does not stamp the build with a release identifier

* **Deficiency:** The deploy workflow (lines 1–46) builds with `npm run build` and uploads `dist/` to Cloudflare Pages. It never reads `${{ github.sha }}` or `${{ github.run_id }}` and never sets `VITE_GIT_SHA`, `VITE_RELEASE`, or any equivalent. The build output therefore has no field that telemetry could use to correlate a captured event to a specific deploy.
* **Location:** `.github/workflows/deploy.yml:18-46`.
* **Risk:** Once telemetry lands, every captured event must answer "which deploy?" Without a build-time stamp, every event is unattributable. Deploy regressions cannot be located on a timeline; A/B tests across releases cannot be partitioned.
* **Refactoring Directive:** Add an env block to the build step:
  ```yaml
  - name: Production build
    run: npm run build
    env:
      VITE_GIT_SHA: ${{ github.sha }}
      VITE_GIT_SHORT: ${{ github.sha }}
      VITE_BUILD_TIME: ${{ github.event.head_commit.timestamp }}
      VITE_RELEASE: ${{ github.run_id }}
  ```
  Read these in `vite.config.ts` via `define: { ... }` so they end up as compile-time constants. The Sentry recommendation in §5.2 (`release: import.meta.env.VITE_GIT_SHA`) only works if this is wired.

#### 9.5 Cloudflare Pages deploy uploads `dist/` raw — source-map and telemetry-secret handling

* **Deficiency:** The `cloudflare/pages-action@1` step uploads `directory: dist`. If `vite.config.ts` is later changed to emit `.map` files (per finding 4.2), they will be uploaded *publicly* to the Cloudflare Pages CDN — exposing source. There is no step to upload maps to Sentry / OTel collector first, then strip them. Additionally, no `VITE_SENTRY_DSN` / `VITE_OTLP_ENDPOINT` env vars are set during the build, so even with the SDK present, the production build would have no egress endpoint baked in.
* **Location:** `.github/workflows/deploy.yml:39-46`.
* **Risk:** A naive enabling of `sourcemap: true` without coordinating the deploy step ships unminified source to public CDN. This is both a code-secret leak (any `// SAFETY:` comments, internal API names, prompt strings for K-2 content) and a Sentry-pricing risk (the Sentry plugin uses the maps; uncoordinated maps shipped publicly bypass Sentry's symbolication path). The deploy workflow is where this contract must be enforced.
* **Refactoring Directive:** Insert before the Cloudflare upload step:
  ```yaml
  - name: Upload source maps to Sentry
    uses: getsentry/action-release@v1
    env:
      SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
      SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
      SENTRY_PROJECT: questerix-fractions
    with:
      sourcemaps: dist
      version: ${{ github.sha }}
  - name: Strip source maps from Pages upload
    run: find dist -name '*.map' -delete
  ```
  Set the build env vars (§9.4) plus `VITE_SENTRY_DSN`, `VITE_OTLP_ENDPOINT` in the same step. Until self-hosting is decided (§14), keep these secrets gated by the consent flag at runtime so the build is portable to non-telemetry deployments.

#### 9.6 Synthetic playtest results are dead-letter — Mondays at 06:00, no one reads them

* **Deficiency:** `synthetic-playtest.yml:28-44` runs the harness weekly, uploads `tests/synthetic/results/` as a GitHub artifact, retains for 30 days. There is no aggregation across runs, no trend chart, no regression-alerting webhook, no Slack/email notification, no comparison to the prior week's report. A run that fails (exit 1 from the Playwright assertions) does flag the workflow red — but a *gradual* drop from 95.1% completion to 94.9% takes weeks to fail and is invisible until then.
* **Location:** `.github/workflows/synthetic-playtest.yml:38-44`. Output schema: `tests/synthetic/aggregator.ts` (`AggregatedReport`).
* **Risk:** The synthetic harness was built to validate the engine end-to-end (per the rich `aggregator.ts` schema with completion rate, p95 latency, feedback budget, per-persona accuracy). It is the closest thing to real-user telemetry the team has, and its output rots in artifact storage. The pass/fail criteria coded in `aggregator.ts:108-118` (≥95% completion, 0 crashes, ≥90% feedback <800ms) are *exactly* the SLO numbers production telemetry should track — they're already specified, just not reported.
* **Refactoring Directive:**
  1. Add a `.github/workflows/synthetic-playtest.yml` step that uploads the latest `AggregatedReport` JSON to a long-lived store (a dedicated GitHub Releases asset on a `synthetic-history` tag works; an S3/R2 bucket is cleaner). Keyed by ISO timestamp.
  2. Add a downstream "compare to last 4 runs" step that flags trend regressions even when the absolute pass criteria still hold (e.g. completion rate dropped >2% week-over-week even if still ≥95%).
  3. When production runtime telemetry lands, emit events with the same field names as `AttemptRecord` / `SessionRecord` so the production aggregator is the *same code* — `aggregate(sessions: SessionRecord[])` already works on either source.
  4. Wire a notification on failure (Slack webhook or GitHub-issue auto-create) so a red Monday doesn't sit unread until Friday.

#### 9.7 Vitest coverage thresholds are absent

* **Deficiency:** `vitest.config.ts:22-26` configures `coverage.provider: 'v8'` and `coverage.include: ['src/**/*.ts']` — but no `coverage.thresholds` block. Coverage is computed but not enforced. CI runs `npm run test:unit` (no `--coverage`) so coverage isn't even *measured* in the default path.
* **Location:** `vitest.config.ts:22-26`; `vitest.integration.config.ts:18-21`; `.github/workflows/ci.yml:33-37` (no coverage step).
* **Risk:** A code change that ships untested branches — including telemetry call sites — passes CI green. Once `Logger`, `reportError`, and `instrumentDexie` land, their test coverage matters: an untested branch in the IndexedDB ring buffer silently drops events. Without enforced coverage, the observability stack itself becomes unobservable.
* **Refactoring Directive:** Add to `vitest.config.ts`:
  ```ts
  coverage: {
    provider: 'v8',
    include: ['src/**/*.ts'],
    exclude: ['src/_legacy/**', 'src/**/*.d.ts'],
    thresholds: {
      lines: 70, branches: 65, functions: 70, statements: 70,
      // Higher bar for the observability surface itself
      'src/lib/observability/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
    },
  }
  ```
  Add `--coverage` to the CI test invocation. Bump the threshold gradually as coverage improves — the initial 70/65 floor should be set to current measured coverage so the pipeline can't go red on day one.

#### 9.8 `vitest.validators.config.ts` — validators run in `node` with no Phaser stub or a11y probe

* **Deficiency:** Validators tests run in `environment: 'node'` (line 13) with no setup file. They are pure-function unit tests, which is fine — but there is no validator-specific telemetry contract test. A validator that returns `{ outcome: 'incorrect', score: 0, feedback: 'validator_error' }` (the magic-string fallback at `Level01Scene.ts:663` and `LevelScene.ts:401`) cannot be distinguished by downstream code from a legitimate incorrect answer, and there is no test asserting that the magic string never leaks into the BKT pipeline.
* **Location:** `vitest.validators.config.ts:8-17`; `Level01Scene.ts:663`; `LevelScene.ts:401`.
* **Risk:** A regression where every validator throws (e.g. registry import broken in production but not in test, since tests use static imports) silently produces a session of "every answer was wrong, the student is in trouble" — and the BKT depresses mastery while feeding `feedback: 'validator_error'` into the pipeline. The student-experience and engine-logic regressions are indistinguishable.
* **Refactoring Directive:** Add a contract test in `tests/integration/validator-pipeline.test.ts` that exercises every validator with deliberately-malformed payloads, asserts (a) no validator throws, (b) `feedback: 'validator_error'` is never returned (introduce a discriminated `ValidatorErrorOutcome` type instead), (c) `validatorMs` (per finding 4.9) is captured at the dispatch layer, not inside the validator. Once the new error reporter exists, dispatch-layer throws should call `reportError(err, { validatorId, templateId })` *and* return a typed `{ outcome: 'incorrect', errorKind: 'validator_throw' }`.

---

### 10. The Engine Layer's Pedagogical Black Boxes

The engine modules — `selection.ts`, `bkt.ts`, `calibration.ts`, `misconceptionDetectors.ts` — are deliberately pure, side-effect-free per the SoC and portability audits. **That purity does not preclude observability**; it just relocates it. Today, every engine output is an opaque return value. There is no per-decision audit trail.

#### 10.1 `src/engine/selection.ts` — the entire pedagogical routing decision is dark

* **Deficiency:** `selectNextQuestion` (line 46) has four selection branches: (1) recency-filtered ZPD candidates, (2) recency-filtered unmastered fallback (if `preferUnmastered`), (3) any remaining candidate, (4) `null` (line 49 — empty pool). The function returns a `QuestionTemplate | null`. The caller has *no way to know which branch fired*. Branch (3) — the random fallback — is a pedagogical-failure mode: it means "no skill in the ZPD window, no skill below it, give them anything." This is the silent regression mode for the entire engine.
* **Location:** `selection.ts:46-67`.
* **Risk:** A regression where every skill mastery reads as `0` (e.g. `getMastery` finds the wrong key after a schema change) means *every* selection falls into the unmastered-fallback or random branches. The student receives questions that look reasonable but are no longer adaptive. There is no signal until aggregate mastery curves on the team's analytics dashboard plateau — and there is no analytics dashboard.
* **Refactoring Directive:** Change the return type from `QuestionTemplate | null` to `{ template: QuestionTemplate; branch: 'zpd' | 'unmastered' | 'fallback'; poolSize: number; freshSize: number; recentSkipped: number } | null`. Increment a counter `selection.branch{branch}` at the call site. A regression where `zpd` rate drops from typical ~70% to <5% is the smoking gun for a mastery-data corruption.

#### 10.2 `src/components/HintLadder.ts` — state machine emits no telemetry

* **Deficiency:** The class is a pure state machine: `next()`, `reset()`, `tierForAttemptCount()`. It emits no logs, no events. The caller (`LevelScene.showHintForTier:474-475`) is what eventually emits a hint event into Dexie — but the *ladder's own state transitions* (specifically the `exhausted` boundary at `state.exhausted`) are not surfaced.
* **Location:** `HintLadder.ts:35-86`.
* **Risk:** Hint efficacy is a research question the team needs to answer (per `learning-hypotheses.md`). To answer it, telemetry must record (a) how often each tier is shown, (b) tier-to-correct-on-next-attempt rate, (c) the exhaustion rate (students who hit Tier 3 and still failed). Today, only (a) is partially capturable from the `hintEvents` table; (b) and (c) require deriving from `attempts` join `hintEvents` after the fact, with no foreign-key linkage (the `hintEventId` and `attemptId` correlation is structural but not traced).
* **Refactoring Directive:** Inject a `Meter` port (or the `Logger` from §3) into the constructor. On every `next()`, increment `hint.tier.shown{tier, difficulty}`. On `state.exhausted` transition, increment `hint.exhausted{difficulty}`. The next-attempt outcome is captured by the existing `Attempt.outcome`; the join is the team's analytical responsibility but the raw signal must exist.

#### 10.3 `src/engine/calibration.ts` — H-04 retention silent-skip is invisible

* **Deficiency:** Line 63: `logger.warn(\`Calibration skipped: no skills found in prior session ${prevSession.id}\`)`. The warning goes to the inline `logger` defined at line 19–21, which is `{ warn: (msg) => console.warn('[calibration] ' + msg) }`. In production builds, this warning is dropped (per the structured-logger production-silence finding in Section 1).
* **Location:** `calibration.ts:19-21, 63`.
* **Risk:** H-04 retention measurement is the *primary research hypothesis* the calibration code exists to validate (per the file's own header comment citing `learning-hypotheses.md H-04`). When calibration is skipped — which line 62 says happens "if prior session had no resolvable skills" — H-04 measurement is silently corrupted. The team cannot empirically answer their own research question because the failure mode is dark in production.
* **Refactoring Directive:** Replace the inline logger with the structured logger; emit a `calibration.skipped{reason}` counter alongside the warning. A `reason: 'no_prior_skills'` rate trending upward is the signal that the team's H-04 measurements are increasingly polluted.

#### 10.4 `src/engine/bkt.ts` — `predictCorrect` is dead code; `updateMastery` is unmeasured

* **Deficiency:** `predictCorrect` (lines 112–118) is exported but, per Grep, has zero call sites in `src/`. It is computable telemetry — a per-attempt prediction that could be compared against actual outcomes to validate the BKT priors. Dead code. Meanwhile `updateMastery` (line 87) is called once per attempt at `Level01Scene.ts:990` and `LevelScene.ts:711` but the *change* it produces (`prev.masteryEstimate` → `next.masteryEstimate`, the delta, the resulting `state` transition `LEARNING` → `APPROACHING` → `MASTERED`) is not emitted anywhere. The `state` transition is the most pedagogically meaningful event in the entire app and it is not signalled.
* **Location:** `bkt.ts:87-106` (`updateMastery`); `bkt.ts:112-118` (`predictCorrect`, dead).
* **Risk:** State-transition telemetry is the difference between "we have BKT" and "we have BKT and know if it's working." A regression where `pTransit` is mis-tuned and `MASTERED` state is unreachable is invisible until a research review notices the cohort never has anyone graduate.
* **Refactoring Directive:**
  1. Remove `predictCorrect` if there's no plan to wire it (the SoC audit's F-06 will dictate that wiring is via use-case). Or wire it: emit `bkt.prediction{predicted, actual}` per attempt and compute confusion-matrix metrics offline.
  2. In the use-case wrapper around `updateMastery`, emit `bkt.state.transition{from, to, skillId}` whenever `prev.state !== next.state`. Emit `bkt.mastery.delta` as a histogram with attribute `state`.

#### 10.5 `src/engine/misconceptionDetectors.ts` — every `return null` is a silent miss

* **Deficiency:** Each detector function returns either a `MisconceptionFlag` or `null`. The `null` branch is taken in every "I evaluated, but the pattern didn't reach the threshold" case. Today there is no signal that a detector *evaluated* at all; only the flag it produces is observable downstream. Detector population, evaluation cardinality, and per-detector flag rate are all dark.
* **Location:** `misconceptionDetectors.ts:50, 95, …` (the `return null` lines for each detector).
* **Risk:** A detector that *stops firing* due to a regression in its filter logic (e.g. a check on `attempt.outcome === 'WRONG'` that should be `attempt.outcome === 'WRONG' || attempt.outcome === 'CLOSE'`) is indistinguishable from a healthy detector that just hasn't observed the trap pattern. The team cannot tell "WHB-01 is healthy and our students aren't tripping" from "WHB-01 is broken and we have no idea."
* **Refactoring Directive:** Per the §4.10 finding, accept a `meter` port, and on every detector entry emit `misconception.detector.eval{detector}`; on every flag-return emit `misconception.detector.flag{detector, misconceptionId}`; on every null-return emit `misconception.detector.miss{detector, reason}` with the reason string ('insufficient_attempts', 'rate_below_threshold', etc.). The miss reason matters: a `miss{reason: 'insufficient_attempts'}` rate that exceeds 80% means the detector almost never has data to work with.

#### 10.6 `src/lib/preferences.ts` — `applyContrastMode` is fired silently on init

* **Deficiency:** `initPreferences` (lines 20–35) silently calls `applyContrastMode(cache.highContrast)` based on the cached value. The function (per the implementation pattern) toggles a CSS class. There is no log of whether high-contrast was applied, the cached value used, or the source of the value (deviceMeta vs default).
* **Location:** `lib/preferences.ts:20-35`.
* **Risk:** A user with `highContrast: true` persisted in `deviceMeta` who experiences a corrupt `deviceMeta` row enters the catch at line 28, falls into defaults (line 31: `highContrast: false`), and silently loses the accessibility setting. Combined with the bare-catch finding (4.x), the user's high-contrast mode silently turns off. No telemetry signal.
* **Refactoring Directive:** Emit `prefs.applied{reduceMotion, highContrast, source: 'deviceMeta' | 'default'}` once per init. A drift in the `default`-source rate (e.g. from typical 5% first-boot to 60%) signals widespread `deviceMeta` corruption.

---

### 11. Test-Side Telemetry — The Schema Already Exists

The team has already built a high-fidelity telemetry schema. It just lives in `tests/synthetic/`, not in production.

#### 11.1 `tests/synthetic/aggregator.ts` is the canonical telemetry contract

* **Deficiency (framing, not a bug):** `AttemptRecord`, `SessionRecord`, and `AggregatedReport` (lines 9–58 of `aggregator.ts`) define the team's view of "what observable events are." The fields (`outcome`, `hintUsed`, `responseTimeMs`, `feedbackShownMs`, `taskDurationMs`, `consoleErrors`, `crashed`, `abandoned`, `completed`) and the SLO numerators (≥95% completion, 0 crashes, ≥90% feedback <800 ms — lines 108–118) are the de facto telemetry spec. Production telemetry is being built *as if from scratch* when this schema can be the production contract.
* **Location:** `tests/synthetic/aggregator.ts` (entire file).
* **Risk:** Inverting: this is the *opportunity*. If the production runtime emits events into the IndexedDB ring buffer in the *exact* shape of `AttemptRecord` / `SessionRecord`, the existing `aggregate(sessions)` function (line 60) can be invoked unmodified on production data captured during e2e or via a debug dumper. The synthetic harness and the production runtime become a contract dual.
* **Refactoring Directive:**
  1. **Move `aggregator.ts` to `src/lib/observability/aggregator.ts`** — it's no longer test-only. Re-export from `tests/synthetic/aggregator.ts` for backward compatibility.
  2. **Define `AttemptRecord` and `SessionRecord` as first-class types in `src/types/telemetry.ts`.** Keep them strictly cohort-anonymised (no `studentId`, only `personaName` or — for production — a per-session salted hash).
  3. **Production runtime emits these shapes** into `db.telemetryEvents`. The "kind" discriminator on `telemetryEvents` is `'attempt' | 'session' | 'error' | 'longtask' | 'fps_sample'`.
  4. **Add `npm run telemetry:dump` script** that opens IndexedDB, drains the buffer, runs `aggregate()`, and prints a `printSummary` matching the synthetic harness output.
  5. **Add an e2e test** that plays a happy path, dumps the buffer, asserts the shape matches `SessionRecord`, runs `aggregate`, and verifies the assertions match. This is the *contract* between synthetic and production.

#### 11.2 The synthetic harness's `clearStorage` hardcodes the DB name

* **Deficiency:** `tests/synthetic/playtest.spec.ts:27` calls `indexedDB.deleteDatabase('questerix-fractions')`. The DB name is duplicated from `db.ts:56` (`super('questerix-fractions')`). There is no shared constant; if the DB name ever changes, the synthetic harness silently leaks state across sessions.
* **Location:** `tests/synthetic/playtest.spec.ts:27`; `src/persistence/db.ts:56`.
* **Risk:** A test that runs against a renamed-but-still-existing-in-fixtures DB silently re-uses the prior session's mastery state. The harness's "session independence" guarantee (the comment on line 22) is broken without warning. False-positive results in the synthetic playtest mask production regressions that depended on a clean state.
* **Refactoring Directive:** Export `DB_NAME = 'questerix-fractions'` from `db.ts`; have both the constructor and the synthetic harness import from one source.

#### 11.3 `tests/setup.ts` — denial-path mocks structurally untestable

* **Deficiency:** Lines 20–26 mock `navigator.storage` as `{ persist: vi.fn().mockResolvedValue(true), persisted: vi.fn().mockResolvedValue(true) }`. Lines 5–17 mock `matchMedia` to always return `matches: false`. Both mocks paper over the failure modes the persistence-grant and reduce-motion code exists to detect.
* **Location:** `tests/setup.ts:5-26`.
* **Risk:** The grant-denied path in `db.ts:188-198` and the OS-prefers-reduce-motion path in `lib/preferences.ts:43-44` are structurally untestable today. A regression that breaks them is impossible to surface in unit tests; it has to wait for e2e.
* **Refactoring Directive:** Add per-test override helpers:
  ```ts
  // tests/setup-overrides.ts
  export function withDeniedStorage<T>(fn: () => Promise<T>): Promise<T> { /* override navigator.storage.persist to return false, run fn, restore */ }
  export function withReduceMotion<T>(fn: () => Promise<T>): Promise<T> { /* override matchMedia, run fn, restore */ }
  ```
  Add tests in `tests/integration/persistence.test.ts` that exercise the denial path through `withDeniedStorage`. This makes the previously-flagged silent-warn finding (Section 2 `db.ts` finding) testable.

#### 11.4 The harness's `consoleErrors` capture is the existing crash telemetry

* **Deficiency (framing):** `playtest.spec.ts:178-183` is the most thorough crash-capture in the codebase: `page.on('console')` for `msg.type() === 'error'`, `page.on('pageerror')` for uncaught errors. Line 342–345 asserts `[uncaught]` count is 0. **This is the existing crash-budget contract**: synthetic tests fail if any session has even one uncaught error.
* **Location:** `playtest.spec.ts:178-183, 342-345`.
* **Risk (inverted to opportunity):** Production has no equivalent. The synthetic harness establishes a "0 uncaught errors per session" SLO that production must meet without measurement. Once `reportError` exists, the synthetic harness can assert against the production telemetry buffer (drain `db.telemetryEvents` where `kind = 'error'`, count, assert 0) — closing the loop.
* **Refactoring Directive:** After §3 / §5 lands, add an e2e assertion: `expect(await drainTelemetryBuffer().then(events => events.filter(e => e.kind === 'error'))).toHaveLength(0)`. This makes the synthetic harness the authoritative arbiter of the production telemetry surface.

#### 11.5 `page.metrics().TaskDuration` is the existing perf metric — production has no equivalent

* **Deficiency:** `playtest.spec.ts:270-272` is the only place in the entire codebase that reads any browser performance metric. It uses the Chrome DevTools Protocol via `page.metrics()` to extract `TaskDuration`. This is Chrome-specific and only available in test contexts.
* **Location:** `playtest.spec.ts:270-272`.
* **Risk:** The synthetic harness measures task-duration jank. Production users (potentially on Safari iPad — the primary target per `runtime-architecture.md`) emit no equivalent signal. The team validates a perf metric in synthetic that is uncollectable in their primary deployment context.
* **Refactoring Directive:** `PerformanceObserver({ entryTypes: ['longtask'] })` (per §3 step 5 / §7) is the cross-browser equivalent. The production telemetry should emit `longtask{durationMs, attribution}` events; the aggregator can compute the same p95 task-duration the synthetic harness reads from `TaskDuration`. **This is the cross-browser version of the already-validated synthetic metric.**

---

### 12. Dexie Lifecycle and Storage-Quota Observability

#### 12.1 `db.on('versionchange')` and `db.on('blocked')` are not handled

* **Deficiency:** `db.ts` (constructor lines 55–141) declares schema versions but never registers `db.on('versionchange', ...)` or `db.on('blocked', ...)` handlers. Per the Dexie documentation, `versionchange` fires when *another tab* upgrades the schema (the current tab should close to allow the upgrade); `blocked` fires when an upgrade in *this tab* is blocked by another tab holding the older version open.
* **Location:** `src/persistence/db.ts:55-141` (the constructor — both events go unhandled). Verified by Grep — zero matches for `db.on(`, `versionchange`, or `blocked` outside the schema declarations.
* **Risk:** The PWA can be opened in two tabs simultaneously (a teacher's iPad with the dashboard tab and the student tab — possible if per-student kiosks aren't enforced). A schema upgrade pushed in a release would: (a) the new tab `blocked` because the old tab holds v4; (b) the old tab gets `versionchange` and should close; (c) without handlers, the new tab hangs indefinitely on `db.open()` and the old tab keeps writing v4 data. The team has zero signal that either tab is in a bad state.
* **Refactoring Directive:** In `db.ts` after the `db` instantiation:
  ```ts
  db.on('versionchange', (event) => {
    reportError(new Error('Dexie versionchange — closing connection'), {
      kind: 'db.versionchange',
      newVersion: event.newVersion,
      oldVersion: event.oldVersion,
    });
    db.close();
    // Reload to get a fresh connection on the new schema
    if (typeof window !== 'undefined') window.location.reload();
  });
  db.on('blocked', (event) => {
    reportError(new Error('Dexie blocked — another tab holds the old schema'), {
      kind: 'db.blocked',
      newVersion: event.newVersion,
      oldVersion: event.oldVersion,
    });
    // UI: show a toast asking the user to close other tabs
  });
  ```
  Both events become observable, and the UI gets a chance to recover.

#### 12.2 `navigator.storage.estimate()` is never called

* **Deficiency:** Verified by Grep: zero matches for `navigator.storage.estimate` in `src/`. The persistence code only ever calls `navigator.storage.persist()` and `navigator.storage.persisted()`. Quota usage is never read.
* **Location:** Whole codebase.
* **Risk:** IndexedDB quota on iOS Safari is famously aggressive (typically ~50 MB before prompts, with eviction under pressure). The app can grow unboundedly: every attempt is appended (`Attempt`, `HintEvent`, `MisconceptionFlag`); the `sessions` table grows monotonically until backup-restore is run. Storage approaches its quota silently; the next write throws `QuotaExceededError`; the bare-catch swallows; the user sees a phantom "save failed" with no recovery.
* **Refactoring Directive:** In `BootScene._bootAsync()` and on `pagehide`, call:
  ```ts
  const est = await navigator.storage.estimate();
  meter.histogram('storage.quota.usage_pct').record(
    est.usage && est.quota ? (est.usage / est.quota) * 100 : 0,
    { source: typeof event !== 'undefined' && event.type === 'pagehide' ? 'pagehide' : 'boot' }
  );
  if (est.usage && est.quota && est.usage / est.quota > 0.85) {
    reportError(new Error('Storage quota >85%'), { kind: 'quota.warn', usage: est.usage, quota: est.quota });
  }
  ```
  85% is the recommended warning threshold per the MDN `StorageManager` docs; some browsers begin LRU eviction at 90%. This signal is the *only* way to know that a particular cohort is hitting the quota wall.

#### 12.3 `db.transaction` blocks have no per-table progress signal

* **Deficiency:** `seed.ts:188-240` and `backup.ts:164-203` both run multi-table transactions with no per-step instrumentation. If the seed transaction takes 8 seconds, all eight bulkPuts are opaque inside; the team cannot tell whether `fractionBank` (the largest table) or `hints` (the smallest) is the bottleneck.
* **Location:** `seed.ts:188-240`; `backup.ts:164-203`.
* **Risk:** A schema regression that bloats one table (e.g. adding a large `metadata` field on every `fractionBank` row) extends boot time silently. The boot-budget guard in §3 needs per-table breakdown to attribute the regression.
* **Refactoring Directive:** Wrap each `bulkPut` call inside the transaction with `tracer.startActiveSpan('db.seed.<table>', span => { ... })`. The Dexie middleware in §5.3 captures top-level operations; transaction-internal sub-spans require manual instrumentation at these two sites.

#### 12.4 Schema version migration outcomes are unobservable

* **Deficiency:** `db.ts` declares schema versions 1 → 4 (lines 59, 72, 86, 115). Dexie's auto-migration runs upgrade functions silently. There is no log emitted on upgrade ("v3 → v4: adding [archetype+submittedAt] index"), no measurement of migration duration, no record of which user installs are on which schema.
* **Location:** `db.ts:59, 72, 86, 115`.
* **Risk:** A user stuck on schema v2 (perhaps because their browser blocked the v3 upgrade) has different available indexes than a user on v4. The team cannot tell from afar which schema each user is on. A migration that fails and rolls back leaves the user on the prior schema, indistinguishable from a user who simply hasn't reloaded since the release.
* **Refactoring Directive:** Add Dexie upgrade hooks (per Dexie docs: `this.version(N).stores({...}).upgrade(tx => { /* migration */ })`). Even when no data migration is needed, register an empty upgrade function so the upgrade event fires. In the upgrade callback emit `db.migration{from, to, durationMs}`. Read `deviceMeta.schemaVersion` after open and emit `db.schema.installed{version}` as a counter — the cohort distribution by schema version becomes visible.

---

### 13. Network State and PWA Lifecycle

#### 13.1 `navigator.onLine` and `'online' / 'offline'` events are unhooked

* **Deficiency:** Grep confirms zero matches for `navigator.onLine`, `'online'`, or `'offline'` in `src/`. The PWA contract is offline-first; the app should function with no network. But network *transitions* (going offline mid-session, regaining connectivity) are not observed.
* **Location:** Entire codebase.
* **Risk:** A student on a school bus with intermittent Wi-Fi has invisible failure modes: the curriculum CDN goes unreachable, the embedded fallback is used, but the team has no signal of fallback rate. Once telemetry egress is wired (§5), buffered events accumulate offline; without an `'online'` listener, the flush never triggers when connectivity returns.
* **Refactoring Directive:**
  ```ts
  // src/lib/observability/networkBridge.ts
  window.addEventListener('online', () => {
    tracer.startSpan('network.online').end();
    void flushTelemetryBuffer(); // drain IndexedDB ring buffer
  });
  window.addEventListener('offline', () => {
    tracer.startSpan('network.offline').end();
  });
  ```
  Plus a periodic `navigator.connection.effectiveType` sampler — the difference between `4g` and `slow-2g` matters for the curriculum-fetch fallback rate.

#### 13.2 `workbox-window` is installed but unused

* **Deficiency:** `package.json:45, 62` declares `workbox-window: ^7.4.0` (twice — once in deps, once in devDeps; minor housekeeping). Grep shows zero imports of `workbox-window` outside `vite-plugin-pwa`'s internal resolution. The `Workbox` class is the standard primitive for hooking service-worker lifecycle events from page-side code; the team has the dependency but does not use it.
* **Location:** `package.json:45, 62`; `src/main.ts` (no `workbox-window` import).
* **Risk:** Service-worker registration succeeds or fails silently. The `installed` / `waiting` / `controlling` / `redundant` events are unhooked — meaning a botched precache (curriculum bundle that fails to fetch during install) leaves the user with a half-broken PWA and no signal.
* **Refactoring Directive:**
  ```ts
  // src/main.ts (after Phaser game instantiation)
  if ('serviceWorker' in navigator && enablePWA) {
    const { Workbox } = await import('workbox-window');
    const wb = new Workbox('/sw.js');
    wb.addEventListener('installed', (e) => logger.info('sw', 'installed', { isUpdate: e.isUpdate }));
    wb.addEventListener('waiting', () => logger.warn('sw', 'waiting', {}));
    wb.addEventListener('controlling', () => logger.info('sw', 'controlling', {}));
    wb.addEventListener('redundant', () => reportError(new Error('SW redundant'), { kind: 'sw.redundant' }));
    void wb.register();
  }
  ```

#### 13.3 PWA install events are unobserved

* **Deficiency:** No handler for `beforeinstallprompt` (the user is being prompted to install) or `appinstalled` (the user accepted). The PWA install rate is the primary engagement metric for an app of this category.
* **Location:** Entire codebase.
* **Risk:** The team cannot tell what fraction of users install the PWA vs. visit-once. PWA install funnels are a significant product signal that is collected by literally every tracking tag the team chose not to use; rolling it manually into structured telemetry is the privacy-aligned alternative.
* **Refactoring Directive:**
  ```ts
  window.addEventListener('beforeinstallprompt', (e) => {
    meter.counter('pwa.prompt.shown').add(1);
    // Defer the prompt; let the app surface it at a contextually appropriate moment
    deferredPrompt = e;
  });
  window.addEventListener('appinstalled', () => {
    meter.counter('pwa.installed').add(1);
  });
  ```

---

### 14. Privacy-Aligned Self-Hosted Telemetry (Open Question)

The team's existing privacy posture is explicit. From `deploy.yml:58-60`:
> *"After first deploy, verify in the Cloudflare dashboard that: Web Analytics is OFF (Workers & Pages → project → Settings → Web Analytics) per docs/40-validation/privacy-notice.md 'no third parties.'"*

This is a hard constraint. **Sentry SaaS is a third party.** **OTLP-to-Honeycomb / Datadog / Grafana Cloud is a third party.** The Section 3 / Section 5 recommendations conflict with this posture as written.

The audit cannot resolve this trade-off — it is a product/legal decision — but the resolution paths are:

* **Option A: Self-host Sentry.** The `getsentry/sentry` repo ships a Docker-Compose-based self-hosted edition. ~9 services, postgres + redis + clickhouse + symbolicator, ~4 GB RAM, ~30 GB disk per month at moderate volume. This is the heavyweight option but keeps "no third parties" intact. The `@sentry/browser` SDK works against a self-hosted instance with no code change — only the DSN host differs.
* **Option B: Self-host an OTel pipeline.** OpenTelemetry Collector (single binary, ~100 MB RAM) ingests OTLP over HTTP; backends are Grafana Tempo (traces), Loki (logs), Prometheus (metrics). Lighter than self-host Sentry; lacks Sentry's error-grouping and source-map symbolication out of the box. Source maps require manual symbolication via `sentry-cli` against a self-hosted Sentry — i.e. **A and B are not mutually exclusive**: the cleanest topology is Sentry-self-hosted *for errors and replays* + OTel-self-hosted *for traces and metrics*. But that's two stacks to operate.
* **Option C: Sentry SaaS with a Data Processing Agreement.** Sentry has a standard DPA, EU-region option, and supports data-residency commitments. *Legally* this can satisfy COPPA/FERPA in many jurisdictions; whether it meets the team's *literal* "no third parties" wording is a policy question. The privacy-notice text would need to be amended explicitly.
* **Option D: Stay third-party-free; ship telemetry to a team-owned Cloudflare Worker.** Cloudflare Pages already hosts the app; the same account can host a Worker accepting OTLP-formatted POST bodies and writing to R2 + a small ClickHouse-compatible DB (e.g. Cloudflare D1 for low-cardinality counters). This is the cheapest "no third parties" topology — the data never leaves the team's Cloudflare account. The implementation cost is meaningful (3–5 person-days for a minimal collector); operational cost is negligible.

* **Risk if not decided:** The Section 3 / Section 5 / Section 8 implementation work cannot start because Phase 2 ("Sentry") has no DSN. The audit *recommends* picking one of these explicitly before any code is written, and updating `docs/40-validation/privacy-notice.md` and `public/privacy.html` to reflect the decision in language a school district can review.

* **Recommended:** **Option D** for traces/metrics + **Option A** for errors/replays. Telemetry stays inside the team's Cloudflare account (D); error grouping and symbolication get the maturity of a self-hosted Sentry (A). The IndexedDB ring buffer (§3 step 5) decouples the runtime from the egress topology — switching between A/B/C/D later is a transport change, not a runtime change.

---

### 15. Closing the Loop — Synthetic Harness as Runtime Contract Test

The single highest-leverage win in the entire audit is making the synthetic harness's `aggregator` the production runtime's emitter shape. The work is small once §11 lands:

1. **Promote `aggregator.ts` to `src/lib/observability/aggregator.ts`.** Re-export from the synthetic test path.
2. **Define `EventKind = 'attempt' | 'session' | 'error' | 'longtask' | 'fps_sample' | 'sw_lifecycle' | 'storage_quota'`** in `src/types/telemetry.ts`.
3. **Production runtime emits `AttemptRecord` and `SessionRecord` shapes** into `db.telemetryEvents`, via the new structured `Logger`.
4. **Add `npm run telemetry:dump`** — a Node script that opens IndexedDB (via `dexie/dist/dexie.js` directly + `fake-indexeddb/auto`), drains the buffer, runs `aggregate(sessions)`, prints `printSummary`. Local-debugging tool that mirrors the synthetic CI report.
5. **Add an e2e contract test** at `tests/e2e/telemetry-contract.spec.ts`:
   ```ts
   test('production runtime emits aggregator-compatible events', async ({ page }) => {
     await page.goto('/');
     // play a session...
     const events = await page.evaluate(async () => {
       const db = await openDb('questerix-fractions');
       return await db.telemetryEvents.toArray();
     });
     const sessions = events.filter(e => e.kind === 'session') as SessionRecord[];
     const report = aggregate(sessions);
     expect(report.totalSessions).toBeGreaterThan(0);
     expect(report.crashedSessions).toBe(0);
     expect(report.failReasons).toHaveLength(0);
   });
   ```
6. **Update `synthetic-playtest.yml`** to also run the telemetry-contract e2e test on the same schedule. When both pass, the contract holds: synthetic-Playwright behaviour and production-runtime emission produce reports of identical shape and meeting identical SLOs.

This is the difference between "we have telemetry" and "our telemetry is already battle-tested by 100 simulated K-2 students every Monday at 06:00 UTC, and field telemetry just adds more data points to the same dashboard."

---

*End of audit. Re-run on every release-candidate build; append new findings as separate dated sections rather than rewriting prior ones.*
