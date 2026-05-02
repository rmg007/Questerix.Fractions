/**
 * Unit tests for MenuPath.samplePath — the only pure function in the
 * MenuPath module. The drawing helpers (drawPath, drawSoftGlow,
 * drawTaglinePill) all require a live Phaser scene and are exercised by
 * the existing menu E2E flow.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  class Scene {}
  return {
    Scene,
    GameObjects: { Container: class {}, Text: class {}, Rectangle: class {}, Graphics: class {} },
    default: { Scene },
  };
});

import { samplePath } from '@/scenes/utils/MenuPath';

const STD = { stationX: 400, playY: 1100, continueY: 700, settingsY: 420 };

describe('samplePath', () => {
  it('starts at the play station and ends at the settings station', () => {
    const pts = samplePath(STD);
    expect(pts.length).toBeGreaterThan(2);
    expect(pts[0]).toEqual({ x: STD.stationX, y: STD.playY });
    const last = pts[pts.length - 1]!;
    expect(last.x).toBeCloseTo(STD.stationX, 5);
    expect(last.y).toBeCloseTo(STD.settingsY, 5);
  });

  it('passes through the continue station as the midpoint', () => {
    const pts = samplePath(STD);
    const mid = pts[Math.floor(pts.length / 2)]!;
    // Two 48-step bezier segments joined at the continue station — the
    // joint is exactly at index 48 (start of segment 2 = end of segment 1).
    const joint = pts[48]!;
    expect(joint.x).toBeCloseTo(STD.stationX, 5);
    expect(joint.y).toBeCloseTo(STD.continueY, 5);
    // Whatever the midpoint index is, it should lie between PLAY and SETTINGS.
    expect(mid.y).toBeLessThan(STD.playY);
    expect(mid.y).toBeGreaterThan(STD.settingsY);
  });

  it('produces 97 points (1 start + 2 × 48 segment samples)', () => {
    expect(samplePath(STD)).toHaveLength(97);
  });

  it('points are continuous — no gap larger than the longest expected step', () => {
    const pts = samplePath(STD);
    let maxStep = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
      if (d > maxStep) maxStep = d;
    }
    // Loose bound — bezier samples on a curve this size shouldn't exceed
    // ~25px per step at 48 samples.
    expect(maxStep).toBeLessThan(30);
  });
});
