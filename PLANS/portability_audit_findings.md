# Portability Audit Findings — Questerix Fractions

**Auditor:** Autonomous Architectural Auditor
**Date generated:** 2026-04-26
**Branch:** `main`
**Scope of audit:** Domain layer (`src/engine/`, `src/validators/`, `src/curriculum/`) and the seams it shares with the infrastructure layer (`src/persistence/`, `src/lib/`, `src/main.ts`).

## Audit Standard

The audit applies a stricter portability standard than the project's prevailing definition (which treats portability as decoupling from the UI framework and deployment host). The standard enforced here is **absolute environmental isolation**: the core domain may not — directly or transitively — depend on the system clock, randomness sources, file system, network protocols, host globals, build-tool intrinsics, or process-wide singletons. Every such dependency must enter the domain through an explicit interface that the application boundary supplies.

Findings are listed individually in the format mandated by the audit directive. They are grouped under category headers for triage only; each finding is self-contained.

---

## Category A — State and Time Isolation

### `src/engine/misconceptionDetectors.ts` — direct system-clock coupling

* **Violation:** The misconception-detection rules call `Date.now()` to stamp `firstObservedAt` and `lastObservedAt` on every `MisconceptionFlag` they produce. The clock is the system's clock, not an injected dependency.
* **Location:** Lines 41, 42, 86, 87, 120, 121, 167, 168, 209, 210 — five detector functions (`detectWHB01`, `detectWHB02`, `detectMAG01`, `detectPRX01`, `detectEOL01`).
* **Consequence:** Detector outputs are non-deterministic across runs, which prevents reproducible unit tests, snapshot fixtures, and replay-based regression testing. A backfill or re-evaluation of historical attempts would stamp every flag with the *replay* time rather than the original observation time, corrupting longitudinal mastery analysis. The module also cannot run inside a deterministic simulation harness or a server-side batch job that needs supplied timestamps.
* **Refactoring Directive:**
  1. Define `interface Clock { now(): number; }` in `src/engine/ports.ts` (new file, sibling to `bkt.ts`).
  2. Add a required `clock: Clock` field to a new `DetectorContext` type and accept it as a parameter on every detector (`detectWHB01(attempts, level, ctx)` etc.) and on `runAllDetectors`.
  3. Replace each `Date.now()` call with `ctx.clock.now()`.
  4. Provide a `SystemClock` adapter (`now: () => Date.now()`) in `src/lib/adapters/clock.ts`; wire it into the call site inside `LevelScene.recordAttempt` / `Level01Scene.recordAttempt`.
  5. Provide a `FixedClock(t: number)` test double in `tests/fixtures/clock.ts` for use by the BKT/detector test suites.

### `src/engine/misconceptionDetectors.ts` — direct call to host crypto API

* **Violation:** The detectors generate flag IDs with `crypto.randomUUID()`. `crypto` is a host global resolved differently across Node, browser, Workers, and embedded JavaScript runtimes (some of which have neither `crypto.randomUUID` nor `crypto.getRandomValues`).
* **Location:** Lines 38, 83, 117, 164, 206 — same five detectors as above.
* **Consequence:** Identical to the clock issue plus environmental fragility: under Node ≤ 18 without polyfills, under jsdom test runners, or in a hypothetical native shell (e.g. Hermes, QuickJS for an offline tablet build), `crypto.randomUUID` is undefined and the detectors will throw a `ReferenceError`. The module also cannot be exercised by deterministic property-based tests because every run produces different IDs.
* **Refactoring Directive:**
  1. Add `interface IdGenerator { newId(): string; }` to `src/engine/ports.ts`.
  2. Extend the `DetectorContext` from the previous finding with `ids: IdGenerator`.
  3. Replace every `crypto.randomUUID()` call with `ctx.ids.newId()`.
  4. Provide a `CryptoUuidGenerator` adapter in `src/lib/adapters/ids.ts` (the only file allowed to reference `crypto` directly), and a `SequentialIdGenerator` test double for fixtures.

### `src/engine/selection.ts` — direct call to `Math.random` inside the selection algorithm

* **Violation:** The tiebreaker in `pickRandom` consumes the global pseudo-random number generator.
* **Location:** Line 87, function `pickRandom<T>(arr: T[]): T`.
* **Consequence:** `selectNextQuestion` is the engine entry point that drives every served item; non-determinism here means you cannot author a regression test that asserts "given this mastery vector and this candidate pool, the engine selects template Q-7", and you cannot replay a student's session to reproduce a routing bug. It also blocks deterministic A/B simulations of the curriculum.
* **Refactoring Directive:**
  1. Introduce `interface Rng { next(): number; pick<T>(arr: T[]): T; }` in `src/engine/ports.ts`.
  2. Add `rng: Rng` to `SelectionArgs` and route it through `pickRandom`.
  3. Provide a `MathRandomRng` adapter in `src/lib/adapters/rng.ts` and a seedable `MulberryRng(seed)` for tests so suites are reproducible.
  4. Update `tests/unit/engine/bkt.test.ts` (and any future selection tests) to inject a `MulberryRng(0)`.

### `src/curriculum/seed.ts` — `crypto.randomUUID()` for `installId`

* **Violation:** The seeder mints `installId` for the first-boot `DeviceMeta` row by calling `crypto.randomUUID()` directly.
* **Location:** Line 67, inside `seedIfEmpty`.
* **Consequence:** The seed pipeline is invoked from BootScene but is itself logically a curriculum-loading concern. Calling a host global here means the seed cannot run under a Node-based migration script (e.g. for shipping a pre-seeded sqlite snapshot for kiosk deployments) without additional shims.
* **Refactoring Directive:** Accept the `IdGenerator` defined above as a parameter on `seedIfEmpty(opts: { ids: IdGenerator })`; replace the literal `crypto.randomUUID()` call with `opts.ids.newId()`.

---

## Category B — Infrastructure Abstraction (I/O and Network)

### `src/curriculum/loader.ts` — direct `fetch` call against a hardcoded URL

* **Violation:** The loader calls `fetch('/curriculum/v1.json')` to retrieve the curriculum bundle. The default URL is a hardcoded absolute path; the protocol (HTTP) is implicit; the loader holds the responsibility for both *deciding what bundle to load* (a domain concern) and *how to load it* (an infrastructure concern).
* **Location:** Lines 134, 138 — function `loadCurriculumBundle(url = '/curriculum/v1.json')`.
* **Consequence:** Any host that does not serve `/curriculum/v1.json` over `fetch` (Electron with `file://` URLs, a Capacitor/iOS shell that ships the bundle in the app bundle path, a Node-side migration tool, a Cloudflare Worker that pulls from R2, a unit test) must either monkey-patch global `fetch` or pass in a different URL string and still depend on `fetch` being defined. The same module also imports the bundle statically (`import bundledData from './bundle.json'`) as a fallback — meaning the build tool (Vite) is part of the domain's API surface; switching to esbuild, Rollup, or a Webpack-only project requires changing the loader.
* **Refactoring Directive:**
  1. Define `interface BundleSource { read(): Promise<unknown>; }` in `src/curriculum/ports.ts`.
  2. Refactor `loadCurriculumBundle` to accept a `BundleSource` and to be responsible only for *parsing* — rename to `parseCurriculumBundle(source: BundleSource): Promise<ParsedBundle>`.
  3. Move the `fetch('/curriculum/v1.json')` call to a new adapter `HttpBundleSource(url)` in `src/lib/adapters/bundleSource.ts`.
  4. Move the `import bundledData from './bundle.json'` fallback to a new adapter `EmbeddedBundleSource` in the same adapters folder. Keep both adapters out of the `curriculum/` directory.
  5. At the BootScene boundary, compose a `FallbackBundleSource(primary, fallback)` that wraps the two and replicates today's TypeError-recovery semantics.

### `src/curriculum/loader.ts` — direct build-tool intrinsic via JSON import

* **Violation:** `import bundledData from './bundle.json'` couples the curriculum domain to a build tool capable of resolving JSON imports (Vite/esbuild/Webpack with `json-loader`). It is a hidden infrastructure dependency that is invisible at the call site but resolved at compile time.
* **Location:** Line 26, top-of-file import.
* **Consequence:** The curriculum module cannot be consumed by a Node script run with `node --experimental-vm-modules` or by a server-side runtime without a JSON-import-aware bundler, even though the rest of the file is plain TypeScript. It also forces the bundle to be resolvable at compile time — no late binding to a CMS-managed bundle is possible without a rebuild.
* **Refactoring Directive:** Remove the static import. Have the `EmbeddedBundleSource` adapter (above) own the JSON import; the curriculum module then never names the file. If the embedded bundle must remain bundled-into-the-binary, use `import.meta.url`-relative `fetch` inside the adapter so the dependency is on the runtime, not on the build tool.

### `src/persistence/backup.ts` — DOM manipulation inside the persistence layer

* **Violation:** `backupToFile` constructs an `<a download>` element, synthesises a click, and revokes a Blob URL. These are presentation-tier concerns (user-visible "Save As" dialog) executed inside the persistence module.
* **Location:** Lines 100–106, function `backupToFile`.
* **Consequence:** The persistence layer cannot be used headlessly: a server-side restore tool, a Node-based backup CLI, or an offline iPad shell that prefers `navigator.share` rather than an `<a>` download will all need to bypass the function and reimplement it. The module also fails closed in any environment where `document` is undefined (it currently guards with `typeof document !== 'undefined'`, but the *responsibility* is misplaced regardless of the guard).
* **Refactoring Directive:**
  1. Strip `backupToFile` down so it returns the `Blob` only (which it already does) and remove the inline download trigger.
  2. Define `interface BackupSink { deliver(blob: Blob, suggestedName: string): Promise<void>; }` in `src/persistence/ports.ts`.
  3. Provide a `DownloadAnchorBackupSink` browser adapter in `src/lib/adapters/backupSink.ts`; provide `FileSystemBackupSink` (Node `fs.writeFile`) and `WebShareBackupSink` (`navigator.share`) as alternates.
  4. Have `SettingsScene` (the actual UI surface) compose `await backupToFile(); await sink.deliver(blob, name)` rather than the persistence module doing both.

### `src/persistence/db.ts` — direct `navigator.storage` calls

* **Violation:** `ensurePersistenceGranted` reads from `navigator.storage`, `sessionStorage`, and emits `console.warn` directly.
* **Location:** Lines 158–199 (`ensurePersistenceGranted`); supporting `sessionStorage` access at lines 164 and 172.
* **Consequence:** The persistence module is the lowest layer of the app, but it transitively requires a browser-shaped `navigator` global. Running the schema/migration logic against a Node-based test, against a server-side IndexedDB shim, or against a sqlite back-end is impossible without monkeypatching globals.
* **Refactoring Directive:**
  1. Extract `ensurePersistenceGranted` to `src/lib/adapters/storagePermission.ts`. The persistence module should not own runtime permission negotiation; it owns schema, transactions, and queries.
  2. Define `interface PersistencePermission { ensureDurable(): Promise<boolean>; }` and inject it from the BootScene boundary.

### `src/curriculum/seed.ts` — direct dependency on the concrete Dexie database

* **Violation:** `seed.ts` imports the concrete `db` instance from `../persistence/db` and calls `db.transaction(...)` and `db.deviceMeta.add(...)` etc. The seeder is in the `curriculum/` namespace (a domain folder) but speaks to the database directly.
* **Location:** Line 8 (`import { db } from '../persistence/db';`); usages throughout `seedIfEmpty`, `wipeStaticStores`, `seedAllStores`.
* **Consequence:** The curriculum domain is welded to Dexie. Replacing IndexedDB with sqlite, an HTTP-backed store, or an in-memory test fake requires editing this file even though no curriculum logic itself depends on Dexie's API surface.
* **Refactoring Directive:**
  1. Define `interface CurriculumStore { wipeStatic(): Promise<void>; bulkSeed(bundle: ParsedBundle): Promise<number>; getDeviceMeta(): Promise<DeviceMeta | null>; putDeviceMeta(meta: DeviceMeta): Promise<void>; }` in `src/curriculum/ports.ts`.
  2. Implement `DexieCurriculumStore` against the existing repos in `src/persistence/dexieCurriculumStore.ts`.
  3. Refactor `seedIfEmpty` to take `(store: CurriculumStore, bundleSource: BundleSource, ids: IdGenerator)` and to contain only orchestration logic.

### `src/persistence/repositories/*` — no repository interface above the Dexie tables

* **Violation:** Each repository file (e.g. `src/persistence/repositories/student.ts`) directly references `db.students` and exposes Dexie return types. There is no abstract `StudentRepository` interface that the engine could depend on.
* **Location:** All 17 files in `src/persistence/repositories/`.
* **Consequence:** Any caller that imports a repository pulls Dexie into its dependency graph. An off-device sync workflow, a server-side batch importer, or a unit test of an upstream caller all transitively initialise an IndexedDB database. The architecture review classifies this as solid because it is correct *for the current deployment*; under the stricter portability standard applied here, it is a leakage.
* **Refactoring Directive:**
  1. For each repository, define a sibling `interface XRepository` in `src/persistence/ports/`. Engine and curriculum callers import only the interfaces.
  2. Move the concrete Dexie implementations to `src/persistence/dexie/` (e.g. `dexie/studentRepo.ts`).
  3. Compose the wiring at the BootScene boundary, not at module-import time, so a Node script can substitute fakes.

---

## Category C — Build-Tool and Host-Global Coupling in the Logger Substrate

### `src/lib/logger.ts` and `src/lib/log.ts` — coupled to Vite intrinsics and browser globals

* **Violation:** Both logger implementations read `import.meta.env.DEV` / `import.meta.env.PROD` (a Vite-specific intrinsic). `src/lib/log.ts` additionally reads `window.location.search`, `localStorage`, and writes to `localStorage` for runtime configuration.
* **Location:** `src/lib/logger.ts:6`; `src/lib/log.ts:38`, `40`, `47`, `114`, `117`, `119`, `120`.
* **Consequence:** The "centralized logger" is itself a portability hazard: any module that imports it pulls in a hard requirement for Vite *and* a browser. This is why `src/engine/calibration.ts` rolls its own ad-hoc inline logger (line 19–21) — using the central one would taint the engine. The team's instinct to avoid the central logger is correct; the central logger needs to be rewritten so it can be safely depended on.
* **Refactoring Directive:**
  1. Define `interface Logger { debug, info, warn, error: (...args: unknown[]) => void; }` in `src/engine/ports.ts` (the engine is the lowest consumer; place the port at its boundary).
  2. Rewrite `src/lib/logger.ts` so it is a *factory*: `createConsoleLogger({ minLevel })` returning a `Logger`. No `import.meta.env`, no globals.
  3. Move the `import.meta.env.DEV` / URL-param / `localStorage` decisions to the BootScene wiring (the only place that legitimately knows the runtime).
  4. Delete the inline logger in `calibration.ts` and have it accept an injected `Logger`.

### `src/engine/calibration.ts` — direct `console.warn` call

* **Violation:** The calibration module exposes a single `logger.warn` call (its only side effect) backed by an inlined `console.warn`. This is a pragmatic shortcut acknowledged by a code comment ("Simple logger to avoid dependency bloat"), but it still couples the engine to the host's `console`.
* **Location:** Line 20, `const logger = { warn: (msg: string) => console.warn(...) }`.
* **Consequence:** The module cannot be exercised in an environment without `console` (some embedded JS shells), and tests that want to assert no log noise must reach for `vi.spyOn(console, 'warn')` instead of receiving an injected logger.
* **Refactoring Directive:** Replace the inline logger with the `Logger` port introduced above; require `Logger` as a parameter on the public functions that may emit warnings (`startCalibration` is the only one today).

---

## Category D — Deployment Agnosticism (Entry-Point Concerns)

### `src/main.ts` — composition root mixes UI bootstrap, error handling, and permission negotiation

* **Violation:** `main.ts` registers a global `unhandledrejection` handler, instantiates the Phaser game, and asks for `navigator.storage.persist()` — three different cross-cutting concerns in one entry point. None of these are violations *in isolation* (an entry point is allowed to touch globals), but the file does not behave as a thin composition root: it makes runtime decisions that should belong to adapters.
* **Location:** Lines 7–14 (rejection handler), lines 30–44 (Phaser game), lines 47–52 (persistence request).
* **Consequence:** A non-browser shell (an Electron build, an iOS/Capacitor wrapper, a Cloudflare Worker prerender, a headless test harness) cannot reuse the boot sequence — each must reimplement it. This is the file where the dependency-injection container *should* be assembled; today it is not.
* **Refactoring Directive:**
  1. Treat `src/main.ts` as the *only* file allowed to import Phaser, `window`, `navigator`, `document`, and the adapter implementations.
  2. Construct a `Composition` object (`{ clock, ids, rng, logger, bundleSource, repos, sink, permission }`) and pass it explicitly into the Phaser scene registration via `scene.data` or a registry singleton owned by `main.ts`.
  3. Move the global rejection handler to `src/lib/adapters/errorHandler.ts` so an alternate shell can decide whether to install it.
  4. Move the persistence request to `src/lib/adapters/storagePermission.ts` (already cited in Category B).

### `src/scenes/BootScene.ts` and `src/scenes/Level01Scene.ts` / `src/scenes/LevelScene.ts` — domain timestamps minted by scene code

* **Violation:** The scenes call `Date.now()` over twenty times (BootScene line 99; Level01Scene lines 313, 322, 469, 667, 811, 915, 931, 932, 970, 979, 981, 1160; LevelScene lines 227, 379, 404, 405, 570, 604, 612, 638, 651, 652, 688, 697, 699, 853) to stamp domain entities (`Session.startedAt`, `Attempt.submittedAt`, `SkillMastery.lastAttemptAt`, `HintEvent.shownAt`, `Session.endedAt`). The scene is the UI tier; the timestamps are domain data.
* **Location:** As enumerated above.
* **Consequence:** Domain timestamps cannot be controlled from a test, replayed from a recorded session, or supplied by a server during reconciliation. The scene also calculates `responseMs = Date.now() - questionStartTime` — the latency metric used to derive `avgResponseMs` for the BKT pipeline — meaning even the engine's *inputs* are non-deterministic.
* **Refactoring Directive:**
  1. The same `Clock` port from the misconception detectors finding applies here.
  2. Have the scene receive a `Clock` from the composition root; replace every `Date.now()` with `clock.now()`.
  3. Where the scene calls `nanoid()` (lines 313, 915 of `Level01Scene.ts`; analogous lines in `LevelScene.ts`), route through the `IdGenerator` port instead — the dynamic `import('nanoid').catch(...)` fallback is itself an anti-pattern that hides the dependency at runtime.

### `src/scenes/Level01Scene.ts` and `src/scenes/LevelScene.ts` — viewport read from `window.innerWidth/Height`

* **Violation:** The scenes record `viewport: { width: window.innerWidth, height: window.innerHeight }` directly into `SessionTelemetry`.
* **Location:** `Level01Scene.ts:333`; `LevelScene.ts:623`.
* **Consequence:** The telemetry capture cannot run inside a Node-based simulation, and the tests cannot assert deterministic telemetry shape without mocking `window`.
* **Refactoring Directive:** Define `interface Viewport { size(): { width: number; height: number; }; }` and inject it from the composition root. The browser adapter reads `window.innerWidth/Height`; the test adapter returns a fixed size.

---

## Category E — Notable Compliance (Defensible as-is)

The following observations are documented to acknowledge that not every host coupling is a violation under this audit standard. They are *boundary code* and the standard permits — indeed requires — them to live where they do.

### `src/components/AccessibilityAnnouncer.ts`, `src/components/PreferenceToggle.ts`, `src/components/SkipLink.ts`, `src/scenes/utils/TestHooks.ts` — DOM access in UI components

* **Status:** Compliant under the audit standard.
* **Reason:** These are presentation-tier modules under `src/components/` and `src/scenes/`. They are required to manipulate the DOM. The audit standard demands that *the domain* not touch the DOM, not that the UI avoid it.

### `src/persistence/lastUsedStudent.ts` — `localStorage` reads/writes

* **Status:** Compliant under the audit standard, with a soft note.
* **Reason:** The module is named for and explicitly bounded to localStorage; it is itself an adapter and the only thing in the dynamic stores that may use localStorage per project constraint C5. The soft note: callers in scenes should depend on an interface (`LastUsedStudentSource`) rather than importing the concrete module, so that a Node-side test can stub it without touching `localStorage`.

### `src/main.ts` — `window`, `navigator`, `document` references

* **Status:** Compliant *in principle* (entry point) but refactor recommended (see Category D, finding 1).

### `src/engine/router.ts:88` — `window` identifier

* **Status:** False positive. The identifier `window` here refers to a local sliding-window variable (`const window = recentOutcomes.slice(-REGRESS_WINDOW_SIZE);`), not the host global. No action required, but consider renaming to `recentWindow` to avoid shadowing.

---

## Summary Triage Table

| # | File / Module | Category | Severity | Effort to Refactor |
|---|---|---|---|---|
| 1 | `src/engine/misconceptionDetectors.ts` (clock) | A | High | Medium (touches all 5 detectors and their callers) |
| 2 | `src/engine/misconceptionDetectors.ts` (UUID) | A | High | Small (same surfaces) |
| 3 | `src/engine/selection.ts` (Math.random) | A | High | Small |
| 4 | `src/curriculum/seed.ts` (UUID) | A | Medium | Small |
| 5 | `src/curriculum/loader.ts` (`fetch`) | B | High | Medium |
| 6 | `src/curriculum/loader.ts` (JSON import) | B | Medium | Small (subsumed by #5 refactor) |
| 7 | `src/persistence/backup.ts` (DOM in persistence) | B | Medium | Small |
| 8 | `src/persistence/db.ts` (`navigator.storage`) | B | Medium | Small |
| 9 | `src/curriculum/seed.ts` (Dexie coupling) | B | Medium | Medium |
| 10 | `src/persistence/repositories/*` (no port interfaces) | B | Low | Large (17 files) |
| 11 | `src/lib/logger.ts` and `src/lib/log.ts` (Vite + globals) | C | Medium | Small |
| 12 | `src/engine/calibration.ts` (inline `console.warn`) | C | Low | Trivial (subsumed by #11) |
| 13 | `src/main.ts` (composition root not assembled) | D | Medium | Medium |
| 14 | `src/scenes/Level*Scene.ts` (`Date.now`, `nanoid`) | D | High | Medium (>20 sites) |
| 15 | `src/scenes/Level*Scene.ts` (`window.innerWidth/Height`) | D | Low | Trivial |

**Recommended attack order:** 1, 2, 3 → 11 → 14 → 5, 6, 7, 8 → 9, 13 → 4, 10, 15. The first three findings unblock deterministic engine tests and have the highest leverage per hour of effort. The last block is structural cleanup that pays off when introducing a second runtime (server-side replay, native shell).

---

# Audit Round 2 — Deep Dive

A second pass targeted vectors the first pass had not covered: module-load-time side effects, hardcoded deployment paths, realm-fragile error handling, mutable module-level state, the interaction-contract surface, the test fixture shape, and the few remaining subtle issues in the schema and serialization paths. New findings are numbered continuing from the Round 1 table.

## Category F — Module-Load-Time Side Effects

A module-level `new` expression is a hidden initialization side effect: it executes the moment any other module imports the file, before any `main()` has run, before any test setup has executed, before any DI container exists. Once this pattern is endemic, it becomes impossible to import the module *only for its types* or *only for its pure functions*, and impossible to substitute the singleton in tests without extensive mocking.

### `src/persistence/db.ts` — Dexie connection opened on import

* **Violation:** The line `export const db = new QuesterixDB();` instantiates a Dexie database at module-evaluation time. Constructing `QuesterixDB` registers four schema versions (`this.version(1).stores(...)` through `this.version(4)`), and Dexie's constructor opens an IndexedDB handle as soon as the first table is read.
* **Location:** Line 144 (`export const db`); the `constructor()` body lines 55–141.
* **Consequence:** Anything that even transitively imports `src/persistence/db` (which is most of the codebase via `src/persistence/index.ts`) drags an open IndexedDB handle into the import graph. In Node-based unit tests, this triggers the Dexie polyfill (or fails) on every test file that touches a repository — even a test that wants only a type. A future server-side migration tool that imports the schema definition for migration metadata would also open a stub IDB. There is no way to reset the singleton between tests, which is why the test suite must rely on `await db.delete(); db = new QuesterixDB()` patterns that race with pending operations.
* **Refactoring Directive:**
  1. Stop exporting `db` as a top-level `const`. Export a factory: `export function createDatabase(): QuesterixDB`. The class itself remains exportable.
  2. Add a `DatabaseProvider` interface with `get(): QuesterixDB`. Provide one implementation that lazy-singletons (for production), one that returns a fresh instance per call (for tests).
  3. Rewrite every `import { db }` site to receive the database from the composition root (the new `Composition` object proposed in Round 1, finding 13). The repositories become factory functions: `export function createSkillMasteryRepo(db: QuesterixDB) { return { get, upsert, ... }; }`.
  4. Move the schema declarations (`this.version(1)...`) into a `defineSchema(dexie: Dexie): void` function so the schema is data, not a constructor side effect.

### `src/audio/TTSService.ts` — singleton frozen at import time

* **Violation:** `export const tts = new TTSService();` runs the constructor at import. The constructor reads `typeof speechSynthesis !== 'undefined'` and stores the result in `this.synth`; the result is never re-checked. `this.enabled = !!this.synth` is set once and persists for the life of the module.
* **Location:** Line 58 (the `export const`); lines 18–21 (the constructor body).
* **Consequence:** In any environment where `speechSynthesis` is undefined at import time but defined later (Capacitor with delayed permission prompts, an iOS web-view that loads voices asynchronously, a test that wants to enable TTS post-setup), the singleton is locked in the disabled state forever. The module also cannot be substituted with a non-Web-Speech backend (e.g., a server-side TTS streamer for a future audio-recording feature) because every consumer imports `tts` directly rather than an interface.
* **Refactoring Directive:**
  1. Define `interface TextToSpeech { speak(text: string, opts?: TTSOptions): void; stop(): void; isAvailable(): boolean; setEnabled(on: boolean): void; }` in `src/audio/ports.ts`.
  2. Make `TTSService` an implementation of `TextToSpeech`. Stop exporting the `tts` singleton; export only the class plus a factory `createWebSpeechTTS(): TextToSpeech`.
  3. Provide a `NoopTTS` implementation in `src/lib/adapters/tts.ts` for headless environments and a `RecordingTTS` for tests that need to assert what would have been spoken.
  4. Refactor every consumer (today there are no callers per the master plan note "TTS never called", so this is a free win) to receive `TextToSpeech` via DI from the composition root.

### `src/scenes/utils/levelRouter.ts` — eager interaction registry

* **Violation:** `interactionRegistry` is a module-level `Map` populated at import; populating it imports all ten interaction modules, each of which (per Round 1, Category D, finding 14) imports Phaser. So importing `levelRouter` for the routing function imports the entire UI tier.
* **Location:** Lines 19–30.
* **Consequence:** A test that wants to assert "given archetype `partition`, the router returns *some* interaction" cannot run without Phaser. Code-splitting the bundle by archetype is impossible because the registry forces all archetypes into the initial chunk. Tree-shaking cannot eliminate unused archetypes from the production bundle.
* **Refactoring Directive:**
  1. Replace the eager imports with dynamic imports: each registry entry becomes `() => import('../interactions/PartitionInteraction').then((m) => new m.PartitionInteraction())`. The factory return type changes to `Promise<Interaction>`.
  2. Or — preferred — move the registry to the composition root, where the chosen runtime can register only the archetypes it needs. The `levelRouter` module then exports only `getInteractionForArchetype` plus an injection seam.

### `src/lib/preferences.ts` — mutable module-level cache

* **Violation:** `let cache: PreferenceCache | null = null;` is a module-level mutable variable. The functions `initPreferences`, `checkReduceMotion`, `updatePreferences`, and `isHighContrastEnabled` all read or write this hidden process-wide singleton.
* **Location:** Line 14, plus the four exported functions that mutate it.
* **Consequence:** Tests cannot run in parallel because they share the same mutable cache; a test that calls `initPreferences` poisons every subsequent test. The cache also survives across hot-module-reload cycles in Vite, producing stale-state bugs in development. There is no way to instantiate two preference contexts in the same process (e.g., for a multi-student or multi-tab future).
* **Refactoring Directive:**
  1. Convert the module to a factory: `export function createPreferenceCache(deps: { repo: DeviceMetaRepo; viewport: Viewport; dom: BodyClassToggler }): PreferenceCache;` returning an object whose methods close over the per-instance state.
  2. Replace the direct `window.matchMedia` and `document.body` calls with the injected `viewport` and `dom` dependencies.
  3. The composition root constructs the cache once and passes it to consumers.

### `src/persistence/index.ts` — barrel re-exports the live `db`

* **Violation:** Line 7 of the persistence barrel re-exports `db`. The barrel is the canonical entry point (every consumer imports `from '@/persistence'`). The re-export ensures that the module-load side effect from finding 16 is triggered no matter how indirectly the persistence layer is referenced.
* **Location:** `src/persistence/index.ts` line 7.
* **Consequence:** Compounds finding 16: it is impossible to import any repo (or the `lastUsedStudent` helper) without opening an IndexedDB connection. This is the reason there is no `import type { ... } from '@/persistence'`-only path for downstream consumers.
* **Refactoring Directive:** When refactoring `db` to a factory (finding 16), also remove the `db` re-export from the barrel. Consumers then must explicitly accept a `db` parameter or call the factory.

## Category G — Hardcoded Deployment Paths in Domain Modules

### `src/curriculum/manifest.ts` — hardcoded asset URL exported as a public constant

* **Violation:** `export const CURRICULUM_BUNDLE_URL = '/curriculum/v1.json';` makes a deployment assumption (the bundle is served at the absolute path `/curriculum/v1.json` on the same origin) part of the curriculum domain's public API. Any consumer can `import { CURRICULUM_BUNDLE_URL } from '@/curriculum'` and rely on it.
* **Location:** Line 8.
* **Consequence:** Subdirectory deployments break (e.g., shipping the SPA at `/games/questerix/` on a school district's portal). Cross-origin bundle hosting (CDN-served curriculum) breaks. Versioned bundle paths (`/curriculum/v2.json`) require a code change because the constant is non-configurable. The constant is also duplicated as the default parameter of `loadCurriculumBundle(url = '/curriculum/v1.json')` — two sources of truth.
* **Refactoring Directive:**
  1. Delete the `CURRICULUM_BUNDLE_URL` export. Move the literal to the composition root (`src/main.ts`) where it can be derived from `import.meta.env.BASE_URL` or a runtime config.
  2. Pass the URL into the `BundleSource` adapter (Round 1 finding 5) as a constructor argument.
  3. Update the `loadCurriculumBundle` default to require an explicit URL, eliminating the duplicate string.

## Category H — Realm-Fragile Error Handling

### `src/persistence/backup.ts` — Dexie-internal error name as a control-flow predicate

* **Violation:** The restore logic distinguishes "expected primary-key collision" from "real failure" by inspecting `err.name === 'ConstraintError'`. The string `'ConstraintError'` is set by Dexie (and by the underlying IDB spec); it is a magic constant that escapes from the persistence implementation into the restore-orchestration logic.
* **Location:** Line 154 of `src/persistence/backup.ts` (`if (err instanceof Error && err.name === 'ConstraintError')`).
* **Consequence:** Three failure modes:
  1. **Storage swap:** if the persistence layer is reimplemented over sqlite, FoundationDB, or a server-side store, the error name changes. The collision branch silently rebrands every error as a "real failure" and the restore aborts on the first duplicate row.
  2. **Cross-realm errors:** in a Worker / WASM / iframe context, `instanceof Error` is realm-fragile — an `Error` thrown from a different JS realm will not match. Some Dexie wrappers (e.g., dexie-cloud) re-throw cross-realm.
  3. **Dexie version drift:** Dexie has historically wrapped errors differently across major versions (the shape of `DexieError` changed in Dexie 3 → 4). The string-equality check is brittle to library upgrades.
* **Refactoring Directive:**
  1. Define a typed `RepositoryError` hierarchy in `src/persistence/errors.ts` with `PrimaryKeyConflictError`, `TransactionAbortedError`, `BackingStoreUnavailableError` etc.
  2. Each repo wraps Dexie's raw errors at the call site and re-throws the typed variant: `try { await db.x.add(row); } catch (e) { if (isDexieConstraintError(e)) throw new PrimaryKeyConflictError(...); throw new BackingStoreError(e); }`.
  3. The restore logic switches to `if (err instanceof PrimaryKeyConflictError)` — a domain-owned class that survives realm and storage swaps.

## Category I — Validators Are the Reference Implementation (Positive Baseline)

### `src/validators/*.ts` — pure-function archetype, no environmental coupling

* **Status:** Compliant with the audit standard. Documented here so the team understands what "good" looks like in this codebase.
* **Why:** Every file in `src/validators/` (`partition.ts`, `compare.ts`, `benchmark.ts`, `placement.ts`, `equal_or_not.ts`, `identify.ts`, `label.ts`, `make.ts`, `order.ts`, `snap_match.ts`) follows the same shape: `function fn(input, expected): ValidatorResult`. The functions are total, deterministic, side-effect-free, and depend only on `Math.*` arithmetic and the input arguments. There are zero `Date.now()`, `Math.random()`, `crypto.*`, `console.*`, `fetch`, `window.*`, or `document.*` references in the entire `validators/` directory.
* **Implication for the engine:** The validator layer proves the team can write portable code in this stack — there is no language or framework barrier to applying the same discipline to `src/engine/`. The engine's coupling (Round 1 findings 1–4) is a habit, not a constraint.
* **Recommended action:** Adopt the validator pattern as the reference for the engine refactor. Specifically: every engine function should accept all of its environmental dependencies (clock, RNG, IDs, logger) as parameters — not import them — exactly the way validators accept their inputs as parameters.

## Category J — Phaser Type Leak in the Interaction Contract

### `src/scenes/interactions/types.ts` — `Phaser.Scene` in the public interaction interface

* **Violation:** `InteractionContext.scene: Phaser.Scene` makes Phaser part of the `Interaction` contract. Every implementation file in `src/scenes/interactions/*` consequently imports Phaser. Per the Round 1 grep, all 13 files in `src/scenes/interactions/` import Phaser.
* **Location:** `src/scenes/interactions/types.ts` lines 6 and 9.
* **Consequence:** The `Interaction` interface is the only abstraction between the scene framework and the per-archetype gameplay code, but it cannot be replaced with a different rendering engine (canvas, DOM, Pixi, Three.js for a future 3D experiment) without changing the interface and every implementation. The interactions also cannot be unit-tested without spinning up a Phaser scene, which means archetype mechanics (drag tolerance, snap behavior, placement geometry) have no isolated test coverage.
* **Refactoring Directive:**
  1. Replace `scene: Phaser.Scene` in `InteractionContext` with a narrow port: `interface InteractionRenderer { addRectangle, addText, addImage, onPointerDown, onPointerMove, onPointerUp, destroy: ...; }` exposing only the operations interactions actually perform.
  2. Provide `PhaserInteractionRenderer(scene: Phaser.Scene)` in `src/scenes/adapters/`.
  3. Provide `HeadlessInteractionRenderer` for tests — records all calls so assertions can be made against the call log.
  4. The interactions become Phaser-free; only the adapter knows about Phaser.

## Category K — Test Fixture Coupling

### `tests/unit/engine/bkt.test.ts` — fixtures depend on the system clock

* **Violation:** The helper `freshMastery(masteryEstimate = 0)` builds a `SkillMastery` whose `lastAttemptAt` is `Date.now()`. The fixture is therefore non-deterministic; even though the test assertions don't read `lastAttemptAt`, the fixture record's identity changes every run.
* **Location:** Line 33 of `tests/unit/engine/bkt.test.ts`.
* **Consequence:** Snapshot testing the fixture is impossible. A future test that wants to assert "the engine doesn't mutate `lastAttemptAt`" cannot assert against a stable value. The pattern also subtly trains the team that "use `Date.now()` as a default" is acceptable in test code, which leaks back into product code over time.
* **Refactoring Directive:** Replace `Date.now()` with a fixed epoch constant: `const TEST_EPOCH = 1700000000000; lastAttemptAt: TEST_EPOCH`. Once the engine accepts an injected `Clock` (Round 1 finding 1), the test should use `FixedClock(TEST_EPOCH)` and the fixture becomes fully deterministic.

## Category L — Schema-Level Hazards That Will Bite at Sync Time

These are not strict portability violations *today* — they live in the data shape, not in the executable code — but they will block the sync-worker work referenced in `src/types/runtime.ts` ("syncState carries through to the 2029 client→server boundary") and in the persistence-spec. They are listed here because the audit standard requires the domain to remain serializable across runtimes.

### `src/types/runtime.ts` — `validatorPayload: unknown` and `studentAnswerRaw: unknown` cannot be safely round-tripped

* **Violation:** `Attempt.validatorPayload` and `Attempt.studentAnswerRaw` / `correctAnswerRaw` are typed as `unknown`. In practice they store archetype-specific shapes — and at least two archetypes (`benchmark`, `snap_match`) use `Map<string, X>` in their validator inputs. `JSON.stringify(map)` returns `'{}'` — Maps silently lose their contents on serialization.
* **Location:** `src/types/runtime.ts` lines 109, 111, 121 (`Attempt`); the producer site is `src/scenes/LevelScene.ts` and `Level01Scene.ts` (which today don't yet handle benchmark/snap_match per the master plan).
* **Consequence:** When the future sync worker serializes attempts to ship to a server, the validator payload for benchmark/snap_match attempts will arrive empty. Replay of historical attempts (for debugging or for re-running the misconception detectors) will be lossy. The bug will not surface until the first benchmark attempt is replayed weeks or months later.
* **Refactoring Directive:**
  1. Forbid `Map` in any payload that lands in an `Attempt` row. Convert to `Array<[K, V]>` or a plain object at the validator boundary.
  2. Replace `unknown` with discriminated unions per archetype: `type ValidatorPayload = | { archetype: 'partition'; ... } | { archetype: 'benchmark'; placements: Array<[string, BenchmarkZone]>; ... } | ...`.
  3. Add a serialization round-trip test in `tests/unit/persistence/` that asserts `JSON.parse(JSON.stringify(payload))` deep-equals the original for every archetype.

### `src/persistence/repositories/attempt.ts` — direct dependency on `Dexie.minKey` / `Dexie.maxKey` static API

* **Violation:** `attemptRepo.listForStudent` and `attemptRepo.getByArchetype` use `Dexie.minKey` and `Dexie.maxKey` for range scans. These are static properties of the Dexie class, not instance methods — the repo therefore depends on `import Dexie from 'dexie'` at the file level *in addition to* the `db` instance.
* **Location:** `src/persistence/repositories/attempt.ts` lines 7, 45, 82.
* **Consequence:** A future repo-interface refactor (Round 1 finding 10) cannot fully isolate Dexie behind a port unless the port also abstracts the range-bound sentinel values (which leak Dexie's lexicographic-key-ordering assumption into the query layer).
* **Refactoring Directive:** Define `interface AttemptRepository { listForStudent(studentId): Promise<Attempt[]>; getByArchetypeRecent(archetype, limit): Promise<Attempt[]>; ... }` so callers pass intent (recent N for an archetype) rather than range bounds. The Dexie implementation translates intent into `between([archetype, Dexie.minKey], [archetype, Dexie.maxKey])` internally.

### `src/persistence/repositories/deviceMeta.ts` — hardcoded singleton id `'device'`

* **Violation:** `const DEVICE_ID = 'device';` and `installId: DEVICE_ID` in `DEFAULT_META` mean every device shares the same `installId` until the seeder overwrites it with `crypto.randomUUID()`. The repo's get-or-create logic returns `{ ...DEFAULT_META }` (with `installId: 'device'`) when the row is absent, before the seeder has a chance to mint a real ID.
* **Location:** Lines 10, 13, 40 of `src/persistence/repositories/deviceMeta.ts`.
* **Consequence:** Two consequences:
  1. **Sync identity collision:** when sync goes live in 2029, every device that ever raced the seeder will appear to be the same device with `installId === 'device'`. Server-side dedup will silently merge unrelated student progress.
  2. **Replay ambiguity:** historical attempts cannot be tied back to a specific device for debugging because the install ID is non-unique across the install base.
* **Refactoring Directive:**
  1. Make `installId` mandatory in the constructor of `DeviceMeta` rather than a default. The get-or-create caller must mint the ID via the `IdGenerator` port before persisting.
  2. Drop the `'device'` placeholder. If a row is absent, throw `DeviceMetaNotInitializedError` and force the caller (BootScene) to handle the seed step explicitly.
  3. Add a migration that detects rows with `installId === 'device'` and reissues a fresh UUID, logging the rebrand.

---

## Updated Summary Triage Table (Round 2 additions)

| # | File / Module | Category | Severity | Effort to Refactor |
|---|---|---|---|---|
| 16 | `src/persistence/db.ts` (singleton + open on import) | F | High | Large (touches every repo and consumer) |
| 17 | `src/audio/TTSService.ts` (frozen singleton) | F | Medium | Small (no callers today) |
| 18 | `src/scenes/utils/levelRouter.ts` (eager registry) | F | Low | Small |
| 19 | `src/lib/preferences.ts` (mutable module-level cache) | F | Medium | Medium |
| 20 | `src/persistence/index.ts` (barrel re-exports `db`) | F | Low | Trivial (subsumed by #16) |
| 21 | `src/curriculum/manifest.ts` (hardcoded path) | G | Medium | Small |
| 22 | `src/persistence/backup.ts` (string-equal `ConstraintError`) | H | Medium | Small |
| 23 | `src/scenes/interactions/types.ts` (Phaser in contract) | J | High | Large |
| 24 | `tests/unit/engine/bkt.test.ts` (fixture uses `Date.now`) | K | Low | Trivial |
| 25 | `src/types/runtime.ts` (`unknown` payloads, `Map` lossy serialization) | L | High | Medium |
| 26 | `src/persistence/repositories/attempt.ts` (`Dexie.minKey/maxKey`) | L | Low | Small |
| 27 | `src/persistence/repositories/deviceMeta.ts` (hardcoded `'device'` ID) | L | High | Small |

## Cross-Cutting Architectural Observations

1. **The codebase has no dependency-injection container.** Every cross-cutting concern (clock, RNG, IDs, logger, persistence, viewport, TTS) is resolved by direct import of a singleton or a host global. Until a `Composition` object exists at the entry point and is threaded through to consumers, every individual finding above can only be fixed locally — it cannot be enforced architecturally. The composition root is the prerequisite refactor for ~70% of the findings.

2. **The validators are the only fully portable layer in the codebase.** They prove that the standard is achievable with the current stack. Any "we can't do that with TypeScript / Vite / Phaser" objection to the refactor directives is contradicted by the validator directory.

3. **The `src/persistence/` directory mixes three responsibilities** — schema declaration, query implementation, and orchestration (backup/restore, persistence-permission negotiation). Each responsibility belongs in a separate layer with a separate port. The current single-folder design is why Dexie leaks into curriculum, scenes, and the engine.

4. **Two parallel logger implementations exist** (`src/lib/logger.ts` and `src/lib/log.ts`) and neither is used by the engine, because both are coupled to `import.meta.env`. The engine rolled its own inline logger in `calibration.ts`. Consolidating loggers (Round 1 finding 11) and fixing the build-tool coupling unlocks adoption across all layers.

5. **The `LevelScene` and `Level01Scene` files together account for >25 of the `Date.now()` calls in the codebase** and several of the `nanoid()` / `window.innerWidth` calls. They are the highest-leverage single targets: a single composition-root + clock injection refactor inside these two files removes more than half of the Category A and Category D violations.

## Final Attack Order (Round 1 + Round 2 Combined)

1. **Foundation (week 1):** define the ports — `Clock`, `Rng`, `IdGenerator`, `Logger`, `BundleSource`, `Viewport`, `TextToSpeech`. Build adapters in `src/lib/adapters/`. Build the `Composition` object and wire it through `src/main.ts`.
2. **Engine purity (week 1):** apply ports to `src/engine/misconceptionDetectors.ts` (#1, #2), `src/engine/selection.ts` (#3), `src/engine/calibration.ts` (#12). Engine becomes deterministically testable.
3. **Persistence factory (week 2):** convert `src/persistence/db.ts` to a factory (#16). Cascade: `src/persistence/index.ts` (#20), repos become factories (#10), `src/persistence/repositories/deviceMeta.ts` (#27), `src/persistence/backup.ts` (#7, #22), `src/persistence/db.ts` permission helper (#8).
4. **Curriculum loader (week 2):** apply `BundleSource` (#5, #6, #21), seeder (#4, #9).
5. **Scene tier hygiene (week 3):** scenes consume injected `Clock`, `IdGenerator`, `Viewport` (#14, #15). Resolve `tts` singleton (#17), `preferences` module state (#19).
6. **Interaction contract refactor (week 3–4):** define `InteractionRenderer` port (#23). Migrate one archetype as a proof, then bulk-migrate the rest. Eager registry becomes lazy (#18).
7. **Schema hardening (week 4):** typed payloads (#25), typed errors (#22 follow-through), repository intent ports (#26).
8. **Test discipline (ongoing):** fixture rewrite (#24); enforce in CI a lint rule that bans `Date.now`, `Math.random`, `crypto.*`, `fetch`, `window.*`, `document.*`, `localStorage`, `navigator.*`, `console.*` inside `src/engine/`, `src/curriculum/`, `src/validators/` (the validators already comply; the rule will fail in the engine until step 2 lands, which is the point).

A lint rule such as the one in step 8 — implemented via `eslint-plugin-no-restricted-syntax` or a custom rule — converts the audit from a snapshot into a ratchet. Once green, regressions become impossible without an explicit `// eslint-disable` that any reviewer can spot.
