/**
 * Visual primitives for Pixi interactions.
 * Reusable components: buttons, text, shapes, and feedback markers.
 * Per React+PixiJS migration plan §5
 */

import * as PIXI from 'pixi.js';
import { COLORS, STROKE, TYPOGRAPHY, RADIUS } from './tokens';

/**
 * Create a filled rectangle with optional stroke.
 */
export function createRect(
  width: number,
  height: number,
  fill: number = COLORS.buttonInactive,
  stroke: number = COLORS.border,
  strokeWidth: number = STROKE.thin,
  borderRadius: number = RADIUS.sm
): PIXI.Graphics {
  const rect = new PIXI.Graphics();
  rect.beginFill(fill);
  if (strokeWidth > 0) {
    rect.lineStyle(strokeWidth, stroke);
  }
  // Pixi Graphics doesn't natively support border-radius, so we draw a rounded rect approximation
  rect.drawRoundedRect(0, 0, width, height, borderRadius);
  rect.endFill();
  return rect;
}

/**
 * Create a circle with optional stroke.
 */
export function createCircle(
  radius: number,
  fill: number = COLORS.primary,
  stroke: number = COLORS.border,
  strokeWidth: number = STROKE.thin
): PIXI.Graphics {
  const circle = new PIXI.Graphics();
  circle.beginFill(fill);
  if (strokeWidth > 0) {
    circle.lineStyle(strokeWidth, stroke);
  }
  circle.drawCircle(0, 0, radius);
  circle.endFill();
  return circle;
}

/**
 * Create a text label.
 */
export function createText(
  content: string,
  size: number = TYPOGRAPHY.normal,
  fill: number = COLORS.textPrimary,
  fontFamily: string = 'Arial'
): PIXI.Text {
  const text = new PIXI.Text(content, {
    fontFamily,
    fontSize: size,
    fill,
    align: 'center',
  });
  return text;
}

export interface ButtonConfig {
  width: number;
  height: number;
  text: string;
  fill?: number;
  fillActive?: number;
  textColor?: number;
  borderRadius?: number;
  fontSize?: number;
  onClick?: () => void;
  id?: string;
}

/**
 * Create an interactive button with text.
 * Must be added to a container with interactiveChildren enabled.
 */
export function createButton(config: ButtonConfig): PIXI.Container {
  const {
    width,
    height,
    text,
    fill = COLORS.buttonInactive,
    fillActive = COLORS.buttonActive,
    textColor = COLORS.textPrimary,
    borderRadius = RADIUS.md,
    fontSize = TYPOGRAPHY.normal,
    onClick,
    id,
  } = config;

  const container = new PIXI.Container();
  container.eventMode = 'static';
  container.cursor = 'pointer';

  // Background rect
  const bg = createRect(width, height, fill, COLORS.border, STROKE.thin, borderRadius);
  container.addChild(bg);

  // Text label
  const label = createText(text, fontSize, textColor);
  label.anchor.set(0.5);
  label.x = width / 2;
  label.y = height / 2;
  container.addChild(label);

  // Interaction state
  container.addEventListener('pointerdown', () => {
    bg.clear();
    bg.beginFill(fillActive);
    bg.lineStyle(STROKE.thin, COLORS.border);
    bg.drawRoundedRect(0, 0, width, height, borderRadius);
    bg.endFill();
  });

  container.addEventListener('pointerup', () => {
    bg.clear();
    bg.beginFill(fill);
    bg.lineStyle(STROKE.thin, COLORS.border);
    bg.drawRoundedRect(0, 0, width, height, borderRadius);
    bg.endFill();
    if (onClick) onClick();
  });

  container.addEventListener('pointerupoutside', () => {
    bg.clear();
    bg.beginFill(fill);
    bg.lineStyle(STROKE.thin, COLORS.border);
    bg.drawRoundedRect(0, 0, width, height, borderRadius);
    bg.endFill();
  });

  if (id) {
    (container as any).id = id;
  }

  return container;
}

/**
 * Create a visual feedback marker (e.g., checkmark, X).
 */
export function createFeedbackMarker(
  type: 'correct' | 'incorrect',
  size: number = 32
): PIXI.Graphics {
  const color = type === 'correct' ? COLORS.correct : COLORS.incorrect;
  const marker = new PIXI.Graphics();
  marker.lineStyle(STROKE.medium, color);

  if (type === 'correct') {
    // Draw checkmark
    const checkSize = size / 2;
    marker.moveTo(-checkSize / 2, 0);
    marker.lineTo(-checkSize / 4, checkSize / 2);
    marker.lineTo(checkSize / 2, -checkSize / 4);
  } else {
    // Draw X
    const xSize = size / 2;
    marker.moveTo(-xSize, -xSize);
    marker.lineTo(xSize, xSize);
    marker.moveTo(xSize, -xSize);
    marker.lineTo(-xSize, xSize);
  }

  return marker;
}

/**
 * Create a progress bar (horizontal).
 */
export function createProgressBar(
  width: number,
  height: number,
  progress: number, // 0..1
  fillColor: number = COLORS.primary,
  backgroundColor: number = COLORS.backgroundDark
): PIXI.Container {
  const container = new PIXI.Container();

  // Background
  const bg = createRect(width, height, backgroundColor, COLORS.border, STROKE.thin);
  container.addChild(bg);

  // Progress fill
  const fill = createRect(Math.max(0, Math.min(width, width * progress)), height, fillColor);
  container.addChild(fill);

  return container;
}

/**
 * Create a simple line (for dividers, underlines).
 */
export function createLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number = COLORS.border,
  thickness: number = STROKE.thin
): PIXI.Graphics {
  const line = new PIXI.Graphics();
  line.lineStyle(thickness, color);
  line.moveTo(x1, y1);
  line.lineTo(x2, y2);
  return line;
}

/**
 * Tween a container's alpha (fade in/out).
 */
export function tweenAlpha(
  container: PIXI.Container,
  targetAlpha: number,
  duration: number,
  onComplete?: () => void
): void {
  const startAlpha = container.alpha;
  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    container.alpha = startAlpha + (targetAlpha - startAlpha) * progress;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      if (onComplete) onComplete();
    }
  };

  animate();
}

/**
 * Tween a container's position.
 */
export function tweenPosition(
  container: PIXI.Container,
  targetX: number,
  targetY: number,
  duration: number,
  onComplete?: () => void
): void {
  const startX = container.x;
  const startY = container.y;
  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    container.x = startX + (targetX - startX) * progress;
    container.y = startY + (targetY - startY) * progress;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      if (onComplete) onComplete();
    }
  };

  animate();
}
