/**
 * SymbolicFractionDisplay — renders a/b notation below bar models.
 * Uses Phaser Text for responsive scaling.
 */

import * as Phaser from 'phaser';
import { HEX } from '../scenes/utils/colors';
import { BODY_FONT } from '../scenes/utils/levelTheme';

export interface SymbolicFractionOptions {
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export class SymbolicFractionDisplay {
  private text: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    numerator: number,
    denominator: number,
    options: SymbolicFractionOptions = {}
  ) {
    const {
      fontSize = '24px',
      fontFamily = BODY_FONT,
      color = HEX.neutral900,
      align = 'center',
    } = options;

    const notation = `${numerator}/${denominator}`;

    this.text = scene.add.text(x, y, notation, {
      fontSize,
      fontFamily,
      fontStyle: 'bold',
      color,
      align,
      wordWrap: { width: 200 },
    });

    this.text.setOrigin(0.5, 0).setDepth(5);
  }

  setFraction(numerator: number, denominator: number): void {
    this.text.setText(`${numerator}/${denominator}`);
  }

  destroy(): void {
    this.text.destroy();
  }
}
