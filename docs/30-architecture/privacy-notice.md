---
title: Privacy Notice
status: active
owner: solo
last_reviewed: 2026-04-26
applies_to: [mvp]
related: [persistence-spec.md, ../../validation-data/README.md]
---

# Privacy & Data Handling

Questerix Fractions is designed to collect **minimal data** and respect student privacy.

## What We Store

### On Device (IndexedDB)

- **Session records**: activity history, question responses, hint usage (per student)
- **Device metadata**: one-time installation ID (`installId`), locale, accessibility preferences
- **Curriculum data**: questions, answers, hints (static, read-only after boot)

### What We _Never_ Collect

- Student names or identifying information
- Email addresses or contact details
- Device serial numbers or OS identifiers
- Geolocation or IP addresses
- Audio recordings or video

## Local-Only Data

**Installation ID (`installId`)**

- Generated once on first boot
- Stored locally in IndexedDB
- Used to correlate sessions within the same device
- Never transmitted to servers or analytics platforms

**Per-Session Data**

- All data is stored locally on the device
- No cloud sync or server upload by default
- Manual backup (Settings > Download Backup) is user-initiated only

## Persistent Storage

The app requests **durable persistent storage** (per `persistence-spec.md §3.2`) to survive iOS Safari's Intelligent Tracking Prevention (ITP):

- On grant: data persists indefinitely
- On denial: browser may clear data after 7–30 days of inactivity
- User can revoke at any time (Settings > Clear All Data)

See `src/persistence/db.ts::ensurePersistenceGranted()` for implementation.

## Data Backup & Restore

Students can download a JSON backup file from Settings. The file contains:

- Session history
- Attempt records
- Progress stats
- Skill mastery data

**The backup is NOT encrypted.** Recommend device-level encryption (FileVault, BitLocker) for sensitive environments.

Backups can be:

- Stored securely (cloud storage, USB drive)
- Restored to another device running Questerix

See `persistence-spec.md §6` and `src/persistence/backup.ts` for technical details.

## Compliance

✓ **FERPA-ready**: No PII collected; locally stored; user-controlled export  
✓ **COPPA-ready**: No tracking, behavioral ads, or third-party data sharing  
✓ **GDPR-ready**: No cross-border data transfer; right to deletion (Clear All Data)

---

**Last updated**: Phase 11.8
