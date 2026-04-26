# Cycle B Data Organization Guide

**This folder contains all data from the Questerix Fractions formal playtest (Cycle B).**

---

## Folder Structure

```
cycle-b/
├── <pseudonym-1>/              # One folder per participant
│   ├── consent-form.pdf        # Signed parental consent
│   ├── pre-test.pdf            # Pre-test results (5 items, 8 points)
│   ├── session-1-*.json        # Session 1 app telemetry (JSON export)
│   ├── session-1-observer-notes.txt  # Observations during Session 1
│   ├── session-2-*.json        # Session 2 app telemetry
│   ├── session-2-observer-notes.txt  # Observations during Session 2
│   ├── session-3-*.json        # Session 3 app telemetry
│   ├── session-3-observer-notes.txt  # Observations during Session 3
│   └── post-test.pdf           # Post-test results
├── <pseudonym-2>/
│   └── [same structure as above]
├── <pseudonym-3>/
│   └── [same structure as above]
├── ...
├── protocol.md                 # Cycle B formal protocol (with all procedures)
├── schedule.csv                # Master schedule of all participants & dates
├── session-log.txt             # Running log of all sessions
├── incentive-tracking.csv      # Record of thank-you gifts given
├── results.csv                 # Aggregate pre/post scores & gains
├── sessions.csv                # Aggregate session metadata
├── json-exports/               # All session JSONs (for batch analysis)
│   ├── session-1-*.json
│   ├── session-2-*.json
│   ├── session-3-*.json
│   └── ...
├── analysis.ipynb              # Jupyter notebook skeleton (Phase 4)
└── report.md                   # Final analysis report (Phase 4, after data is analyzed)
```

---

## File Naming Convention

### Per-Participant Files

Use **pseudonym** only (no real names) in all filenames:

- **Consent:** `consent-form.pdf`
- **Pre-test:** `pre-test.pdf`
- **Sessions:** `session-<NUMBER>-<PSEUDONYM>-<DATE>.json`
  - Example: `session-1-alex-2026-06-01.json`
  - Example: `session-2-alex-2026-06-05.json`
  - Example: `session-3-alex-2026-06-14.json`
- **Observer notes:** `session-<NUMBER>-observer-notes.txt`
  - Example: `session-1-observer-notes.txt`
- **Post-test:** `post-test.pdf`

### Aggregate Files

- **Schedule:** `schedule.csv` (master participant schedule)
- **Session log:** `session-log.txt` (running notes on all sessions)
- **Incentive tracking:** `incentive-tracking.csv` (gifts given and dates)
- **Results:** `results.csv` (pre/post scores and gains for all participants)
- **Sessions metadata:** `sessions.csv` (duration, device, level, etc.)
- **Analysis:** `analysis.ipynb` (Jupyter notebook for Phase 4)
- **Report:** `report.md` (final findings, Phase 4)

---

## What Goes in Each File Type

### Pre-Test & Post-Test PDFs

- **Format:** Scanned PDFs or printed + filled paper
- **Content:** 8 items, with child's responses marked (correct/incorrect/no response)
- **Scoring:** Researcher marks total score (0–8 points)
- **Storage:** Cycle B folder in participant's subfolder
- **Retention:** Keep 6 months post-study (or per parent consent)

### Session JSON Export

**What it contains (see `in-app-telemetry.md` for full schema):**
- `sessionId`: Unique identifier for this session
- `studentPseudonym`: Display name (e.g., "alex")
- `startTime`: ISO 8601 timestamp (e.g., "2026-06-01T14:30:00Z")
- `endTime`: ISO 8601 timestamp (e.g., "2026-06-01T14:45:00Z")
- `device`: "iPad" | "Chromebook" | "Desktop"
- `level`: Game level (1, 2, or 3)
- `interactions`: Array of user actions (taps, drags, correct/incorrect responses)

**Example:**
```json
{
  "sessionId": "uuid-12345",
  "studentPseudonym": "alex",
  "startTime": "2026-06-01T14:30:00Z",
  "endTime": "2026-06-01T14:45:00Z",
  "device": "iPad",
  "level": 1,
  "interactions": [
    {"type": "tap", "timestamp": "2026-06-01T14:30:15Z", "target": "start-button"},
    {"type": "drag", "timestamp": "2026-06-01T14:30:45Z", "question": "Q1-identify-half", "correct": true},
    ...
  ]
}
```

**Do NOT contain (privacy compliance):**
- Real name
- Age or grade
- Parent email or phone
- School name or location
- Audio/video files
- Mouse/keystroke timing details

### Observer Notes

- **Format:** Plain text (`.txt`) or markdown (`.md`)
- **Content:**
  - Session date, start/end times, duration
  - Notable moments (with timestamps): joy, confusion, breakthrough, frustration
  - Any technical glitches
  - Child's debrief responses (2 questions)
  - General observations (engagement, environment, behavior change)
- **Length:** 1–2 pages (concise, not verbose)
- **Legibility:** Hand-written notes must be clearly scanned or transcribed

**Example:**
```
Session 1 Observer Notes — Alex, 2026-06-01

Duration: 15 minutes (14:30–14:45)

Notable moments:
- 14:32 (2 min in): Alex tapped the start button quickly, seemed familiar with tablets
- 14:35 (5 min in): Confusion when dragging the half-circle piece — hesitated, tried 3x before getting it right
- 14:38 (8 min in): "Oh! That's a half!" when the piece aligned correctly — big smile
- 14:42 (12 min in): Breezed through the next 2 items, clearly gaining confidence

Technical issues: None. App responsive, no lag.

Debrief:
- Favorite part: "When the pieces clicked together"
- Confusing: "At first, I didn't know which piece to drag"

General obs: Alex is very motivated by visual feedback (the "correct" animation was huge). Left-handed, managed iPad fine. Very engaged throughout.
```

### Schedule & Tracking CSVs

- **Columns:** Pseudonym, age, grade, pre-test date, session dates, post-test date, parent email, device, notes
- **Purpose:** Quick reference for scheduling and compliance checking
- **Update frequency:** After each session (same-day or next day)
- **Retention:** Keep indefinitely (non-sensitive); reference for Phase 3/4

---

## Privacy & Confidentiality

### What's Public (in this folder)
- Pseudonyms (display names only)
- Session timestamps and durations
- Device types
- Test scores (no identifying info attached)
- Aggregate statistics (mean gains, etc.)

### What's Sealed (separate location)
- Real name ↔ pseudonym mapping
- Parent emails and phone numbers
- School or location information

**Sealed file location:** See `SEALED-pseudonym-mapping.xlsx` or `SEALED-pseudonym-mapping.txt` (stored in parent `validation-data/` folder, encrypted or in locked cabinet)

### Data Deletion Timeline

- **Default:** All per-participant files deleted 6 months after post-test
- **Exception:** If parent requested data retention for Phase 3, keep until 12 months post-test
- **Archive:** Summary statistics (aggregate results) may be kept longer for Phase 4 analysis
- **Process:** Delete files systematically; maintain deletion log

---

## Quality Assurance Checklist (per participant)

Before analysis begins, verify each participant folder contains:

- [ ] Signed consent form (PDF)
- [ ] Pre-test PDF (filled + scored)
- [ ] Session 1 JSON (validated, ~50–500 KB)
- [ ] Session 1 observer notes (legible, dated)
- [ ] Session 2 JSON (validated)
- [ ] Session 2 observer notes (legible, dated)
- [ ] Session 3 JSON (validated)
- [ ] Session 3 observer notes (legible, dated)
- [ ] Post-test PDF (filled + scored)
- [ ] All timestamps consistent (pre ≤ S1 ≤ S2 ≤ S3 ≤ post)
- [ ] No real names in any JSON or notes
- [ ] All PDFs readable and legible
- [ ] All JSONs pass validation script:
  ```bash
  python3 ../scripts/check.py <pseudonym>/session-*.json
  ```

---

## Analysis Workflow (Phase 4)

### Step 1: Batch Validate All JSONs

```bash
cd validation-data/cycle-b/
for file in */session-*.json; do
  python3 ../scripts/check.py "$file"
done
```

Expected output: `VALID` for each file.

### Step 2: Aggregate Scores

Create `results.csv`:
```csv
pseudonym,pre_test_score,post_test_score,gain,device,grade
alex,2,5,3,iPad,K
sam,3,7,4,Chromebook,K
casey,2,6,4,Desktop,1
...
```

### Step 3: Aggregate Session Metadata

Create `sessions.csv`:
```csv
pseudonym,session_number,date,duration_min,level,withdrawal
alex,1,2026-06-01,15,1,no
alex,2,2026-06-05,15,2,no
alex,3,2026-06-14,14,3,no
...
```

### Step 4: Extract Interactions

Copy all session JSONs to `json-exports/` for batch processing:
```bash
mkdir -p json-exports/
cp */session-*.json json-exports/
```

### Step 5: Run Analysis Notebook

Open `analysis.ipynb` and execute cells to:
- Load pre/post scores
- Calculate mean gain and SD
- Compare pre vs. post (t-test or Wilcoxon)
- Analyze interaction patterns from JSONs
- Generate visualizations
- Check hypothesis: "Post-test gain ≥ 3 points"

See `analysis.ipynb` for full skeleton.

---

## Common Issues & Resolutions

| Issue | Likely Cause | Resolution |
|-------|-------------|-----------|
| **Missing JSON file** | Export failed or not saved | Check device storage; re-export if app logs are available; note in session log |
| **JSON validation fails** | Corrupted file or wrong format | Check file size (> 0 KB); try re-exporting; if impossible, note "data loss" |
| **Pre/post-test not scanned** | Forgotten to photograph | Retrieve original form; scan and upload; update PDF filename |
| **Timestamp mismatch** | Sessions logged on wrong day | Check observer notes for actual date; rename file if needed; correct schedule.csv |
| **Real name appears in JSON** | App bug or observer error | Delete that JSON; re-export if possible; investigate app bug |
| **Parent requests data deletion** | Withdrawal or privacy concern | Delete all files for that pseudonym; update schedule.csv; confirm to parent |

---

## Tools & Scripts

### JSON Validation Script
- **Location:** `../scripts/check.py`
- **Usage:** `python3 ../scripts/check.py <file.json>`
- **Output:** "VALID" or error message with details

### Analysis Notebook
- **Location:** `analysis.ipynb`
- **Usage:** Open in Jupyter Lab or VS Code; execute cells in order
- **Requires:** Python 3.8+, pandas, numpy, scipy, matplotlib

### Spreadsheet Tools
- **Schedule:** `schedule.csv` (open in Excel, Google Sheets, or Numbers)
- **Results:** `results.csv` (open in any spreadsheet app; import to pandas)

---

## Document Version & Maintenance

**Version:** 1.0  
**Last updated:** 2026-04-25  
**Next review:** After first Cycle B session  
**Maintained by:** Researcher (Ryan Gonzalez)

**Related documents:**
- `protocol.md` — Full Cycle B protocol
- `../recruitment-template.md` — Recruitment & scheduling info
- `../cycle-a/pre-test-checklist.md` — Pre-test & session procedures
- `../scripts/check.py` — JSON validation
- `analysis.ipynb` — Phase 4 analysis skeleton

---

**Questions about file organization or privacy?** Refer to `protocol.md` §6 (Data Organization & Management) or `../cycle-a/observer-form.md`.
