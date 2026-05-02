# Phase 12.2: Materials Prep Complete

**Status:** ✅ READY FOR CYCLE A DRY-RUN  
**Completed:** 2026-04-26  
**Scope:** Audit, create, and organize all Cycle A validation materials

---

## Summary

All Phase 12.2 materials have been prepared and verified. The project is ready to begin the informal playtest dry-run with 5 participants over 2 weeks (Cycle A).

---

## 1. Materials Audit — All Ready

### Core Documents (All Exist)

| Document | Location | Pages | Status | For Print |
|----------|----------|-------|--------|-----------|
| Consent Form | `docs/40-validation/consent-form-phase1.md` | 1 | ✅ Ready | 5 copies |
| Pre/Post-Test | `docs/40-validation/pre-post-test-instrument.md` | 8 | ✅ Ready | 5 pre + 5 post |
| Observer Form | `validation-data/cycle-a/observer-form.md` | 5 | ✅ Ready | 15 copies |
| Privacy Notice | `docs/40-validation/privacy-notice.md` | 1 | ✅ Ready | File reference |

### Document Details

**Consent Form (Phase 1):**
- Covers: Participant info, purpose, activities, privacy/data, benefits/risks, rights, optional Phase 3 opt-in
- Includes: Pseudonym policy, researcher contact (ryanmidogonzalez@gmail.com), signature block
- Privacy: No collection of real name, address, phone, email
- Compliance: FERPA/COPPA-aligned

**Pre/Post-Test Instrument (8 items):**
- Item 1: Identify half (visual)
- Item 2: Visual partitioning (denominator concept)
- Item 3: Compare halves (same denominator)
- Item 4: Compare different denominators (whole-number bias trap)
- Item 5: Benchmark to half (number line)
- Item 6: Order two fractions (same numerator)
- Item 7: Partition & identify (kinesthetic)
- Item 8: Open-ended reasoning (pizza scenario)
- Scoring: 0–8 points, rubric provided (0–2: none, 3–4: emerging, 5–6: developing, 7–8: proficient)
- CCSS alignment: 1.G.A.3, 2.NF.A.1, 2.NF.A.3
- Misconception coverage: MC-WHB-01 (whole-number bias), MC-WHB-02 (denominator bias)
- Printing: 8.5"×11", portrait, 14pt questions, 18pt answers, full-size bar models

**Observer Form (Session Documentation):**
- Sections: Session info, device type, dates/times, observer credentials
- Instructions: Admin setup, pre-session prep, during-session guidance, post-session debrief
- Notable moments: 5 slots for key observations (timestamp + significance)
- Technical checklist: Lag, crashes, visual/audio glitches, interaction failures
- Debrief questions: Favorite part, confusing elements
- File naming: `session-<number>-<pseudonym>-<date>.json`
- Privacy reminder: No real names, use pseudonyms only

---

## 2. Directory Structure — Created

### Cycle A Layout

```
validation-data/cycle-a/
├── README.md                        # Data organization guide
├── pre-test-checklist.md           # Pre-session protocol
├── observer-form.md                # Session observation template
├── analysis-report.md              # ✨ NEW — placeholder for post-analysis
├── pseudonym-A/                    # ✨ NEW — 5 participant folders
│   └── .gitkeep
├── pseudonym-B/
│   └── .gitkeep
├── pseudonym-C/
│   └── .gitkeep
├── pseudonym-D/
│   └── .gitkeep
└── pseudonym-E/
    └── .gitkeep
```

### Expected Per-Participant Contents

```
validation-data/cycle-a/<pseudonym>/
├── consent-form.pdf                # Scanned signed copy (optional)
├── pre-test.pdf                    # Pre-test results (8 points)
├── session-1-<pseudonym>-<date>.json    # App telemetry export
├── session-1-observer-notes.txt         # Observation notes
├── session-2-<pseudonym>-<date>.json
├── session-2-observer-notes.txt
├── session-3-<pseudonym>-<date>.json
├── session-3-observer-notes.txt
└── post-test.pdf                   # Post-test results (printed after S3)
```

---

## 3. New Artifact: Materials Checklist

**File:** `validation-data/materials-checklist.md`

Comprehensive checklist covering:
- Document status table (consent, pre/post-test, observer form, privacy notice)
- Printing instructions (quantities, paper specs, fonts, image sizing)
- Privacy & pseudonym management (sealed offline mapping protocol)
- Data folder setup (expected contents per participant)
- Validation script status (check.py verified: schema + data integrity validation)
- Timeline (print 1 week before, seal mapping before S1, conduct sessions, post-test after S3)
- Final verification (8 categories, 30+ checklist items)

---

## 4. Validation Script — Verified Ready

**File:** `validation-data/scripts/check.py`

**Function:** Validates telemetry JSON exports after app session

**Features:**
- Schema validation: Checks for required keys (schemaVersion, contentVersion, student, sessions, attempts, hintEvents, skillMastery, misconceptionFlags, progressionStat, deviceMeta)
- Data integrity: Detects corruption, duplicates, missing fields
- Exit codes:
  - 0 = valid
  - 1 = schema validation failed
  - 2 = data integrity issue
  - 3 = file not found

**Usage:**
```bash
python3 validation-data/scripts/check.py <pseudonym>/session-*.json
```

**Status:** ✅ Ready — can validate telemetry after each session

---

## 5. Privacy & FERPA/COPPA Compliance

### Pseudonym Policy

- **Assignment:** Researcher assigns pseudonyms (pseudonym-A through pseudonym-E) during consent
- **Mapping:** Keep sealed, offline pseudonym mapping file in locked cabinet
  - Format: `pseudonym-X = [real name] | parent contact: [phone/email]`
  - **Never commit to git**
  - **Never store digitally** on networked drive
- **Session files:** Use pseudonyms only in filenames and JSON exports
- **Consent form:** Collects parent name, child age, contact info (sealed separately, not with session data)

### Compliance References

- **Consent form:** Addresses FERPA/COPPA concerns (no tracking, no ads, no third-party sharing)
- **Privacy notice:** Full data handling policy (docs/40-validation/privacy-notice.md)
- **Data retention:** Post-Cycle A, delete all unless Phase 3 opt-in received
- **Phase 3 opt-in:** Optional box on consent form; contact info saved only if selected

---

## 6. Timeline

### Phase 12.2 (Now — 2026-04-26)
✅ **Complete:** Audit materials, create structure, document checklists

### 1 Week Before Cycle A
⏳ **Print materials:**
  - Consent forms (5 copies)
  - Pre-tests (5 copies)
  - Observer forms (15 copies, ~3 per participant)
  - Privacy notice (1 copy, for reference)

⏳ **Privacy setup:**
  - Recruit 5 participants
  - Assign pseudonyms (A–E)
  - Create sealed pseudonym mapping (offline, locked cabinet)

### Before Session 1
⏳ **Pre-test administration:**
  - Distribute consent forms to families
  - Collect signed consents
  - Administer pre-tests (1 per student)
  - Record scores in `<pseudonym>/pre-test.pdf`

### Sessions 1–3 (Spread over 2 weeks)
⏳ **Conduct playtest sessions:**
  - Session 1: Week 1
  - Session 2: Week 1–2
  - Session 3: Week 2
  - Per session: Observer present, observations recorded, JSON exported, validation check run

### After Session 3
⏳ **Post-test & analysis:**
  - Administer post-tests (1 per student)
  - Record scores in `<pseudonym>/post-test.pdf`
  - Complete analysis-report.md with findings
  - Archive all data

---

## 7. Printing Checklist

Before Cycle A begins, print:

- [ ] **Consent forms** (5 copies)
  - Export `docs/40-validation/consent-form-phase1.md` as PDF
  - Verify: Researcher contact visible, signature block present

- [ ] **Pre-test instruments** (5 copies)
  - Export `docs/40-validation/pre-post-test-instrument.md` pages 1–8 as PDF
  - Print on heavy 8.5"×11" stock
  - Verify: Bar model images full-size, minimum 2" width per item
  - Verify: 14pt questions, 18pt answer choices readable

- [ ] **Observer forms** (15 copies)
  - Print `validation-data/cycle-a/observer-form.md` (pages 1–5 recommended)
  - Loose (not stapled) for easy filing per session
  - Assign one clipboard per observer

- [ ] **Post-tests** (5 copies)
  - Same as pre-tests
  - Print 1 day before final session

---

## 8. Dry-Run Next Steps

**Before full Cycle A, conduct a single dry-run session:**

1. Print one consent form + one pre-test + one observer form (test batch)
2. Recruit one participant (ask permission for dry-run, then proceed with real Cycle A)
3. Administer pre-test and consent
4. Run 1 session with observer
5. Export JSON telemetry
6. Run `check.py` on export — verify exit code 0 (valid)
7. Verify file named correctly and stored in correct folder
8. If successful: print remaining materials and begin full Cycle A

---

## 9. File Inventory

### Core Validation Docs (Already Existed)
- `docs/40-validation/consent-form-phase1.md` (3.4K) — Consent form
- `docs/40-validation/pre-post-test-instrument.md` (7.0K) — 8-item assessment
- `docs/40-validation/privacy-notice.md` (2.4K) — Privacy policy
- `docs/40-validation/playtest-protocol.md` (13K) — Full playtest protocol
- `docs/40-validation/learning-hypotheses.md` (14K) — Hypotheses & misconceptions
- `docs/40-validation/in-app-telemetry.md` (13K) — Telemetry schema

### Cycle A Docs
- `validation-data/cycle-a/README.md` (1.1K) — Data organization
- `validation-data/cycle-a/observer-form.md` (8.2K) — Session observation template
- `validation-data/cycle-a/pre-test-checklist.md` (12K) — Pre-session protocol
- `validation-data/cycle-a/analysis-report.md` (NEW — placeholder, 0 bytes pending)

### New in Phase 12.2
- **`validation-data/materials-checklist.md`** (7.4K) — Complete printing & privacy checklist

### Directory Structure (New)
- `validation-data/cycle-a/pseudonym-A/` → pseudonym-E/ (5 participant folders with .gitkeep)

### Validation Script (Already Existed)
- `validation-data/scripts/check.py` — JSON schema validator

---

## 10. Summary

| Category | Status | Details |
|----------|--------|---------|
| **Consent Form** | ✅ Ready | `docs/40-validation/consent-form-phase1.md`, 5 copies to print |
| **Pre/Post-Test** | ✅ Ready | `docs/40-validation/pre-post-test-instrument.md`, 8 items, 0–8 scoring |
| **Observer Form** | ✅ Ready | `validation-data/cycle-a/observer-form.md`, 15 copies to print |
| **Privacy Notice** | ✅ Ready | `docs/40-validation/privacy-notice.md`, referenced in consent |
| **Cycle A Folders** | ✅ Created | `pseudonym-A` through `pseudonym-E`, ready to receive data |
| **Analysis Template** | ✅ Created | `cycle-a/analysis-report.md`, placeholder for post-analysis |
| **Validation Script** | ✅ Verified | `check.py` validates JSON exports, exit codes 0–3 |
| **Materials Checklist** | ✅ Created | `validation-data/materials-checklist.md`, 8 sections, 30+ items |
| **Privacy & FERPA** | ✅ Planned | Sealed offline pseudonym mapping, no real names in digital files |
| **Timeline** | ✅ Drafted | Print 1 week before, conduct Sessions 1–3, post-test after |

---

## Next Actions (For Researcher)

1. **Review** `validation-data/materials-checklist.md` for full printing & prep workflow
2. **Set calendar:** 1 week before Cycle A, block time for printing materials
3. **Create sealed file:** Plan to make offline pseudonym mapping before Session 1 begins
4. **Dry-run:** Print test batch, recruit 1 participant, conduct 1 full session, validate telemetry
5. **On success:** Print remaining materials, recruit remaining 4 participants, begin Cycle A

---

**Phase 12.2 Status:** ✅ **COMPLETE**

All materials prepared, organized, and ready for informal playtest dry-run.

---

Generated: 2026-04-26  
Related: `docs/40-validation/playtest-protocol.md`, `PLANS/curriculum-completion-phase-3.plan.md`
