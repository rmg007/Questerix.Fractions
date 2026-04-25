import * as Phaser from 'phaser';
import { THEME } from '../data/config';
import { GameSystem } from './core/BaseSystem';

/**
 * BackgroundSystem — starfield, grid, nebula clouds, and subtle animated aurora.
 * Owns all background graphics. No game logic.
 */
export default class BackgroundSystem implements GameSystem {
    private scene: Phaser.Scene;
    private stars: { graphics: Phaser.GameObjects.Graphics, speed: number }[] = [];
    private grid: Phaser.GameObjects.Grid | null = null;
    private aurora: Phaser.GameObjects.Graphics | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    create() {
        const { width, height } = this.scene.scale;

        // Deep-space gradient backdrop
        const bg = this.scene.add.graphics();
        bg.fillGradientStyle(
            THEME.colors.bgGradient, THEME.colors.bgGradient,
            THEME.colors.bg, THEME.colors.bg,
            1
        );
        bg.fillRect(0, 0, width, height);

        // Subtle geometric constellation lines
        bg.lineStyle(1, THEME.colors.primary, 0.03);
        for (let i = 0; i < 10; i++) {
            bg.lineBetween(
                Math.random() * width, Math.random() * height,
                Math.random() * width, Math.random() * height
            );
        }

        // Nebula clouds — soft color patches
        this._drawNebula(bg, width * 0.2, height * 0.3, 180, THEME.colors.primary, 0.012);
        this._drawNebula(bg, width * 0.8, height * 0.6, 200, THEME.colors.secondary, 0.008);
        this._drawNebula(bg, width * 0.5, height * 0.15, 140, 0x4488ff, 0.01);

        // Layered star fields with depth
        this._createStarfield(70, 0.04, 0.8);  // Distant
        this._createStarfield(40, 0.08, 1.2);  // Mid
        this._createStarfield(15, 0.14, 1.8);  // Near

        // Subtle grid mesh
        this.grid = this.scene.add.grid(
            width / 2, height / 2, width, height,
            80, 80, 0, 0, THEME.colors.primary, 0.025
        );

        // Aurora layer
        this.aurora = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.SCREEN);
    }

    private _drawNebula(g: Phaser.GameObjects.Graphics, cx: number, cy: number, radius: number, color: number, alpha: number) {
        for (let i = 0; i < 5; i++) {
            const r = radius * (1 - i * 0.15);
            g.fillStyle(color, alpha * (1 - i * 0.15));
            g.fillCircle(cx + (Math.random() - 0.5) * 30, cy + (Math.random() - 0.5) * 30, r);
        }
    }

    private _createStarfield(count: number, alpha: number, maxRadius: number) {
        const { width, height } = this.scene.scale;
        const g = this.scene.add.graphics();
        
        for (let i = 0; i < count; i++) {
            const brightness = 0.4 + Math.random() * 0.6;
            g.fillStyle(0xffffff, alpha * brightness);
            g.fillCircle(
                Math.random() * width,
                Math.random() * height,
                Math.random() * maxRadius
            );
        }
        this.stars.push({ graphics: g, speed: alpha * 8 });
    }

    update() {
        const { width, height } = this.scene.scale;
        const time = this.scene.time.now;

        // Parallax star drift
        this.stars.forEach(s => {
            s.graphics.y += s.speed * 0.08;
            if (s.graphics.y > height) s.graphics.y = -height;
        });

        // Grid breathing
        if (this.grid?.active) {
            this.grid.alpha = 0.04 + Math.sin(time / 1200) * 0.015;
        }

        // Subtle aurora wave
        if (this.aurora?.active) {
            this.aurora.clear();
            const auroraAlpha = 0.015 + Math.sin(time / 3000) * 0.008;
            const offset = Math.sin(time / 2000) * 30;

            this.aurora.fillStyle(THEME.colors.primary, auroraAlpha);
            this.aurora.beginPath();
            this.aurora.moveTo(0, height * 0.3 + offset);
            for (let x = 0; x <= width; x += 20) {
                const y = height * 0.3 + Math.sin((x / width) * Math.PI * 2 + time / 1500) * 40 + offset;
                this.aurora.lineTo(x, y);
            }
            this.aurora.lineTo(width, height * 0.5);
            this.aurora.lineTo(0, height * 0.5);
            this.aurora.closePath();
            this.aurora.fillPath();
        }
    }

    destroy() {
        this.stars.forEach(s => { if (s.graphics?.active) s.graphics.destroy(); });
        this.stars = [];
        if (this.grid?.active) this.grid.destroy();
        this.grid = null;
        if (this.aurora?.active) this.aurora.destroy();
        this.aurora = null;
    }
}
