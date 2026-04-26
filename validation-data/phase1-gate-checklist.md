# Phase 1 Gate Verification Checklist

**Purpose:** Verify that all 4 Phase 1 gates pass before proceeding to Cycle A (informal playtest) and Cycle B (formal structured playtest).

**Completion time:** ~3–4 hours (one full day of testing)  
**Responsibility:** Developer / tester  
**Date completed:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Gate 1: Tech Stack Works (iPad + Desktop)

### 1.1 Build and Deploy

- [ ] Run `npm run build` and confirm no errors
- [ ] Run `npm run preview` and confirm app serves locally on localhost
- [ ] Deploy to staging environment (Cloudflare Pages or test server)
- [ ] Note deployed URL: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### 1.2 iPad Testing

**Device:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ (model, OS version)  
**Browser:** Safari / Chrome (circle one)

- [ ] Open deployed URL on iPad in portrait orientation
- [ ] App loads without console errors (check Developer Tools if Safari)
- [ ] Game is fully playable: tap/drag interactions respond instantly
- [ ] Visual assets render correctly: no blurry or missing images
- [ ] Game can complete a full 15-minute session without crashing
- [ ] Audio plays (if enabled): no silence, no distortion
- [ ] Session can be exported to JSON via "Export Data" button
- [ ] Exported JSON file is valid and contains session telemetry (see `in-app-telemetry.md`)

**Notes:**  
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### 1.3 Desktop Testing

**Device 1:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ (Windows/Mac, OS version)  
**Browser:** Chrome / Edge / Firefox (circle one)

- [ ] Open deployed URL on desktop in a 1024×768 window (landscape)
- [ ] App loads without console errors
- [ ] Game is fully playable: mouse clicks / keyboard work as expected
- [ ] Game completes a full 15-minute session without crashing
- [ ] Video/audio assets render correctly
- [ ] Session can be exported to JSON
- [ ] Exported JSON is valid

**Device 2:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ (Chromebook or secondary machine)  
**Browser:** Chrome / Edge / Firefox (circle one)

- [ ] Same checklist as Device 1 (repeat above 7 items)

**Notes:**  
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### 1.4 Gate 1 Sign-Off

- [ ] All iPad tests pass
- [ ] All desktop tests pass
- [ ] Developer confirms: "Tech stack is production-ready for Cycle A"

**Developer signature:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Gate 2: End-to-End Loop (Pre-Test → Session → Post-Test)

### 2.1 Simulate Cycle A Dry Run

Run a single complete test cycle with a volunteer (friend, family member, or yourself).

**Tester info:**  
- Pseudonym: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- Device: iPad / Desktop (circle one)
- Age (for realism, if child): \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### 2.2 Pre-Test Administration

- [ ] Print consent form (docs/40-validation/consent-form-phase1.pdf)
- [ ] Print pre-test instrument (docs/40-validation/pre-post-test-instrument.pdf)
- [ ] Tester signs consent form (or simulates signing)
- [ ] Administer pre-test (5 min): tester completes all 8 items on paper
- [ ] Tester's pre-test score: \_\_\_\_\_ / 8 points
- [ ] Save pre-test PDF to: `validation-data/cycle-a/<pseudonym>/pre-test.pdf`

### 2.3 Game Session (15 min)

- [ ] Load app on tester's device
- [ ] Display tester's pseudonym in a splash screen or via observer notes
- [ ] Tester plays Level 1 for exactly 15 minutes
  - [ ] Time the session with a stopwatch; note start and end times
  - [ ] Observe and take notes on any glitches, confusing interactions, or moments of joy/frustration
- [ ] At session end, tester clicks "Export Data"
- [ ] Export completes successfully; file size is reasonable (~50–500 KB)
- [ ] Exported JSON can be validated with `validation-data/scripts/check.py` (see Gate 4)
- [ ] Save exported JSON to: `validation-data/cycle-a/<pseudonym>/session-1.json`
- [ ] Save observer notes to: `validation-data/cycle-a/<pseudonym>/session-1-notes.txt`

**Session notes:**  
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### 2.4 Post-Test Administration

- [ ] Administer post-test (5 min): tester completes all 8 items on paper (use fresh copy)
- [ ] Tester's post-test score: \_\_\_\_\_ / 8 points
- [ ] Expected: post-test score ≥ pre-test score (even in dry run, tester should recognize patterns)
- [ ] Save post-test PDF to: `validation-data/cycle-a/<pseudonym>/post-test.pdf`

### 2.5 Gate 2 Sign-Off

- [ ] Full loop completes without blockers
- [ ] Data is captured in all three places: pre-test, session JSON, post-test
- [ ] No data is corrupted or lost
- [ ] Developer confirms: "End-to-end loop is ready for Cycle A"

**Developer signature:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Gate 3: Data Integrity

### 3.1 Validate Session JSON

**File:** `validation-data/cycle-a/<pseudonym>/session-1.json`

Run the validation script:

```bash
python3 validation-data/scripts/check.py validation-data/cycle-a/<pseudonym>/session-1.json
```

- [ ] Script returns "VALID" (no schema errors)
- [ ] JSON contains all required fields (per `in-app-telemetry.md`):
  - [ ] `sessionId` (UUID or string)
  - [ ] `studentPseudonym` (matches tester's pseudonym)
  - [ ] `startTime` (ISO 8601 timestamp)
  - [ ] `endTime` (ISO 8601 timestamp)
  - [ ] `device` (iPad/Chromebook/Desktop)
  - [ ] `level` (should be 1 for Session 1)
  - [ ] `interactions` (array of events)
- [ ] `startTime` and `endTime` are approximately 15 minutes apart
- [ ] `interactions` array is non-empty (≥10 events, typically 50+ for a 15-min session)
- [ ] Each interaction has: `type`, `timestamp`, `question` (if applicable), `correct` (boolean)
- [ ] No fields contain real names, email addresses, or sensitive PII

**Validation output:**  
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### 3.2 Validate Test Files

- [ ] Pre-test PDF is readable and contains no blank fields (aside from score calculation)
- [ ] Post-test PDF is readable
- [ ] Observer notes are legible and timestamped
- [ ] No file is corrupted or unreadable

### 3.3 Check Privacy Compliance

- [ ] Tester's real name does NOT appear anywhere in the exported JSON
- [ ] Pseudonym appears consistently in JSON and observer notes
- [ ] Parent's email is NOT in the JSON
- [ ] No audio/video files are exported (only text logs)

### 3.4 Gate 3 Sign-Off

- [ ] All JSON files validate
- [ ] All PDFs are readable
- [ ] Privacy compliance check passes
- [ ] Developer confirms: "Data integrity verified; ready to scale to Cycle A"

**Developer signature:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Gate 4: C9 Budget (15 min per session)

### 4.1 Measure Session Duration

**Requirement (C9):** Each game session must not exceed 15 minutes.

Run the duration check on the dry-run session JSON:

```bash
python3 -c "
import json
with open('validation-data/cycle-a/<pseudonym>/session-1.json') as f:
    data = json.load(f)
    from datetime import datetime
    start = datetime.fromisoformat(data['startTime'])
    end = datetime.fromisoformat(data['endTime'])
    duration_min = (end - start).total_seconds() / 60
    print(f'Session duration: {duration_min:.1f} minutes')
    assert duration_min <= 15, f'FAIL: Session exceeds 15 min ({duration_min:.1f})'
    print('PASS: Session complies with C9')
"
```

- [ ] Duration is reported
- [ ] Duration is ≤ 15 minutes
- [ ] Script outputs "PASS"

**Duration result:** \_\_\_\_\_ minutes

### 4.2 Measure App Load Time

- [ ] Open app in a fresh browser tab (clear cache if needed)
- [ ] Time from URL load to first interactive element visible
- [ ] Load time: \_\_\_\_\_ seconds
- [ ] Goal: < 3 seconds on a 4G connection
- [ ] If > 5 seconds on desktop, flag for optimization before Cycle A

### 4.3 Measure Bundle Size

Run:

```bash
npm run measure-bundle
```

- [ ] Main bundle size: \_\_\_\_\_ KB
- [ ] Gzip bundle size: \_\_\_\_\_ KB
- [ ] Total assets (including media): \_\_\_\_\_ MB
- [ ] Goal: < 5 MB total (to fit K–2 tablets with limited storage)

**Output:**  
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

### 4.4 Gate 4 Sign-Off

- [ ] Session duration ≤ 15 min
- [ ] App load time ≤ 5 sec (or note constraint)
- [ ] Bundle size < 5 MB
- [ ] Developer confirms: "C9 budget achieved"

**Developer signature:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Final Sign-Off: All Gates Passed

Once all four gates are signed off, you are clear to proceed to Cycle A.

- [ ] Gate 1: Tech Stack Works
- [ ] Gate 2: End-to-End Loop
- [ ] Gate 3: Data Integrity
- [ ] Gate 4: C9 Budget

**Overall sign-off by:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Timestamp:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Notes & Issues Discovered

Use this space to log any blockers, warnings, or design changes discovered during gating:

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

**Document version:** 1.0  
**Last updated:** 2026-04-25  
**Maintained by:** Developer / Researcher
