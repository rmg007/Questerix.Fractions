# Questerix Fractions Playtest Infrastructure — Complete Index

**All deliverables for Phase 1 → Cycle B playtest ready to execute.**

---

## Deliverable Summary (10 Items)

### 1. Phase 1 Gate Verification Checklist
**File:** `phase1-gate-checklist.md`  
**Purpose:** Verify all 4 Phase 1 gates before proceeding to Cycle A  
**Gates:**
- Gate 1: Tech Stack Works (iPad + Desktop)
- Gate 2: End-to-End Loop (Pre → Session → Post)
- Gate 3: Data Integrity (JSON validation)
- Gate 4: C9 Budget (≤15 min per session)

**Use when:** Before first playtest session  
**Status:** Ready to print and use

---

### 2. Cycle A Observer Protocol (Form)
**File:** `cycle-a/observer-form.md`  
**Purpose:** Template for documenting observations during Cycle A (informal) test sessions  
**Includes:**
- Session metadata (pseudonym, device, timing)
- Notable moments with timestamps
- Technical glitch logging
- Child debrief questions (2 questions)
- Data export & file naming instructions
- Privacy checklist

**Use when:** During each Cycle A session (print 1 copy per session)  
**Status:** Ready to print and distribute

---

### 3. Cycle A Pre-Test Checklist
**File:** `cycle-a/pre-test-checklist.md`  
**Purpose:** Step-by-step guide for what to do one day before, morning of, and after first Cycle A test  
**Includes:**
- Setup checklist (1 day before)
- Device checks (morning)
- Pre-test procedure (~5 min)
- Game session procedure (~15 min)
- Data export & debrief (~3 min)
- Post-session file organization
- Troubleshooting guide

**Use when:** Before first Cycle A session (print and keep handy)  
**Status:** Ready to use

---

### 4. Cycle B Formal Playtest Protocol
**File:** `cycle-b/protocol.md`  
**Purpose:** Complete formal protocol for structured Cycle B testing (8–10 students, 3 sessions each, 2 weeks)  
**Includes:**
- Recruitment strategy (personal network, 8–10 target)
- Informed consent process (detailed)
- Pseudonym assignment system (sealed mapping)
- Pre-test administration (identical to pre-test instrument)
- Session protocol (3 sessions with spacing: Days 1, 4–5, 10–14)
- Post-test administration (within 3 days of Session 3)
- Data organization structure
- Privacy protections & FERPA compliance notes
- QA checklist (per-participant)
- Analysis preparation (Phase 4)
- Participant compensation & incentive tracking
- Troubleshooting & escalation
- Protocol compliance checklist

**Use when:** Before Cycle B recruitment opens  
**Status:** Ready for IRB review (if needed) or direct use

---

### 5. Recruitment & Scheduling Templates
**File:** `recruitment-template.md`  
**Purpose:** Pseudonym system, scheduling spreadsheet, and reminder email templates  
**Includes:**
- Pseudonym assignment system (step-by-step)
- Sealed mapping file setup (encrypted or printed)
- Scheduling template (CSV format, Google Sheets alternative)
- 6 recruitment email templates:
  1. Initial recruitment pitch
  2. Consent form delivery
  3. 1-week reminder
  4. Post-session debrief
  5. Final session confirmation
  6. Study complete wrap-up
- Incentive tracking (sticker packs, gift cards, thank-you notes)
- Budget estimate ($65–91 for 8–10 kids)
- Recruitment checklist

**Use when:** During Cycle B recruitment phase  
**Status:** Ready to copy-paste and personalize

---

### 6. Recruitment Email Template (Plain Text)
**File:** `recruitment-email-template.txt`  
**Purpose:** One main recruitment email, copy-paste ready, no personalization needed  
**Includes:**
- What child will do (3 sessions, 2 tests)
- What's required from parent (time, scheduling)
- What data is collected (and NOT collected)
- Who can participate (K–2, ages 5–7)
- When & where (flexible, parent's choice)
- Next steps (reply to email)
- FAQ-style answers to common questions
- Tips for sending (personalization, follow-up, spreadsheet tracking)

**Use when:** Ready to send to prospective families  
**Status:** Ready to send (customize with your dates/contact info)

---

### 7. Cycle A Data Folder README
**File:** `cycle-a/README.md`  
**Purpose:** Quick reference for Cycle A file organization  
**Includes:**
- Folder structure per participant
- File naming convention
- Privacy reminders
- Validation command

**Use when:** Setting up folder structure for Cycle A participants  
**Status:** Ready to use

---

### 8. Cycle B Data Folder README
**File:** `cycle-b/README.md`  
**Purpose:** Comprehensive guide to Cycle B data organization, privacy, and analysis prep  
**Includes:**
- Complete folder structure for all 8–10 participants
- File naming convention (detailed)
- What goes in each file type (consent, pre-test, JSON, observer notes, post-test)
- Privacy & confidentiality protocols (sealed mapping, retention timeline)
- Quality assurance checklist (per participant)
- Analysis workflow (Steps 1–5 for Phase 4)
- Tools & scripts (validation script, analysis notebook, spreadsheets)
- Common issues & resolutions
- Document maintenance info

**Use when:** Before and during Cycle B testing  
**Status:** Ready to refer to throughout Cycle B

---

### 9. Analysis Skeleton Notebook (Jupyter)
**File:** `cycle-b/analysis.ipynb`  
**Purpose:** Pre-built notebook structure for Phase 4 analysis (no analysis yet, just scaffolding)  
**Includes (10 parts):**
1. Setup & data import (load results & sessions CSVs)
2. Descriptive statistics (pre/post means, SD, ranges)
3. Statistical tests (paired t-test, Wilcoxon, Cohen's d)
4. Hypothesis test (primary hypothesis: gain ≥ 3 points)
5. Visualizations (pre vs post distributions, gain histogram, trajectories)
6. Breakdown by grade (K, 1, 2 performance comparison)
7. Breakdown by device (iPad vs Chromebook vs Desktop)
8. Session-to-session progression (optional, placeholder)
9. Misconception analysis (optional, placeholder)
10. Summary report generator & export

**Use when:** After Cycle B data collection is complete (Phase 4)  
**Status:** Skeleton ready; fill in data and execute cells

---

### 10. Master Readiness Checklist
**File:** `READINESS-CHECKLIST.md`  
**Purpose:** Master gate check before/during/after Cycle A & B  
**Includes:**
- Pre-Cycle A readiness (docs, tech, data, testers)
- Cycle A in-progress checkpoints (after each session, after dry run)
- Pre-Cycle B readiness (docs, tech, recruitment, data, privacy, researcher prep)
- Cycle B in-progress checkpoints (recruitment, pre-test, sessions, post-test, completion)
- Post-Cycle B wrap-up (consolidation, analysis, report, compliance, closeout)
- Overall success criteria (Cycle A, Cycle B, Phase 3 readiness)
- Sign-off sections for each major phase (print & have researcher sign)
- Issues log for tracking deviations

**Use when:** Throughout the entire Cycle A & B timeline (print and keep handy)  
**Status:** Ready to use as master checklist

---

## Related Existing Documents

These files already exist and are referenced throughout the playtest infrastructure:

- **`docs/40-validation/consent-form-phase1.md`** — Parental consent form (printable)
- **`docs/40-validation/pre-post-test-instrument.md`** — 8-item assessment (printable, with large images)
- **`docs/40-validation/playtest-protocol.md`** — Original protocol framework (referenced in Cycle B)
- **`docs/40-validation/in-app-telemetry.md`** — JSON schema & data structure
- **`docs/40-validation/learning-hypotheses.md`** — Learning hypotheses & misconception list
- **`docs/40-validation/privacy-notice.md`** — Privacy & data retention policy
- **`validation-data/scripts/check.py`** — JSON validation script (execute to validate exports)

---

## Quick Start: First Playtest (Cycle A)

**Timeline: ~3–4 hours on test day**

1. **1 day before:**
   - Read: `cycle-a/pre-test-checklist.md` (Setup section)
   - Print: consent form, pre-test, observer form
   - Charge devices, test WiFi, verify app loads

2. **Morning of test:**
   - Read: `cycle-a/pre-test-checklist.md` (Morning section)
   - Do device & material checks
   - Set up venue

3. **During test:**
   - Follow: `cycle-a/pre-test-checklist.md` (During section)
   - Administer pre-test (~5 min)
   - Run game session (~15 min)
   - Export data, administer post-test (~5 min)
   - Record observations on observer form

4. **After test:**
   - Follow: `cycle-a/pre-test-checklist.md` (After section)
   - Move files to `cycle-a/<pseudonym>/` folder
   - Validate JSON: `python3 scripts/check.py cycle-a/<pseudonym>/session-*.json`
   - Update tracking log

---

## Quick Start: Cycle B Recruitment

**Timeline: ~2 weeks recruitment, ~4 weeks testing, ~1 week analysis**

1. **Before recruitment:**
   - Read: `cycle-b/protocol.md` (§2 Recruitment & Consent)
   - Prepare: recruitment email, schedule template, pseudonym list, sealed mapping file
   - Confirm: app is production-ready, devices are on hand

2. **Recruitment (Week 1):**
   - Send: recruitment email to target families (use: `recruitment-email-template.txt`)
   - Track: responses in a spreadsheet
   - Collect: signed consent forms from families
   - Assign: pseudonyms (store in sealed file)
   - Schedule: all 3 sessions for each family using template in `recruitment-template.md`

3. **Testing (Weeks 2–5):**
   - Week 1: Pre-test + Session 1
   - Week 2: Session 2 (Days 4–5)
   - Week 3: Session 3 (Days 10–14)
   - Week 4: Post-test + wrap-up
   - After each session: validate JSON, file data, send reminder email

4. **Analysis (Week 6):**
   - Aggregate data: `results.csv` and `sessions.csv`
   - Run: Jupyter notebook `cycle-b/analysis.ipynb`
   - Visualize: generate graphs and summary statistics
   - Report: write findings in `report.md`

---

## File Locations (Summary)

```
validation-data/
├── INDEX.md                              ← YOU ARE HERE
├── READINESS-CHECKLIST.md                ← Master checklist (print & keep handy)
├── phase1-gate-checklist.md              ← Pre-Cycle A gates
├── recruitment-template.md               ← Pseudonym + scheduling + emails
├── recruitment-email-template.txt        ← Copy-paste recruitment email
├── cycle-a/
│   ├── README.md                         ← Quick reference
│   ├── pre-test-checklist.md             ← Step-by-step guide for day of test
│   ├── observer-form.md                  ← Template for session observations
│   └── <pseudonym>/                      ← Participant folders (created during testing)
│       ├── consent-form.pdf
│       ├── pre-test.pdf
│       ├── session-1-*.json
│       ├── session-1-observer-notes.txt
│       └── post-test.pdf
├── cycle-b/
│   ├── README.md                         ← Comprehensive data guide
│   ├── protocol.md                       ← Full formal protocol
│   ├── analysis.ipynb                    ← Skeleton for Phase 4 analysis
│   ├── schedule.csv                      ← Master participant schedule
│   ├── session-log.txt                   ← Running log of all sessions
│   ├── incentive-tracking.csv            ← Thank-you gift tracking
│   ├── results.csv                       ← Aggregate pre/post scores
│   ├── sessions.csv                      ← Aggregate session metadata
│   ├── json-exports/                     ← All session JSONs (for batch analysis)
│   └── <pseudonym>/                      ← Participant folders (created during testing)
│       ├── consent-form.pdf
│       ├── pre-test.pdf
│       ├── session-*.json
│       ├── session-*-observer-notes.txt
│       └── post-test.pdf
└── scripts/
    └── check.py                          ← JSON validation script (existing)
```

---

## Success Criteria

### Cycle A Success
- ✓ All Phase 1 gates passed
- ✓ Dry-run session completed without blockers
- ✓ Data pipeline works end-to-end
- ✓ JSON validation passes
- ✓ No data lost or corrupted

### Cycle B Success
- ✓ 8–10 families recruited & consented
- ✓ All 3 sessions completed (no involuntary withdrawals)
- ✓ Mean learning gain ≥ 3 points (hypothesis supported)
- ✓ All data securely stored & privacy maintained
- ✓ Analysis completed & findings reported

---

## Support & Questions

**For protocol questions:** See the full protocol in the specific cycle document (e.g., `cycle-b/protocol.md`)  
**For file organization:** See the README in each cycle folder  
**For data validation:** Run: `python3 validation-data/scripts/check.py <file.json>`  
**For analysis help:** See the notebook skeleton in `cycle-b/analysis.ipynb`  

---

**Document version:** 1.0  
**Last updated:** 2026-04-25  
**Maintained by:** Ryan Gonzalez (ryanmidogonzalez@gmail.com)

**Next step:** Print `READINESS-CHECKLIST.md` and get Phase 1 gates signed off before Cycle A.
