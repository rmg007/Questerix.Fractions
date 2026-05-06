/**
 * Worked-example CTA — shared helpers for LevelScene and Level01Scene.
 *
 * This module handles:
 *  - Computing whether the "Show me how" gate is open
 *  - Creating the Phaser button (hit target ≥ 100 canvas px height)
 *  - Wiring the click handler (debounced, disabled during playback)
 *  - Registering with A11yLayer for keyboard/SR access
 *
 * per PLANS/2026-05-04-worked-example-flow.md §Phase 2
 */

import * as Phaser from 'phaser';
import { WORKED_EXAMPLE_ATTEMPT_THRESHOLD } from '../scenes/interactions/workedExample';
import type { HintLadder } from '../components/HintLadder';
import type { Interaction } from '../scenes/interactions/types';
import { A11yLayer } from '../components/A11yLayer';
import { tween, Duration, Ease } from '../scenes/utils/motion';
import { applyState } from '../scenes/utils/states';
import { log } from './log';
import { TITLE_FONT, ACTION_BORDER } from '../scenes/utils/levelTheme';

// ── Gate logic ────────────────────────────────────────────────────────────────

/**
 * Returns true when the "Show me how" CTA should be offered:
 *  - at least WORKED_EXAMPLE_ATTEMPT_THRESHOLD wrong attempts, AND
 *  - the hint ladder is exhausted (all tiers shown), AND
 *  - the active interaction implements playWorkedExample()
 */
export function shouldOfferWorkedExample(
  wrongCount: number,
  hintLadder: HintLadder | null,
  activeInteraction: Interaction | null
): boolean {
  if (wrongCount < WORKED_EXAMPLE_ATTEMPT_THRESHOLD) return false;
  if (!hintLadder?.state.exhausted) return false;
  if (typeof activeInteraction?.playWorkedExample !== 'function') return false;
  return true;
}

// ── Button factory ────────────────────────────────────────────────────────────

const DEMO_BTN_ID = 'show-me-how';
const A11Y_DEMO_BTN_ID = 'a11y-show-me-how';
const BTN_W = 420;
const BTN_H = 100; // ≥ 44 CSS px at 360 vp (canvas scale ≈ 0.45): 100 * 0.45 ≈ 45 px ✓
const BTN_SHADOW = 6;
const BTN_R = 32;

// Debounce window per UX contract (§ UX & animation contract)
const DEBOUNCE_MS = 300;

/**
 * Creates and fades in the "Show me how" CTA button.
 *
 * @param scene       The parent Phaser scene.
 * @param x           Canvas X centre of the button.
 * @param y           Canvas Y centre of the button.
 * @param depth       Phaser depth (render order).
 * @param onActivate  Called once per activation (debounced + disabled during playback).
 * @returns           The container; caller is responsible for destroying it.
 */
export function createWorkedExampleButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth: number,
  onActivate: () => void
): Phaser.GameObjects.Container {
  // Shadow layer
  const shadow = scene.add.graphics();
  shadow.fillStyle(ACTION_BORDER, 1);
  shadow.fillRoundedRect(-BTN_W / 2, -BTN_H / 2 + BTN_SHADOW, BTN_W, BTN_H, BTN_R);

  // Face layer (slightly different colour to distinguish from Check button)
  const face = scene.add.graphics();
  face.fillStyle(0x7c3aed, 1); // violet-700 — distinct from amber Check button
  face.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, BTN_R);
  face.lineStyle(4, 0x4c1d95, 1); // violet-900 border
  face.strokeRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, BTN_R);

  const txt = scene.add
    .text(0, 0, '👁 Show me how', {
      fontFamily: TITLE_FONT,
      fontSize: '32px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [shadow, face, txt]).setDepth(depth);
  container.setSize(BTN_W, BTN_H + BTN_SHADOW);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H + BTN_SHADOW),
    Phaser.Geom.Rectangle.Contains
  );
  container.input!.cursor = 'pointer';

  // Debounce + disabled-during-playback guard
  let lastActivatedAt = 0;
  let isDisabled = false;

  container.on('pointerup', () => {
    if (isDisabled) return;
    const now = Date.now();
    if (now - lastActivatedAt < DEBOUNCE_MS) return; // anti-double-tap
    lastActivatedAt = now;
    onActivate();
  });

  // Expose a method to disable/enable the button during demo playback
  (container as WorkedExampleButtonContainer).setDisabled = (disabled: boolean) => {
    isDisabled = disabled;
    applyState(container, disabled ? 'disabled' : 'idle', scene);
  };

  // Fade in from 0 alpha
  container.setAlpha(0);
  tween(scene, container, { alpha: 1 }, { duration: Duration.short, ease: Ease.out });

  // Register A11y action
  A11yLayer.mountAction(A11Y_DEMO_BTN_ID, 'Show me how to solve this question', () => {
    if (!isDisabled) onActivate();
  });

  log.scene('worked_example_cta_shown', { x, y });

  return container;
}

/**
 * Extended container type with the `setDisabled` helper attached.
 */
export interface WorkedExampleButtonContainer extends Phaser.GameObjects.Container {
  setDisabled(disabled: boolean): void;
}

// ── Demo orchestration ────────────────────────────────────────────────────────

/**
 * Full worked-example flow:
 *  1. Disable inputs + the CTA itself.
 *  2. Play the archetype animation (or 500 ms stub).
 *  3. Re-enable inputs.
 *  4. Destroy the CTA (it stays hidden until the next wrong-answer cycle).
 *  5. Call reset() so focus goes to the first input.
 *
 * @param scene             The parent Phaser scene.
 * @param interaction       The active interaction (must have playWorkedExample).
 * @param ctaContainer      The button container created by createWorkedExampleButton.
 * @param submitContainer   The scene's Check button (disabled during demo).
 * @param setInputLocked    Scene callback to toggle input lock.
 * @param onDemoComplete    Called after reset() — scene can mark next attempt as ASSISTED.
 */
export async function runWorkedExampleDemo(
  scene: Phaser.Scene,
  interaction: Interaction,
  ctaContainer: WorkedExampleButtonContainer,
  submitContainer: Phaser.GameObjects.Container | null,
  setInputLocked: (locked: boolean) => void,
  onDemoComplete: () => void
): Promise<void> {
  // Disable CTA + normal inputs
  ctaContainer.setDisabled(true);
  submitContainer?.setAlpha(0.4);
  setInputLocked(true);

  // Dim scene background to 40% while demo plays
  const dimOverlay = scene.add.rectangle(0, 0, 800, 1280, 0x000000, 0).setDepth(50).setOrigin(0);
  tween(scene, dimOverlay, { fillAlpha: 0.4 }, { duration: Duration.short, ease: Ease.out });

  try {
    await interaction.playWorkedExample!();
  } catch (err) {
    log.error('DEMO', 'worked_example_failed', { error: String(err) });
  }

  // Restore scene opacity
  tween(
    scene,
    dimOverlay,
    { fillAlpha: 0 },
    { duration: Duration.base, ease: Ease.out, onComplete: () => dimOverlay.destroy() }
  );

  // Re-enable inputs
  setInputLocked(false);
  submitContainer?.setAlpha(1);

  // Destroy CTA — it hides naturally; next wrong-answer cycle may recreate it
  ctaContainer.destroy();
  A11yLayer.unmount(A11Y_DEMO_BTN_ID);

  // Reset interaction focus
  interaction.reset?.();

  log.scene('worked_example_demo_complete');

  // Notify scene so it can mark the next attempt as ASSISTED
  onDemoComplete();
}

// Re-export threshold for use in scenes
export { WORKED_EXAMPLE_ATTEMPT_THRESHOLD };
export { DEMO_BTN_ID };
