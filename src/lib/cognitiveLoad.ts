/**
 * Cognitive-load budget — reference + jsdoc convention.
 *
 * Per ux-elevation.md §7:
 *
 *   A *cognitive element* is a discrete unit that demands attention from the
 *   player — specifically:
 *     (a) a tap or drag target,
 *     (b) a text passage that must be read to proceed,
 *     (c) a focal visual that conveys state (e.g., Quest, a fraction shape).
 *
 *   A panel that contains multiple targets or multiple passages is *not* one
 *   element; it is the sum of its parts. A purely decorative shape (background
 *   gradient, ambient particle) is not counted.
 *
 *   Maximum 7 cognitive elements per question scene at any time.
 *
 * Convention for scene authors:
 *   - Add `@cognitiveElementCount N` to the jsdoc on each scene's `create()`.
 *   - The number must include Quest, the n/5 chip, and every interactive
 *     surface visible during the active question.
 *   - PR review checks the count is grep-able (`rg "@cognitiveElementCount"`)
 *     and that the asserted count matches the implementation.
 *
 * Example:
 *
 *   class LevelScene extends Phaser.Scene {
 *     /\**
 *      * @cognitiveElementCount 7
 *      * Quest (1) + n/5 chip (2) + back btn (3) + prompt text (4)
 *      *  + answer area (5) + hint btn (6) + submit btn (7)
 *      *\/
 *     create() { ... }
 *   }
 *
 * This module is intentionally tiny — it exposes a single counter helper for
 * scenes that want to assert their count at runtime in dev builds.
 */

/** Hard cap from §7. */
export const MAX_COGNITIVE_ELEMENTS = 7;

/**
 * Assert that the runtime element count does not exceed the budget.
 * No-op in production; in dev, throws with a useful message so developers
 * see the budget violation before code review does.
 */
export function assertCognitiveElementCount(sceneKey: string, count: number): void {
  if (count <= MAX_COGNITIVE_ELEMENTS) return;
  const msg = `[cognitiveLoad] ${sceneKey}: ${count} cognitive elements exceeds budget of ${MAX_COGNITIVE_ELEMENTS}`;
  if (typeof process !== 'undefined' && process.env && process.env['NODE_ENV'] === 'production') {
    // eslint-disable-next-line no-console
    console.warn(msg);
  } else {
    throw new Error(msg);
  }
}
