# Playtest Readiness Master Checklist

**Gate check before Cycle A, checkpoint during Cycle A/B, wrap-up after Cycle B.**

---

## Pre-Cycle A Readiness (Before First Informal Test)

### Documentation & Forms
- [ ] Consent form printed and ready (`docs/40-validation/consent-form-phase1.md` — render to PDF before printing)
- [ ] Pre-test instrument printed in large, clear format (`docs/40-validation/pre-post-test-instrument.md` — render to PDF before printing)
- [ ] Observer form printed (`validation-data/cycle-a/observer-form.md`)
- [ ] Pre-test checklist ready (`validation-data/cycle-a/pre-test-checklist.md`)
- [ ] Phase 1 gate checklist printed and ready (`validation-data/phase1-gate-checklist.md`)

### Technology & Devices
- [ ] All 4 Phase 1 gates have been signed off (tech stack, end-to-end loop, data integrity, C9 budget)
  - See: `validation-data/phase1-gate-checklist.md` (all sections completed)
- [ ] iPad tested: app loads, plays, exports data, no crashes (15+ min trial)
- [ ] Desktop/Chromebook tested: same as iPad (15+ min trial)
- [ ] Both devices fully charged or plugged in
- [ ] WiFi tested at intended venue, or each device pre-cached: load the app URL once on each device while connected to WiFi (the service worker pre-caches assets); subsequent loads work without a network
- [ ] App deployed to staging or production URL (parent-accessible)
- [ ] App URL bookmarked on both devices

### Data Organization
- [ ] Folder structure created: `validation-data/cycle-a/`
- [ ] README created explaining file organization and privacy

### Testers & Scheduling
- [ ] First Cycle A tester identified (friend, family, or volunteer)
- [ ] Tester's pseudonym assigned (e.g., "Alex")
- [ ] Session date/time confirmed with tester
- [ ] Venue confirmed (home, library, classroom)

### Materials on Hand
- [ ] Printed consent form (at least 1 copy)
- [ ] Printed pre-test (at least 1 copy)
- [ ] Printed observer form (at least 1 copy)
- [ ] Pens/pencils for marking test
- [ ] Timer or stopwatch (phone works)
- [ ] Water and tissues (for child comfort)

### Researcher Readiness
- [ ] You've read and understood the protocol: `cycle-a/pre-test-checklist.md`
- [ ] You've done a dry run yourself (or mentally walkthrough) the full 30-minute session
- [ ] You know where to find the validation script: `validation-data/scripts/check.py`
- [ ] You have a plan for storing data (local folder, encrypted drive, or backup)

---

## Cycle A In-Progress Checkpoints (During Informal Testing)

### After Each Session (Same Day)
- [ ] Files organized in: `validation-data/cycle-a/<pseudonym>/`
  - [ ] Pre-test PDF (filled) ✓
  - [ ] Session JSON (exported) ✓
  - [ ] Observer notes (filled) ✓
- [ ] Observer notes are legible
- [ ] JSON file passes validation:
  ```bash
  python3 validation-data/scripts/check.py validation-data/cycle-a/<pseudonym>/session-*.json
  ```
  - [ ] Output: "VALID" ✓
- [ ] No real names appear in JSON or notes ✓
- [ ] Tester's consent form filed in folder ✓

### After Cycle A Dry Run (Usually 1 Session)
- [ ] Full end-to-end loop completed without blockers
- [ ] Device tested on both iPad and Desktop ✓
- [ ] Pre-test and post-test both administered ✓
- [ ] Session data exported and validated ✓
- [ ] No data was lost or corrupted ✓
- [ ] Time budget (15 min session) was met ✓
- [ ] Ready to proceed to Cycle B? YES / NO

---

## Pre-Cycle B Readiness (Before Formal Structured Testing)

### Documentation
- [ ] Cycle B protocol finalized (`validation-data/cycle-b/protocol.md`)
- [ ] Recruitment email drafted (`validation-data/recruitment-email-template.txt`)
- [ ] Recruitment templates ready (`validation-data/recruitment-template.md`)
- [ ] Schedule template created (`validation-data/cycle-b/schedule.csv`)
- [ ] All forms and instruments finalized:
  - [ ] Consent form (`docs/40-validation/consent-form-phase1.md` — render to PDF before printing)
  - [ ] Pre-test instrument (`docs/40-validation/pre-post-test-instrument.md` — render to PDF before printing)
  - [ ] Observer form (cycle-a version can be reused)
  - [ ] Cycle B protocol overview (1-pager for parent FAQ)

### Technology & Deployment
- [ ] App is production-ready (all Phase 1 gates passed)
- [ ] App URL is finalized (not changing during Cycle B)
- [ ] App has no known critical bugs
- [ ] At least 2 devices available (iPad + Desktop or iPad + Chromebook)
- [ ] JSON export mechanism tested and reliable
- [ ] Backup plan if a device fails (use alternate device or reschedule)

### Recruitment Infrastructure
- [ ] Target recruitment list created (8–10 families identified or email list prepared)
- [ ] Pseudonym list generated (10+ neutral names ready)
- [ ] Sealed mapping system prepared (encrypted spreadsheet or sealed envelope)
  - [ ] File: `validation-data/SEALED-pseudonym-mapping.xlsx` or printout
- [ ] Email templates saved and review (all 6 recruitment emails)
- [ ] Schedule template ready for data entry

### Data Organization
- [ ] Folder structure created: `validation-data/cycle-b/`
- [ ] Subfolder for each participant (pseudonym) to be created as they enroll
- [ ] README written (`validation-data/cycle-b/README.md`)
- [ ] Analysis skeleton notebook prepared (`validation-data/cycle-b/analysis.ipynb`)
- [ ] Validation script in place and tested: `validation-data/scripts/check.py`

### Backup & Privacy Plan
- [ ] Backup plan for data loss (external drive, cloud backup, or duplicate on USB)
- [ ] Privacy checklist understood (no real names in JSON, pseudonyms only)
- [ ] Data deletion timeline understood (6 months post-study, or per parent request)
- [ ] FERPA/COPPA compliance reviewed (if working with school data; apply common sense)

### Researcher Readiness
- [ ] You've read the full protocol: `validation-data/cycle-b/protocol.md`
- [ ] You understand the 3-session schedule (spacing: Days 1, 4–5, 10–14)
- [ ] You have a calendar or scheduling system ready (Google Calendar, spreadsheet, etc.)
- [ ] You've prepared thank-you gifts (~$65–91 budget for 8–10 kids):
  - [ ] Sticker packs purchased (8–10)
  - [ ] Bookstore gift cards purchased (8–10)
  - [ ] Thank-you cards purchased/printed (8–10)
- [ ] You have a plan for recruiting and sending the first recruitment email by: [TARGET DATE]

---

## Cycle B In-Progress Checkpoints (During Formal Testing)

### After Recruitment Closes
- [ ] 8–10 families enrolled (target met or alternative plan if below target)
- [ ] All consent forms received and signed
- [ ] Pseudonym assignments recorded in sealed file
- [ ] Schedule spreadsheet filled with all dates
- [ ] Recruitment reminder emails sent (see: `recruitment-template.md` § Email 3)

### After Each Pre-Test
- [ ] Pre-test PDF filed in: `validation-data/cycle-b/<pseudonym>/pre-test.pdf`
- [ ] Score recorded in schedule spreadsheet
- [ ] Session 1 reminder email sent to parent

### After Each Session (All 3 Sessions per Child)
- [ ] Session JSON exported and filed: `validation-data/cycle-b/<pseudonym>/session-<N>-*.json`
- [ ] Observer notes filled and filed: `validation-data/cycle-b/<pseudonym>/session-<N>-observer-notes.txt`
- [ ] JSON passes validation script (output: "VALID")
- [ ] Thank-you gift #1 given after Session 1 (sticker pack)
- [ ] Session log updated: `validation-data/cycle-b/session-log.txt`
- [ ] Incentive tracking log updated: `validation-data/cycle-b/incentive-tracking.csv`

### After Each Post-Test
- [ ] Post-test PDF filed: `validation-data/cycle-b/<pseudonym>/post-test.pdf`
- [ ] Score recorded in schedule spreadsheet
- [ ] Gain (post − pre) calculated and recorded
- [ ] Thank-you gift #2 given (bookstore card)
- [ ] Thank-you card mailed (record date in incentive tracking log)

### Cycle B Completion Checkpoint
- [ ] All 8–10 participants completed all 3 sessions and both tests
- [ ] All files organized in `validation-data/cycle-b/<pseudonym>/` folders
- [ ] All JSON files validated (no errors)
- [ ] Pre/post scores recorded in `validation-data/cycle-b/results.csv`
- [ ] Session metadata recorded in `validation-data/cycle-b/sessions.csv`
- [ ] No data was lost or corrupted
- [ ] Privacy checklist passed (no real names in JSON/notes)
- [ ] All families thanked and informed of next steps

---

## Post-Cycle B (Analysis & Wrap-Up)

### Data Consolidation
- [ ] All session JSONs copied to: `validation-data/cycle-b/json-exports/`
- [ ] Aggregate results file created: `validation-data/cycle-b/results.csv`
- [ ] Aggregate sessions file created: `validation-data/cycle-b/sessions.csv`
- [ ] All files spot-checked (no obvious errors or data corruption)

### Analysis (Phase 4)
- [ ] Analysis notebook executed: `validation-data/cycle-b/analysis.ipynb`
- [ ] Pre/post statistics computed (mean, SD, range)
- [ ] Learning gain analyzed (mean, SD, % meeting success threshold)
- [ ] Statistical tests completed (paired t-test, Wilcoxon, effect size)
- [ ] Visualizations created (pre vs post, gain distribution, grade/device breakdowns)
- [ ] Primary hypothesis tested: "Mean gain ≥ 3 points"
- [ ] Result recorded: SUPPORTED / UNSUPPORTED / INCONCLUSIVE

### Report Writing
- [ ] Summary report drafted: `validation-data/cycle-b/report.md`
- [ ] Included: cohort overview, results, hypothesis conclusion, recommendations
- [ ] Visualizations embedded in report (PNG files)

### Compliance & Data Retention
- [ ] Deletion log started: which families requested immediate deletion?
- [ ] Data retention policy communicated to families (6 months default)
- [ ] Sealed pseudonym mapping file stored securely (separate from data)
- [ ] Backup of aggregate results created (before deletion timeline starts)
- [ ] Deletion scheduled: [DATE = 6 months post-last-session]

### Closeout Communication
- [ ] Thank-you email sent to all families (see: `recruitment-template.md` § Email 6)
- [ ] Results summary shared with families (what you learned)
- [ ] Opt-in families informed of Phase 3 plans (if applicable)
- [ ] Researcher contact info updated for Phase 3 outreach

---

## Overall Success Criteria

### Cycle A Success
- [ ] All Phase 1 gates passed
- [ ] Dry-run session completed without blockers
- [ ] Data pipeline works end-to-end (pre-test → session → post-test)
- [ ] JSON validation script confirms data integrity
- [ ] No data was lost, corrupted, or exposed

### Cycle B Success
- [ ] 8–10 families recruited and consented
- [ ] All families completed all 3 sessions (no involuntary withdrawals)
- [ ] Mean learning gain ≥ 3 points (hypothesis supported)
- [ ] All data securely stored and privacy maintained
- [ ] Analysis completed and findings reported

### Readiness to Proceed to Phase 3
- [ ] Cycle B hypothesis test result: SUPPORTED
- [ ] App bugs fixed (if any identified during Cycle B)
- [ ] Recruitment process refined (lessons learned documented)
- [ ] Phase 3 protocol drafted (larger cohort, 12+ weeks, potential IRB review)

---

## Sign-Off

### Cycle A Gate Checklist Complete
**Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Researcher:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Signature:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### Cycle A Dry Run Complete
**Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Researcher:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Signature:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### Cycle B Recruitment Open
**Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Recruitment start:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Target close:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Researcher:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Signature:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### Cycle B Testing Complete
**Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Participants completed:** \_\_\_\_ / 8–10  
**Researcher:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Signature:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### Analysis Complete
**Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Primary hypothesis result:** ☐ SUPPORTED ☐ UNSUPPORTED ☐ INCONCLUSIVE  
**Mean learning gain:** \_\_\_\_\_ points (target: ≥ 3)  
**Analyst:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Signature:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Notes & Issues Log

Use this space to track any deviations from the plan:

**Issue 1:**  
Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Description: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Resolution: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  

**Issue 2:**  
Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Description: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Resolution: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  

---

**Document version:** 1.0  
**Last updated:** 2026-04-25  
**Print this page and keep it accessible during Cycle A & B**
