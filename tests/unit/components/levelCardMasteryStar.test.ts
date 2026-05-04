/**
 * Unit tests for levelCardMasteryStar component.
 * Tests gold star rendering for mastery thresholds and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { levelCardMasteryStar } from '@/components/levelCardMasteryStar';
import { makeScene } from './helpers';

describe('levelCardMasteryStar', () => {
  it('renders a gold star when mastery >= 0.85 (happy path)', () => {
    const scene = makeScene();
    const star = levelCardMasteryStar(scene, { x: 100, y: 100, mastered: 0.85 });

    expect(star).toBeDefined();
    expect(star.container).toBeDefined();
    expect(star.visible).toBe(true);
  });

  it('does not render star when mastery < 0.85', () => {
    const scene = makeScene();
    const star = levelCardMasteryStar(scene, { x: 100, y: 100, mastered: 0.84 });

    expect(star.visible).toBe(false);
  });

  it('handles boundary case: mastery = 0.849 (just below threshold)', () => {
    const scene = makeScene();
    const star = levelCardMasteryStar(scene, { x: 100, y: 100, mastered: 0.849 });

    expect(star.visible).toBe(false);
  });

  it('handles boundary case: mastery = 1.0 (perfect score)', () => {
    const scene = makeScene();
    const star = levelCardMasteryStar(scene, { x: 100, y: 100, mastered: 1.0 });

    expect(star.visible).toBe(true);
  });

  it('handles undefined mastery gracefully', () => {
    const scene = makeScene();
    const star = levelCardMasteryStar(scene, { x: 100, y: 100, mastered: undefined });

    expect(star).toBeDefined();
    expect(star.visible).toBe(false);
  });

  it('cleans up on destroy', () => {
    const scene = makeScene();
    const star = levelCardMasteryStar(scene, { x: 100, y: 100, mastered: 0.9 });

    expect(() => star.destroy()).not.toThrow();
  });
});
