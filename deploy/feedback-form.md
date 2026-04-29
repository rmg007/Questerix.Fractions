# Feedback Setup

## Guiding Constraint

Per `docs/40-validation/privacy-notice.md`: no third-party scripts may be
embedded in the app. The CSP in `deploy/vercel.json` enforces this at the
network layer — `connect-src 'self'` blocks all external calls.

This means feedback widgets (Typeform, Hotjar, etc.) cannot be embedded.
All feedback channels are **link-out only**.

---

## Primary: GitHub Issues (No PII)

**For bug reports and general feedback.**

URL pattern: `https://github.com/ryanmidogonzalez/questerix-fractions/issues/new?template=feedback.md`

- No personal information required.
- Kids should not submit issues directly; this channel is for adults.
- Use the `feedback.md` issue template (see `.github/ISSUE_TEMPLATE/feedback.md`).
- Bug reports use `.github/ISSUE_TEMPLATE/bug_report.md`.

In-app link text: "Share feedback (opens GitHub)"

---

## Secondary: Google Form (Parent / Teacher Only, Opt-In)

**Optional. For structured parent and teacher feedback only.**

Setup:

1. Create a Google Form at forms.google.com with your personal Google account.
2. Fields (keep minimal; no kid PII):
   - Grade band of student (Kindergarten / Grade 1 / Grade 2 / Grade 3+)
   - What worked well? (paragraph)
   - What didn't work? (paragraph)
   - Would you use this again? (Yes / No / Maybe)
   - May we follow up with you? (Yes / No) — if Yes, collect email as optional.
3. Do not ask for the child's name, age, school, or location.
4. Set response destination to a private Google Sheet; do not publish responses.
5. Link to the form from the About screen with the label:
   "Optional: Parent/teacher feedback form (Google)"

**Do NOT embed the Google Form in the app.** This would:

- Violate the CSP (`connect-src 'self'` blocks accounts.google.com).
- Violate `privacy-notice.md` ("no third parties" and "no cookies of any kind").

The form is a separate tab/window that users open voluntarily.

---

## What Not to Do

- No Typeform, Tally, Airtable embeds.
- No Hotjar, FullStory, or session recording.
- No email capture widget inside the app.
- No chat widget (Intercom, Crisp, etc.).
