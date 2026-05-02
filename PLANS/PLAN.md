# Questerix Fractions — Active Plan

**Created:** 2026-05-02
**MVP exit criterion:** A real student completes a 5-question L1 session in a real browser tab, confirmed via DevTools → IndexedDB.

> The previous multi-phase sprint plan archived in
> `PLANS/_archive/2026-05-02-PLAN.md` covered Phases 0–5; everything that
> can be finished from the terminal is now done. What remains is gated on
> a human-in-the-loop or external auth — see `PLANS/MANUAL_VERIFICATION.md`.

---

## Active trackers

| File | Scope |
|---|---|
| [`PLANS/MANUAL_VERIFICATION.md`](./MANUAL_VERIFICATION.md) | Items that require a human in a browser, on iPad hardware, or with Cloudflare auth — Phase 0 walkthrough, iPad Safari touch-drag, production deploy. |
| [`PLANS/E2E_FOLLOWUPS.md`](./E2E_FOLLOWUPS.md) | E2E specs `test.skip`'d during the 2026-05-02 fixture-bug closeout (mascot, Quest catalog, L6/L7 chrome, multi-attempt flake, A11y touch targets, skip-link). Each cluster has a fix path. |
| `PLANS/refactor-god-objects-2026-05-01.md` | Long-running god-object refactor reference (Level01Scene → LevelScene migration, etc.). Not active sprint scope. |
| `PLANS/ui-audit.md` | Visual / UX audit notes referenced by the closed Phase 3 tables. |

## Closed-out phases (see archived plan for full notes)

- Phase 0 — Validate ✅ (verified 2026-05-01 in a real Chromium tab)
- Phase 1 — Critical bugs (B1/B2/B3) ✅
- Phase 2 — Core features (D-1 unlock gate, UI-11 routing overlay, menu badges, gold ribbon) ✅
- Phase 3 — UX pre-playtest (10 task groups + T1 FeedbackOverlay visual specs) ✅
- Phase 4 — Harden (R-task closeout + LevelScene/Level01Scene refactor under budget) ✅
- Phase 5 — Production (CI hardening, E2E unblock, deferred manual items moved to `MANUAL_VERIFICATION.md`)

## How to start a session

1. Skim this file and `MANUAL_VERIFICATION.md`.
2. If picking up an `E2E_FOLLOWUPS.md` cluster, branch off `main` with a date-stamped name.
3. Append new findings here or in the cluster trackers — do not create new top-level plan files.

## Deferred (require explicit user authorization to start)

| Item | Risk | Reason |
|---|---|---|
| Sunset `Level01Scene.ts` (D-25 Path A) | HIGH | 1727 LOC, 15 file deps. Side-by-side parity test + 2-week soak. |
| `SessionService` pivot | HIGH | ~30 h of focused work. Only after Sunset proves impractical. |
| E2E parameterization L1–L9 | MEDIUM | Needs `data-testid` sentinels on `LevelScene` for L2–L9 not yet wired. |
| Tighten coverage gate 45 → 75 % | MEDIUM | Real coverage ~77 % with integration suite; low ROI until pipeline unified. |
| TS → Python validator parity (A2) | MEDIUM | Not blocking MVP; evaluate after deploy. |
| Audio pipeline (OpenAI pre-render) | LOW | Post-MVP; ship with Web Speech TTS as placeholder. |
