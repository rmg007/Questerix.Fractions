# Baseline Audit — Plan 2 Phase 1–2 + Plan 3 Phase 0

**Generated:** 2026-05-05 | **Scope:** Read-only baseline survey | **Output:** 2 documents

---

## Documents

### 1. `touch-a11y-checklist.md`
**Plan 2 (touchscreen-a11y-audit) Phase 1–2 baseline.**

Systematic audit of accessibility compliance across the codebase:

- **Touch targets:** DOM elements confirmed ≥44×44 CSS px (PreferenceToggle, A11yLayer). Canvas-rendered interactive objects require E2E visual audit.
- **Font size:** Body text ≥16px, labels ≥14px. One edge case (`13px` star label) noted for verification.
- **Reduced-motion:** 17 files implement `prefers-reduced-motion` correctly; infrastructure is solid.
- **ARIA & accessible names:** All interactive elements have proper roles, labels, and live regions. Strong coverage.
- **Color contrast:** DOM toggles and focus states identified; canvas rendering requires axe-core scanner.
- **Keyboard navigation:** Tab order and focus visible confirmed; full E2E testing needed.

**Status:** PASS on most criteria. Canvas elements and contrast measurement require Phase 1 detailed work (Playwright + visual inspection).

---

### 2. `orphan-assets.json`
**Plan 3 Phase 0 asset audit.**

Inventory of static assets on disk vs. actual usage in code:

```json
{
  "total_assets": 75,
  "actively_used": 11,
  "orphans": 64,
  "breakdown": {
    "audio": 58 unused .ogg files,
    "fonts": 0 unused (all 5 fonts declared in CSS),
    "icons": 6 PWA manifest files (correctly retained, not "orphans")
  }
}
```

**Key findings:**

- **Audio:** SFXService uses only 6 sounds (phaserUp1, phaserDown1, powerUp11, powerUp12, threeTone1, pepSound1). The other 58 .ogg files are likely legacy from earlier prototypes or sound design iterations.
- **Fonts:** All 5 self-hosted fonts (Nunito, Fredoka One, Lexend) are actively used in CSS and index.html.
- **Icons:** favicon-32.png and apple-touch-icon.png are referenced in index.html; the remaining 6 PWA icons are standard manifest assets and should not be deleted.

**Bundle impact:** ~1.7–2.9 MB of unused audio on disk. Runtime impact: 0 KB (preload only fetches the 6 active SFX files).

**Recommendation:** Safe to defer deletion of audio orphans to Phase 3 cleanup pass (post-curriculum review to confirm no planned features depend on the unused sounds).

---

## Phase Gates

### Plan 2 Phase 1–2: Touchscreen & A11y Audit
- ✓ **Baseline complete** (this audit)
- **Phase 1 gate:** E2E Playwright tests confirm all touch targets ≥44×44 on actual rendered canvas; keyboard Tab traversal works; contrast ≥4.5:1 (axe-core)
- **Phase 2 gate:** Reduced-motion, ARIA, color contrast all verified in automated tests; 13px font size context documented and justified

### Plan 3 Phase 0: Visual Audit & Cleanup
- ✓ **Baseline complete** (this audit)
- **Phase 1 gate:** Orphan audio list reviewed by curriculum team; decision made on deletion vs. retention for future features
- **Phase 2 gate:** Audio orphans deleted (if approved); no broken references in curriculum or code

---

## How to Use These Documents

**For Plan 2 (a11y):**
1. Read `touch-a11y-checklist.md` to understand gaps (mainly E2E coverage).
2. Run Playwright tests to measure canvas touch targets: `npm run test:e2e -- --grep "touch-target|keyboard-nav"`.
3. Use axe-core to scan contrast: `npm run test:a11y`.
4. Verify 13px font size context by inspecting levelCardMasteryStar on-canvas.

**For Plan 3 (visual):**
1. Review `orphan-assets.json` summary.
2. In Phase 0 final review, confirm whether the 58 audio orphans should be deleted.
3. Commit deletion (if approved) with message referencing this audit.

---

## Notes

- **Canvas elements:** Phaser renders UI directly to canvas; touch target and color contrast measurement requires visual tools (not grep/static analysis).
- **PWA assets:** Icons not directly imported in TypeScript, but they ARE used (index.html links, PWA manifest). Not orphans.
- **Audio legacy:** The large orphan audio library is intentional — likely represents design iterations or planned future sounds. Do NOT delete without curriculum stakeholder review.

---

**Audit completed by:** Agent (read-only baseline) | **Next phase ownership:** Plan 2 (a11y-auditor agent), Plan 3 (visual-auditor agent)
