---
title: Tween Animation Policy — rAF + Token Easings
description: Canonical animation strategy for React + PixiJS stack. No GSAP, no popmotion, no Phaser tweens. One pattern for all phases.
status: active
applies_to: [phases-1-through-9]
related: [../00-foundation/decision-log.md#D-32, react-pixijs-phase-1-spike-scaffolding.md]
---

# Tween Animation Policy — rAF + Token Easings

**Effective:** 2026-05-10 (D-32 decision)

**Short version:** All animation in the React + PixiJS stack uses `requestAnimationFrame` + token-based easing functions from `src/scenes/utils/easings.ts`. No external tween library (GSAP, popmotion, Framer Motion) may be imported without an explicit measured justification and approval gate.

---

## Why This Policy

1. **Bundle cost.** GSAP is ~20 KB gzipped. Popmotion is ~15 KB. Phaser's tween manager is built-in and disappears with Phaser. The current stack has 525.9 KB gzipped; every KB counts.

2. **Simplicity.** Animation in Questerix Fractions is feedback-driven, not narrative:
   - Snap feedback when partitions align
   - Mascot reactions to correct/incorrect answers
   - Hint ladder transitions
   - Partition divider animations
   - Progress bar fill

   These are all simple linear or eased motion over 300–800 ms. rAF + easing tokens handle this without needing a DSL.

3. **Control.** A hand-rolled rAF loop lets us:
   - Respect `prefers-reduced-motion` globally (set once, all tweens honor it)
   - Stop all tweens on demand (e.g., if answer validation interrupts)
   - Measure exact frame times for latency audits

4. **Determinism.** The engine layer (`src/engine/`) already lives on a deterministic tick loop. Canvas animations can subscribe to the same tick, making progression deterministic if needed.

---

## The Pattern

### Easing Token Library (Existing)

`src/scenes/utils/easings.ts` ships easing curves as tokens, not as a tween manager.

```typescript
// Existing curves (from current codebase)
export const easings = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t: number) => 
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  // ...
};
```

These are already in the codebase. No changes needed.

### Canonical Tween Hook (React)

Use this hook for all React-based animations (DOM overlays, progress bars, hint ladder transitions).

```typescript
// src/app/hooks/useTween.ts

import { useEffect, useRef, useState } from 'react';
import { usePreferences } from '@app/services/PreferencesService';
import { easings } from 'src/scenes/utils/easings';

interface TweenConfig {
  from: number;
  to: number;
  duration: number; // milliseconds
  easing: keyof typeof easings;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

export function useTween(config: TweenConfig) {
  const prefs = usePreferences();
  const startTimeRef = useRef<number | null>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    // If reduced-motion is enabled, snap to end value immediately
    if (prefs.reducedMotion) {
      config.onUpdate(config.to);
      config.onComplete?.();
      return;
    }

    const animate = (now: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = now;
      }

      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / config.duration, 1);
      const easeFunc = easings[config.easing];
      const eased = easeFunc(progress);
      const value = config.from + (config.to - config.from) * eased;

      config.onUpdate(value);

      if (progress < 1) {
        animationIdRef.current = requestAnimationFrame(animate);
      } else {
        config.onComplete?.();
      }
    };

    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [config, prefs.reducedMotion]);
}
```

### Usage in a React component

```typescript
// src/app/components/ProgressBar.tsx

import { useState } from 'react';
import { useTween } from '@app/hooks/useTween';

interface ProgressBarProps {
  target: number; // 0–1
  onComplete?: () => void;
}

export function ProgressBar({ target, onComplete }: ProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useTween({
    from: progress,
    to: target,
    duration: 600,
    easing: 'easeOutCubic',
    onUpdate: setProgress,
    onComplete,
  });

  return (
    <div
      style={{
        width: `${progress * 100}%`,
        height: '8px',
        backgroundColor: '#4CAF50',
        transition: 'none', // rAF handles animation, not CSS
      }}
    />
  );
}
```

### Canonical Animation in Pixi (Canvas)

Use the same rAF loop, but animate Pixi object properties directly.

```typescript
// src/interactions/equal-or-not/renderer.ts

import { easings } from 'src/scenes/utils/easings';

function snapFeedback(sprite: PIXI.Sprite) {
  const startTime = performance.now();
  const duration = 300;
  const startScale = sprite.scale.x;
  const targetScale = 1.1;

  function animate(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easings.easeOutCubic(progress);
    const scale = startScale + (targetScale - startScale) * eased;

    sprite.scale.set(scale);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}
```

---

## When to Request an Exception

If a visual effect cannot be achieved with rAF + token easings, request an exception. Process:

1. **Measure the baseline.** Run `npm run build && npm run measure-bundle` with the current rAF approach.
2. **Propose the alternative.** Document which animation(s) need the external library and why.
3. **Measure the cost.** Run `npm run build && npm run measure-bundle` with the external library added.
4. **Quantify the trade-off.** "GSAP adds 20 KB gzipped but enables X effect that rAF cannot achieve."
5. **Add a decision-log entry** (D-NN) approving the exception, citing the measurement.

**Likely candidate for exception:** If mascot reactions or hint ladder transitions require complex Spring physics that are painful to hand-code, Popmotion (~15 KB) or a lightweight Spring library might be justified.

**Not a candidate for exception:** "I want smoother animation" or "GSAP has a cleaner API" — those are preferences, not measured gaps.

---

## Reduced-Motion Handling

Every animation respects `prefers-reduced-motion: reduce` globally. The `usePreferences()` hook supplies the boolean; every `useTween` and rAF loop checks it:

```typescript
// All tweens snap to the end state if reduced-motion is enabled
if (prefs.reducedMotion) {
  config.onUpdate(config.to);
  config.onComplete?.();
  return; // no rAF loop
}
```

This is non-negotiable. K–2 students may have vestibular disorders; respecting the OS-level preference is an accessibility requirement.

---

## Performance Baseline

This policy is expected to:
- Keep bundle size ≤ 1.0 MB gzipped (no external tween library overhead)
- Maintain 60 FPS on real devices (Playwright latency audit: ≤ 100 ms from tap to visible feedback)
- Render snap/feedback animations in 300–800 ms (short, snappy feedback)

If measured results differ, revise this policy via a new decision-log entry.

---

## Phases Checklist

Each phase confirms this policy is applied:

- [ ] Phase 1 (`equal_or_not`): snap feedback via rAF + easeOutCubic
- [ ] Phase 2 (next archetype): feedback animation uses `useTween` or Pixi rAF pattern
- [ ] Phase 3 (next): any new animation follows the pattern
- ...continuing through Phase 9

If a phase invents a different animation approach, the PR audit will flag it. Defer to this document.
