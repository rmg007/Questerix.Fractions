/**
 * CompareInteraction — two BarModels side-by-side; tap relation button.
 * per activity-archetypes.md §5 (L6, L7)
 */

import * as Phaser from 'phaser';
import { CLR, HEX } from '../utils/colors';
import { BarModel } from './utils';
import { SymbolicFractionDisplay } from '../../components/SymbolicFractionDisplay';
import { TestHooks } from '../utils/TestHooks';
import type { Interaction, InteractionContext } from './types';

const RELATION_TESTID: Record<'<' | '=' | '>', string> = {
  '>': 'compare-relation-gt',
  '=': 'compare-relation-eq',
  '<': 'compare-relation-lt',
};

type FractionRef = string | { numerator: number; denominator: number; label?: string } | undefined;

interface ComparePayload {
  fractionA?: FractionRef;
  fractionB?: FractionRef;
  leftLabel?: string;
  rightLabel?: string;
}

// Accepts "1/2", "frac:1/2", or {numerator, denominator}. The "frac:" ID prefix
// is the curriculum's canonical reference format for fractions.
function parseFrac(ref?: FractionRef): { n: number; d: number; label?: string } {
  if (!ref) return { n: 1, d: 2 };
  if (typeof ref === 'object') {
    const out: { n: number; d: number; label?: string } = { n: ref.numerator, d: ref.denominator };
    if (ref.label !== undefined) out.label = ref.label;
    return out;
  }
  const stripped = ref.startsWith('frac:') ? ref.slice(5) : ref;
  const [n, d] = stripped.split('/').map(Number);
  return { n: n ?? 1, d: d ?? 1 };
}

export class CompareInteraction implements Interaction {
  readonly archetype = 'compare' as const;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private bars: BarModel[] = [];
  private fractionDisplays: SymbolicFractionDisplay[] = [];

  mount(ctx: InteractionContext): void {
    const { scene, template, centerX, centerY, onCommit } = ctx;
    const payload = template.payload as ComparePayload;

    const aFrac = payload.fractionA ? parseFrac(payload.fractionA) : parseFrac(payload.leftLabel);
    const bFrac = payload.fractionB ? parseFrac(payload.fractionB) : parseFrac(payload.rightLabel);
    const aLabel = aFrac.label ?? payload.leftLabel ?? `${aFrac.n}/${aFrac.d}`;
    const bLabel = bFrac.label ?? payload.rightLabel ?? `${bFrac.n}/${bFrac.d}`;

    const barW = 220;
    const barH = 48;
    const gap = 80;

    // Top bar — fraction A (accent-a yellow)
    const aBar = new BarModel(scene, {
      x: centerX,
      y: centerY - 80,
      width: barW,
      height: barH,
      numerator: aFrac.n,
      denominator: aFrac.d,
      label: aLabel,
      fillColor: CLR.accentA,
    });
    this.bars.push(aBar);

    // Bottom bar — fraction B (accent-b purple)
    const bBar = new BarModel(scene, {
      x: centerX,
      y: centerY - 80 + barH + gap,
      width: barW,
      height: barH,
      numerator: bFrac.n,
      denominator: bFrac.d,
      label: bLabel,
      fillColor: CLR.accentB,
    });
    this.bars.push(bBar);

    // Symbolic notation below bars
    const aDisplay = new SymbolicFractionDisplay(
      scene,
      centerX,
      centerY - 80 + barH + 30,
      aFrac.n,
      aFrac.d,
      {
        fontSize: '20px',
        color: HEX.neutral900,
      }
    );
    this.fractionDisplays.push(aDisplay);

    const bDisplay = new SymbolicFractionDisplay(
      scene,
      centerX,
      centerY - 80 + barH + gap + barH + 30,
      bFrac.n,
      bFrac.d,
      { fontSize: '20px', color: HEX.neutral900 }
    );
    this.fractionDisplays.push(bDisplay);

    // Relation buttons
    const btnY = centerY + 120;
    const defs: Array<{ label: string; val: '<' | '=' | '>' }> = [
      { label: 'Top is bigger', val: '>' },
      { label: 'Equal', val: '=' },
      { label: 'Bottom is bigger', val: '<' },
    ];

    defs.forEach(({ label, val }, i) => {
      const bx = centerX - 220 + i * 220;
      const bg = scene.add
        .rectangle(bx, btnY, 180, 56, CLR.primarySoft)
        .setStrokeStyle(2, CLR.primary)
        .setDepth(6);
      scene.add
        .text(bx, btnY, label, {
          fontSize: '14px',
          fontFamily: '"Nunito", system-ui, sans-serif',
          fontStyle: 'bold',
          color: HEX.primary,
          align: 'center',
          wordWrap: { width: 168 },
        })
        .setOrigin(0.5)
        .setDepth(7);
      const hit = scene.add
        .rectangle(bx, btnY, 180, 56, 0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(8);
      const aVal = aFrac.n / aFrac.d;
      const bVal = bFrac.n / bFrac.d;
      const submit = () => {
        const correct = aVal > bVal ? '>' : aVal < bVal ? '<' : '=';
        onCommit({ relation: val, correct: val === correct });
      };
      hit.on('pointerup', submit);
      TestHooks.mountInteractive(RELATION_TESTID[val], submit, {
        top: `${(btnY / 1280) * 100}%`,
        left: `${(bx / 800) * 100}%`,
        width: '180px',
        height: '56px',
      });
      this.gameObjects.push(bg, hit);
    });
  }

  unmount(): void {
    (Object.values(RELATION_TESTID) as string[]).forEach((id) => TestHooks.unmount(id));
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.bars.forEach((b) => b.destroy());
    this.bars = [];
    this.fractionDisplays.forEach((d) => d.destroy());
    this.fractionDisplays = [];
  }
}
