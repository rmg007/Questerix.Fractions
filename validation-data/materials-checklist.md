# Cycle A Materials Checklist

**Phase 12.2 Preparation Checklist**  
**Updated:** 2026-04-26

---

## 1. Core Documents Status

| Document | Location | Status | Format | Copies Needed |
|----------|----------|--------|--------|---------------|
| Consent Form | `docs/40-validation/consent-form-phase1.md` | ✅ Ready | Markdown (print as PDF) | 5 |
| Pre/Post Test | `docs/40-validation/pre-post-test-instrument.md` | ✅ Ready | Markdown (print as PDF) | 5 pre + 5 post |
| Observer Form | `validation-data/cycle-a/observer-form.md` | ✅ Ready | Markdown (print) | 3 per participant (9 total) |
| Privacy Notice | `docs/40-validation/privacy-notice.md` | ✅ Ready | Reference | 1 (for file) |

---

## 2. Directory Structure

**Status:** ✅ Created

```
validation-data/cycle-a/
├── README.md                      # Data organization guide
├── observer-form.md               # Session observation template
├── pre-test-checklist.md          # Pre-session protocol
├── analysis-report.md             # Placeholder for post-session analysis
├── pseudonym-A/                   # Participant 1
│   └── .gitkeep
├── pseudonym-B/                   # Participant 2
│   └── .gitkeep
├── pseudonym-C/                   # Participant 3
│   └── .gitkeep
├── pseudonym-D/                   # Participant 4
│   └── .gitkeep
└── pseudonym-E/                   # Participant 5
    └── .gitkeep
```

---

## 3. Materials to Print & Prepare

### Consent Forms
- **How:** Export `docs/40-validation/consent-form-phase1.md` as PDF
- **Quantity:** 5 copies (1 per family)
- **Notes:** Include researcher contact info at bottom; keep signed forms in sealed envelope

### Pre-Test Instruments
- **How:** Export `docs/40-validation/pre-post-test-instrument.md` pages 1–8 as PDF
- **Quantity:** 5 copies (1 per student, administered before Session 1)
- **Paper:** 8.5" × 11", heavy stock recommended
- **Images:** Full-size bar models; verify print clarity (minimum 2" width per item)
- **Font:** 14pt questions, 18pt answer choices
- **Timeline:** Print 1 week before Cycle A start

### Observer Forms
- **How:** Print `validation-data/cycle-a/observer-form.md` (pages 1–5 recommended)
- **Quantity:** 3 per participant × 5 participants = 15 copies total (9 for Cycle A sessions, 6 extra)
- **Paper:** Standard 20lb stock
- **Binding:** Loose (not stapled) so each session is captured separately
- **Clipboard:** One per observer

### Post-Test Instruments
- **Status:** Print after Session 3 only
- **Quantity:** 5 copies
- **Timeline:** Print within 1 day of final session for immediate scoring

---

## 4. Pseudonym & Privacy Management

### Pseudonym Policy
- **Assignment:** Researcher assigns pseudonyms (e.g., pseudonym-A, pseudonym-B) during consent
- **Mapping:** Keep a **sealed, offline pseudonym mapping sheet** in locked file:
  - File: `validation-data/pseudonym-mapping.sealed.txt` (offline copy required)
  - Format:
    ```
    pseudonym-A = [real name] | parent contact: [method]
    pseudonym-B = [real name] | parent contact: [method]
    ...
    ```
  - **NEVER commit to git**
  - **NEVER store digitally** on networked drive
  - Print once, store in locked cabinet

### Session Privacy Checklist
- [ ] No real names in session JSON exports
- [ ] No real names in observer notes
- [ ] No parent phone/email in forms (consent form only, filed separately)
- [ ] All filenames use pseudonyms only
- [ ] Encryption at rest for any digital backup

---

## 5. Data Folder Setup

**Status:** ✅ Ready

Each participant folder should contain:

```
validation-data/cycle-a/<pseudonym>/
├── consent-form.pdf         # Scanned signed copy (optional)
├── pre-test.pdf             # Pre-test results (8 points score)
├── session-1-<pseudonym>-<date>.json      # App export (auto-generated)
├── session-1-observer-notes.txt           # Observer form observations
├── session-2-<pseudonym>-<date>.json      # Session 2 export
├── session-2-observer-notes.txt           # Session 2 observations
├── session-3-<pseudonym>-<date>.json      # Session 3 export
├── session-3-observer-notes.txt           # Session 3 observations
└── post-test.pdf            # Post-test results (8 points score, added after S3)
```

---

## 6. Validation Script

**Status:** 🔍 Need to verify

Check if validation script exists:
```bash
ls -la validation-data/scripts/check.py
```

**If exists:**
- [ ] Script validates JSON telemetry exports
- [ ] Script can parse session duration, question counts, timestamps
- [ ] Script outputs `VALID` or `ERROR` for each session

**If missing:**
- Note: Backup validation ready per `playtest-protocol.md` (manual inspection)
- Can add automated validation in Phase 3 if needed

---

## 7. Materials Preparation Timeline

| Task | Due Date | Owner | Status |
|------|----------|-------|--------|
| Consent forms printed | 1 week before Cycle A | Researcher | ⏳ TODO |
| Pre-test instruments printed & verified | 1 week before Cycle A | Researcher | ⏳ TODO |
| Pseudonym mapping created (sealed offline) | Before Session 1 | Researcher | ⏳ TODO |
| Observer forms printed × 15 copies | Before Session 1 | Researcher | ⏳ TODO |
| Participant folders created on disk | ✅ Done (2026-04-26) | System | ✅ DONE |
| Directory structure tested with .gitkeep | ✅ Done (2026-04-26) | System | ✅ DONE |
| Privacy notice document filed | Before Session 1 | Researcher | ⏳ TODO |
| Dry-run session 1 | [TBD] | Researcher + Observer | ⏳ PENDING |

---

## 8. Final Verification Checklist

Before Cycle A begins:

### Documentation
- [ ] Consent form printed, researcher contact verified
- [ ] Pre-test printed, bar model images verified at full size
- [ ] Observer form printed, 15 copies collated
- [ ] Privacy notice in researcher file (not in participant folder)
- [ ] All documents reviewed for typos and clarity

### Directory Structure
- [ ] `validation-data/cycle-a/` exists with 5 pseudonym folders
- [ ] `.gitkeep` files present (preserves empty dirs in git)
- [ ] `analysis-report.md` placeholder created
- [ ] `README.md` and `pre-test-checklist.md` accessible

### Privacy & Data
- [ ] Pseudonym mapping created and sealed (offline)
- [ ] No real names in any digital files
- [ ] Data folders ready to receive JSON exports
- [ ] Researcher knows backup protocol if JSON export fails

### Device & Technical
- [ ] Test device(s) have Questerix app installed, updated to current version
- [ ] Test session shows data export button works
- [ ] Researcher has tested export → JSON file → naming convention (once)
- [ ] Backup: manual telemetry capture script ready (if JSON export fails)

### Timeline
- [ ] Cycle A dry-run scheduled: [DATE]
- [ ] Full Cycle A blocked on calendar: [DATE RANGE]
- [ ] Post-session analysis deadline: [DATE]

---

## Ready to Deploy

**Status:** ✅ **All materials prepared for Cycle A**

Next steps:
1. Print consent forms, pre-tests, observer forms (1 week before start)
2. Recruit 5 participants, assign pseudonyms
3. Create sealed pseudonym mapping file (offline)
4. Conduct dry-run session with 1 participant
5. Verify telemetry export → JSON → folder structure works
6. If successful, proceed with remaining 4 participants

---

**Checklist version:** 1.0  
**Last updated:** 2026-04-26  
**Related files:** `docs/40-validation/playtest-protocol.md`, `pre-post-test-instrument.md`, `consent-form-phase1.md`, `observer-form.md`
