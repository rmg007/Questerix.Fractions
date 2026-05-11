---
title: React + PixiJS Phase 1 Spike — Scaffolding Spec
description: Concrete file structure, Vite config deltas, and the canonical service singleton pattern for the equal_or_not archetype spike.
status: ready-for-implementation
applies_to: [phase-1]
related: [../00-foundation/decision-log.md#D-32, ../../PLANS/2026-05-10-react-pixijs-migration.md]
---

# React + PixiJS Phase 1 Spike — Scaffolding Spec

**Goal:** Establish the canonical file structure, Vite configuration, and service singleton pattern once, then every subsequent archetype (Phases 2–7) and UI surface (menu, settings) replicates the same shape.

**Spike boundary:** `equal_or_not` archetype only. This is a binary-choice interaction (no drag, no constraints) — the simplest surface for evaluating the React+Pixi boundary and touch/a11y parity.

---

## File Structure (Spike Phase)

New files only; no Phaser deletion yet (Phaser stays until Phase 9).

```text
src/
  app/
    main.tsx                    # NEW: React app entry (replaces scenes/main.ts for spike)
    routes.tsx                  # NEW: wouter router config
    App.tsx                     # NEW: root component, scene selection
    screens/
      MenuScreen.tsx            # NEW: menu (sketch only for spike; full impl Phase 2)
      LevelMapScreen.tsx        # NEW: level map (sketch only; full impl Phase 2)
      LevelScreen.tsx           # NEW: level session wrapper, archetype delegation
      SettingsScreen.tsx        # NEW: settings modal (sketch only; full impl Phase 2)
    hooks/
      useAudio.ts               # NEW: adapter over existing src/audio/ service
      usePreferences.ts         # NEW: user prefs (theme, reduced-motion)
      useLevelProgression.ts    # NEW: subscribe to Dexie progressionStat table
      useEqualOrNotRenderer.ts  # NEW: lifecycle mgmt for equal_or_not Pixi canvas
    services/
      AudioService.ts           # WRAP: existing src/audio/*.ts + isPlaying hook
      PreferencesService.ts     # WRAP: existing src/preferences.ts
      LevelProgressionService.ts # WRAP: existing src/persistence/repositories/* (read-only for spike)
  interactions/
    equal-or-not/
      EqualOrNotRenderer.tsx    # NEW: React wrapper; exports <canvas>, answer props
      renderer.ts               # NEW: Pixi scene for equal_or_not (pointer events, graphics)
      __tests__/
        renderer.test.ts        # NEW: canvas pointer events, answer payload shape
        integration.test.ts      # NEW: mounts <EqualOrNotRenderer /> + validates payload

# No Phaser scenes deleted yet (kept for fallback/rollback)
```

---

## Vite Config Delta

**Goal:** keep the existing vite.config.ts structure, add React-specific entries.

### Add to vite.config.ts

```javascript
// Near the top, after existing imports
import react from '@vitejs/plugin-react';

// In defineConfig({ plugins: [ ... ] }), append:
plugins: [
  // existing phaser plugin
  react(),
],

// Add resolve alias for app imports
resolve: {
  alias: {
    '@app': path.resolve(__dirname, 'src/app'),
    '@interactions': path.resolve(__dirname, 'src/interactions'),
  },
},

// Entry point: now a choice (CLI flag or branch-specific)
// For the spike, default to src/app/main.tsx if it exists
build: {
  // existing build config...
  rollupOptions: {
    input: {
      main: path.resolve(__dirname, 'src/app/main.tsx'),
      // OR fall back to src/main.ts (Phaser) if spike branch not active
    },
  },
},

// Preserve the dev server on port 5000 (no change)
```

**VITE_SPIKE=1 flag:** Use an environment variable to toggle entry point at build time.

```javascript
const isSpikeMode = process.env.VITE_SPIKE === '1';

// In defineConfig:
build: {
  rollupOptions: {
    input: isSpikeMode 
      ? path.resolve(__dirname, 'src/app/main.tsx')
      : path.resolve(__dirname, 'src/main.ts'),
  },
},
```

---

## Service Singleton Pattern (Canonical)

Every service (Audio, Preferences, LevelProgression, etc.) follows this shape. This is the authoritative pattern — copy it verbatim for Phase 2+.

### Example: PreferencesService.ts

```typescript
// src/app/services/PreferencesService.ts

import { useSyncExternalStore } from 'react';
import { Preferences } from 'src/types/preferences';
// existing module (kept from Phaser)
import { preferences as phaserPrefs } from 'src/lib/preferences';

// Single instance (singleton)
class PreferencesServiceImpl {
  private listeners = new Set<() => void>();

  // Subscribe to changes (used by React via useSyncExternalStore)
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Get current snapshot (sync, for useSyncExternalStore)
  getSnapshot(): Preferences {
    // Delegate to existing src/lib/preferences (unchanged)
    return phaserPrefs.get();
  }

  // Convenience methods (same as Phaser version)
  setTheme(theme: 'light' | 'dark') {
    phaserPrefs.setTheme(theme);
    this.notifyListeners();
  }

  setReducedMotion(enabled: boolean) {
    phaserPrefs.setReducedMotion(enabled);
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }
}

const preferencesService = new PreferencesServiceImpl();

// Hook for React (the canonical way to consume the service)
export function usePreferences() {
  return useSyncExternalStore(
    (listener) => preferencesService.subscribe(listener),
    () => preferencesService.getSnapshot(),
  );
}

// Export service itself for non-React code (e.g., Pixi event handlers)
export { preferencesService };
```

### Example: Consuming the service in a React component

```typescript
// src/app/screens/LevelScreen.tsx

import { usePreferences } from '@app/services/PreferencesService';

export function LevelScreen() {
  const prefs = usePreferences(); // triggers re-render on preference change

  return (
    <div style={{ 
      colorScheme: prefs.theme,
      // ... other styles
    }}>
      {/* content */}
    </div>
  );
}
```

### Example: Consuming the service from a Pixi renderer (non-React)

```typescript
// src/interactions/equal-or-not/renderer.ts

import { preferencesService } from '@app/services/PreferencesService';

export function createEqualOrNotCanvas(container: HTMLElement) {
  const prefs = preferencesService.getSnapshot();
  const canvas = new PIXI.Application({
    // ... config using prefs.theme, prefs.reducedMotion
  });

  // Subscribe to future changes
  preferencesService.subscribe(() => {
    const updated = preferencesService.getSnapshot();
    // re-render or update canvas config if needed
  });

  return canvas;
}
```

---

## Validator Payload Contract (Unchanged)

The spike does NOT change validator payloads. The `equal_or_not` validator still receives the same shape as Phaser:

```typescript
// From src/validators/registry.ts (no change)
export type ValidatorResult = {
  isCorrect: boolean;
  outcome: ActivityOutcome; // 'CORRECT' | 'MISCONCEPTION_*' | 'WRONG'
  misconception?: string;
  hintsUsed: string[];
};

// The React renderer produces:
const payload = {
  isCorrect: true,
  outcome: 'CORRECT',
  misconception: undefined,
  hintsUsed: [],
};

// Call validator exactly as before:
import { equal_or_not } from 'src/validators/registry';
const result = equal_or_not(payload);
```

---

## A11yLayer Replacement (Spike Phase)

The spike uses a **DOM-first shell** for accessibility. A11y overlays are real DOM (buttons, select, fieldset), not canvas text.

```typescript
// src/app/screens/LevelScreen.tsx

export function LevelScreen({ archetypeKey }) {
  const [answer, setAnswer] = React.useState<AnswerPayload | null>(null);

  return (
    <>
      {/* Main canvas interaction (Pixi) */}
      <EqualOrNotRenderer
        question={question}
        onAnswer={(payload) => {
          setAnswer(payload);
          // Call validator
          const result = validate(payload);
          // ... progression update
        }}
      />

      {/* Accessibility overlay — real DOM buttons/labels */}
      <div role="region" aria-label="keyboard alternative" className="sr-only">
        <fieldset>
          <legend>Choose:</legend>
          <button onClick={() => setAnswer({ choice: 'left' })}>
            Left option
          </button>
          <button onClick={() => setAnswer({ choice: 'right' })}>
            Right option
          </button>
        </fieldset>
      </div>
    </>
  );
}
```

---

## Testing Spike Outputs

Phase 1 success criteria (verified before committing):

1. **Bundle measurement:**
   - Run `VITE_SPIKE=1 npm run build && npm run measure-bundle`
   - Gzipped size must be ≤ 850 KB (leaves 150 KB margin under 1 MB budget)

2. **Touch responsiveness:**
   - Run `npm run test:e2e -- --grep "equal_or_not"` on real device (iOS Safari, Android Chrome)
   - Tap latency ≤ 100 ms (Playwright trace)

3. **Validator parity:**
   - Run `npm run test:unit -- --filter equal_or_not`
   - Payload shape matches `src/validators/equal_or_not.ts` contract
   - All misconception detectors (MC-*) fire correctly

4. **A11y parity:**
   - Run `npm run test:a11y -- --grep equal_or_not`
   - Keyboard navigation works (Tab, Enter)
   - Screen reader announces choices and feedback

---

## Phase 1 Task Checklist

- [ ] Create `src/app/main.tsx`, `App.tsx`, `routes.tsx`
- [ ] Install React, ReactDOM, @vitejs/plugin-react, wouter
- [ ] Update vite.config.ts with React plugin + VITE_SPIKE=1 support
- [ ] Create PreferencesService (canonical pattern)
- [ ] Create LevelProgressionService (canonical pattern)
- [ ] Create AudioService (canonical pattern)
- [ ] Scaffold MenuScreen, LevelMapScreen, SettingsScreen (empty/sketch only)
- [ ] Create EqualOrNotRenderer.tsx + renderer.ts (Pixi canvas)
- [ ] Write renderer.test.ts + integration.test.ts
- [ ] Run `VITE_SPIKE=1 npm run build && npm run measure-bundle` — must ≤ 850 KB
- [ ] Run `npm run test:unit -- --filter equal_or_not`
- [ ] Run `npm run test:a11y` on equal_or_not
- [ ] Test on real iOS Safari + Android Chrome with Playwright
- [ ] Commit with "phase/2026-05-10-react-pixijs-phase-1-spike" branch

---

## Rollback Trigger

If at any gate (**not** each phase, but each gate):
- Bundle ≥ 900 KB — pause, diagnose, do not proceed
- Touch latency > 100 ms on real devices — pause, diagnose
- Validator parity fails — pause, diagnose
- A11y regressions (keyboard/SR) — pause, diagnose

If unresolvable, revert entire branch and return to Appendix A (Phaser-first agent-friendliness).
