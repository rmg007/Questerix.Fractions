---
title: Tech Stack
status: draft
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
constraint_refs: [C1, C4, C5, C7]
related:
  [data-schema.md, persistence-spec.md, runtime-architecture.md, ../00-foundation/constraints.md]
---

# Tech Stack

The complete dependency surface of the MVP, rationale for each choice, what is forbidden, and the budgets each piece must respect. This document is the _what we use_; `runtime-architecture.md` is the _how it fits together_.

Per **C4 — Tech Stack: Phaser 4 + TypeScript + Vite + Dexie.js**, this stack is locked. Proposals to swap any layer are rejected, not the constraint.

---

## 1. The Stack at a Glance

| Layer              | Choice                                           | Version      | Purpose                                             |
| ------------------ | ------------------------------------------------ | ------------ | --------------------------------------------------- |
| Game engine        | **Phaser**                                       | `4.x`        | Canvas/WebGL rendering, drag/snap, scene management |
| Language           | **TypeScript**                                   | `6.x` strict | Type safety across game + UI + persistence          |
| Build tool         | **Vite**                                         | `8.x`        | Dev server, HMR, production bundle                  |
| UI framework       | **Tailwind CSS**                                 | `4.x`        | Utility-first styling for non-game UI               |
| Persistence        | **Dexie.js**                                     | `4.x`        | IndexedDB wrapper for student progress              |
| Persistence helper | **dexie-export-import**                          | latest       | JSON backup/restore (per persistence-spec §6)       |
| Test runner        | **Vitest**                                       | `1.x`        | Unit tests over validators, BKT, persistence        |
| E2E testing        | **Playwright**                                   | `1.59+`      | Cross-browser headless playthroughs                 |
| Hosting            | Static CDN (Vercel / Netlify / Cloudflare Pages) | n/a          | HTTPS, free, PWA-compatible                         |

Confirmed against `package.json` at the project root.

---

## 2. Why Each Was Chosen

### 2.1 Phaser 4 — game engine

**Why.** The prototype already uses Phaser. It handles every interaction the MVP needs: drag-snap with magnetic forces (`src/data/config.ts ENGINE_SETTINGS.snap`), procedural shape rendering (circles, rectangles, partition lines), animation tweens, scene transitions, and input across mouse/touch with no platform-specific code. Phaser 4 brings WebGL2 rendering and a redesigned scene plugin system without breaking the v3 patterns we already use.

**Constraint linkage.** C4 explicitly names Phaser. Per C7 (mobile + desktop responsive), Phaser's `Phaser.Scale.FIT` mode handles the 360 → 1024+ px range without per-device branching.

**What it isn't.** Phaser is _not_ used for the surrounding UI (menus, settings, modals, the home screen). That's HTML+Tailwind. Mixing Phaser scenes for everything would inflate complexity without payoff — DOM is faster for non-canvas UI.

### 2.2 TypeScript (strict) — language

**Why.** The data schema (`data-schema.md`) has 17 entity types with foreign keys. JavaScript would force runtime guards everywhere; TypeScript catches schema drift at compile time. Strict mode (`strict: true` in `tsconfig.json`) plus `noImplicitAny`, `strictNullChecks`, and `noUncheckedIndexedAccess` are non-negotiable.

**Constraint linkage.** C4 names TypeScript. The schema versioning strategy (`data-schema.md §5`) requires migration functions whose `(oldDb) => newDb` shape must typecheck — this is impossible without TypeScript.

**Build target.** ES2022. Targets all browsers per C7 (see §5 below).

### 2.3 Vite — build tool

**Why.** Vite gives sub-second HMR for both Phaser scenes and the surrounding HTML/Tailwind UI. The existing `vite.config.ts` already wires Tailwind v4's first-party Vite plugin and a custom logging middleware (`/api/log` → `log/game_*.log`). Production build outputs a static `dist/` directory deployable to any CDN.

**Constraint linkage.** C4 names Vite. C1 (no backend) means we need static build output — Vite's `vite build` produces exactly that.

**Bundle strategy.** Code-split per scene where possible. Phaser is the single largest dependency (~900 KB minified) and is shared across all scenes, so it must be in the main chunk.

### 2.4 Tailwind CSS v4 — UI styling

**Why.** Utility-first Tailwind eliminates 90% of the bespoke CSS for the non-game UI (menus, modals, settings panel, level picker). v4 ships a Vite-native plugin that's faster than the v3 PostCSS pipeline. Token-based design (per `design-language.md`) maps cleanly to Tailwind's color and spacing utilities.

**Constraint linkage.** C4 names Tailwind v4. C6 (simple + bright) is much cheaper to maintain when most styling is utility classes — there are no bespoke CSS files accumulating ad-hoc rules.

**What we don't use.** Tailwind plugins beyond the official Vite plugin. No `@apply` abuse — utilities live in JSX/TSX, not extracted into bespoke classes.

### 2.5 Dexie.js — IndexedDB persistence

**Why.** See `persistence-spec.md §1–2` for the full rejected-alternatives table. In short: 22 KB gzipped, fluent typed queries, declarative migrations, Phaser-thread-friendly (no Worker contortion).

**Constraint linkage.** C5 (no localStorage), C1 (offline-only), C4 (Dexie explicitly named).

**Add-ons.** `dexie-export-import` (~10 KB) for the user-controlled JSON backup feature.

### 2.6 Vitest + Playwright — testing

**Why.** Vitest re-uses the Vite config, runs in a few seconds, supports ESM natively. The existing `package.json scripts.test` already runs `vitest run && npx playwright test`.

**Coverage targets.**

- Vitest: pure-function code (validators, BKT math, fraction arithmetic, persistence migrations)
- Playwright: scene-level smoke (boot → student-create → level pick → first attempt → outcome)

E2E coverage is **not** comprehensive — it's a regression net for boot and the happy path. Detailed Phaser interaction tests aren't worth the maintenance overhead.

### 2.7 Hosting (static CDN)

**Why.** Vercel, Netlify, and Cloudflare Pages all give free HTTPS, custom domains, and CDN. HTTPS is required for PWA installation (per `persistence-spec §3.1`).

**Recommended:** Cloudflare Pages — generous free tier, fast global CDN, no surprise bills. Vercel and Netlify are equivalent fallbacks.

---

## 3. Forbidden Stack Items (per C4)

These are explicitly rejected. Any PR that introduces them is rejected on sight.

| Forbidden                                                | Why                                                                                                                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **React / Preact / Vue / Svelte**                        | C4 names Phaser; mixing a virtual-DOM framework adds reconciliation overhead and a parallel state model. The Tailwind UI uses plain TypeScript + DOM where needed. |
| **Next.js / Nuxt / Remix**                               | These are SSR-first frameworks. C1 forbids a backend; SSR is irrelevant to a static PWA.                                                                           |
| **Redux / Zustand / Jotai / MobX**                       | C4 explicitly forbids these. The runtime state lives in Phaser scenes, the data layer in Dexie. A third state container is unnecessary.                            |
| **jQuery / lodash / underscore**                         | TypeScript stdlib + Phaser utilities cover everything. Adding a utility belt costs bytes for no gain.                                                              |
| **Backend frameworks (Express, Fastify, Hono, etc.)**    | C1: no backend. The lone Vite middleware (`/api/log`) is a dev-only logging endpoint, not production code.                                                         |
| **Auth libraries (Auth0, Clerk, Supabase Auth, etc.)**   | C1: no accounts. Single locally-generated UUID per student.                                                                                                        |
| **localStorage**                                         | C5 forbids. Only `lastUsedStudentId` may be in localStorage; everything else is Dexie.                                                                             |
| **Service-worker libraries beyond a no-op**              | Per `persistence-spec §3.1`, the service worker is minimal — installable PWA flag, no offline-first caching strategy yet. Workbox / Vite-PWA are deferred.         |
| **CSS-in-JS (Emotion, styled-components)**               | Tailwind covers UI; Phaser covers canvas. No third styling layer.                                                                                                  |
| **GraphQL / tRPC**                                       | No backend = no API contract.                                                                                                                                      |
| **Web frameworks beyond static (Astro, Eleventy, etc.)** | The site is a single HTML entry; Vite alone produces it.                                                                                                           |

---

## 4. Bundle Size Budget

Targets are **gzipped** transfer size. Values below the line are **hard limits**; the build fails if exceeded.

| Bundle                         | Budget (gzipped)     | Notes                                       |
| ------------------------------ | -------------------- | ------------------------------------------- |
| Phaser 4 (vendor chunk)        | ≤ 350 KB             | Largest single dependency                   |
| Dexie + dexie-export-import    | ≤ 30 KB              |                                             |
| Tailwind output (purged)       | ≤ 20 KB              | Tailwind v4 ships small with proper purge   |
| App code (TypeScript compiled) | ≤ 80 KB              | Includes scenes, systems, persistence layer |
| Curriculum JSON (static seed)  | ≤ 500 KB gzip        | ~2 MB raw, per `persistence-spec §7`        |
| Audio assets (SFX × 5)         | ≤ 50 KB total        | Short Ogg/MP3                               |
| Fonts (Lexend + Nunito subset) | ≤ 30 KB              | Latin subset, woff2                         |
| **Total initial transfer**     | **≤ 1.0 MB gzipped** | First-meaningful-paint budget               |

A 1 MB initial transfer over a typical 4G connection (~5 Mbps) loads in ~1.6 seconds. Acceptable for a PWA target; further optimization is a post-MVP problem.

### 4.1 What's measured

- Counted: production build output (`dist/`), all chunks, all assets pulled by the initial HTML
- Excluded: dev-only middleware, source maps, test fixtures

### 4.2 Enforcement

A `vite-bundle-analyzer` run in CI compares against a checked-in `bundle-budget.json` snapshot. PRs that increase any line item by > 10% require explanation in the PR description.

---

## 5. Browser Compatibility Matrix

Per **C7**, the MVP must work on every realistic K–2 student device. The compatibility matrix:

| Browser                         | Min version    | Tier | Notes                                         |
| ------------------------------- | -------------- | ---- | --------------------------------------------- |
| **Chrome (desktop + Android)**  | 109 (Jan 2023) | A    | Reference target                              |
| **Safari (macOS + iPadOS)**     | 16.4           | A    | iPadOS dominates US K–2 schools               |
| **Safari (iOS iPhone)**         | 16.4           | A    | ITP eviction caveat per `persistence-spec §3` |
| **Firefox (desktop + Android)** | 110            | A    |                                               |
| **Edge**                        | 110            | A    | Chromium under the hood                       |
| **Samsung Internet**            | 21+            | B    | Common on Android tablets                     |
| **Older Safari (< 16)**         | —              | Out  | No `navigator.storage.persist` reliability    |
| **IE11**                        | —              | Out  | Dead.                                         |

### 5.1 Target features required

- ES2022 syntax (no transpile to ES5)
- IndexedDB v2
- Pointer Events API
- `navigator.storage.persist()` (graceful degrade if absent)
- Web App Manifest support
- Service Worker registration (no offline-first strategy required for MVP)
- Fetch API
- CSS Grid + Flexbox
- WebGL 2 (Phaser 4 default; falls back to WebGL 1 / Canvas2D where needed)

### 5.2 Test devices (minimum playtest matrix)

Per C7:

- iPhone SE (375 × 667) — smallest realistic phone
- iPad 9th gen (768 × 1024) — most common K–2 school device
- Desktop Chrome at 1024 × 768 (small laptop)
- Android phone in 360–414 px range (Samsung Galaxy S series, Pixel A series)

---

## 6. What's Explicitly Deferred (Not Forbidden, Just Not in MVP)

These are reasonable additions post-validation but out of scope for the MVP:

- **Workbox / Vite-PWA full caching.** Current PWA is minimal-install; full offline-first is post-validation polish.
- **Web Components / Lit.** No need yet. If the UI grows past Tailwind's reach, reconsider in 2029.
- **WebAssembly modules.** No compute hot path requires it. Validators are < 1 ms each.
- **Web Workers for BKT computation.** BKT updates take < 5 ms; not worth a Worker context.
- **Internationalization libraries (i18next, FormatJS).** MVP ships English only per `data-schema §2.1`. The schema's `localeStrings` field exists for forward-compat.
- **Sentry / error monitoring.** C1 forbids remote telemetry; errors are caught locally and logged via the dev-only `/api/log` middleware.
- **Analytics (Plausible, Fathom, GA).** Same reason. Validation telemetry is read by inspecting IndexedDB exports.

---

## 7. Dependency Update Policy

- **Major version bumps** (Phaser 4 → 5, TypeScript 6 → 7) require an explicit decision noted in the constraints change log.
- **Minor / patch** bumps may proceed if Vitest + Playwright suites pass.
- **Security advisories** (`npm audit`) on production dependencies are addressed within the next release. Dev-only advisories are addressed quarterly.
- **Lockfile** (`package-lock.json`) is committed. CI runs `npm ci` (not `npm install`).

---

## 8. Cross-References

- Constraint authority: `../00-foundation/constraints.md` (C1, C4, C5, C7)
- How these technologies are arranged at runtime: `runtime-architecture.md`
- What gets stored where: `data-schema.md`, `persistence-spec.md`
- Visual styling that consumes Tailwind: `../20-mechanic/design-language.md`
