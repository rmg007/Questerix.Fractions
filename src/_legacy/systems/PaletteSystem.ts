import * as Phaser from 'phaser';
import { FRACTIONS, Level } from '../data/config';
import FractionPiece from '../entities/FractionPiece';
import { GameSystem } from './core/BaseSystem';

/**
 * PaletteSystem — creates draggable fraction pieces with staggered entry animations
 * and enhanced idle behaviors.
 */
export default class PaletteSystem implements GameSystem {
    private scene: Phaser.Scene;
    public pieces: FractionPiece[] = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    create(level: Level, target: { radius: number }) {
        this.pieces = [];
        const { width, height } = this.scene.scale;
        const count = level.fractions.length;
        const shape = level.shape || 'circle';

        const cols = Math.min(4, count);
        const spacing = 100;
        const rowSpacing = 110;
        const startY = height * 0.76;
        const startX = (width - (cols - 1) * spacing) / 2;

        level.fractions.forEach((fKey, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * spacing;
            const y = startY + row * rowSpacing;

            const total = FRACTIONS[fKey].denominator;
            const piece = new FractionPiece(this.scene, x, y, fKey, target.radius, shape, i, total);
            this.pieces.push(piece);

            // Staggered entrance animation: pieces fly in from below
            piece.setAlpha(0);
            piece.y = y + 80;
            this.scene.tweens.add({
                targets: piece,
                y: y,
                alpha: 1,
                duration: 400,
                delay: i * 80,
                ease: 'Back.easeOut',
                onComplete: () => {
                    piece.originPos.y = y; // Reset origin after animation
                }
            });
        });
    }

    update() {
        const time = this.scene.time.now;
        this.pieces.forEach((p, i) => {
            if (p.snapped || p.isDragging || p.isReturning) return;

            // Floating bob: each piece has unique phase
            const phase = i * 1.2;
            p.y = p.originPos.y + Math.sin((time / 900) + phase) * 5;

            // Gentle rotation sway
            p.rotation = Math.sin((time / 1400) + phase) * 0.05;

            // Subtle scale pulse
            const breathe = 0.8 + Math.sin((time / 1200) + phase * 0.7) * 0.015;
            p.setScale(breathe);
        });
    }

    destroy() {
        this.pieces.forEach(p => { if (p?.active) p.destroy(); });
        this.pieces = [];
    }
}
