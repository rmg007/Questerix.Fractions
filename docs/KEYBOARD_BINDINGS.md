# Keyboard Bindings — Accessibility

Per Phase 6 (C6.8) and interaction-model.md §9, keyboard and switch-access users can navigate the game using these bindings:

## Canvas/Game Level

- **Arrow Keys (↑↓←→)**: Move fraction handle position during dragging
- **Enter**: Submit current answer or action
- **Escape**: Back to Menu (from any level or dialog)
- **Tab**: Navigate focusable elements (settings, toggles, links)
- **Space**: Activate buttons/toggles (if focused)

## Menu / Settings

- **Tab / Shift+Tab**: Navigate menu options, settings toggles, links
- **Enter / Space**: Activate focused button or link
- **Escape**: Close Settings dialog (if open)

## Skip Link

- **Tab** (from browser address bar): Focus skip link at top of page
- **Enter**: Skip to game canvas and begin playing

## Switch Access Support

Users with switch-access devices can:
1. Tab to any interactive element
2. Use switch to "scan" and select elements
3. Arrow keys work for dragging within the game canvas
4. Enter/Space activate selections

All interactive elements have ≥44×44 hit areas (per C7) and clear ARIA labels for screen reader compatibility.

---

**Testing**: All bindings verified in wcag.spec.ts; Lighthouse accessibility score ≥95.
