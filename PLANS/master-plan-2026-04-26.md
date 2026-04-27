# Questerix Fractions — Master Plan

**Date:** 2026-04-26
**Branch:** `main`
**Status:** 🔴 Sprint 0 — gameplay loop being unblocked; in-flight scene work pending real-browser verification
**Source documents:** [architecture-review-2026-04-27.md](architecture-review-2026-04-27.md) · [qa-visual-report-2026-04-27.md](qa-visual-report-2026-04-27.md)

This is the single backlog of everything left to do for the K–2 MVP (Levels 1–9, validation gate). It synthesizes the architecture review and visual QA report, reflects work-in-flight since they were written, and orders work by sprint with explicit exit criteria.

---

## 1. Status Snapshot

| Layer | Today | Trend |
|---|---|---|
| Visual / theme | ✅ Adventure-world unification landed (commit `f252104`) | ↑ |
| Gameplay loop (L1) | 🟡 Heavy in-flight edits (~317 LOC in `Level01Scene.ts`) — needs real-browser verification | ↑ |
| Learning engine (BKT + detectors) | 🔴 Built, never called from `Level01Scene.recordAttempt()` | — |
| Level 2–9 access | 🔴 No UI route exists (adventure map decorative) | — |
| Persistence (Dexie v3) | ✅ All 17 repositories solid; gates 2–4 verified in `65333ef` | — |
| Settings / TTS / privacy | ✅ Settings working · ✅ `public/privacy.html` exists · 🔴 TTS never called | ↑ |
| Tests | 🟡 `tests/unit/engine/bkt.test.ts` started (197 LOC, 8 describe blocks) | ↑ |
| Deploy infra | 🟡 `wrangler.toml` (Cloudflare Pages) added; build not smoke-tested | ↑ |

**Bottom line:** App is closer to Sprint 0 exit than the 2026-04-27 review reflects. Confirm in a real browser, then move into Sprint 1 (wire BKT) immediately.

---

## 2. Immediate Next 5 Actions

Run these in order. Each one unblocks the next.

| # | Action | File(s) | Effort | Validates |
|---|---|---|---|---|
| 1 | Open `localhost:5002` in a real Chrome tab and play L1 end-to-end. Capture screenshots of: Q1 prompt, post-drag, post-Check, Q5 result, session-complete card. | n/a | 15 min | BUG-01, BUG-02, BUG-04, BUG-05, G-L1–G-L6 |
| 2 | If session completes: tag in-flight diff, commit with message referencing closed gates. If still failing: use new `src/lib/log.ts` (`?log=DRAG,VALID,Q`) to capture the failure path. | n/a | 15–60 min | Closes Sprint 0 OR isolates remaining bug |
| 3 | Wire `updateMastery()` and `runAllDetectors()` into `Level01Scene.recordAttempt()`; persist via `skillMasteryRepo`. Verify in IndexedDB DevTools that mastery moves after 3 correct answers. | `src/scenes/Level01Scene.ts`, `src/engine/bkt.ts` | 1–2 h | G-E1, G-E2, G-E5 |
| 4 | Pass `hintsUsedIds` from hint events into `recordAttempt()` payload; derive real `accuracy` and `avgResponseMs` in `closeSession()`. | `src/scenes/Level01Scene.ts`, `src/scenes/LevelScene.ts` | 1 h | G-E3, G-E4 |
| 5 | Run full Vitest suite (`npm run test`) to confirm BKT unit tests pass and nothing regressed; production smoke build (`npm run build` + `npm run preview`). | n/a | 30 min | G-OPS1, baseline for deploy |

---

## 3. Master Backlog by Sprint

Numbering matches the 2026-04-27 architecture review so cross-references stay stable. Items with **strikethrough** are closed since the review.

### Sprint 0 — Unblock Basic Gameplay (in-flight)
*Exit:* Student completes one 5-question session in a real browser. Screenshot of session-complete card committed to `PLANS/screenshots/`.

- [ ] S0-T1 — BUG-01: filter `templatePool` to `archetype === 'partition'` only — *likely fixed in pending diff; needs verification*
- [ ] S0-T2 — BUG-02: debug `handlePos` update on drag events; widen snap tolerance if needed — *likely fixed in pending diff; needs verification*
- [ ] S0-T3 — BUG-04: hint tier counter advances 1→2→3 — *needs verification*
- [ ] S0-T4 — BUG-05: settings gear retest (code uses `scene.launch`; suspected IDE-preview artifact only)
- [ ] S0-T5 — Round-trip screenshot: Menu → L1 → 5-correct → session-complete → "Back to menu"

### Sprint 1 — Make It Feel Smart
*Exit:* IndexedDB shows real mastery estimates after 5 questions. Hints escalate. Misconception flags written when a pattern repeats.

- [ ] S1-T1 — Wire `updateMastery()` in `Level01Scene.recordAttempt()` (G-E1)
- [ ] S1-T2 — Wire `runAllDetectors()` in `Level01Scene.recordAttempt()` (G-E2; already wired in `LevelScene` per review)
- [ ] S1-T3 — Pass `hintsUsedIds` through to attempt records (G-E3)
- [ ] S1-T4 — Real `accuracy` + `avgResponseMs` in `closeSession()` (G-E4)
- [ ] S1-T5 — Verify state transitions in IndexedDB: `NOT_STARTED → LEARNING → APPROACHING → MASTERED`
- [ ] S1-T6 — *(pull-in)* Add `[archetype+submittedAt]` index to Dexie schema v4 if attempt queries get slow (G-DB1, deferrable)

### Sprint 2 — Level Progression
*Exit:* Student can reach Level 2 after L1, and progress is gated on mastery (or simple completion — see Open Decision D-1).

- [ ] S2-T1 — Choose unlock model: BKT-mastery gate vs. session-completion gate (D-1)
- [ ] S2-T2 — Make adventure-map nodes tappable, OR add a level-select bottom sheet (G-C3, G-C4)
- [ ] S2-T3 — Fix "Keep going" to advance `levelNumber` (G-C7, G-UX6)
- [ ] S2-T4 — Author L2 (quarters, partition + identify) ≥ 10 templates (G-C5)
- [ ] S2-T5 — Run `npm run build:curriculum`; smoke-test L2 in browser

### Sprint 3 — TTS + Feedback Polish
*Exit:* Prompt is read aloud on question load. Correct/incorrect feedback verified with target-age proxy.

- [ ] S3-T1 — Call `tts.speak(promptText)` on question load, gated by `prefs.ttsEnabled` (G-UX3, G-UX8)
- [ ] S3-T2 — iPad Safari TTS + touch-drag test (G-OPS2)
- [ ] S3-T3 — Playtest feedback animations with a 6-year-old (or close proxy) (G-UX4)
- [ ] S3-T4 — Polish session-complete card if playtest reveals issues

### Sprint 4 — L3–L9 Content + Full Level Access
*Exit:* All 9 levels playable with authored content. Level unlock works end-to-end.

- [ ] S4-T1 — Author L3–L5 templates (≥ 10 each) — *equal_or_not, label, make, snap_match*
- [ ] S4-T2 — Author L6–L9 templates (≥ 10 each) — *compare, benchmark, order*
- [ ] S4-T3 — Per-level browser smoke test
- [ ] S4-T4 — Mastery-gated unlock wired into menu state

### Sprint 5 — Production & Testing
*Exit:* App builds, deploys to Cloudflare Pages, works offline, works on iPad, has happy-path E2E test.

- [x] ~~S5-T2 — `public/privacy.html` exists~~ (closed by current branch)
- [x] ~~S5-T2b — `wrangler.toml` exists~~ (closed by current branch)
- [ ] S5-T1 — `npm run build` produces clean bundle, `npm run preview` boots (G-OPS1)
- [ ] S5-T2c — Confirm `public/manifest.json` exists and passes Lighthouse PWA basics
- [ ] S5-T3 — iPad Safari touch-drag test (G-OPS2)
- [ ] S5-T4 — Playwright happy-path E2E for L1 (G-OPS5) — TestHooks already in place
- [ ] S5-T5 — Expand BKT unit tests (G-OPS6 partial — `tests/unit/engine/bkt.test.ts` covers 8 areas; add edge cases for slip/guess and decay if introduced)
- [ ] S5-T6 — Validator unit tests (`src/validators/registry.ts` and individual validators) (G-OPS6 expansion)
- [ ] S5-T7 — Deploy to Cloudflare Pages

---

## 4. Cross-Cutting Workstreams

These don't fit a single sprint — they progress alongside.

| Stream | Owner | Status |
|---|---|---|
| Logging — `src/lib/log.ts` | done | ✅ added; use for Sprint 0 BUG-02 debug (`?log=DRAG,VALID,Q`) |
| Curriculum authoring (L2–L9) | content | 🔴 9 hours estimated (S4-T1 + S4-T2) |
| iPad / touch device coverage | QA | 🔴 critical — primary K–2 device, never tested |
| E2E test scaffolding | engineering | 🟡 TestHooks ready; no specs yet |
| Roadie integration (`npm run dev`) | infra | 🟡 broken dependency — works around with `npm run dev:app` |
| Deploy pipeline | infra | 🟡 wrangler.toml present; CI not configured |

---

## 5. Verification Required (In-Flight Work)

The branch has unstaged edits to 5 scene files totaling ~762 LOC. Before claiming Sprint 0 is closed, verify each of these in a real Chrome tab — not the IDE preview:

| Item | What to verify | How |
|---|---|---|
| L1 prompt text | Reads "Split this shape…" or partition language, not "Which shape has 1/3 shaded?" | Open `localhost:5002`, click Play! |
| Drag handle | Moves freely with pointer; releases at last position | Drag-and-drop on rectangle |
| Submit at center | Returns `EXACT`; green feedback fires; counter goes 1/5 → 2/5 | Center the line, click Check ✓ |
| Submit off-center (close) | Returns `CLOSE`; amber feedback; "Almost!" copy | Drag slightly off, click Check |
| Submit off-center (wrong) | Returns `WRONG`; shake animation; "Not quite" | Drag far off, click Check |
| Hint tiers | Tier 1 → 2 → 3 on consecutive presses; not stuck on Tier 1 | Click ? three times |
| Session complete | Shows after 5 correct; "Keep going ▶" + "Back to menu" both visible | Complete 5 questions |
| Settings gear | Opens SettingsScene as overlay (does not destroy MenuScene) | Click gear from menu |

If any item fails, capture a console log with `?log=*` and add the failure to Sprint 0.

---

## 6. Open Decisions Pending User Input

| ID | Decision | Why now |
|---|---|---|
| D-1 | Level unlock model: **BKT mastery threshold** vs. **session completion** vs. **always unlocked (free play)** | Blocks S2-T1; affects whether Sprint 1 BKT wiring is also a UX dependency |
| D-2 | Where do L3–L9 templates come from? Hand-authored, generated from `RoadMap/` quarantined assets, or LLM-assisted? | Affects S4 effort estimate (could double if hand-authored) |
| D-3 | Is the `src/curriculum/bundle.json` source-of-truth, or is `public/curriculum/v1.json` (the served copy)? Both are dirty in `git status`. | Affects authoring workflow for S4 |
| D-4 | Sunset the legacy `Level01Scene.ts` once the generic `LevelScene.ts` reaches parity, or keep both? | Affects refactor effort during S2 |
| D-5 | Onboarding for first-time student (now deprioritised): does *any* first-tap signal need to exist, or is "see Play! button → tap it" enough? | Edge-case for SettingsScene's storage-permission prompt |

---

## 7. Constraint Compliance — Quick Audit

From `docs/00-foundation/constraints.md`:

| C# | Status | Notes |
|---|---|---|
| C1 — no backend | ✅ | Dexie + IndexedDB only |
| C3 — K–2 persona only | ✅ | No teacher / parent surface |
| C4 — Phaser 4 + TS + Vite + Tailwind v4 + Dexie | ✅ | No React, no backend |
| C4b — privacy notice | ✅ | `public/privacy.html` now exists |
| C5 — IndexedDB only for important data | ✅ | localStorage used only for prefs / log filter |
| C7 — touch targets ≥ 44×44px | ✅ | Existing audit passed |
| C8 — reduced motion respected | ✅ | SettingsScene toggle wired |
| C9 — 5+ problems per session | ✅ | Architecture supports; in-flight verification in progress |
| C10 — linear denominator progression L1→L9 | 🟡 | Architecture correct; content blocked on Sprint 4 |

---

## 8. Effort Roll-Up

| Sprint | Estimated Effort | Status |
|---|---|---|
| Sprint 0 (unblock loop) | 1.5 h remaining | 🟡 in-flight |
| Sprint 1 (BKT wiring) | 3 h | 🔴 not started |
| Sprint 2 (level progression) | 8 h | 🔴 not started |
| Sprint 3 (TTS + polish) | 4 h | 🔴 not started |
| Sprint 4 (L3–L9 content) | 16 h | 🔴 not started |
| Sprint 5 (production + testing) | 8 h remaining | 🟡 partially started (privacy, wrangler, BKT tests) |
| **Total to MVP** | **~40 h** | — |

This is below the 50-hour roadmap budget. Headroom should go into iPad/touch testing and a real-child playtest (Sprint 3).

---

## 9. Document References

| Doc | Purpose |
|---|---|
| [architecture-review-2026-04-27.md](architecture-review-2026-04-27.md) | Full technical audit + 28-item gap register (canonical source) |
| [qa-visual-report-2026-04-27.md](qa-visual-report-2026-04-27.md) | Live browser walkthrough + screenshots + bug register |
| `docs/00-foundation/constraints.md` | Locked C1–C10 constraints |
| `docs/50-roadmap/mvp-l1-l9.md` | Phased roadmap (Phase 0 done; Phase 1 in progress) |
| `docs/10-curriculum/scope-and-sequence.md` | L1–L9 progression model |
| `docs/10-curriculum/misconceptions.md` | Detector definitions (EOL, WHB, MAG, PRX, NOM, ORD) |
| `docs/20-mechanic/activity-archetypes.md` | Mechanic specs per archetype |
| [INDEX.md](INDEX.md) | This planning suite's navigation hub |

---

## 10. How To Use This Plan

1. **Daily:** Open Section 2 (Next 5 Actions) and the active sprint in Section 3.
2. **End of session:** Move closed items to ✅ in Section 3; add any newly discovered issues to the relevant sprint or Section 5.
3. **Weekly:** Re-check Section 1 (status snapshot) and update Section 8 (effort roll-up) — rebudget if drift > 20%.
4. **Decision needed:** Bring Section 6 to the user; do not silently choose.

*Created: 2026-04-26 · Status: ACTIVE · Owner: Claude + user*
