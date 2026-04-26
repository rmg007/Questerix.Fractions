# Cycle B Recruitment & Scheduling Templates

---

## Pseudonym Assignment System

Use this system to assign pseudonyms to participants while keeping real names sealed.

### Step 1: Create a Pseudonym List

Generate a list of neutral, age-appropriate display names (no gendered names to avoid bias):

```
Alex, Sam, Casey, Jordan, Riley, Morgan, Casey, Drew, Blake, Skylar
```

### Step 2: Assign During Recruitment

When a parent agrees to participate:

1. Pick the next pseudonym from the list
2. Assign to that participant
3. Record in the **Sealed Mapping File** (see below)
4. Use the pseudonym in all future communication and data

### Step 3: Sealed Mapping File

Keep a **SEALED** file with the real name → pseudonym mapping:

**Option A: Encrypted Spreadsheet**
- File: `validation-data/SEALED-pseudonym-mapping.xlsx` (encrypted with password)
- Columns: `Pseudonym | Real Name | Age | Grade | Parent Email | Phone | Consent Date`
- Access: Only researcher has password
- Retention: Delete after 6 months (or per parent request)

**Option B: Printed Envelope (Low-Tech)**
- File: `validation-data/SEALED-pseudonym-mapping.txt` (printed, placed in sealed envelope)
- Mark envelope: "CONFIDENTIAL — Open only if data recovery needed"
- Store: Locked file cabinet, separate from data folders
- Retention: Same as Option A

### Example Mapping

| Pseudonym | Real Name | Age | Grade | Parent Email | Consent Date |
|-----------|-----------|-----|-------|--------------|--------------|
| Alex | [SEALED] | 5 | K | parent1@example.com | 2026-05-10 |
| Sam | [SEALED] | 6 | K | parent2@example.com | 2026-05-12 |
| Casey | [SEALED] | 7 | 1 | parent3@example.com | 2026-05-15 |

---

## Scheduling Template

Use this spreadsheet to manage session dates for all participants.

### Master Schedule (CSV Format)

Create a file: `validation-data/cycle-b/schedule.csv`

```csv
Pseudonym,Age,Grade,Pre-Test Date,Session 1,Session 2,Session 3,Post-Test,Parent Email,Device,Notes
Alex,5,K,2026-06-01,2026-06-01,2026-06-05,2026-06-14,2026-06-16,parent1@example.com,iPad,Left-handed; prefers morning times
Sam,6,K,2026-06-02,2026-06-02,2026-06-06,2026-06-15,2026-06-17,parent2@example.com,Chromebook,Familiar with tablets
Casey,7,1,2026-06-03,2026-06-03,2026-06-07,2026-06-16,2026-06-18,parent3@example.com,Desktop,Shy; needs encouragement
Jordan,6,K,2026-06-04,2026-06-04,2026-06-08,2026-06-17,2026-06-19,parent4@example.com,iPad,Talkative; quick learner
Riley,7,2,2026-06-05,2026-06-05,2026-06-09,2026-06-18,2026-06-20,parent5@example.com,Chromebook,ADHD accommodations; shorter breaks okay
```

### Filling Out the Template

1. **Pseudonym:** From pseudonym list (see above)
2. **Age:** Child's age in years (5–7 for K–2)
3. **Grade:** K, 1, or 2
4. **Pre-Test Date:** Date you will administer the pre-test (ideally same day as Session 1)
5. **Session 1:** Day 1 (immediately after pre-test)
6. **Session 2:** Day 4–5 (3–4 days later)
7. **Session 3:** Day 10–14 (5–9 days later)
8. **Post-Test:** Within 3 days of Session 3
9. **Parent Email:** For reminders and scheduling confirmations
10. **Device:** iPad, Chromebook, or Desktop (researcher choice or parent availability)
11. **Notes:** Any special circumstances (left-handed, ADHD, language, allergies, etc.)

### Google Sheets Alternative

If you prefer a live spreadsheet:

1. Create a Google Sheet: `Cycle B Participant Schedule`
2. Share with yourself and any co-researchers (read-only for assistants)
3. Columns: Pseudonym, Pre-Test, Session 1–3, Post-Test, Parent Email, Device, Notes
4. Color-code: Green (completed), Yellow (scheduled), Red (pending/rescheduled)
5. Use Sheet > Protect Sheets to prevent accidental editing

---

## Reminder Email Templates

### Email 1: Recruitment & Initial Consent

**Subject:** Help Us Validate a New Math Game for Kids! 🎮

```
Hi [Parent Name],

I'm working on a new educational game called Questerix Fractions, designed to help young children learn about fractions (halves, thirds, fourths) through play.

I'm looking for 8–10 families to participate in a short playtest this June. Your child would:
- Complete 3 game sessions, ~15 minutes each, spread over 2 weeks
- Take two short paper activities (one before, one after) to help me measure if the game teaches
- Get a thank-you gift (sticker pack + bookstore card)

The whole thing takes about 30 minutes of your time, plus 30 minutes for setup. No accounts, no data collection beyond what's needed to improve the game.

If you're interested, I'll send you a simple one-page consent form to review. Any questions, just ask!

**When:** Recruitment open through [DATE]
**Sessions:** [START DATE] through [END DATE], in your home or at a location convenient for you
**Contact:** [YOUR EMAIL]

Interested? Reply to this email and let me know!

Thanks,
[Your Name]
```

### Email 2: Consent Form Delivery

**Subject:** Questerix Playtest — Consent Form & Scheduling

```
Hi [Parent Name],

Thanks for agreeing to participate! Attached is the consent form for the Questerix Fractions playtest.

**Please review and let me know:**
1. Any questions about the study, data privacy, or what your child will do
2. Whether you'd like to keep your child's data after the playtest (for a future larger study) or delete it
3. Your preferred dates for the three sessions (I'll schedule around your availability)

Once you're comfortable, please:
- Print and sign the form, or
- Reply with your digital signature (I can use DocuSign if you prefer)

**What comes next:**
1. I'll confirm receipt of the signed form
2. I'll send you a calendar invite for the pre-test (5 min) + Session 1 (15 min)
3. Sessions 2 & 3 will be scheduled after Session 1

Any questions, just reply!

Thanks,
[Your Name]
```

### Email 3: Pre-Session Reminder (1 Week Before)

**Subject:** Questerix Playtest Next Week — Session 1 Scheduled

```
Hi [Parent Name],

Excited to have [Child's Pseudonym] try Questerix! Here's a quick reminder:

**Session 1 Details:**
- **Date:** [DATE]
- **Time:** [TIME] — [TIME + 20 min] (includes 5 min pre-test + 15 min game)
- **Location:** [YOUR ADDRESS / ZOOM LINK / LIBRARY LOCATION]
- **What to bring:** The signed consent form (if not already provided)
- **What to expect:** Pre-test on paper, then the game on a tablet/computer

**What I'll provide:**
- The game app (no download needed—runs in a browser)
- Paper and pencils for the pre-test
- Friendly encouragement (no pressure to "succeed"—this is just a playtest)

Please confirm your availability by [DATE]. If you need to reschedule, just let me know!

See you soon,
[Your Name]
```

### Email 4: Post-Session Debrief & Next Session Scheduling

**Subject:** Thanks for Session 1! Here's Session 2 Scheduling

```
Hi [Parent Name],

Thanks so much for coming! [Child's Pseudonym] did great on the game. A few notes:

**Session 1 Observations:**
- [Liked: specific moment you observed, e.g., "really enjoyed the drag-and-drop puzzles"]
- [Challenge: specific moment, e.g., "took a moment to understand the "equal parts" concept"]

**Next Sessions:**
- **Session 2:** [PROPOSED DATES] — please reply with your preferred day
- **Session 3:** [PROPOSED DATES] — we'll confirm after Session 2

Sessions are 15 minutes each. No pre/post test this time—just play!

Any questions, just reply. See you next week!

Thanks,
[Your Name]
```

### Email 5: Final Session & Post-Test Scheduling

**Subject:** Final Session & Wrap-Up for [Child's Pseudonym]

```
Hi [Parent Name],

Excited for the last session! Here's the plan:

**Session 3:** [DATE & TIME] (15 min game)
**Post-Test:** [DATE & TIME, same day or next day] (5 min paper test)
**Thank-You Gifts:** After the post-test, [Child's Pseudonym] will get:
  - Sticker pack (already given after Session 1)
  - $5 Bookstore gift card (at post-test)
  - Thank-you card in the mail

See you [DATE]!

Thanks for all your help,
[Your Name]
```

### Email 6: Study Complete & Results Preview

**Subject:** Questerix Playtest Complete — Thank You!

```
Hi [Parent Name],

Study complete! Thanks so much for [Child's Pseudonym]'s participation. I'm currently analyzing the data from all [N] participants to see how much the game helped with fraction learning.

**Quick Stats (for your curiosity):**
- [Child's Pseudonym]'s pre-test score: [X]/8
- [Child's Pseudonym]'s post-test score: [Y]/8
- Improvement: [Y-X] points

I'll share full results in a few weeks once I've analyzed everyone's data.

**Did you give me permission to keep the data for a longer-term study?** If you did, you might hear from me again in the fall about a Phase 3 playtest with a larger group. No obligation—totally up to you!

Thanks again,
[Your Name]

P.S. If you have any feedback on the game itself, I'd love to hear it. Just reply to this email!
```

---

## Compensation Tracking

### Incentive Log

Maintain a simple log of thank-you gifts given:

```
Pseudonym | Sticker Pack Given | Date | Gift Card Given | Date | Thank-You Card Mailed | Date | Notes
Alex      | Yes                | 6/1  | Yes             | 6/16 | Yes                   | 6/20 | Preferred animal stickers
Sam       | Yes                | 6/2  | Yes             | 6/17 | Yes                   | 6/20 | Allergy to latex (no balloon theme)
Casey     | Yes                | 6/3  | Yes             | 6/18 | Yes                   | 6/20 | Shy but engaged
```

**File:** `validation-data/cycle-b/incentive-tracking.csv`

### Budget Estimate

- **Sticker packs:** ~$2–3 per child × 8–10 children = $16–30
- **Bookstore gift cards ($5):** 5 × 8–10 children = $40–50
- **Thank-you cards:** ~$0.50 each × 8–10 = $4–5
- **Postage:** ~$0.63 per card × 8–10 = $5–6
- **Total estimated cost:** $65–91 for 8–10 children

---

## Recruitment Checklist

- [ ] Pseudonym list created (10+ names)
- [ ] Sealed mapping file prepared (encrypted spreadsheet or envelope)
- [ ] Recruitment email drafted and reviewed
- [ ] Scheduling spreadsheet template created
- [ ] All email templates saved and ready to send
- [ ] Incentive budget estimated and approved
- [ ] Schedule: recruitment open [DATE], close [DATE], sessions [DATE] onwards

---

**Template version:** 1.0  
**Last updated:** 2026-04-25  
**Questions?** See `cycle-b/protocol.md` for full recruitment details
