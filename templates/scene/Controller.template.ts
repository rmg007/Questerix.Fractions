// TODO: scaffolded by npm run scaffold:scene. Replace stubs and remove this comment.
/**
 * __NAME__Controller — orchestration logic for __NAME__Scene.
 *
 * Owns input wiring, game-object lifecycle, and the per-scene state object.
 * The Phaser.Scene stays thin; behaviour goes here so the scene file stays
 * within the 600 LOC budget enforced by the LOC hook + ESLint `max-lines`.
 */

import type * as Phaser from 'phaser';
import { create__NAME__State, type __NAME__State } from './__NAME__State';

export class __NAME__Controller {
  private state: __NAME__State;

  constructor(private readonly scene: Phaser.Scene) {
    this.state = create__NAME__State();
  }

  /** Wire scene listeners + create initial game objects. */
  mount(): void {
    // TODO: build UI, register input handlers, subscribe to engine events.
    void this.scene;
    void this.state;
  }

  /** Mirror of `mount` — release every listener / tween / DOM node it created. */
  unmount(): void {
    // TODO: kill tweens, remove listeners, unmount DOM sentinels.
  }

  /** Read-only snapshot for tests / debugging. */
  snapshot(): Readonly<__NAME__State> {
    return this.state;
  }
}
