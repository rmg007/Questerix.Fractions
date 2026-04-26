---
title: Validation Data Schema
status: active
owner: solo
last_reviewed: 2026-04-26
applies_to: [mvp]
related: [../../docs/30-architecture/data-schema.md, ../../docs/40-validation/playtest-protocol.md]
---

# Validation Data

This directory contains curriculum validation data — session exports, playtest results, and analysis artifacts used to verify that the curriculum meets C1–C10 constraints.

## Directory Structure

```
validation-data/
├── cycle-a/                # First playtest cycle
│   ├── raw/                # Raw session JSON exports (git-ignored, sensitive)
│   ├── processed/          # Anonymized session records
│   └── analysis/           # Metrics and reports
├── cycle-b/                # Second playtest cycle
│   ├── raw/
│   ├── processed/
│   └── analysis/
└── README.md               # This file
```

## Schema

**Session Export** (`session.json`)
- `exportedAt`: ISO 8601 timestamp
- `version`: schema version (currently 1)
- `sessions`: array of session records
  - `sessionId`: unique identifier
  - `studentId`: pseudonymous student ID (see Pseudonym Policy below)
  - `startedAt`, `endedAt`: timestamps
  - `levelProgression`: array of level numbers attempted
  - `attempts`: array of question attempt records
  - `hintUsage`: array of hint events
  - `sessionTelemetry`: error counts, state snapshots

## Pseudonym Policy

**Student privacy is enforced at export time.**

- Raw exports use pseudonymous `studentId` (hash-based, not linkable to real identities)
- No student names, email addresses, or device identifiers are stored
- Each `installId` (device fingerprint) is local-only and never transmitted
- Session records are rotated after 90 days (per `persistence-spec.md §3.1`)

## Processing Pipeline

1. **Raw export**: developer downloads `questerix-YYYY-MM-DD.json` from Settings page
2. **Anonymization**: student records are re-keyed with stable pseudonyms
3. **Aggregation**: per-level metrics (completion rate, error rate, hint frequency)
4. **Analysis**: cross-cycle trends, misconception prevalence, difficulty calibration

Raw exports are in `.gitignore` and must never be committed.

## Analysis Outputs

- `metrics.json`: completion rates, error rates, hint usage per level
- `misconceptions.json`: frequency of detected misconception traps
- `calibration.json`: difficulty tier validation (target: ≥80% success rate on easy, 50–70% on medium)

## Constraints Verified

- **C1**: All levels load without errors ✓ (completion rate)
- **C2**: Hint system prevents frustration ✓ (hint usage patterns)
- **C3**: Misconception detection accuracy ✓ (false positive/negative rates)
- **C8–C10**: Performance, bundle size, accessibility (log analysis)

---

**Last updated**: Phase 11.7
