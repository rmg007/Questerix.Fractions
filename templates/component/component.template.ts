// TODO: scaffolded by npm run scaffold:component. Replace stubs and remove this comment.
/**
 * __NAME__ — reusable Phaser component.
 *
 * Components are leaves: they may import Phaser and `A11yLayer`, but never
 * `scenes/`. Per CLAUDE.md (a11y rule) every interactive component registers
 * itself with A11yLayer on mount and unmounts on destroy.
 *
 * Stays under the 300 LOC component budget — extract subclasses if you need
 * more surface area.
 */

import * as Phaser from 'phaser';
import { A11yLayer } from './A11yLayer';

const A11Y_ID = '__NAME__-action';

export interface __NAME__Config {
  scene: Phaser.Scene;
  x: number;
  y: number;
  /** SR-only label exposed to assistive tech via A11yLayer. */
  label?: string;
  /** Invoked when the user activates the component (click / Enter / Space). */
  onActivate?: () => void;
}

export class __NAME__ extends Phaser.GameObjects.Container {
  private readonly label: string;
  private readonly onActivate: () => void;

  constructor(config: __NAME__Config) {
    const { scene, x, y, label = '__NAME__', onActivate = () => {} } = config;
    super(scene, x, y);

    this.label = label;
    this.onActivate = onActivate;

    scene.add.existing(this as Phaser.GameObjects.GameObject);
    this.setDepth(5);

    // a11y rule: every interactive surface mirrors into the DOM A11yLayer.
    A11yLayer.mountAction(A11Y_ID, this.label, () => this.onActivate());
  }

  override destroy(fromScene?: boolean): void {
    A11yLayer.unmount(A11Y_ID);
    super.destroy(fromScene);
  }
}
