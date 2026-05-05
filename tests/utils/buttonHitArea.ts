/**
 * Button hit-area test helpers (Phase 1 — Plan: button-hit-regions).
 *
 * Canvas is 800×1280 px. Phaser Scale.FIT.
 * At the minimum supported viewport (360 CSS px wide): scale = 360/800 = 0.45
 * WCAG 2.5.5 requires 44 CSS px → 98 canvas px minimum on each axis.
 *
 * No Phaser import — works in Node / Vitest without a canvas environment.
 * Duck-types Phaser geometry objects by checking known property names.
 */

/** Minimum canvas pixels on each axis to satisfy WCAG 2.5.5 at 360 CSS px viewport. */
export const MIN_HIT_CANVAS_PX = Math.ceil(44 / (360 / 800)); // 98

/** Anything with a width and height in canvas pixels. */
interface HasDims {
  width: number;
  height: number;
}

/** Phaser.Geom.Circle duck type (has `radius` but no `height`). */
interface CircleLike {
  radius: number;
}

/** Phaser interactive object as attached to a GameObject after setInteractive(). */
interface PhaserInput {
  hitArea?: HasDims | CircleLike | null;
}

/** Minimal duck type for a Phaser.GameObjects.Rectangle. */
interface RectLike extends HasDims {}

/** Minimal duck type for a Phaser.GameObjects.Container with a setSize boundary. */
interface ContainerLike extends HasDims {
  input?: PhaserInput;
}

/** Minimal duck type for any interactive GameObject. */
interface InteractiveLike {
  input?: PhaserInput;
}

function isCircleLike(geom: object): geom is CircleLike {
  return 'radius' in geom && !('width' in geom);
}

function boundingSize(geom: HasDims | CircleLike): { width: number; height: number } {
  if (isCircleLike(geom)) {
    const d = (geom as CircleLike).radius * 2;
    return { width: d, height: d };
  }
  const r = geom as HasDims;
  return { width: r.width, height: r.height };
}

/**
 * Assert that a Phaser interactive GameObject's hit area meets the WCAG 2.5.5
 * minimum of 44 CSS px on each axis at the 360 CSS px minimum viewport.
 *
 * Reads `gameObject.input.hitArea` directly; call after `setInteractive`.
 */
export function expectHitAreaCoversMinTarget(
  go: InteractiveLike,
  label: string,
  minPx = MIN_HIT_CANVAS_PX
): void {
  const input = go.input;
  if (!input) {
    throw new Error(`${label}: GameObject has no input data — was setInteractive() called?`);
  }

  const geom = input.hitArea;
  if (!geom) {
    throw new Error(
      `${label}: input.hitArea is undefined — interactive uses default (visual) bounds`
    );
  }

  const { width, height } = boundingSize(geom as HasDims | CircleLike);

  if (width < minPx || height < minPx) {
    const cssW = (width * 0.45).toFixed(1);
    const cssH = (height * 0.45).toFixed(1);
    throw new Error(
      `${label}: hit area ${width}×${height} canvas px is below the ${minPx} canvas px ` +
        `minimum (= 44 CSS px at 360 vp scale 0.45). ` +
        `CSS equivalent: ${cssW}×${cssH} CSS px.`
    );
  }
}

/**
 * Assert that an interactive Container's effective hit area meets the minimum.
 * Checks `container.input.hitArea` first, falls back to `container.width/height`
 * (set via `container.setSize`).
 */
export function expectContainerHitAreaCoversMinTarget(
  container: ContainerLike,
  label: string,
  minPx = MIN_HIT_CANVAS_PX
): void {
  const input = container.input;
  if (!input) {
    throw new Error(`${label}: Container has no input data — was setInteractive() called?`);
  }

  const geom = input.hitArea;
  if (geom) {
    const { width, height } = boundingSize(geom as HasDims | CircleLike);
    if (width < minPx || height < minPx) {
      throw new Error(
        `${label}: container hit area ${width}×${height} canvas px is below the ${minPx} canvas px minimum.`
      );
    }
    return;
  }

  // Fall back to container.setSize dimensions
  const w = container.width;
  const h = container.height;
  if (w < minPx || h < minPx) {
    throw new Error(
      `${label}: container size ${w}×${h} canvas px is below the ${minPx} canvas px minimum. ` +
        `(No explicit hitArea — container uses setSize bounds.)`
    );
  }
}

/**
 * Assert that a transparent Rectangle used as a hit zone
 * (pattern: `scene.add.rectangle(x,y,w,h,0,0).setInteractive(...)`)
 * meets the minimum target size.
 */
export function expectRectHitZoneCoversMinTarget(
  rect: RectLike,
  label: string,
  minPx = MIN_HIT_CANVAS_PX
): void {
  const w = rect.width;
  const h = rect.height;
  if (w < minPx || h < minPx) {
    const cssW = (w * 0.45).toFixed(1);
    const cssH = (h * 0.45).toFixed(1);
    throw new Error(
      `${label}: Rectangle hit zone ${w}×${h} canvas px is below the ${minPx} canvas px minimum ` +
        `(= 44 CSS px at 360 vp). CSS equivalent: ${cssW}×${cssH} CSS px.`
    );
  }
}
