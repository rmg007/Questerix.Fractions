import * as Phaser from 'phaser';
import { THEME, Level, FRACTIONS } from '../data/config';
import { GameSystem } from './core/BaseSystem';

export interface TargetData {
    x: number;
    y: number;
    radius: number;
}

/**
 * TargetSystem — manages the destination shape with enhanced technological visuals.
 * Now includes animated scanning lines and a holographic shimmer effect.
 */
export default class TargetSystem implements GameSystem {
    public target: TargetData | null = null;
    public targetContainer: Phaser.GameObjects.Container | null = null;
    private scene: Phaser.Scene;
    private scanLine: Phaser.GameObjects.Graphics | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    create(level: Level) {
        const { width, height } = this.scene.scale;
        const radius = 130;
        const cx = width / 2;
        const cy = height * 0.38;
        const shape = level.shape || 'circle';

        this.target = { x: cx, y: cy, radius };
        this.targetContainer = this.scene.add.container(cx, cy);

        const g = this.scene.add.graphics();
        this.targetContainer.add(g);

        // --- 1. Deep Core Base ---
        g.fillStyle(0x020308, 1); 
        
        if (shape === 'circle') {
            g.fillCircle(0, 0, radius);
            g.lineStyle(1, THEME.colors.primary, 0.08);
            g.strokeCircle(0, 0, radius * 0.66);
            g.strokeCircle(0, 0, radius * 0.33);
        } else if (shape === 'square') {
            g.fillRect(-radius, -radius, radius * 2, radius * 2);
            g.lineStyle(1, THEME.colors.primary, 0.08);
            g.strokeRect(-radius * 0.5, -radius * 0.5, radius, radius);
        } else if (shape === 'rectangle') {
            g.fillRect(-radius * 1.3, -radius * 0.8, radius * 2.6, radius * 1.6);
            g.lineStyle(1, THEME.colors.primary, 0.08);
            g.strokeRect(-radius * 0.65, -radius * 0.4, radius * 1.3, radius * 0.8);
        }

        // --- 2. Technological Rim with double border ---
        g.lineStyle(4, 0x1a243d, 1);
        if (shape === 'circle') g.strokeCircle(0, 0, radius);
        else if (shape === 'square') g.strokeRect(-radius, -radius, radius * 2, radius * 2);
        else if (shape === 'rectangle') g.strokeRect(-radius * 1.3, -radius * 0.8, radius * 2.6, radius * 1.6);
        
        // Inner bright accent line
        g.lineStyle(1, THEME.colors.primary, 0.4);
        if (shape === 'circle') g.strokeCircle(0, 0, radius - 2);
        else if (shape === 'square') g.strokeRect(-radius + 2, -radius + 2, radius * 2 - 4, radius * 2 - 4);
        else if (shape === 'rectangle') g.strokeRect(-radius * 1.3 + 2, -radius * 0.8 + 2, radius * 2.6 - 4, radius * 1.6 - 4);

        // Outer soft glow line
        g.lineStyle(2, THEME.colors.primary, 0.06);
        if (shape === 'circle') g.strokeCircle(0, 0, radius + 6);
        else if (shape === 'square') g.strokeRect(-radius - 6, -radius - 6, radius * 2 + 12, radius * 2 + 12);
        else if (shape === 'rectangle') g.strokeRect(-radius * 1.3 - 6, -radius * 0.8 - 6, radius * 2.6 + 12, radius * 1.6 + 12);

        // --- 3. Animating Data Arcs (circle only) ---
        if (shape === 'circle') {
            for (let arcIdx = 0; arcIdx < 3; arcIdx++) {
                const techArc = this.scene.add.graphics();
                const arcAlpha = 0.35 - arcIdx * 0.08;
                const arcRadius = radius - 12 - arcIdx * 8;
                techArc.lineStyle(1.5, THEME.colors.primary, arcAlpha);
                techArc.beginPath();
                techArc.arc(0, 0, arcRadius, arcIdx * 0.6, arcIdx * 0.6 + 1.2);
                techArc.strokePath();
                this.targetContainer.add(techArc);

                this.scene.tweens.add({
                    targets: techArc,
                    rotation: Math.PI * 2,
                    duration: 5000 + arcIdx * 2000,
                    repeat: -1,
                    yoyo: arcIdx === 1
                });
            }
        }

        // --- 4. Segment guides ---
        g.lineStyle(1, THEME.colors.primary, 0.2);
        let cumulative = 0;

        if (shape === 'circle') {
            const startAngle = -Math.PI / 2;
            level.fractions.forEach(fKey => {
                const angle = startAngle + cumulative;
                g.lineBetween(0, 0, Math.cos(angle) * (radius - 5), Math.sin(angle) * (radius - 5));
                cumulative += (Math.PI * 2) / FRACTIONS[fKey].denominator;
            });
            const endAngle = startAngle + cumulative;
            g.lineBetween(0, 0, Math.cos(endAngle) * (radius - 5), Math.sin(endAngle) * (radius - 5));

        } else if (shape === 'square') {
            level.fractions.forEach(fKey => {
                const x = -radius + cumulative;
                if (cumulative > 0) {
                    g.lineStyle(1, THEME.colors.primary, 0.2);
                    g.lineBetween(x, -radius, x, radius);
                    // Tick marks at top and bottom
                    g.lineStyle(2, THEME.colors.primary, 0.4);
                    g.lineBetween(x, -radius, x, -radius + 6);
                    g.lineBetween(x, radius - 6, x, radius);
                }
                cumulative += (radius * 2) / FRACTIONS[fKey].denominator;
            });

        } else if (shape === 'rectangle') {
            const w = radius * 2.6;
            const h = radius * 1.6;
            level.fractions.forEach(fKey => {
                const y = -h / 2 + cumulative;
                if (cumulative > 0) {
                    g.lineStyle(1, THEME.colors.primary, 0.2);
                    g.lineBetween(-w / 2, y, w / 2, y);
                    // Tick marks on left and right
                    g.lineStyle(2, THEME.colors.primary, 0.4);
                    g.lineBetween(-w / 2, y, -w / 2 + 8, y);
                    g.lineBetween(w / 2 - 8, y, w / 2, y);
                }
                cumulative += h / FRACTIONS[fKey].denominator;
            });
        }

        // --- 5. Center hub ---
        g.fillStyle(THEME.colors.primary, 0.15);
        g.fillCircle(0, 0, 8);
        g.lineStyle(1.5, THEME.colors.primary, 0.8);
        g.strokeCircle(0, 0, 3);
        g.fillStyle(THEME.colors.primary, 0.5);
        g.fillCircle(0, 0, 1.5);

        // --- 6. Horizontal scan line (holographic effect) ---
        this.scanLine = this.scene.add.graphics();
        this.targetContainer.add(this.scanLine);
    }

    update() {
        if (!this.scanLine || !this.target) return;
        const time = this.scene.time.now;
        const r = this.target.radius;

        // Scan line sweeps vertically
        this.scanLine.clear();
        const scanY = Math.sin(time / 2000) * r * 0.8;
        const scanWidth = r * 1.8;
        const scanAlpha = 0.04 + Math.sin(time / 400) * 0.02;

        this.scanLine.lineStyle(1, THEME.colors.primary, scanAlpha);
        this.scanLine.lineBetween(-scanWidth, scanY, scanWidth, scanY);

        // Subtle glow around scan line
        this.scanLine.fillStyle(THEME.colors.primary, scanAlpha * 0.5);
        this.scanLine.fillRect(-scanWidth, scanY - 2, scanWidth * 2, 4);
    }

    destroy() {
        if (this.targetContainer?.active) this.targetContainer.destroy(true);
        this.target = null;
        this.targetContainer = null;
        this.scanLine = null;
    }
}
