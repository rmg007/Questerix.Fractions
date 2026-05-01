// TODO: scaffolded by npm run scaffold:scene. Replace stubs and remove this comment.
/**
 * __NAME__State — plain data shape for __NAME__Scene / __NAME__Controller.
 *
 * No Phaser imports, no DOM, no IndexedDB. Pure data so it can be unit-tested
 * and serialised without spinning up a runtime. Per D-30 split mandate.
 */

export interface __NAME__State {
  /** Indicates the controller has finished its mount() pass. */
  ready: boolean;
}

/** Factory — keeps construction explicit and trivially mockable in tests. */
export function create__NAME__State(): __NAME__State {
  return { ready: false };
}
