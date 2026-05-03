/**
 * PlacementInteraction — show BarModel, drag marker on NumberLine, commit snapped value.
 * per activity-archetypes.md §10 (L8 primary, L9 secondary)
 */

import * as Phaser from 'phaser';
import { A11yLayer } from '../../components/A11yLayer';
import { BarModel, NumberLine } from './utils';
import type { Interaction, InteractionContext } from './types';
import { NAVY, TEXT_BODY } from '../utils/levelTheme';

interface PlacementPayload {
  targetFracId?: string;
  targetLabel?: string;
  numerator?: number;
  denominator?: number;
  snapCount?: number; // e.g. 8 → snap8
  exactTolerance?: number;
  closeTolerance?: number;
}

function parseFrac(s?: string): { n: number; d: number } {
  if (!s) return { n: 1, d: 2 };
  const [n, d] = s.split('/').map(Number);
  return { n: n ?? 1, d: d ?? 1 };
}

function buildSnaps(count: number): number[] {
  return Array.from({ length: count + 1 }, (_, i) => i / count);
}

export class PlacementInteraction implements Interaction {
  readonly archetype = 'placement' as const;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private bar: BarModel | undefined = undefined;
  private line: NumberLine | undefined = undefined;

  mount(ctx: InteractionContext): void {
    A11yLayer.unmountAll();
    const { scene, template, centerX, centerY, width, onCommit } = ctx;
    const payload = template.payload as PlacementPayload;
    const label = payload.targetLabel ?? payload.targetFracId ?? '?';
    const frac =
      payload.numerator !== undefined
        ? { n: payload.numerator, d: payload.denominator ?? 1 }
        : parseFrac(label);
    const exactTol = payload.exactTolerance ?? 0.05;
    const closeTol = payload.closeTolerance ?? 0.15;
    const snapCount = payload.snapCount ?? 8;
    const snaps = buildSnaps(snapCount);

    // Fraction bar model at top
    this.bar = new BarModel(scene, {
      x: centerX,
      y: centerY - 150,
      width: 240,
      height: 48,
      numerator: frac.n,
      denominator: frac.d,
      label,
      fillColor: NAVY,
    });

    // Build tick marks that match the question's denominator so kids see
    // labelled fraction ticks (e.g. 0, 1/3, 2/3, 1) rather than raw decimals.
    // For halves we keep the existing single midpoint; for other denominators
    // we generate evenly-spaced ticks for every k/d value.
    const tickDenominator = frac.d;
    const tickFractions: number[] =
      tickDenominator > 1
        ? Array.from({ length: tickDenominator + 1 }, (_, i) => i / tickDenominator)
        : [0, 1];

    // Number line with snap positions
    const lineW = Math.min(560, width - 80);
    this.line = new NumberLine(scene, {
      x: centerX,
      y: centerY - 20,
      length: lineW,
      tickFractions,
      ...(tickDenominator > 1 ? { denominator: tickDenominator } : {}),
      snapPositions: snaps,
    });
    // Start the marker on the far end of the line from the correct value so a
    // touch-and-release (which still fires dragend → onCommit) doesn't pre-pass.
    // dragend always commits, so we must avoid initialising on or near the answer.
    const correctValue = frac.n / frac.d;
    const initialMarker = correctValue < 0.5 ? 1 : 0;
    this.line.setMarker(initialMarker);
    const submitPlacement = (value: number) => {
      onCommit({ placedDecimal: value, exactTolerance: exactTol, closeTolerance: closeTol });
    };
    this.line.enableDrag(submitPlacement);
    let lastPlacedValue = initialMarker;
    const wrappedDrag = (value: number) => {
      lastPlacedValue = value;
      submitPlacement(value);
    };
    // Re-wrap the drag with our tracking wrapper
    this.line.enableDrag(wrappedDrag);
    A11yLayer.mountAction('a11y-placement-submit', 'Place marker on number line', () => {
      submitPlacement(lastPlacedValue);
    });

    // Instruction label
    const instrTxt = scene.add
      .text(centerX, centerY + 50, 'Drag the marker to place the fraction', {
        fontSize: '15px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        color: TEXT_BODY,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(6);
    this.gameObjects.push(instrTxt);
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.bar?.destroy();
    this.line?.destroy();
    this.bar = undefined;
    this.line = undefined;
  }
}
