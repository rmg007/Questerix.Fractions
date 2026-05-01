// TODO: scaffolded by npm run scaffold:scene. Replace stubs and remove this comment.
/**
 * __NAME__Scene — thin Phaser surface; logic lives in __NAME__Controller / __NAME__State.
 *
 * Per D-30 (proactive prevention): scenes stay under the 600 LOC budget by
 * keeping wiring here and pushing behaviour to the controller. See
 * `PLANS/agent-tooling-2026-05-01.md` → "Scaffolding that enforces the split".
 */

import * as Phaser from 'phaser';
import { __NAME__Controller } from './__NAME__Controller';

export class __NAME__Scene extends Phaser.Scene {
  private controller: __NAME__Controller | null = null;

  constructor() {
    super({ key: '__NAME__Scene' });
  }

  create(): void {
    this.controller = new __NAME__Controller(this);
    this.controller.mount();
  }

  /**
   * Phaser-style teardown hook. Call from Phaser scene shutdown wiring or
   * route through `this.scene.stop()` — the controller owns its own cleanup.
   */
  preDestroy(): void {
    this.controller?.unmount();
    this.controller = null;
  }
}
