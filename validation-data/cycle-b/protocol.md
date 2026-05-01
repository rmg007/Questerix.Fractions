# Cycle B Formal Playtest Protocol

**Formal structured playtest with 8–10 students over 3 sessions spanning 2 weeks.**

---

## 1. Overview

### Purpose
Cycle B is a **structured validation study** to determine whether Questerix Fractions teaches fraction concepts (halves, thirds, fourths) to K–2 students. This is **not** a peer-reviewed research study (no IRB approval needed for informal pilot), but it follows a formal schedule and measurement protocol to generate defensible evidence.

### Scope
- **Cohort:** 8–10 students (target roughly 3 per grade: K, 1, 2)
- **Duration:** 3 game sessions per student, spread over 2 weeks
- **Measurement:** Pre-test (5 min) → 3 sessions (15 min each) → Post-test (5 min)
- **Data collection:** In-app telemetry (JSON), pre/post-test scores, observer notes
- **Success metric:** Average post-test score ≥ pre-test + 3 points (out of 8)

### Timeline
- **Week 1:** Session 1 recruitment + consent + pre-test administration
- **Week 2:** Sessions 2–3 administration
- **Post-week:** Post-test administration within 3 days of Session 3

---

## 2. Recruitment & Consent

### 2.1 Recruitment Strategy

**Target population:**  
- Grade K–2 students (ages 5–7)
- Mixed ability: include students with prior fraction knowledge and students with none
- Recruitment method: personal network (family, friends-of-friends, neighborhood, school partnerships)

**Recruitment pitch:**  
Use the template email in `recruitment-email-template.txt`. Key points:
- "Help us validate a new math game"
- "3 short sessions over 2 weeks, ~15 min each"
- "Free access + thank-you gift"
- "Takes 30 min total (including tests)"

**Recruitment timeline:**
- Opens: [DATE] (e.g., 1 May 2026)
- Closes: [DATE] (e.g., 21 May 2026) — target 8–10 responses
- Sessions start: [DATE] (e.g., 1 June 2026)

### 2.2 Informed Consent

**Consent form:** `docs/40-validation/consent-form-phase1.md` (or Cycle B variant if updated)

**Consent process:**
1. Parent receives email with recruitment message and consent form link
2. Parent reviews form and asks questions (async or via email)
3. Parent prints and signs form (or uses digital signature tool like DocuSign)
4. Parent returns signed form to researcher before Session 1
5. Researcher confirms receipt and provides schedule confirmation

**Consent must include:**
- Purpose: "validate a new math game"
- What child will do: "3 game sessions (~15 min each) + 2 paper tests (~5 min each)"
- What data is collected: in-app logs (no audio/video), pre/post-tests, observer notes
- Privacy protections: pseudonyms, no PII in JSON, data deleted after analysis if requested
- Right to withdraw at any time
- Contact info for questions

**Data retention policy:**
- Default: data deleted 6 months after post-test
- Optional: parent may request data kept longer or deleted immediately
- Researcher files consent in: `validation-data/cycle-b/<pseudonym>/consent-form.pdf`

### 2.3 Pseudonym Assignment & Tracking

**Pseudonym system:**  
- Each student is assigned a display name (pseudonym) at recruitment
- Pseudonym appears in all JSON exports and observer notes
- Real names are kept in a sealed envelope or encrypted spreadsheet, separate from all data

**Pseudonym assignment sheet:**

| Pseudonym | Real Name | Age | Grade | School/Context | Parent Email | Phone | Notes |
|-----------|-----------|-----|-------|-----------------|--------------|-------|-------|
| Alex-K1  | [SEALED] | 5   | K     | Home            | parent@example.com | [SEALED] | Lefthanded |
| Sam-K2  | [SEALED] | 6   | K     | Library         | parent@example.com | [SEALED] | Prior fraction knowledge |
| Casey-1  | [SEALED] | 7   | 1     | School          | parent@example.com | [SEALED] | Enjoys games |

**Storage:** Keep this spreadsheet encrypted or printed and stored in a locked file cabinet, separate from all data folders.

---

## 3. Pre-Test Administration (Before Session 1)

### 3.1 Timing & Setting

- **When:** Same day as Session 1 or up to 3 days before
- **Duration:** ~5 minutes per student
- **Setting:** 1-on-1 with student (not whole-class)
- **Location:** Quiet, private space (home, library, classroom corner)

### 3.2 Procedure

**Materials:**
- Printed pre-test instrument: `docs/40-validation/pre-post-test-instrument.md` (render to PDF before printing)
- Pencil or pen
- Optional: bar-model flashcards for visual reference

**Administration:**
1. Seat student comfortably
2. Say: "I'm going to ask you some questions about shapes. There's no right or wrong answer—just do your best."
3. Read each item aloud, show the visual (if applicable)
4. Allow student ~30 seconds to respond; if hesitation > 30 sec, say: "Take a guess or we'll move on"
5. Record response (correct / incorrect / no response)
6. After Item 8, thank student: "Great effort! Now let's try the game."

**Scoring:**
- Items 1, 2, 5, 6, 8: binary (correct = 1 point, incorrect = 0 points)
- Item 3 (draw 2 equal parts): correct if parts are visibly equal (±10% area)
- Item 4 (draw 4 equal parts): correct if parts are visibly equal (±10% area)
- Item 7 (place on number line or Grade K substitute): correct if within ±10% of true 0.5 mark
- **Total: 8 points possible**

**Record pre-test results:**
- Student pseudonym: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- Pre-test date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- Pre-test score: \_\_\_\_ / 8
- Observer (researcher): \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- Signed consent obtained: ☐ Yes ☐ No

**File storage:** `validation-data/cycle-b/<pseudonym>/pre-test.pdf`

---

## 4. Session Protocol (3 Sessions per Student)

### 4.1 Session Schedule

**Spacing:** Sessions are spread over 2 weeks to avoid fatigue and allow for learning between plays.

| Session | Recommended Timing | Days Since Previous Session |
|---------|-------------------|------------------------------|
| 1       | Day 1 (immediately after pre-test) | — |
| 2       | Day 4–5 | 3–4 days |
| 3       | Day 10–14 | 5–9 days |
| Post-test | Within 3 days of Session 3 | — |

**Constraint:** No more than 1 session per child per day (to avoid fatigue and learning decay).

### 4.2 Session Setup & Procedure

**Setup (~3 minutes):**
1. Load the app on the assigned device (iPad or Chromebook/Desktop)
2. App is pre-set to the correct level:
   - Session 1: Level 1
   - Session 2: Level 2 (or Level 1 repeated if child found it challenging)
   - Session 3: Level 3 (or next appropriate level based on Session 2 performance)
3. Device has:
   - Full battery or plugged in
   - WiFi connected (or the app URL was already loaded once on this device while online so the service worker has cached assets)
   - Notifications muted
   - Other apps closed

**Baseline (~2 minutes):**
1. Seat child comfortably
2. Show the device screen
3. Say: "This is a game about fractions. You'll see shapes and numbers. Tap and drag to play. I'll be here watching, but I won't give hints—just have fun!"
4. Ask: "Do you have any questions before we start?"
5. If child is anxious: "This is just for fun. If you want to stop, that's totally okay."

**Play Session (~15 minutes):**
1. Start timer
2. Child plays independently while you observe silently
   - Do NOT give hints, explanations, or guidance
   - Do NOT touch the device or point at the screen
   - Watch for: moments of clarity, confusion, frustration, engagement
   - Take brief timestamped notes on observable moments
3. At 14 minutes: give gentle reminder "Just 1 more minute!"
4. At 15 minutes (or when child finishes): stop play
5. Record actual duration (should be ~15 min, ±2 min is acceptable)

**Data Export (~2 minutes):**
1. Tap Settings (gear icon) → "Export My Backup" (assist the child if needed)
2. App generates a JSON file with session telemetry
3. Save file with naming: `session-<number>-<pseudonym>-<date>.json`
   - Example: `session-1-alex-2026-06-01.json`
4. Confirm file size is reasonable (50–500 KB)
5. Store file in: `validation-data/cycle-b/<pseudonym>/`

**Debrief (~2 minutes):**
1. Ask: "What was your favorite part?"
2. Ask: "Was anything confusing?"
3. Record responses
4. Thank child and parent

**Record session metadata:**

| Field | Value |
|-------|-------|
| Pseudonym | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |
| Session Number | 1 / 2 / 3 |
| Date | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |
| Time Start | \_\_\_\_:\_\_\_\_ AM/PM |
| Time End | \_\_\_\_:\_\_\_\_ AM/PM |
| Duration | \_\_\_\_\_ minutes |
| Device | iPad / Chromebook / Desktop |
| Level | \_\_\_\_ |
| Technical Issues | ☐ None ☐ Yes (describe) |
| Child Withdrawal | ☐ No ☐ Yes (at time: \_\_\_\_:\_\_\_\_) |

**File storage:** `validation-data/cycle-b/<pseudonym>/session-<number>-<pseudonym>-<date>.json`

### 4.3 What to Do If Issues Arise

| Issue | Action |
|-------|--------|
| **App crashes** | Restart device, reload app, resume play. Note in observer log: "Crash at [time]; restarted." |
| **Child loses interest** | Honor their request to stop. Note "withdrew at [time]" but still export available data. |
| **WiFi drops** | If the device loaded the app while online earlier, the service worker should keep it running; reload the page to confirm. If it was never loaded online on this device, switch to a backup device. Note downtime in observer log. |
| **Child asks for hints** | Redirect: "What do you think?" or "Try tapping/dragging." |
| **Child asks to use bathroom** | Pause the game, restart timer when they return. Note break time. |
| **Parent interrupts** | Gently ask parent to step back. Continue session. |
| **Export fails** | Try again. If still fails, note "export failed; data may be in app logs." Contact researcher. |

---

## 5. Post-Test Administration (After Session 3)

### 5.1 Timing & Procedure

- **When:** Within 3 days of Session 3 (ideally same day or next day)
- **Duration:** ~5 minutes
- **Procedure:** Identical to pre-test (see §3.2)
- **Scoring:** Same rubric as pre-test

**Record post-test results:**
- Student pseudonym: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- Post-test date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- Post-test score: \_\_\_\_ / 8
- Days between pre-test and post-test: \_\_\_\_ days
- Observer (researcher): \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**File storage:** `validation-data/cycle-b/<pseudonym>/post-test.pdf`

### 5.2 Expected Outcomes

- **Null hypothesis:** Post-test score ≈ pre-test score (no learning)
- **Alternative hypothesis:** Post-test score > pre-test score + 2 points (learning occurred)
- **Success criterion:** Average cohort gain ≥ 3 points (post − pre)

Example:
| Pseudonym | Pre-Test | Post-Test | Gain |
|-----------|----------|-----------|------|
| Alex      | 2        | 5         | +3   |
| Sam       | 3        | 7         | +4   |
| Casey     | 2        | 6         | +4   |
| **Average** | **2.3** | **6.0** | **+3.7** |

---

## 6. Data Organization & Management

### 6.1 Folder Structure

```
validation-data/cycle-b/
├── <pseudonym-1>/
│   ├── consent-form.pdf
│   ├── pre-test.pdf
│   ├── session-1-<pseudonym>-<date>.json
│   ├── session-1-observer-notes.txt
│   ├── session-2-<pseudonym>-<date>.json
│   ├── session-2-observer-notes.txt
│   ├── session-3-<pseudonym>-<date>.json
│   ├── session-3-observer-notes.txt
│   └── post-test.pdf
├── <pseudonym-2>/
│   └── [same as above]
├── ...
├── README.md (folder guide)
└── analysis.ipynb (skeleton for Phase 4)
```

### 6.2 File Naming Convention

- **Consent:** `consent-form.pdf`
- **Pre-test:** `pre-test.pdf` (filled + scanned, or printed + filled)
- **Session exports:** `session-<number>-<pseudonym>-<date>.json`
  - Example: `session-1-alex-2026-06-01.json`
  - Example: `session-2-alex-2026-06-05.json`
  - Example: `session-3-alex-2026-06-14.json`
- **Observer notes:** `session-<number>-observer-notes.txt`
- **Post-test:** `post-test.pdf`

### 6.3 Privacy Protections

**In-app JSON (no PII):**
- ✓ Pseudonym (display name)
- ✓ Session ID (UUID)
- ✓ Timestamps, device type, level, interactions
- ✗ Real name
- ✗ Age / grade (only in metadata, not in JSON)
- ✗ Parent email / phone
- ✗ School name / address
- ✗ Audio/video recordings

**Observer notes (pseudonyms only):**
- Use only pseudonym + session number in all notes
- No real names, ages, or family info in notes

**Pseudonym mapping (sealed):**
- Keep the mapping of pseudonym → real name in a **separate, encrypted file** or **locked physical envelope**
- Do NOT store real names in the `validation-data/` folder
- Only the researcher (you) has access to this mapping
- Delete mapping after 6 months (unless parent requested longer retention)

**Data deletion timeline:**
- **Default:** Delete all session data and consent forms 6 months after post-test
- **Optional (parent consent):** Keep data for up to 1 year or delete immediately
- **Archive:** After Phase 4 analysis is complete, archive anonymized summary statistics

---

## 7. Quality Assurance

### 7.1 Data Validation

After each session, validate the exported JSON:

```bash
python3 validation-data/scripts/check.py validation-data/cycle-b/<pseudonym>/session-<number>-*.json
```

Expected output: `VALID — all required fields present and well-formed`

**If validation fails:**
1. Check file is not corrupted (file size > 0, readable as JSON)
2. Re-export if possible
3. Contact researcher if data cannot be recovered
4. Mark in session log: "validation failed; investigate"

### 7.2 Session Completeness Checklist (per student)

Before analysis, confirm each student has:

- [ ] Signed consent form (PDF, filed in folder)
- [ ] Pre-test PDF (filled, scored)
- [ ] Session 1 JSON (validated)
- [ ] Session 1 observer notes (legible, dated)
- [ ] Session 2 JSON (validated)
- [ ] Session 2 observer notes (legible, dated)
- [ ] Session 3 JSON (validated)
- [ ] Session 3 observer notes (legible, dated)
- [ ] Post-test PDF (filled, scored)
- [ ] All timestamps are consistent (pre-test ≤ Session 1 ≤ Session 3 ≤ post-test)
- [ ] No real names appear in any JSON or notes

---

## 8. Analysis Preparation (Phase 4)

### 8.1 Data Export for Analysis

After all 8–10 students complete Cycle B:

1. **Aggregate scores:**
   ```
   pseudonym,pre_test_score,post_test_score,gain,device,grade
   alex,2,5,3,iPad,K
   sam,3,7,4,Chromebook,K
   casey,2,6,4,Desktop,1
   ...
   ```
   Save as: `validation-data/cycle-b/results.csv`

2. **Aggregate session metadata:**
   ```
   pseudonym,session_number,date,duration_min,level,withdrawal
   alex,1,2026-06-01,15,1,no
   alex,2,2026-06-05,15,2,no
   alex,3,2026-06-14,14,3,no
   ...
   ```
   Save as: `validation-data/cycle-b/sessions.csv`

3. **Copy all JSONs to a single folder for batch analysis:**
   ```bash
   mkdir validation-data/cycle-b/json-exports/
   cp validation-data/cycle-b/*/session-*.json validation-data/cycle-b/json-exports/
   ```

### 8.2 Analysis Plan (Skeleton)

See `validation-data/cycle-b/analysis.ipynb` for phase 4 (created separately).

---

## 9. Participant Compensation & Incentives

### 9.1 Thank-You Gifts

All participating families receive:
- **Sticker pack** (~$2–3 value) — given after Session 1
- **Bookstore gift card** ($5) — given after post-test
- **Thank-you card** — mailed after study ends

**Tracking:** Maintain a receipt log:
| Pseudonym | Sticker Date | Card Date | Notes |
|-----------|--------------|-----------|-------|
| Alex | 2026-06-01 | 2026-06-18 | Preferred animal stickers |
| Sam | 2026-06-01 | 2026-06-18 | Allergy to latex (no balloon-themed) |

**Incentive is NOT contingent on:**
- Completing all 3 sessions
- Achieving high scores on pre/post-tests
- Continuing if child withdraws

---

## 10. Troubleshooting & Escalation

### 10.1 Common Issues & Resolutions

| Issue | Likely Cause | Resolution |
|-------|-------------|-----------|
| Parent cancels 1+ session | Schedule conflict | Reschedule if possible; note "missed session 2" in data |
| Child refuses to play | Anxiety, boredom, fatigue | Withdraw child; thank parent; offer future participation |
| App crashes repeatedly | Device or network issue | Try different device; check WiFi; escalate to developer if bug suspected |
| JSON export fails | App bug or storage issue | Manual data recovery from app logs; note issue in analysis |
| Pre/post-test scores unchanged | Child guessed on pre-test, no learning, or test insensitive | Expected for some students; include in analysis as "no gain" |

### 10.2 Escalation Path

- **Device/network issues:** Contact parent; offer alternative device or reschedule
- **App bugs (crash, export fail):** Contact developer; provide device type, browser, error logs
- **Data corruption:** Attempt recovery; if unsuccessful, note "data loss" and continue with remaining students
- **Ethical concerns (consent withdrawal, data request):** Honor immediately; delete data as requested

---

## 11. Protocol Compliance Checklist

**Researcher confirms:**
- [ ] All participants provided signed informed consent (or digital signature)
- [ ] All data is stored with pseudonyms only (no real names in JSON/notes)
- [ ] Pseudonym → real name mapping is sealed and separate
- [ ] All JSONs validate against schema (see `in-app-telemetry.md`)
- [ ] All pre/post-tests are scored consistently (no bias in scoring)
- [ ] All sessions are 15 ± 2 minutes
- [ ] No child is coerced to continue if withdrawn
- [ ] Parents received thank-you gifts as promised
- [ ] Data will be deleted on schedule (6 months post-study, unless parent requested otherwise)

---

## 12. Documentation & Reporting

### 12.1 Session Log Template

Maintain a running log of all sessions:

```
**Cycle B Session Log**
—
Session 1 (Alex, 2026-06-01):
  Device: iPad, Duration: 15 min, Level: 1, Export: successful, Technical issues: none
  Debrief: "Favorite was the drag part. Confusing: clicking through shapes."
  
Session 2 (Sam, 2026-06-01):
  Device: Chromebook, Duration: 14 min, Level: 2, Export: successful, Technical issues: lag on touch
  Debrief: "Liked the colors. Confusing: when pieces move."
  
...
```

**File:** `validation-data/cycle-b/session-log.txt`

### 12.2 Final Report (Phase 4)

After analysis, produce a brief report:
- Cohort summary: N, grade distribution, demographics
- Pre-test mean and SD
- Post-test mean and SD
- Mean gain and SD
- Hypothesis result: "SUPPORTED" / "UNSUPPORTED" / "INCONCLUSIVE"
- Notable moments: challenges, breakthroughs, misconceptions
- Recommendations for Phase 3 / formal study

**File:** `validation-data/cycle-b/report.md` (created in Phase 4)

---

## Document Version & Maintenance

**Version:** 1.0  
**Last updated:** 2026-04-25  
**Next review:** Before Cycle B recruitment (May 2026)  
**Maintained by:** Researcher (Ryan Gonzalez)

**Related documents:**
- `consent-form-phase1.md` — consent template
- `pre-post-test-instrument.md` — assessment instrument
- `in-app-telemetry.md` — JSON schema
- `cycle-a/observer-form.md` — session observation template
- `validation-data/scripts/check.py` — JSON validation script

---

**END OF PROTOCOL**
