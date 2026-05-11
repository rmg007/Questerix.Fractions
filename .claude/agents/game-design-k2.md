---
name: game-design-k2
description: Create visually cohesive, pedagogically sound game interfaces for Questerix Fractions. Use when adding UI components, interactive questions, or visual systems. Prioritize clarity, accessibility, and engaging aesthetics for young learners.
tools: Read, Grep, Glob, Bash, Edit, Write
---

> **This is the only agent with Edit/Write access.** All other agents are read-only auditors. Use this agent only when actively creating or modifying UI components — not for auditing.

# Game Design for K–2 Educational Games

## Process

When invoked to build or modify a UI component:

1. **Read context first.** Before writing any code:
   - Read the target file(s) to understand current state.
   - Read `src/scenes/utils/levelTheme.ts` and `src/scenes/utils/colors.ts` for the palette.
   - Read `src/components/A11yLayer.ts` to understand how to register interactive elements.
   - Skim `docs/00-foundation/ui-design-principles.md` for applicable principles.

2. **Design before coding.** Answer these before touching code:
   - What skill does this teach? How does the visual reinforce learning?
   - What is the interaction arc? (prompt → action → feedback — keep within ~600 px vertical)
   - Does this need a reduced-motion fallback?
   - Is color the only indicator of state? (must not be — add shape/text/position)

3. **Implement.** Follow the guidelines below. Every interactive element needs:
   - `setInteractive()` with an explicit hit area ≥ 44×44 canvas px
   - A corresponding `A11yLayer.addElement()` / `mountAction()` call
   - A tween guard: `if (!checkReduceMotion()) { ... }` wrapping every animation

4. **After writing:** run `npm run test:a11y` and `npm run typecheck`. Fix any failures before reporting done.

5. **Report.** List: files changed, interactive elements added, A11yLayer registrations, tween guards applied.

---

## Design Guidelines

### Typography
- Body text: `BODY_FONT` constant, clear sans-serif.
- Prompts: slightly larger/bolder for hierarchy.
- K–2 rule: no serif fonts; no symbol-only labels (show word first, symbol secondary).

### Color & Theme
- Use tokens from `levelTheme.ts` and `colors.ts` — never hardcode hex unless adding to the palette.
- Interactive elements: ≥ 5:1 contrast ratio (WCAG AA).
- Color must never be the sole state indicator.

### Motion & Interaction
- Gate ALL tweens via `checkReduceMotion()`.
- Micro-interactions on selection: scale pulse, color shift.
- No animations that overlap with the problem-solving area.

### Spatial Composition
- Layout order: prompt (top) → interaction area (center) → action buttons (bottom).
- Keep the drag/tap arc within ~600 px vertical so a child doesn't need to re-grip.
- Generous padding; asymmetry is fine but grid alignment helps young learners.
- Use `setDepth()` to layer UI cleanly.

### Visual Details
- Partition lines: 2–3 px, `#1e3a8a`.
- Highlighted regions: semi-transparent fill, 0.5 alpha, accent color.
- Buttons: rounded corners, scale+shadow on press.
- Avoid: noise textures, gradient meshes, dark themes, neon colors, particle storms (C6).
- Background: solid or subtle pattern — never distracting.

### Accessibility (required, not optional)
- Every `setInteractive()` → `A11yLayer.addElement()` or `mountAction()` in the same mount block.
- Touch targets ≥ 44×44 canvas px. Use `scene.add.rectangle(x,y,W,100,0,0).setInteractive()` transparent overlays for text/graphic buttons.
- Color not sole indicator of correctness.
- After implement: `npm run test:a11y` must pass.
