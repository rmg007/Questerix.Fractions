# Plan: Audio — Questerix Fractions

**Status:** Decision recorded — implementation deferred.
**Last updated:** 2026-04-29
**Sibling plans:** [ux-elevation.md](./ux-elevation.md) (references "the audio plan" repeatedly), [harden-and-polish.md](./harden-and-polish.md) (TTS hardening — Phase 3.3).

This file is the seed of the audio plan. It records decisions made now so future work doesn't relitigate them.

---

## Decision: OpenAI `gpt-4o-mini-tts` is the chosen TTS provider

**Status:** **Decided** — 2026-04-29 (user confirmed after listening to samples).
**Implementation:** **Not yet started.** Tracked here for later execution.

### What was decided
1. **No runtime TTS.** The Web Speech API will not be used to synthesize audio at runtime. Voice quality is the reason — every browser/OS variant of Web Speech sounds robotic and varies unacceptably across the 5 device profiles.
2. **All audio is pre-rendered at build time.** Treat audio the same way as images: a generated build artifact, hashed and shipped.
3. **Provider:** **OpenAI `gpt-4o-mini-tts`** — chosen for cost (~$0.015/1k input chars), natural-language voice-instruction support (a single instruction string controls character across the whole catalog), and quality that's competitive with ElevenLabs at a fraction of the price.
4. **End-state from day one.** No half-solutions; no fallback path; no runtime TTS code outside of one optional escape-hatch for free-text player names if/when that feature ships.

### Why this provider over alternatives
- **vs. ElevenLabs:** ElevenLabs has a marginally higher quality ceiling but costs ~10× more. For a K-2 educational app's catalog scope (hundreds of lines, not thousands), the OpenAI quality is sufficient and the cost difference matters at iteration time.
- **vs. Azure Neural / Google WaveNet:** Both are solid and cheaper still, but they require SSML for prosody control rather than natural-language voice instruction. The instruction-style of `gpt-4o-mini-tts` ("warm, curious, gentle, K-2 children's narrator, slow and playful") is easier to keep coherent across 300+ lines and easier to revise as Quest's persona evolves.
- **vs. Voice actor:** Higher quality ceiling, but breaks the "automation" preference. Reserved as a possible future upgrade for Quest's static catalog only (~50 lines, ~$300–800 one-time).

### Why this is the right call pre-release
- Pre-release means we can commit fully to this architecture without backwards-compatibility concerns.
- No PII concerns (synthesis happens at developer machines; no audio data leaves the device at runtime).
- Offline-first preserved (audio ships in the bundle / SW cache).
- Localization-ready (re-run the pipeline with a translated manifest, no code change).
- Identical audio across every device, every browser, every session — eliminates the iOS `voiceschanged` race, eliminates the "first prompt sounds wrong" problem.

---

## Architecture (to be implemented)

This is the target shape; not yet built.

### Pipeline
```
src/lib/quest/copy.ts (manifest, single source of truth — already proposed in ux-elevation.md T2)
                ↓
npm run build:audio
                ↓
For each line: hash text + voice-instruction; if not cached, call OpenAI gpt-4o-mini-tts API
                ↓
Write MP3 to public/audio/{hash}.mp3
                ↓
Write public/audio/manifest.json — keys → hashes
                ↓
At runtime: AudioCatalog.play('quest.greeting.first_run') → resolves hash → plays MP3
```

### Components to build
- `scripts/build-audio.mjs` — the pipeline runner. Reads manifest, hashes each line, calls API for changed lines only, writes outputs. Idempotent. Cache key = `hash(text + voice_instruction + provider_version)`.
- `scripts/check-audio.mjs` — CI gate. Fails the build if any line in the manifest lacks a corresponding clip in the manifest. Catches drift between text and audio.
- `audio.config.ts` — single source of truth for the voice instruction string, provider, model, sample rate, format. Changing the voice instruction triggers a full re-render.
- `src/audio/AudioCatalog.ts` — runtime player. Tiny. Resolves keys to MP3 URLs and plays via `<audio>` or Web Audio API. Honors the existing `preferences.audio` toggle.
- `npm run build` runs `build:audio` before `vite build`. CI runs `check:audio` after.

### Player name interpolation
- WelcomeScene constrains player names to **6 prefab options** (per ux-elevation.md T28).
- For lines using `[name]`: pre-render all 6 variants. ~5 lines × 6 names = 30 extra clips.
- Default to "friend" when name unset.
- **No runtime concatenation, no runtime TTS, no seam.**
- If free-text custom names are ever added later, that single feature would need a runtime escape hatch — but this is explicitly deferred and not designed for now.

### Output budget
- Roughly 50 mascot lines + ~250 prompts + 30 name variants + 15 non-verbal celebrations = **~345 clips**.
- At ~5 KB MP3 mono 64 kbps each: **~1.7 MB total**.
- Sits in its own audio budget separate from the 1 MB JS gzip budget. Add an `audio-bundle-size.mjs` check.

### Voice instruction (working draft — finalize when persona bible lands)
> "Speak as a warm, curious, gentle K-2 children's educational narrator. Pace is slow and playful, with natural breath and pauses. Pitch is slightly higher than neutral. Tone is encouraging and never patronizing. The character is named Quest — a learner on a journey, not a teacher. Treat questions as wondering aloud. Treat correct answers with delight, not exaggeration. Treat wrong answers as still-open, never as failures."

This string lives in `audio.config.ts`. Changing it re-renders the entire catalog — that's the desired property; voice and copy co-evolve.

### Render cost (one-time + iteration)
- Full first render: ~$5–15 total (gpt-4o-mini-tts pricing).
- Iteration: only changed lines re-render (content-hashed cache).
- Even re-rendering the entire catalog on every build is rounding error.

---

## Optional layer: non-verbal celebrations (deferred decision)

Idea floated but not committed: Quest's pure emotional reactions (cheer, think, hmm, oh, yes) could be **non-verbal vocalizations** instead of language — like Animal Crossing animalese or Pokémon cries. Same pipeline produces them (just feed phonetic gibberish like `"ba-da!"`, `"hmmm-mm?"` into the TTS).

**Pros:** zero awkward seams, infinite i18n robustness, ownable character signature.
**Cons:** contradicts ux-elevation.md §4's commitment to Quest modeling thinking with words ("Hmm. I can split this in two.").

**Decision:** ship language-speaking Quest first (the LX position), evaluate non-verbal layering for cheers/celebrations only after the persona has settled in playtest.

---

## What is explicitly out of scope for this plan

- Sound effects (taps, snaps, success chimes, fanfares) — separate task; may use the same provider with non-language phonetic input or use sourced/commissioned SFX.
- Background music — not in product scope.
- Live voice cloning, runtime TTS, or any per-user voice customization.
- Caregiver-recorded voice (idea floated in earlier UX brainstorm; deferred).
- Multilingual rollout — pipeline supports it; content/translation is a separate plan.

---

## Open questions for when this work begins

1. Final voice instruction string — locked when the persona bible (ux-elevation.md §4) is approved.
2. Which sample rate / bitrate balances quality and bundle size — likely 64 kbps mono MP3, but A/B test on iPad Mini speakers.
3. Where do the API credentials live? — likely a developer-only `.env` not in CI; CI uses a cached `public/audio/` directory and only fails if a line is missing, never calls the API itself.
4. Cache strategy in CI — re-render on every PR? Cache via GitHub Actions artifact? Decide when implementing.
