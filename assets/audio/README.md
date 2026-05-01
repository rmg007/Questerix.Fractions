---
title: Audio Assets — Provenance & Licensing
status: active
owner: solo
last_reviewed: 2026-05-01
---

# Audio Assets

This directory holds **source-of-truth audio files** that are processed and curated before shipping. Anything under `assets/` is *not* served to the browser; only the curated subset under `public/audio/` reaches users.

```
assets/audio/
  README.md          # this file
  raw/               # untouched third-party packs (zips + extracted source files)
public/audio/        # curated, optimized, shipped to users
```

---

## Source: Kenney Digital Audio Pack

**Page (canonical):** <https://kenney.nl/assets/digital-audio>
**Direct ZIP URL (download link from the "Continue without donating…" option):**
<https://kenney.nl/media/pages/assets/digital-audio/7492b26e77-1677590265/kenney_digital-audio.zip>

**Downloaded:** 2026-05-01
**Saved to:** `assets/audio/raw/kenney_digital-audio.zip`

### Commands used

```bash
mkdir -p /home/user/Questerix.Fractions/assets/audio/raw
curl -sSL \
  -o /home/user/Questerix.Fractions/assets/audio/raw/kenney_digital-audio.zip \
  "https://kenney.nl/media/pages/assets/digital-audio/7492b26e77-1677590265/kenney_digital-audio.zip"
```

> Note: `curl` is in the `deny` list of the project's committed `.claude/settings.json` (per the C1 "no external data egress" defense-in-depth posture). The download was performed manually from a developer terminal, not by an agent.

### License

**CC0 1.0 Universal (Public Domain Dedication).** No attribution required. Verified on the Kenney pack page; Kenney consistently ships CC0 across the asset library. We choose to record provenance here anyway for our own future-self memory — knowing *where* an asset came from is independent of whether the license demands credit.

CC0 reference: <https://creativecommons.org/publicdomain/zero/1.0/>

---

## Curation policy

The Kenney pack contains 200+ sounds. We ship a small curated subset (~6–8) under `public/audio/`. Selection criteria:

1. Fits C6 — flat + bright, no neon — i.e. clean UI blips, not arcade explosions.
2. Sub-200 KB total across the curated set (audio doesn't count against the 1 MB *gzipped JS* budget but still hits the C7 mobile-load surface).
3. One sound per semantic event, not one per archetype. Target events:
   - `correct` — successful validator result
   - `incorrect` — wrong answer
   - `hint-advance` — hint ladder tier advance
   - `level-complete` — session finished
   - `ui-tap` — generic confirm/back tap (use sparingly to avoid fatigue)

Anything not in the curated set stays in `raw/` and is **not** committed beyond the source zip — no expanding the zip into the working tree. If a future curator needs to audition sounds, they re-extract the zip locally.

---

## How to add a new pack

1. Find the canonical page (kenney.nl, freesound.org, etc.) and verify the license is CC0 or CC-BY (CC-BY needs a credits line in the about/settings screen — open a decision in `docs/00-foundation/decision-log.md` first).
2. Drop the original archive in `assets/audio/raw/<source>_<pack-name>.<ext>`.
3. Append a new section to this README following the same shape as "Source: Kenney Digital Audio Pack" above:
   - Page URL
   - Direct ZIP URL (the actual download endpoint, not the page)
   - Date
   - Exact commands used
   - License with link
4. Curate into `public/audio/` (separate commit, separate concern).
