/**
 * A11yLayer — lifecycle tests.
 * Verifies DOM cleanup, layer stack management, and orphan prevention.
 * Mock levelTheme to avoid Phaser canvas init in jsdom environment.
 */

import { describe, expect, it, afterEach, vi } from 'vitest';

// Mock levelTheme before importing A11yLayer
vi.mock('@/scenes/utils/levelTheme', () => ({
  BODY_FONT: 'Arial',
}));

import { A11yLayer } from '@/components/A11yLayer';
import { expectZeroA11yOrphans, cleanupA11yDOM } from '../../utils/dom-orphan-check';

describe('A11yLayer Lifecycle', () => {
  afterEach(() => {
    A11yLayer.resetAll();
    cleanupA11yDOM();
  });

  describe('pushLayer / popLayer', () => {
    it('creates a new layer in the DOM', () => {
      const layer = A11yLayer.pushLayer('test-modal', 'Test Modal');
      expect(layer).not.toBeNull();
      expect(layer?.id).toBe('qf-a11y-layer-test-modal');
      expect(document.getElementById('qf-a11y-layer-test-modal')).toBe(layer);
    });

    it('appends layer to document.body', () => {
      const layer = A11yLayer.pushLayer('modal', 'Modal');
      expect(layer?.parentElement).toBe(document.body);
    });

    it('sets aria-hidden on previous layer', () => {
      const layer1 = A11yLayer.pushLayer('base', 'Base');
      const layer2 = A11yLayer.pushLayer('modal', 'Modal');

      expect(layer1?.getAttribute('aria-hidden')).toBe('true');
      expect(layer1?.getAttribute('inert')).toBe('');
      expect(layer2?.getAttribute('aria-hidden')).not.toBe('true');
    });

    it('removes layer from DOM on popLayer', () => {
      A11yLayer.pushLayer('test', 'Test');
      expect(document.getElementById('qf-a11y-layer-test')).not.toBeNull();

      A11yLayer.popLayer();
      expect(document.getElementById('qf-a11y-layer-test')).toBeNull();
    });

    it('restores previous layer visibility on popLayer', () => {
      const layer1 = A11yLayer.pushLayer('base', 'Base');
      A11yLayer.pushLayer('modal', 'Modal');
      A11yLayer.popLayer();

      expect(layer1?.getAttribute('aria-hidden')).not.toBe('true');
      expect(layer1?.hasAttribute('inert')).toBe(false);
    });

    it('handles pop on empty stack (no-op)', () => {
      A11yLayer.resetAll();
      expect(() => A11yLayer.popLayer()).not.toThrow();
    });
  });

  describe('layer stacking', () => {
    it('maintains stack order for nested modals', () => {
      A11yLayer.pushLayer('base', 'Base');
      A11yLayer.pushLayer('modal1', 'Modal 1');
      A11yLayer.pushLayer('modal2', 'Modal 2');

      const modal2 = document.getElementById('qf-a11y-layer-modal2');
      expect(modal2?.previousElementSibling?.id).toBe('qf-a11y-layer-modal1');
    });

    it('pops in LIFO order', () => {
      A11yLayer.pushLayer('base', 'Base');
      A11yLayer.pushLayer('modal1', 'Modal 1');
      A11yLayer.pushLayer('modal2', 'Modal 2');

      A11yLayer.popLayer();
      expect(document.getElementById('qf-a11y-layer-modal2')).toBeNull();
      expect(document.getElementById('qf-a11y-layer-modal1')).not.toBeNull();

      A11yLayer.popLayer();
      expect(document.getElementById('qf-a11y-layer-modal1')).toBeNull();
      expect(document.getElementById('qf-a11y-layer-base')).not.toBeNull();
    });
  });

  describe('orphan prevention', () => {
    it('has zero orphans when all layers are popped', () => {
      A11yLayer.pushLayer('base', 'Base');
      A11yLayer.pushLayer('modal', 'Modal');

      A11yLayer.popLayer();
      A11yLayer.popLayer();

      expect(expectZeroA11yOrphans()).toBe(0);
    });

    it('detects orphans if popLayer not called', () => {
      A11yLayer.pushLayer('orphaned', 'Orphaned');
      // Intentionally don't pop

      expect(() => expectZeroA11yOrphans()).toThrow(/A11y layer orphans detected/);
    });

    it('resetAll cleans all orphans', () => {
      A11yLayer.pushLayer('modal1', 'Modal 1');
      A11yLayer.pushLayer('modal2', 'Modal 2');
      // Don't pop — intentionally create orphans

      A11yLayer.resetAll();

      expect(expectZeroA11yOrphans()).toBe(0);
    });
  });

  describe('action mounting', () => {
    it('mounts action button on active layer', () => {
      A11yLayer.pushLayer('test', 'Test');
      const btn = A11yLayer.mountAction('my-btn', 'Click me', () => {});

      expect(btn?.getAttribute('data-a11y-id')).toBe('my-btn');
      expect(btn?.textContent).toBe('Click me');
      expect(document.getElementById('qf-a11y-layer-test')?.contains(btn)).toBe(true);
    });

    it('unmounts single action', () => {
      A11yLayer.pushLayer('test', 'Test');
      A11yLayer.mountAction('my-btn', 'Click me', () => {});

      A11yLayer.unmount('my-btn');

      expect(document.querySelector('[data-a11y-id="my-btn"]')).toBeNull();
    });

    it('unmountAll clears all actions on active layer', () => {
      A11yLayer.pushLayer('test', 'Test');
      A11yLayer.mountAction('btn1', 'Button 1', () => {});
      A11yLayer.mountAction('btn2', 'Button 2', () => {});

      A11yLayer.unmountAll();

      expect(document.querySelector('[data-a11y-id="btn1"]')).toBeNull();
      expect(document.querySelector('[data-a11y-id="btn2"]')).toBeNull();
    });
  });

  describe('live region', () => {
    it('creates live region with proper ARIA attributes', () => {
      A11yLayer.announce('Test message');

      const liveRegion = document.getElementById('qf-a11y-live');
      expect(liveRegion).not.toBeNull();
      expect(liveRegion?.getAttribute('role')).toBe('status');
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion?.getAttribute('aria-atomic')).toBe('true');
    });

    it('exists after layer operations', () => {
      A11yLayer.pushLayer('modal', 'Modal');
      A11yLayer.announce('Message');
      A11yLayer.popLayer();

      const liveRegion = document.getElementById('qf-a11y-live');
      expect(liveRegion).not.toBeNull();
    });
  });
});
