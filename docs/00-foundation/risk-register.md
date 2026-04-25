---
title: Risk Register
status: active
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
related:
  - ../50-roadmap/mvp-l1-l9.md
  - ../30-architecture/persistence-spec.md
  - ../30-architecture/runtime-architecture.md
  - ../30-architecture/content-pipeline.md
---

# Risk Register

## Purpose

Single source for all project risks across the MVP lifecycle. Per audit §4.1, risks were previously scattered across `mvp-l1-l9.md` §3.4/§4.4/§5.4, `persistence-spec.md` §9, and `runtime-architecture.md` §10. This register consolidates them into one tracked list, assigns IDs, and adds entries not yet captured in those sections.

**Review cadence:** quarterly during pre-MVP (Phase 0–1); monthly during validation cycles (Phase 3–4).

---

## Risk Register

| ID | Category | Risk | Likelihood | Impact | Current Mitigation | Residual Risk | Owner | Source Doc |
|----|----------|------|-----------|--------|-------------------|---------------|-------|-----------|
| R-01 | technical | Phaser 4 bundle-size budget overrun — Phaser 4 vendor chunk exceeds 350 KB gzipped target, pushing total initial transfer past 1.0 MB | M | M | Vite code-splitting; Phaser in isolated vendor chunk; rollup-plugin-visualizer in CI | Phaser 4 is still new; actual bundle size not yet measured | solo | `../30-architecture/stack.md §4` |
| R-02 | technical | IndexedDB quota eviction before PWA install — iOS Safari ITP evicts storage after 7 days of non-use if app is not installed as PWA | M | H | Install prompt surfaced on Day 1; `navigator.storage.persist()` called after first engagement | Some families will not install the PWA; first sessions remain fragile | solo | `../30-architecture/persistence-spec.md §9` |
| R-03 | technical | User declines `persist()` request — storage.persist denied, leaving progress vulnerable to OS-level eviction | L | H | Auto-prompt JSON backup after 5 sessions if persist not granted | User may ignore backup prompts | solo | `../30-architecture/persistence-spec.md §9` |
| R-04 | technical | Schema migration corrupts dynamic data — a Dexie version upgrade runs incorrectly and loses student progress records | L | H | Migrations run inside `versionchange` transaction; snapshot fixtures tested before each release | Complex multi-table migrations carry non-zero corruption risk | solo | `../30-architecture/persistence-spec.md §9` |
| R-05 | technical | Drag-and-drop on touch is unreliable — Phaser's built-in drag plugin misbehaves on certain iOS/Android combinations (multi-touch, scroll conflict, offset issues) | M | H | Use Phaser built-in drag; no custom touch code; tested on iPhone SE + iPad 9th gen baseline devices | iOS WebKit pointer-event quirks are a known pain point | solo | `../50-roadmap/mvp-l1-l9.md §3.4` |
| R-06 | technical | Phaser 4 API unfamiliarity — Phase 1 estimate may underrun due to learning-curve rework on Phaser 4's redesigned plugin and scene systems | M | M | Budget extra week in Phase 1; first activity is explicitly the learning-curve activity | Schedule slip likely; scope compression risk if budget is consumed by ramp-up | solo | `../50-roadmap/mvp-l1-l9.md §3.4` |
| R-07 | technical | BKT prior misspecification — pInit/pTransit/pSlip/pGuess priors from level specs are wrong for this population, causing mastery gates to be too easy or too hard | M | M | Start with priors from `level-01.md`; retune after Phase 2 Cycle A data; BKT formulas are pure functions (testable) | Poor prior calibration will produce incorrect progression recommendations during Cycle A | solo | `../50-roadmap/mvp-l1-l9.md §3.4` |
| R-08 | technical | Model deprecation mid-build — Haiku 4.5 or Sonnet 4.6 deprecated by Anthropic during the ~5-month build window, breaking the content pipeline | L | M | Pipeline uses named model IDs; swap takes < 1 hour; content pipeline is a build-time tool not runtime | Regeneration is needed if schema changes after deprecation; cost may change | solo | `../30-architecture/content-pipeline.md §6.3` |
| R-09 | content | Content-pipeline cost spike — LLM pricing changes or regen loops drive cost significantly above the $3–$8 per full-build estimate | L | L | Budget alarm set at $20 per Anthropic account; full regeneration is infrequent | Trivial financial risk; only meaningful if many regen cycles occur | solo | `../30-architecture/content-pipeline.md §6.4` |
| R-10 | content | Authoring fatigue — hand-authoring ~250 templates plus hints and misconception tags across 9 levels causes quality to degrade in later levels | M | M | Parameterized generation via content pipeline; per `scope-and-sequence.md §4`; spot-check 30 templates per run | L6–L9 templates may receive less editorial scrutiny than L1–L2 | solo | `../50-roadmap/mvp-l1-l9.md §4.4` |
| R-11 | content | Validator parity drift — Python pipeline validators and TypeScript runtime validators diverge over time, causing the pipeline to pass templates the runtime rejects | M | H | Conformance test (`test_validators_match_ts.py`) runs in CI; PRs blocked if validator parity tests fail | A change to one side without updating the other will break content generation silently | solo | `../30-architecture/content-pipeline.md §6.2` |
| R-12 | validation | Classroom recruitment failure — unable to recruit 8–10 students for Cycle B (Phase 3) due to summer scheduling, family travel, school access constraints | M | H | Start recruitment early in Phase 3, not at the end; allow 2-week buffer; fallback to extended family network | Cycle B may require Cycle C if cohort is too small for hypothesis testing | solo | `../50-roadmap/mvp-l1-l9.md §5.4` |
| R-13 | validation | Cycle A reveals fundamental mechanic failure — drag-and-drop partition mechanic is incomprehensible to K–2 students without adult scaffolding | L | H | Cycle A is explicitly the early catch; reschedule Phase 3 to fix before Cycle B | A fundamental mechanic failure would add 4–6 weeks and require full scene rewrites | solo | `../50-roadmap/mvp-l1-l9.md §4.4` |
| R-14 | validation | Mid-cycle bug forces app restart during Cycle B — a crashing defect discovered after Cycle B begins risks data loss and cohort disruption | L | H | Freeze app binary at start of Cycle B; no deploys during cycle; bugs logged for Phase 4 | No recovery path if a crash corrupts the Dexie store for an active participant | solo | `../50-roadmap/mvp-l1-l9.md §5.4` |
| R-15 | scope | Set-fraction scope creep — pressure to add "equivalent fractions" or "fraction of a set" content (Grade 2 CCSS 2.G.3 extensions) before validation completes | M | M | C3 constraint explicitly locks scope to partition/identify/compare; enforced by constraint gate | Feature requests from testers may pressure scope expansion; C3 is the guard | solo | `../00-foundation/constraints.md C3` |
| R-16 | scope | Phase 4 inconclusive result — validation data is insufficient to confirm or refute learning hypotheses, forcing a Cycle C that extends timeline by 4–6 weeks | M | M | Clear pass/fail criteria defined in `learning-hypotheses.md`; Cycle B cohort sized for 80% power | Ambiguous data is a real outcome; accept it as a cost of honest validation | solo | `../50-roadmap/mvp-l1-l9.md §9` |
| R-17 | external | Static CDN provider policy change — Vercel, Netlify, or Cloudflare Pages changes free-tier limits or restricts PWA hosting, requiring migration | L | L | All three providers are suitable fallbacks for each other; migration is < 1 day for a static site | No lock-in; trivial to switch CDN | solo | `../30-architecture/stack.md §2.7` |

---

## Review Cadence

- **Quarterly** (Phase 0–2): owner re-reads this register after each phase gate; updates likelihood/mitigation column for any materialized or changed risks.
- **Monthly** (Phase 3–4, validation cycles): review before each Cycle B session block; escalate any H-impact risks that increase in likelihood.
- **After each phase exit:** update `last_reviewed` date above and note which risks materialized in `mvp-l1-l9.md §10`.
