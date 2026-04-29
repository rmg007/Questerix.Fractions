---
title: Post-MVP 2029 Parking Lot
status: parking-lot
owner: solo
last_reviewed: 2026-04-24
applies_to: [post-mvp-2029]
related: [mvp-l1-l9.md, ../00-foundation/constraints.md]
---

# Post-MVP 2029 Parking Lot

Everything we are deliberately deferring until **2029-01-01 at the earliest**.

This document exists for one reason: **to prevent good ideas from leaking into MVP planning.** A feature in this list is not rejected. It is _not yet_. By writing it down here, we acknowledge the idea, capture enough context to revisit it later, and free the MVP planning surface from its weight.

Per C1, C2, C3 in [`../00-foundation/constraints.md`](../00-foundation/constraints.md), no item in this document may be referenced as a dependency or assumption in any document tagged `applies_to: [mvp]`.

---

## How This List Is Maintained

- An idea graduates _into_ this list when someone (the user, a stakeholder, the developer) raises it during MVP planning and it doesn't fit the MVP scope.
- An idea graduates _out of_ this list only when (a) MVP validation completes, (b) the post-MVP roadmap planning conversation begins, and (c) the team explicitly decides to schedule it.
- Items here have no priority order. Sorting and prioritization happens in 2029.
- Items here have no estimates. Estimating speculative work is wasted effort.

Each item has the same shape: **what it is, why it's parked, and what would have to change for it to graduate**.

---

## Backend & Identity

### Server-side persistence

**What:** Move student data from IndexedDB to a hosted PostgreSQL database with sync workers, conflict resolution, and multi-device support.
**Why parked:** C1 — no backend until 2029. Hosting cost, maintenance burden, security review, privacy compliance all out of scope until validation passes.
**Graduation trigger:** MVP validation passes; demand for cross-device sync is documented from real users.

### User accounts and authentication

**What:** Email/OAuth/SSO login, password reset flows, account recovery.
**Why parked:** C1, C2. Adds enormous surface area without contributing to validation. The MVP works fine with locally-generated student IDs.
**Graduation trigger:** Same as backend.

### School / district / classroom roster management

**What:** Class codes, teacher rosters, student bulk import, LTI integration with school SISes.
**Why parked:** C2 — no teacher surface until 2029. Premature optimization for a sales motion that doesn't exist.
**Graduation trigger:** Validated efficacy + interested partner schools approaching for licensing.

### Multi-device sync and conflict resolution

**What:** Same student plays on tablet at school and laptop at home; progress merges correctly.
**Why parked:** Requires backend (see above) and conflict resolution algorithm not yet designed.
**Graduation trigger:** Same as backend; second priority after basic sync exists.

---

## Adult-Facing Surfaces

### Teacher dashboard

**What:** Class roster view, per-student progress, mastery heatmap, assignment tools, intervention recommendations.
**Why parked:** C2. Designed for a sales motion that doesn't exist; teachers can already glean enough from looking over a student's shoulder during MVP.
**Graduation trigger:** Multiple teachers requesting a dashboard after using the MVP informally for a semester.

### Parent companion app or report

**What:** Parent-facing summary of child's progress, weekly digest emails, achievement notifications.
**Why parked:** C2. Parents can watch their child play and ask questions. No technical surface adds enough value to justify building.
**Graduation trigger:** Repeated direct requests from parents who have used the MVP.

### Administrator analytics

**What:** District-wide rollups, license utilization, demographic breakdowns, ESSA evidence reports.
**Why parked:** Procurement and licensing are 2029-and-beyond concerns. Building the reports before there are licenses is theatrical.
**Graduation trigger:** First procurement conversation with a real district.

---

## Curriculum Expansion

### Levels 10–15 (Grade 3 fraction operations)

**What:** Addition with like denominators, subtraction, decomposition, mixed numbers, recipe scaling. Activity specs already exist in `_quarantine/RoadMap/04_Level_10_15/`.
**Why parked:** C3. Different mechanics, different validation question. MVP is about partition+identify+compare, not arithmetic.
**Graduation trigger:** MVP validation passes for L1–L9; demand from teachers for next-grade content.

### Level 16+ (Grade 4 reduction, decimals, GCD)

**What:** Reduce to lowest terms, decimal ↔ fraction conversion, GCD discovery, mixed-number arithmetic. Specs exist in `_quarantine/RoadMap/05_Level_16/`.
**Why parked:** Same as L10–L15.
**Graduation trigger:** Same.

### Spanish (and other) localization

**What:** Translate prompts, TTS audio, instructions, UI copy to Spanish. The schema's `localeStrings` field anticipates this.
**Why parked:** Translating before validating risks translating something that gets rewritten. Validate first; localize what survives.
**Graduation trigger:** MVP validation passes.

### Word problems with reading-grade calibration

**What:** Story problems where the _language_ difficulty is calibrated separately from the _math_ difficulty.
**Why parked:** Reading-level calibration is a research project unto itself. The MVP word problems are simple by deliberate scope.
**Graduation trigger:** Validation passes; partnership with reading-research lab.

### Fraction Lab sandbox

**What:** A free-play mode where students compose fractions, build wholes, and explore equivalence without a goal.
**Why parked:** Sandboxes generate deep engagement but are difficult to validate pedagogically. MVP focuses on bounded activities first.
**Graduation trigger:** Mainline activities validated; teacher requests for free exploration mode.

---

## Game Mechanics & Engagement

### Multiplayer / competitive modes

**What:** "Snap Battle" (4-player Snap), "Fraction War," real-time tournaments. Specs in `_quarantine/`.
**Why parked:** Competitive multiplayer demotivates struggling students unless skill-gated. Skill-gating requires backend matchmaking. Both are post-2029.
**Graduation trigger:** Backend exists; validation completed; ELO-style matching designed.

### Seasonal events and challenges

**What:** Weekly tournaments, holiday-themed levels, time-limited cosmetics.
**Why parked:** Engagement-driven content marketing. Distracts from validation.
**Graduation trigger:** Backend; user base large enough to justify the content cycle.

### AI tutor / chatbot

**What:** A natural-language tutor the student can ask questions to.
**Why parked:** Vastly under-validated for elementary math; potential for harm; expensive to operate; raises privacy concerns. Emphatically post-MVP.
**Graduation trigger:** Multi-year track of safety research and supervised classroom pilots, plus parent consent and data-handling reviews. Not before 2030 at earliest.

### Voice input

**What:** Student speaks an answer instead of tapping or dragging.
**Why parked:** Speech recognition for child voices is unreliable; audio capture raises privacy and consent issues; accuracy gain is uncertain.
**Graduation trigger:** Industry-quality child speech recognition matures; clear pedagogical case identified.

### Achievement system, leaderboards, streaks

**What:** Badges, XP economy, daily streak counters, social comparison.
**Why parked:** Light XP exists in MVP. Heavy gamification (streaks, leaderboards) introduces extrinsic motivation that confounds validation. Compete with intrinsic motivation later, after we know intrinsic motivation works.
**Graduation trigger:** Validated MVP; deliberate experiment design comparing intrinsic-only vs. light-extrinsic.

### Avatars, customization, cosmetics

**What:** Character customization, unlockable themes, virtual goods.
**Why parked:** Engagement scaffolding. Doesn't matter if the core teaches. Easy to add later.
**Graduation trigger:** Anytime post-validation.

---

## Accessibility Beyond MVP Baseline

The MVP commits to WCAG 2.1 AA at minimum (touch target sizes, color contrast, reduce-motion mode, keyboard navigation for non-game UI). The following are deferred:

### Full screen reader support for game scenes

**What:** Phaser canvas with full ARIA narration of partition state, drag progress, etc.
**Why parked:** Phaser scenes don't expose accessible DOM by default; building an accessibility layer over the canvas is a substantial effort and requires user research with blind/low-vision children.
**Graduation trigger:** Direct user need identified; partnership with a school for blind/low-vision learners.

### Switch and assistive-device input

**What:** Sequential scanning, switch input, eye-tracker compatibility.
**Why parked:** Same as screen reader; specialized assistive technology requires specialized testing.
**Graduation trigger:** Direct user need; assistive-tech partner.

### Multi-language audio narration

**What:** Pre-recorded native-speaker audio in target locales (vs. current SpeechSynthesis API).
**Why parked:** SpeechSynthesis is functional for MVP. Native audio is content production cost.
**Graduation trigger:** Localization graduates from this list; validation in target locale.

---

## Distribution & Monetization

### iOS / Android native app store presence

**What:** Wrap the PWA in a native shell (Capacitor, etc.) and publish to App Store / Play Store.
**Why parked:** App store review, store listing maintenance, IAP plumbing — all distraction. PWA install from web works fine for MVP.
**Graduation trigger:** Demand from users who don't trust web-installed apps; revenue model exists.

### Subscription, freemium, in-app purchases

**What:** Any monetization mechanism.
**Why parked:** MVP is free. No revenue plan, no payments processor, no subscriber management. Adding monetization confounds engagement metrics ("are they engaged or are they just paid?").
**Graduation trigger:** Validation completes; deliberate decision to convert from free to paid.

### Marketing site, SEO, paid acquisition

**What:** Landing page beyond the app, content marketing, ads.
**Why parked:** No product to market until validation. A simple "what this is" page on the same domain is sufficient for the MVP.
**Graduation trigger:** Post-validation; growth plan.

### Affiliate or curriculum partner integrations

**What:** Embed in third-party curricula; co-branded versions; OEM/white-label.
**Why parked:** Same as accounts and roster management.
**Graduation trigger:** Inbound interest from a credible partner.

---

## Operations

### Real-time analytics dashboard

**What:** Live view of all session activity, real-time metrics, alerting.
**Why parked:** No team to watch a dashboard; validation cohort is small enough to analyze offline from JSON exports.
**Graduation trigger:** Cohort large enough that exports become unwieldy.

### Feature flagging and A/B testing infrastructure

**What:** Flagging system, experiment framework, statistical analysis pipeline.
**Why parked:** Premature; MVP has no mature variants to test.
**Graduation trigger:** Multiple credible variants of a single decision and the budget to evaluate them.

### CI/CD beyond the basics

**What:** Visual regression testing, deploy previews per branch, automatic rollback, canary deploys, dependency-update bots, SBOM generation.
**Why parked:** A PWA on Vercel/Netlify auto-deploys from git push. Sufficient for solo developer at MVP scale.
**Graduation trigger:** Multiple developers; deployment incidents that require fancier tooling.

### SOC 2, ISO 27001, FERPA audit

**What:** Formal compliance audits with external assessors.
**Why parked:** Required for school-district sales. No district sales motion exists during MVP.
**Graduation trigger:** First district procurement conversation.

---

## Research & Validation Beyond MVP

### Randomized controlled trial (RCT)

**What:** Formal experimental study with comparison group, IRB approval, peer-reviewed publication.
**Why parked:** MVP playtest is informal pilot for internal decision-making. RCT is expensive, slow, and only worthwhile after the product has stabilized.
**Graduation trigger:** Stable product; partnership with research university; MVP validation suggests a hypothesis worth formal testing.

### Longitudinal retention study

**What:** Track students over multiple grade levels; measure long-term retention and transfer.
**Why parked:** Multi-year commitment requires backend, accounts, follow-up infrastructure.
**Graduation trigger:** Same as RCT.

### Cross-cultural validation

**What:** Test the mechanic in cohorts where Montessori-derived intuition may not transfer (different cultural framings of fairness, sharing, "equal").
**Why parked:** Localization graduates first; cultural validation comes after that.
**Graduation trigger:** Localization graduates; partner research labs in target regions.

---

## What Goes In This List vs. Just Gets Rejected

This list is for ideas that are **plausibly valuable** but **not now**. Ideas that are **wrong** for this product (e.g., "add NFTs," "add blockchain achievements," "add an AI girlfriend feature") don't go here — they get rejected outright.

A useful test: would someone reasonable, looking at the MVP a year after launch, ask why we don't have it? If yes, park it here. If no, reject it.
