# Questerix Fractions — Active Plan

**Created:** 2026-05-02  
**Last updated:** 2026-05-02  
**MVP exit criterion:** A real student completes a 5-question L1 session in a real browser tab, confirmed via DevTools → IndexedDB.

---

## Summary of Session (2026-05-02)

✅ **Completed & Verified:**
- **Phase 4.1** — Level01Scene refactor: 1648 → 598 LOC (under 600 budget). 10 modules extracted.
- **UI/UX Polish (14 items)** — UI-S1, UI-1, UI-S2 actively updated. T25/T26/T27/T18/T19/S verified already in place. UI-M1/M2 skipped (design conflicts).
- See `_archive/2026-05-02-PHASE4.1-AND-UIUX.md` for detailed closeout.
- **R1–R12 (Data integrity):** All fixed and verified
- **C0.0a–C0.0d (Curriculum correctness):** All audited and fixed
- See `_archive/2026-05-02-CORRECTNESS-CLOSEOUT.md` for detailed audit

---

## Active trackers

*(none — E2E clusters unblocked, refactor remaining)*

---

## Closed phases

- Phase 0 — Validate ✅ (verified 2026-05-01 in a real Chromium tab)
- Phase 1 — Critical bugs (B1/B2/B3) ✅
- Phase 2 — Core features (D-1 unlock gate, UI-11 routing overlay, menu badges, gold ribbon) ✅
- Phase 3 — UX pre-playtest (10 task groups + T1 FeedbackOverlay visual specs) ✅
- Phase 4 — Harden (R-task closeout + LevelScene/Level01Scene refactor under budget) ✅
- Phase 5 — Production (CI hardening, E2E unblock, deferred manual items moved to MANUAL_VERIFICATION.md) ✅
- Phase 6 — Correctness & Integrity (R1–R12, C0.0a–C0.0d) ✅
- **Phase 4.1 — Level01Scene god-object refactor (1648 → 598 LOC)** ✅
- **Phase 7 — UI/UX Polish (14 items)** ✅
- **Phase 8 — E2E Cluster Unblock (5 clusters, ~14 tests)** ✅ — see `_archive/2026-05-02-E2E-CLUSTERS.md`

---

## Backlog — God-object refactor (5 sub-phases remaining, serial)

LOC budgets: scenes ≤ 600, components ≤ 300.

| Sub-phase | File | Current LOC | Budget | Required |
|---|---|---|---|---|
| ~~**4.1**~~ | ~~`src/scenes/Level01Scene.ts`~~ | ~~1648 → 598~~ | ~~600~~ | ✅ Done 2026-05-02 |
| **4.2** | `src/scenes/LevelScene.ts` | ~801 | 600 | Extract chrome, hint flow, progression math |
| **4.3** | `src/scenes/MenuScene.ts` | ~923 | 600 | Extract station rendering, streak display, R13 Dexie migration |
| **4.4** | `src/components/Mascot.ts` | ~760 | 300 | Extract speech-bubble, idle-escalation timer |
| **4.5** | `src/scenes/SettingsScene.ts` | ~602 | 600 | Export/restore handlers (~1% extraction) |
| **4.7** | `src/components/SessionCompleteOverlay.ts` | ~527 | 300 | Extract animation + scoring math |

> Execute strictly serial. Gate: typecheck + lint + tests green AND file under budget before next sub-phase.

---

## Deferred (require explicit user authorization)

| Item | Risk | Notes |
|---|---|---|
| Sunset `Level01Scene.ts` (D-27 Path A) | HIGH | ~1648 LOC, 15 file deps. Side-by-side parity test + 2-week soak required. |
| `SessionService` pivot | HIGH | ~30 h. Only after Sunset proves impractical. |
| E2E parameterization L1–L9 | MEDIUM | Needs `data-testid` sentinels on LevelScene for L2–L9. |
| Tighten coverage gate 45 → 75% | MEDIUM | Real coverage ~77% with integration suite; low ROI until pipeline unified. |
| TS → Python validator parity (A2) | MEDIUM | Not blocking MVP; evaluate after deploy. |
| Audio pipeline (OpenAI pre-render) | LOW | Post-MVP; Web Speech TTS ships as placeholder. |
| L03 equal_or_not shapeType fix | LOW | 8 templates missing shapeType field (validation catch). |

---

## How to start a session

1. Skim this file.
2. For E2E work, pick a cluster (A–E) and branch off `main` with a date-stamped name.
3. For UI/UX, pick an item and open a `feat/` or `fix/` branch.
4. For refactor, start with 4.1 (Level01Scene); gate each sub-phase completion.
5. Append findings here — do not create new top-level plan files.
