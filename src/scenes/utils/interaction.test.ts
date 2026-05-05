import { describe, it, expect } from 'vitest';
import { Gesture } from './interaction';

describe('interaction.ts', () => {
  describe('Gesture constants', () => {
    it('exports all required gesture tokens', () => {
      expect(Gesture.tapCancelRadiusPx).toBeDefined();
      expect(Gesture.tapMaxDurationMs).toBeDefined();
      expect(Gesture.longPressMs).toBeDefined();
      expect(Gesture.dragEngageThresholdPx).toBeDefined();
      expect(Gesture.dragCancelRevertMs).toBeDefined();
      expect(Gesture.doubleTapWindowMs).toBeDefined();
      expect(Gesture.snapRadiusPx).toBeDefined();
      expect(Gesture.fingerRestTolerancePx).toBeDefined();
    });

    it('tap-related timings are K–2-friendly', () => {
      // Tap should be quick (children can hold press longer)
      expect(Gesture.tapMaxDurationMs).toBe(250);

      // Long-press should be longer than tap
      expect(Gesture.longPressMs).toBeGreaterThan(Gesture.tapMaxDurationMs);

      // Double-tap window should give kids time to re-tap intentionally
      expect(Gesture.doubleTapWindowMs).toBe(300);
    });

    it('drag-related distances are appropriate for touch', () => {
      // Tap cancel radius should be small (not too sensitive)
      expect(Gesture.tapCancelRadiusPx).toBeLessThan(15);

      // Drag engage threshold should prevent accidental drags
      expect(Gesture.dragEngageThresholdPx).toBeLessThan(10);

      // Snap radius should be large enough for K–2 fine motor
      expect(Gesture.snapRadiusPx).toBeGreaterThanOrEqual(28);

      // Finger rest tolerance should be tiny
      expect(Gesture.fingerRestTolerancePx).toBeLessThan(5);
    });

    it('snap radius is sufficient for K–2 motor skills', () => {
      // Research shows K–2 children need ≥ 28 px snap radius
      expect(Gesture.snapRadiusPx).toBeGreaterThanOrEqual(28);
    });

    it('all values are positive numbers', () => {
      Object.values(Gesture).forEach((val) => {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThan(0);
      });
    });

    it('motion timings are within perceptual limits', () => {
      // Drag cancel revert should be fast enough to feel snappy
      expect(Gesture.dragCancelRevertMs).toBeLessThan(400);

      // All timings should fit within the ~600 ms input-feedback link
      expect(Gesture.longPressMs).toBeLessThan(600);
      expect(Gesture.dragCancelRevertMs).toBeLessThan(600);
    });
  });

  describe('Gesture timeout relationships', () => {
    it('tap must complete before long-press triggers', () => {
      expect(Gesture.tapMaxDurationMs).toBeLessThan(Gesture.longPressMs);
    });

    it('double-tap window is after a single tap', () => {
      expect(Gesture.doubleTapWindowMs).toBeGreaterThanOrEqual(Gesture.tapMaxDurationMs);
    });

    it('double-tap window is before long-press', () => {
      expect(Gesture.doubleTapWindowMs).toBeLessThan(Gesture.longPressMs);
    });
  });

  describe('Gesture distance relationships', () => {
    it('snap radius is larger than tap cancel radius', () => {
      expect(Gesture.snapRadiusPx).toBeGreaterThan(Gesture.tapCancelRadiusPx);
    });

    it('drag engage threshold is smaller than tap cancel radius', () => {
      expect(Gesture.dragEngageThresholdPx).toBeLessThan(Gesture.tapCancelRadiusPx);
    });

    it('finger rest tolerance is the smallest distance', () => {
      const distances = [
        Gesture.tapCancelRadiusPx,
        Gesture.dragEngageThresholdPx,
        Gesture.snapRadiusPx,
        Gesture.fingerRestTolerancePx,
      ];
      expect(Gesture.fingerRestTolerancePx).toBeLessThanOrEqual(Math.min(...distances));
    });
  });
});
