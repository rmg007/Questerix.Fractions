import * as Phaser from 'phaser';
import { THEME } from '../data/config';
import { GameSystem } from './core/BaseSystem';

/**
 * EffectsSystem — Full rewrite with multi-layered snap celebrations,
 * shockwave rejection feedback, and cascading win sequence.
 */
export default class EffectsSystem implements GameSystem {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Premium snap effect: shockwave ring + particle starburst + floating text + screen shake.
     */
    createSnapEffect(x: number, y: number, color: number, targetRadius: number) {
        const scene = this.scene;

        // 1. Screen micro-shake for tactile feedback
        scene.cameras.main.shake(120, 0.003);

        // 2. Flash burst (screen-blend glow)
        const flash = scene.add.graphics().setDepth(50);
        flash.fillStyle(color, 0.35);
        flash.fillCircle(x, y, targetRadius + 40);
        flash.setBlendMode(Phaser.BlendModes.SCREEN);
        scene.tweens.add({
            targets: flash,
            alpha: 0,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 350,
            ease: 'Cubic.easeOut',
            onComplete: () => flash.destroy()
        });

        // 3. Double shockwave rings (inner fast, outer slow)
        this._shockwaveRing(x, y, color, 25, 2.5, 300);
        this._shockwaveRing(x, y, color, 40, 3.2, 450);

        // 4. Core glow with additive blending
        const glow = scene.add.graphics().setDepth(49);
        glow.fillStyle(color, 0.20);
        glow.fillCircle(x, y, targetRadius + 20);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({
            targets: glow, alpha: 0, duration: 500, ease: 'Cubic.easeOut',
            onComplete: () => glow.destroy()
        });

        // 5. Floating confirmation text with dynamic message
        const messages = ['LOCKED!', 'PERFECT!', 'FUSED!', 'ALIGNED!'];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        const txt = scene.add.text(x, y - 20, msg, {
            fontFamily: THEME.fonts.display,
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setResolution(2).setDepth(55);
        txt.setShadow(0, 0, '#' + color.toString(16).padStart(6, '0'), 14, true, true);

        scene.tweens.add({
            targets: txt,
            y: txt.y - 35,
            alpha: 0,
            scale: 1.3,
            duration: 700,
            ease: 'Cubic.easeOut',
            onComplete: () => txt.destroy()
        });

        // 6. Particle starburst
        this._particleStarburst(x, y, color, 28);
    }

    private _shockwaveRing(x: number, y: number, color: number, startRadius: number, endScale: number, duration: number) {
        const ring = this.scene.add.graphics().setDepth(48);
        ring.lineStyle(3, color, 0.85);
        ring.strokeCircle(x, y, startRadius);
        this.scene.tweens.add({
            targets: ring,
            scaleX: endScale,
            scaleY: endScale,
            alpha: 0,
            duration,
            ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy()
        });
    }

    private _particleStarburst(x: number, y: number, color: number, count: number) {
        const scene = this.scene;
        const g = scene.add.graphics().setDepth(50);

        const pts = Array.from({ length: count }, (_, i) => {
            const a = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.3;
            const speed = 3 + Math.random() * 6;
            return {
                x, y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                size: 2 + Math.random() * 3,
                decay: 0.92 + Math.random() * 0.04
            };
        });

        scene.tweens.addCounter({
            from: 1, to: 0, duration: 650,
            onUpdate: (tween) => {
                const life = tween.getValue() ?? 0;
                g.clear();
                pts.forEach(p => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vx *= p.decay;
                    p.vy *= p.decay;
                    p.vy += 0.08; // Micro gravity

                    g.fillStyle(color, life * 0.8);
                    g.fillCircle(p.x, p.y, p.size * life);

                    // Tiny glow around each particle
                    g.fillStyle(color, life * 0.15);
                    g.fillCircle(p.x, p.y, p.size * life * 2.5);
                });
            },
            onComplete: () => g.destroy()
        });
    }

    /**
     * Rejection feedback: soft orange pulse + directional wobble hint.
     */
    showRejectionPulse(x: number, y: number) {
        const scene = this.scene;

        // Gentle screen nudge
        scene.cameras.main.shake(80, 0.002);

        // Warning ring with soft glow
        const pulse = scene.add.graphics().setDepth(45);
        pulse.lineStyle(2.5, THEME.colors.rejectSoft, 0.7);
        pulse.strokeCircle(x, y, 45);
        pulse.fillStyle(THEME.colors.rejectSoft, 0.06);
        pulse.fillCircle(x, y, 45);
        scene.tweens.add({
            targets: pulse,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 400,
            ease: 'Cubic.easeOut',
            onComplete: () => pulse.destroy()
        });

        // Softer rejection message
        const hints = ['ALMOST!', 'CLOSE!', 'TRY AGAIN'];
        const hint = hints[Math.floor(Math.random() * hints.length)];
        const msg = scene.add.text(x, y - 55, hint, {
            fontFamily: THEME.fonts.display,
            fontSize: '14px',
            color: '#ffaa66',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setResolution(2).setDepth(55);

        scene.tweens.add({
            targets: msg,
            y: msg.y - 18,
            alpha: 0,
            duration: 600,
            ease: 'Cubic.easeOut',
            onComplete: () => msg.destroy()
        });
    }

    /**
     * Win flash: cascading light sweep + radial shockwave.
     */
    winFlash(width: number, height: number) {
        const scene = this.scene;

        // Big camera shake
        scene.cameras.main.shake(300, 0.008);

        // Full-screen white flash
        const flash = scene.add.rectangle(
            width / 2, height / 2, width, height, 0xffffff, 0
        ).setDepth(60);
        scene.tweens.add({
            targets: flash,
            alpha: { from: 0.85, to: 0 },
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => flash.destroy()
        });

        // Central shockwave
        this._shockwaveRing(width / 2, height * 0.38, THEME.colors.primary, 60, 5, 800);
        this._shockwaveRing(width / 2, height * 0.38, THEME.colors.secondary, 40, 6, 900);

        // Victory particle explosion
        this._particleStarburst(width / 2, height * 0.38, THEME.colors.primary, 50);

        // Delayed secondary burst
        scene.time.delayedCall(200, () => {
            this._particleStarburst(width / 2, height * 0.38, THEME.colors.secondary, 30);
        });
    }

    destroy() {}
}
