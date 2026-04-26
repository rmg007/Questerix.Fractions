# Cycle A Data Organization

**Cycle A is the informal playtest — quick dry-run to verify the end-to-end pipeline works.**

---

## What Goes Here

Each tester gets a folder with:

```
cycle-a/<pseudonym>/
├── consent-form.pdf         # Signed parental consent
├── pre-test.pdf             # Pre-test results (8 points)
├── session-1-<pseudonym>-<date>.json    # Exported telemetry
├── session-1-observer-notes.txt         # Observation notes
└── post-test.pdf            # Post-test results (if applicable)
```

## File Naming

- **Session exports:** `session-<number>-<pseudonym>-<date>.json`
  - Example: `session-1-alex-2026-05-15.json`
- **Observer notes:** `session-1-observer-notes.txt`

## Privacy Reminder

- Use only **pseudonyms** in filenames and JSON
- No real names appear anywhere
- Parent email/phone stored separately in sealed file

## Validation

After each session, run:
```bash
python3 ../scripts/check.py <pseudonym>/session-*.json
```

Expected: `VALID`

---

For full protocol, see: `pre-test-checklist.md`
