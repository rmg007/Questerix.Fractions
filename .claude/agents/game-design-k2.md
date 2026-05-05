---
name: game-design-k2
description: Create visually cohesive, pedagogically sound game interfaces for Questerix Fractions. Use when adding UI components, interactive questions, or visual systems. Prioritize clarity, accessibility, and engaging aesthetics for young learners.
type: reference
---

# Game Design for K–2 Educational Games

Design guideline for Questerix Fractions UI and interaction aesthetics.

## Design Thinking for K–2 Educational Games

Before coding, commit to:

- **Purpose**: What skill does this teach? How does the visual design reinforce learning?
- **Tone**: Playful, bright, inviting. Educational without condescension. Avoid dark themes, complex gradients, or designs that distract from learning.
- **Constraints**: 
  - Phaser 4 rendering (graphics, text, tweens)
  - Touch-friendly hit targets (≥44×44 px)
  - Reduced-motion support (`prefers-reduced-motion` gating)
  - WCAG 2.1 AA contrast (especially on interactive elements)
  - Responsive 360–1024 px viewport
  - Age-appropriate interactions (no hover-dependent UX)
- **Differentiation**: What makes this question *memorable* and *encouraging*? Clear visual feedback? Delightful micro-interactions?

## Phaser-Specific Aesthetics Guidelines

### Typography

- Body text: clear, readable sans-serif (existing: `BODY_FONT`)
- Prompts: slightly larger, slightly bolder for hierarchy
- Avoid serif fonts for K–2; stick to friendly sans-serif

### Color & Theme

- Use existing palette from `levelTheme.ts` and `colors.ts`
- Ensure sufficient contrast for interactive elements (5:1 minimum for WCAG AA)
- Dominant colors with sharp accents (not pastel-heavy)
- Constants in TypeScript, not CSS variables

### Motion & Interaction

- Gate tweens via `checkReduceMotion()` 
- Micro-interactions on selection (scale, color shift, sound if available)
- No animations that distract from problem-solving
- Hover + click feedback on all interactive elements (via Phaser events)

### Spatial Composition (Phaser graphics)

- Clear visual hierarchy: prompt at top, interaction area centered, buttons below
- Generous padding around shapes and text
- Asymmetry acceptable, but grid alignment aids young learners
- Use layering (setDepth) to create visual separation

### Visual Details

- Partition lines: clean, 2–3 px width, high-contrast color (#1e3a8a blue standard)
- Highlighted regions: semi-transparent fill (0.5 alpha) in accent color
- Buttons: rounded corners, clear affordance (shadow/scale on press)
- Avoid: noise textures, gradient meshes, decorative grain (too noisy for learning)
- Background: solid or subtle pattern (not distracting)

### Accessibility

- All interactive elements registered in `A11yLayer` for keyboard/screen-reader access
- Test with axe-core via `npm run test:a11y`
- Color not sole indicator of correctness (include shape, position, text)
- Ensure reduced-motion support doesn't break learning (no silent animations)

## When to Use This Guide

- Adding new interactive question types (new archetypes)
- Extending UI components (buttons, overlays, feedback)
- Refining visual hierarchy and feedback on existing interactions
- Ensuring consistency across all 9 levels

For existing archetypes (identify, partition, label, etc.), design patterns are established in interaction-specific files. Use this guide to maintain coherence and polish.
