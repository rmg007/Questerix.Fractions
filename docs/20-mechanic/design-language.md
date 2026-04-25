---
title: Design Language
status: draft
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
constraint_refs: [C6, C7]
related: [activity-archetypes.md, interaction-model.md, ../00-foundation/constraints.md]
---

# Design Language

The visual contract for Questerix Fractions MVP. Defines colors, type, spacing, motion, and iconography. Replaces the deprecated neon Cosmic Blue + Cyan/Pink palette referenced in the original prototype (`src/data/config.ts THEME` is to be deprecated and migrated against this document).

Per **C6 — Visual Style: Simple + Bright (Not Neon Sci-Fi)**, the aesthetic target is closer to a children's picture book than a sci-fi UI. Flat fills, primary colors, generous whitespace, clear sans-serif type. If a designer reads this and wants to add a glow or gradient, they re-read C6.

---

## 1. Design Principles

1. **The mechanic is the hero.** Visual chrome must never compete with the shape, the partition lines, the number line, or the cards. Backgrounds stay quiet so the math reads loudly.
2. **Bright but not loud.** Saturated primary fills are fine; neon glows, gradients, and translucent stacks are not.
3. **High contrast between learners' targets and everything else.** A drop zone should be unmistakable. A correct/wrong state should be readable in 200 ms.
4. **K–2 fingers and K–2 eyes.** All interactive targets meet WCAG 2.5.5; all type meets WCAG AA contrast. No exceptions for cosmetic reasons.
5. **No ambient motion.** Animation must serve a learning purpose (snap feedback, partition demonstration). Ambient hover-glows, breathing effects, and particle storms are out (C6).

---

## 2. Color Palette

All colors are stated as hex. Phaser's number-typed colors (e.g. `0xFF4D6A`) are derivable by removing the `#`. Light/dark variants are provided for hover and disabled states only — there is no dark theme in the MVP.

### 2.1 Primary

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#2F6FED` | Main brand accent. Active button fills, focused borders, primary CTAs. |
| `primary-soft` | `#D9E5FB` | Tinted backgrounds for selected cards, hover states. |
| `primary-strong` | `#1A4FBF` | Pressed state for primary buttons. |

### 2.2 Accent

Secondary accents used to differentiate fractions in side-by-side displays (e.g. `compare`). One fraction always uses `accent-a`, the other `accent-b`. Never both for the same fraction.

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-a` | `#FFB400` | Sunny yellow. First fraction in comparison views. |
| `accent-b` | `#7B2CBF` | Deep purple. Second fraction in comparison views. |
| `accent-c` | `#0FA968` | Forest green. Used for highlighted regions in identify/label. |

### 2.3 Semantic

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#1FAA59` | EXACT outcome feedback, success confirmations. |
| `success-soft` | `#D6F1E0` | Success-state backgrounds. |
| `error` | `#E5484D` | WRONG outcome feedback. *Used briefly only* — never as a persistent border. |
| `error-soft` | `#FBE3E4` | Error-state backgrounds. |
| `warning` | `#F2A93B` | CLOSE outcome (off-by-a-little) feedback. |

### 2.4 Neutrals

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-0` | `#FFFFFF` | Page background. |
| `neutral-50` | `#F7F8FA` | Surface backgrounds (cards, panels). |
| `neutral-100` | `#EEF0F4` | Dividers, disabled fills. |
| `neutral-300` | `#C5CAD3` | Idle borders. |
| `neutral-600` | `#5B6478` | Secondary text. |
| `neutral-900` | `#101521` | Primary text. |

### 2.5 Forbidden

The following from the original `THEME` palette in `src/data/config.ts` are **deprecated** and must not appear in MVP UI:

- `bg: 0x050810` (near-black background) — replace with `neutral-0`
- `primary: 0x00FFD1` (neon cyan) — replace with `#2F6FED`
- `secondary: 0xFF00FF` (magenta) — replace with `accent-b`
- `magnetNear: 0x00FFAA`, `snapGlow: 0xFFFFFF`, etc. — replace with semantic tokens or remove entirely
- All gradients (`bgGradient`)

The migration of `src/data/config.ts THEME` is tracked separately and is out of scope for this document.

---

## 3. Typography

Per C6, **one** sans-serif family, **two** weights.

### 3.1 Family

```
font-family: "Nunito", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

Nunito is chosen because:
- Rounded letterforms are more legible to young readers than geometric sans (e.g. Inter, Roboto)
- Free via Google Fonts; subset to Latin to keep payload < 30 KB
- Pairs cleanly with simple shape illustrations
- Falls back gracefully to system UI fonts on offline-first scenarios

If Nunito fails to load (offline first session, before service-worker cache), the system fallback chain remains legible without rebuild.

### 3.2 Weights

| Weight | Use |
|--------|-----|
| `400` (regular) | Body text, prompt copy, button labels |
| `700` (bold) | Headings, fraction labels (e.g. "1/2"), level titles |

Italics, light, and extra-bold weights are **not** used.

### 3.3 Size Scale

Fluid sizes scale with viewport. The scale is a 1.25 modular ratio anchored at 16 px on the smallest viewport.

| Token | 360 px viewport | 768 px+ | Usage |
|-------|-----------------|---------|-------|
| `text-xs` | 13 px | 14 px | Caption, debug labels |
| `text-sm` | 14 px | 16 px | Secondary copy, form helpers |
| `text-base` | 16 px | 18 px | Default body |
| `text-lg` | 20 px | 22 px | Question prompts |
| `text-xl` | 24 px | 28 px | Activity titles |
| `text-2xl` | 32 px | 40 px | Level titles, success exclamations |
| `text-display` | 48 px | 64 px | Fraction labels in card form (e.g., big "1/2") |

### 3.4 Line Height + Tracking

- Body: line-height 1.5, letter-spacing 0
- Headings: line-height 1.2, letter-spacing -0.01em
- Fraction labels: line-height 1.0, letter-spacing 0

---

## 4. Spacing Scale

A 4 px base unit. All gaps, paddings, and margins use multiples of this base. Tailwind v4 utility classes map 1:1.

| Token | Value | Common use |
|-------|-------|-----------|
| `space-1` | 4 px | Icon-to-label gap |
| `space-2` | 8 px | Tight grouping inside a card |
| `space-3` | 12 px | Default inner padding small |
| `space-4` | 16 px | Default inner padding |
| `space-6` | 24 px | Card padding, section gap |
| `space-8` | 32 px | Major section gap |
| `space-12` | 48 px | Hero spacing on desktop |
| `space-16` | 64 px | Top/bottom anchor padding on tall portrait screens |

The 4 px base aligns with Tailwind v4 defaults — no custom spacing config needed.

---

## 5. Touch Targets and Hit Areas

Per **C7** and **WCAG 2.5.5**, the minimum interactive target is **44×44 CSS pixels**. The MVP recommends **48×48** as the design target so that *visible* element + comfortable padding still meets the 44 minimum.

Specific minimums:

| Element | Minimum size | Notes |
|---------|--------------|-------|
| Primary button | 56 × 48 | Provides comfortable padding around 18 px label |
| Icon button | 48 × 48 | Icon at 24 px centered |
| Option card (in `identify`) | 88 × 88 | K–2 fingers; matches `level-01.md` examples |
| Drag handle (e.g. partition divider grip) | 44 × 44 | At handle midpoints; the line itself can be thinner |
| Number-line tick label | 44 × 44 hit area | Visible label can be 16 px text |
| Compare-relation buttons (`<` `=` `>`) | 56 × 56 | With 12 px gap between |

When a visible element is smaller than 44 px (e.g., a partition line stroke), an invisible padded hit area extends it.

---

## 6. Animation Principles

Per **C6**, motion exists *only* to reinforce a concept. Every animation must answer "what does this teach the student?" If the answer is "it looks cool," it does not ship.

### 6.1 Allowed motion patterns

| Pattern | Purpose | Duration |
|---------|---------|----------|
| **Snap pulse** | Confirms a piece has docked into a slot | 180–240 ms |
| **Partition demonstration** | Animates the dividing line being drawn (in tutorial / hint contexts) | 400–600 ms |
| **Card return-to-tray** | Communicates a wrong drop without shaming | 350 ms (matches existing `ENGINE_SETTINGS.snap.returnDuration`) |
| **Success bounce** | Brief 1.05× scale on correct answer | 200 ms |
| **Shake** | Wrong-answer feedback; lateral ±3–4 px | 160–180 ms |
| **Reorder slide** | Demonstrates correct sequence in `order` mechanic | 600 ms |

### 6.2 Forbidden motion (per C6)

- Ambient glow / breathing on idle elements
- Particle systems for celebration (use a single ✓ icon instead)
- Continuous gradient shifts
- Parallax background motion
- Animated cursor trails or "magic dust"
- Any motion that runs continuously while the student is thinking

### 6.3 Easing

Default to a single ease curve: `cubic-bezier(0.4, 0, 0.2, 1)` (Material's "standard"). One curve everywhere produces a consistent feel without requiring per-component decisions.

### 6.4 Reduced motion

When `prefers-reduced-motion: reduce` is set (or `DeviceMeta.preferences.reduceMotion === true`):

- Replace all motion with instant state transitions or single-frame fades (≤ 80 ms)
- Snap pulses become static color changes
- Reordering animations become instant rearrangement
- Shake feedback becomes a single border flash

See `interaction-model.md §reduced-motion-mode` for the runtime implementation contract.

---

## 7. Iconography

### 7.1 Style

- **Stroke-based, 2 px stroke**, rounded line caps and joins
- 24 × 24 default size; 16, 20, 32, 48 also available
- Single color (inherits `currentColor` so semantic tokens cascade)
- No filled icons except for state-indicating glyphs (✓ in success, ✗ in error)

### 7.2 Icon set

The MVP uses ~20 icons total. The recommended source is **Lucide Icons** (open license, consistent style, tree-shakable). Required icons:

| Icon | Use |
|------|-----|
| `volume-2` | Audio replay button on prompts |
| `help-circle` | Hint request |
| `check` | Correct answer (filled green inside circle) |
| `x` | Wrong answer (filled red inside circle) |
| `arrow-left` | Back to menu |
| `home` | Home / level select |
| `star` | XP / mastery indicators |
| `settings` | Preferences |
| `download` | Backup-progress export (per persistence-spec §6) |
| `upload` | Restore-progress import |
| `pause` | Pause session |
| `play` | Resume |

### 7.3 Custom illustrations

Shape primitives (circles, rectangles, partition lines) are rendered procedurally by Phaser, not loaded as icons or SVGs. This is deliberate — the math objects are *the* interactive surface, not decoration.

---

## 8. Responsive Breakpoints

Per **C7**, the MVP is responsive from **360 px to 1024 px+**. The breakpoint set is:

| Breakpoint | Min width | Tailwind alias | Target devices |
|------------|-----------|----------------|----------------|
| `xs` (default) | 360 px | (default) | Smallest Android phones, iPhone SE |
| `sm` | 480 px | `sm:` | Larger phones in portrait |
| `md` | 768 px | `md:` | iPad in portrait, large phones in landscape |
| `lg` | 1024 px | `lg:` | iPad in landscape, small desktop |
| `xl` | 1280 px | `xl:` | Desktop |

### 8.1 Layout rules per breakpoint

- **xs/sm:** Single-column layouts. Activity cards stack vertically. Number lines compress to ~280 px usable width.
- **md:** Activity layouts may use 2-column option grids. Number lines extend to ~600 px.
- **lg+:** Center the play area at max ~720 px wide; flank with whitespace. Do not stretch to fill — wider play areas reduce target reachability for small hands on tablets.

### 8.2 Phaser scale strategy

The Phaser canvas continues to use `Phaser.Scale.FIT` (per C7), but the internal logical resolution is now **800 × 1280** (portrait-tall reference) instead of the prototype's 430 × 932. All Phaser-rendered Sprites and Containers use this logical resolution; the engine handles down-scaling on smaller viewports.

The HTML/Tailwind UI surrounding the Phaser canvas (menus, settings modal, toast notifications) uses the responsive breakpoints above.

### 8.3 Orientation

Portrait-first. Landscape on phones is supported by simply rotating the same layout — the play area becomes shorter and wider, and the bottom toolbar shifts to a side toolbar above 600 px viewport width.

---

## 9. Cross-References

- For *how* these visuals respond to user input, see `interaction-model.md`.
- For *which* mechanics use which colors and layouts, see `activity-archetypes.md`.
- The deprecated `THEME` constants in `src/data/config.ts` will migrate against §2 in a separate refactor task.
