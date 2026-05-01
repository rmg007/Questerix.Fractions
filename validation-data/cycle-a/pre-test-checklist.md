# Cycle A Pre-Test Checklist

**What to do before, during, and after the first playtest session.**

Estimated time: ~2 hours total (1.5 hours prep + 0.5 hours cleanup)

---

## One Day Before the Test

### Setup & Materials
- [ ] Confirm venue is booked and accessible (home, library, or quiet classroom space)
- [ ] Print **consent form** (1 copy per family + 1 extra)
  - Source: `docs/40-validation/consent-form-phase1.md` (open in any markdown viewer or render to PDF before printing)
  - Ensure text is dark and legible (test print one copy)
- [ ] Print **pre-test instrument** (1 copy per child + 2 extras for practice)
  - Source: `docs/40-validation/pre-post-test-instrument.md` (open in any markdown viewer or render to PDF before printing)
  - Verify images are large and clear (test print one copy)
- [ ] Print **observer form** (1 copy per session; for Cycle A = 1 copy per child)
  - Source: `validation-data/cycle-a/observer-form.md`
  - Recommend: print 1-sided, with blank back for extra notes

### Devices & Connectivity
- [ ] Test device #1 (iPad): charge battery to 100%
- [ ] Test device #2 (Chromebook or desktop): charge battery or ensure plugged in
- [ ] Test WiFi connectivity at venue, or pre-cache for offline use: load the app URL once on each device while connected to WiFi (the service worker pre-caches assets); subsequent loads work without a network
  - Load app on device in test mode: does it load within 3 seconds?
  - Try a mock 15-minute session: no crashes?
- [ ] Test audio on both devices:
  - [ ] Device #1 audio (iPad) is audible, volume appropriate for a child
  - [ ] Device #2 audio works (or silent mode is acceptable)
- [ ] Download app backup: export a blank session JSON to confirm export button works
  - [ ] Blank session exports successfully
  - [ ] File appears in device's download folder
  - [ ] File size is < 1 MB (healthy)

### Files & Organization
- [ ] Create folder structure for first tester:
  ```
  validation-data/cycle-a/<pseudonym>/
  ├── pre-test.pdf (to be filled)
  ├── session-1-observer-notes.txt (to be filled)
  └── session-1-<pseudonym>-<date>.json (to be exported)
  ```
- [ ] Prepare a blank "tester log" (simple text file to track which tests you've run):
  - Format: `pseudonym | date | device | pre-test score | post-test score | notes`
- [ ] Back up app on both devices:
  - [ ] Verify latest version is deployed to staging
  - [ ] Confirm URL is correctly bookmarked or pinned on each device
- [ ] Confirm the in-app navigation route to Level 1 (no deep links exist):
  - From the menu, tap **Play** → **Choose Level** to open the level chooser overlay
  - On a fresh device only **Level 1** is unlocked; L2 unlocks after L1 completes, L3 after L2
  - To reach L2 or L3 directly during a test, use the same Choose Level overlay (the Adventure Map is decorative)

### Consent & Privacy
- [ ] Review consent form with parent/guardian **before** the test
  - [ ] Parent reads and signs form
  - [ ] Parent asks questions; you answer
  - [ ] Parent chooses: keep data / delete data (check box on form)
  - [ ] Store signed form in `validation-data/cycle-a/<pseudonym>/consent-form.pdf`
- [ ] Confirm child's **display name** (pseudonym):
  - [ ] Ask child: "What would you like to be called during the game?"
  - [ ] Avoid real first names (e.g., suggest "Alex", "Sam", "Casey")
  - [ ] Record pseudonym on consent form and all observer notes
- [ ] Ensure parent has your contact info (on the consent form)

### Researcher Checklist
- [ ] Notify parent of session **start time** and **location**
- [ ] Confirm parent will stay with child (if child < 7 years old)
- [ ] Send reminder 1 day before: "Hi [Parent], we're on for tomorrow at [TIME] at [LOCATION]. Bring the signed consent form (or we'll sign it there). See you soon!"

---

## Morning of the Test

### 30 Minutes Before Start Time

**Device Check (5 min)**
- [ ] Device #1 battery is full; WiFi is connected (or the app URL was already loaded once on this device while online so the service worker has cached assets)
- [ ] Device #2 battery is full; WiFi is connected
- [ ] Open app on both devices; confirm they load without errors
- [ ] Audio test on Device #1: play a sound from the app (mute if necessary)

**Materials Check (5 min)**
- [ ] Consent form is printed and in hand
- [ ] Pre-test instrument is printed and in hand (one copy)
- [ ] Observer form is printed (one copy)
- [ ] Blank paper and pens/pencils available for the tester
- [ ] Timer or stopwatch is ready (phone stopwatch works)
- [ ] Tissues and water bottle available (for child comfort)

**Environment Check (5 min)**
- [ ] Room is quiet (no loud background noise)
- [ ] Chairs/tables are set up for comfortable use
- [ ] Lighting is good (not glare on device screen)
- [ ] Bathroom is accessible
- [ ] No interruptions expected (phone on silent, door closed if possible)

---

## During the Test

### Before Pre-Test (~5 min setup)

- [ ] Greet the parent and child warmly
- [ ] If consent form not pre-signed:
  - [ ] Ask parent to read and sign the consent form (5 min)
  - [ ] Clarify any questions
  - [ ] Obtain parent signature and date
- [ ] Ask child for their **display name** (if not already given):
  - [ ] Child's pseudonym: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- [ ] Record on observer form:
  - [ ] Pseudonym
  - [ ] Age (if < 18)
  - [ ] Device assignment (iPad or Desktop)
  - [ ] Date and start time

### Pre-Test Administration (~5 min)

- [ ] Seat child comfortably at table with paper test
- [ ] Say: "I'm going to ask you some questions about shapes and numbers. There's no right or wrong answer—just do your best."
- [ ] Read each question aloud and wait for a response
- [ ] Do **NOT** explain fractions, halves, fourths, or give hints
- [ ] If child says "I don't know," say: "That's okay, take a guess or skip to the next one"
- [ ] After each item, record the child's response (check mark for correct, X for incorrect)
- [ ] After Item 8, thank the child: "Great job! Let's take a quick break before we play the game."

**Pre-test score:** \_\_\_\_\_ / 8

### Game Session (~15 min)

- [ ] Start the timer
- [ ] Bring child to the device with the app loaded
- [ ] Say: "This is a game about fractions. You'll see shapes and pieces. Just tap and drag to play. I'll be right here watching, but I won't give hints—have fun!"
- [ ] **Step back:** Sit silently and observe
  - [ ] Do NOT touch the device or point at the screen
  - [ ] Do NOT explain game mechanics, even if child is confused
  - [ ] Watch for moments of clarity, confusion, or joy (note in observer form)
  - [ ] If child asks a question: "What do you think?" or "Try it and see"
  - [ ] If child wants to stop: honor their request; note "withdrew at [time]"
- [ ] At 14 minutes, give a gentle reminder: "We're almost done—just 1 more minute"
- [ ] At 15 minutes: "Great job! Let's stop here and export your data"
- [ ] Stop the timer and record the **exact duration** on the observer form

### Post-Session Data Export (~2 min)

- [ ] In the app, tap the Settings gear (top-right of the menu screen) to open SettingsScene
- [ ] Tap the **"Export My Backup"** button
- [ ] App will generate a JSON file (saved to the device's downloads folder; status text confirms "Saved! Check your downloads.")
- [ ] Save the file to your computer with the name: `session-1-<pseudonym>-<date>.json`
  - Example: `session-1-alex-2026-05-15.json`
- [ ] Confirm file is saved: check file size (should be 50–500 KB)
- [ ] Move file to: `validation-data/cycle-a/<pseudonym>/session-1-<pseudonym>-<date>.json`

### Debrief (~3 min)

- [ ] Give child a 1-2 minute break (water, tissue, stretch)
- [ ] Ask Question 1: "What was your favorite part of the game?"
  - [ ] Record response in observer form
- [ ] Ask Question 2: "Was there anything that felt tricky or confusing?"
  - [ ] Record response in observer form
- [ ] Thank child: "You did a great job! Here's a thank-you gift [if applicable]."

### End of Session

- [ ] Record session **end time** on observer form
- [ ] Calculate **duration** (should be ~15 min)
- [ ] Review observer notes: are they legible and complete?
- [ ] Thank parent: "Thanks for bringing [Child's name]. We'll be in touch about the next session!"
- [ ] Give parent a copy of the signed consent form (if they want it)

---

## After the Test

### Same Day (within 2 hours)

- [ ] Move all test materials to the secure folder:
  - [ ] Signed consent form → `validation-data/cycle-a/<pseudonym>/consent-form.pdf`
  - [ ] Pre-test PDF (filled) → `validation-data/cycle-a/<pseudonym>/pre-test.pdf`
  - [ ] Observer notes (filled) → `validation-data/cycle-a/<pseudonym>/session-1-observer-notes.txt`
  - [ ] Exported JSON → `validation-data/cycle-a/<pseudonym>/session-1-<pseudonym>-<date>.json`
- [ ] Review observer notes for clarity:
  - [ ] Are all timestamps legible?
  - [ ] Are notable moments described clearly?
  - [ ] Are any technical glitches noted?
  - [ ] Is debrief legible?
- [ ] Validate the exported JSON:
  ```bash
  python3 validation-data/scripts/check.py validation-data/cycle-a/<pseudonym>/session-1-*.json
  ```
  - [ ] Script outputs "VALID"
  - [ ] If not, review error message and re-export if necessary

### Within 24 Hours

- [ ] Log results in tester tracker:
  - [ ] Pseudonym, date, device, pre-test score, session date, any notes
- [ ] If parent requested Phase 3 opt-in:
  - [ ] File parent's email in a secure location (encrypted spreadsheet or sealed envelope)
  - [ ] Send parent a confirmation: "Thanks for agreeing to Phase 3. We'll be in touch in June."
- [ ] Review the test for any learnings:
  - [ ] Did the app work smoothly?
  - [ ] Did the pre-test feel age-appropriate?
  - [ ] Did the child engage with the game?
  - [ ] Any glitches or usability issues?
  - [ ] Update your notes in `validation-data/cycle-a/NOTES.md` for next time

### Before Next Test

- [ ] Print new copies of:
  - [ ] Pre-test instrument (fresh copy)
  - [ ] Observer form (fresh copy)
- [ ] Check devices:
  - [ ] Do they need to be charged?
  - [ ] Has the app been updated? (re-deploy if needed)
  - [ ] Confirm WiFi still works at the venue
- [ ] Confirm next tester's appointment:
  - [ ] Date and time scheduled
  - [ ] Venue confirmed
  - [ ] Parent informed and has consent form link

---

## Troubleshooting During Test

### "The app won't load"
- [ ] Check WiFi connectivity
- [ ] Refresh the browser (pull-down on iPad; F5 on desktop)
- [ ] Close the browser completely and reopen
- [ ] If offline: confirm this device loaded the app URL at least once while online before the test (the service worker auto-caches on first load; there is no in-app toggle). If it was never loaded online, switch to a backup device that was, or reconnect to WiFi.
- [ ] If still broken: use a backup device (if available) or reschedule

### "The child is confused by the game"
- [ ] **Do not explain.** This is expected at first play.
- [ ] Encourage: "You're doing great. Just try tapping things."
- [ ] Let them play their own way; no pressure to "succeed"

### "The child wants to stop early"
- [ ] **Honor the request.** No penalty, no coercion.
- [ ] Note "withdrew at [time]" in observer form
- [ ] Still export the session data (it's valid up to the withdrawal point)
- [ ] Still ask debrief questions (brief version)
- [ ] Contact parent: "Thanks for participating. We know it's new, and that's okay. Let us know if you'd like to try again."

### "The JSON export fails"
- [ ] Try tapping Settings → "Export My Backup" again
- [ ] If still fails: note "export failed" in observer notes
- [ ] Ask parent for contact info to follow up (if data recovery is needed)
- [ ] Continue with the test; data may be recoverable from in-app logs

### "The device crashes mid-session"
- [ ] Restart the device
- [ ] Reload the app
- [ ] Note in observer form: "Crash at [time]; session restarted"
- [ ] Resume play if the child is willing
- [ ] The session data up to the crash should still export

---

## Quick Checklist (Print & Keep Handy)

**Day Before:**
- [ ] Materials printed (consent, pre-test, observer form)
- [ ] Devices charged and tested
- [ ] Venue confirmed
- [ ] Parent reminder sent

**Morning of:**
- [ ] Devices loaded and WiFi working
- [ ] Materials in hand (consent, test, form, pencils)
- [ ] Room quiet and comfortable
- [ ] Timer ready

**During:**
- [ ] Consent form signed
- [ ] Pre-test administered (~5 min)
- [ ] Game session timed (~15 min)
- [ ] Data exported
- [ ] Debrief recorded (~3 min)

**After:**
- [ ] Files organized in folder
- [ ] JSON validated
- [ ] Observer notes legible
- [ ] Parent contacted (if follow-up needed)

---

**Form version:** 1.0  
**Last updated:** 2026-04-25  
**Questions?** Refer to `cycle-a/observer-form.md` or `phase1-gate-checklist.md`
