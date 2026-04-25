import * as Phaser from 'phaser';
import { THEME, FRACTIONS, ENGINE_SETTINGS, ShapeType } from '../data/config';
import SlotSystem, { Slot } from './SlotSystem';
import TargetSystem from './TargetSystem';
import EffectsSystem from './EffectsSystem';
import UISystem from './UISystem';
import { Logger } from './core/LoggerSystem';
import FractionPiece from '../entities/FractionPiece';
import { Geometry } from '../utils/Geometry';

/**
 * DragSystem — Full rewrite. 3-phase interaction: Detection → Magnetic Pull → Auto-Snap.
 * 
 * Key behaviors:
 * - Pieces glow and the target reacts when a piece enters detection range
 * - Magnetic pull applies cubic-eased force that accelerates as piece approaches
 * - Pieces auto-rotate towards their destination slot during pull
 * - If piece reaches auto-snap range, it locks in WITHOUT needing to release
 * - Particle trails stream from piece to target during magnetic pull
 * - Slot highlights pulse with breathing animation keyed to piece color
 * - Rejection shows a gentle "nudge back" with directional hint arrow
 */
export default class DragSystem {
    private scene: Phaser.Scene;
    private magneticLine: Phaser.GameObjects.Graphics | null = null;
    private magneticArrow: Phaser.GameObjects.Graphics | null = null;
    private slotHighlight: Phaser.GameObjects.Graphics | null = null;
    private trailGraphics: Phaser.GameObjects.Graphics | null = null;
    private glowGraphics: Phaser.GameObjects.Graphics | null = null;

    private slotSys!: SlotSystem;
    private targetSys!: TargetSystem;
    private effects!: EffectsSystem;
    private ui!: UISystem;
    private shape: ShapeType = 'circle';
    
    // Trail particle state
    private trails: { x: number; y: number; vx: number; vy: number; life: number; color: number; maxLife: number }[] = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    attach(_pieces: FractionPiece[], slotSys: SlotSystem, targetSys: TargetSystem, effects: EffectsSystem, ui: UISystem, shape: ShapeType = 'circle') {
        this.slotSys = slotSys;
        this.targetSys = targetSys;
        this.effects = effects;
        this.ui = ui;
        this.shape = shape;

        this.magneticLine = this.scene.add.graphics().setDepth(15);
        this.magneticArrow = this.scene.add.graphics().setDepth(20);
        this.slotHighlight = this.scene.add.graphics().setDepth(18);
        this.trailGraphics = this.scene.add.graphics().setDepth(16);
        this.glowGraphics = this.scene.add.graphics().setDepth(14);

        _pieces.forEach(p => this._wire(p));
    }

    destroy() {
        [this.magneticLine, this.magneticArrow, this.slotHighlight, this.trailGraphics, this.glowGraphics].forEach(g => {
            if (g?.active) g.destroy();
        });
        this.magneticLine = null;
        this.magneticArrow = null;
        this.slotHighlight = null;
        this.trailGraphics = null;
        this.glowGraphics = null;
        this.trails = [];
    }

    update() {
        this._updateTrails();
    }

    private _wire(piece: FractionPiece) {
        piece.on('dragstart', () => this._onDragStart(piece));
        piece.on('drag', (_ptr: any, dx: number, dy: number) => this._onDrag(piece, dx, dy));
        piece.on('dragend', () => this._onDragEnd(piece));
    }

    // ─── DRAG LIFECYCLE ─────────────────────────────────────────────

    private _onDragStart(piece: FractionPiece) {
        Logger.log(`Drag Start: ${piece.fKey}`, 'INTERACTION');
        piece.isDragging = true;
        piece.setDepth(100);
        
        // Satisfying "pick up" animation: scale up + slight shadow
        this.scene.tweens.add({
            targets: piece,
            scale: 1.08,
            duration: 180,
            ease: 'Back.easeOut'
        });
    }

    private _onDrag(piece: FractionPiece, dx: number, dy: number) {
        piece.x = dx;
        piece.y = dy;

        const target = this.targetSys.target;
        if (!target) return;

        const dist = Phaser.Math.Distance.Between(dx, dy, target.x, target.y);
        
        // Clear all feedback layers
        this.magneticLine!.clear();
        this.slotHighlight!.clear();
        this.magneticArrow!.clear();
        this.glowGraphics!.clear();

        if (dist < ENGINE_SETTINGS.snap.detectionRange && !piece.snapped) {
            // ── PHASE 1: Detection Range ──
            const detectionFactor = 1 - (dist / ENGINE_SETTINGS.snap.detectionRange);
            this._pulseTarget(1 + detectionFactor * 0.06);
            this._drawPieceGlow(piece, detectionFactor);

            const bestSlot = this.slotSys.getClosestSlot(dx, dy, target.x, target.y, this.shape);
            if (bestSlot && !bestSlot.occupied) {
                this._drawSlotHighlight(bestSlot, piece.fKey);
                this._drawMagneticRibbon(piece, detectionFactor);

                if (dist < ENGINE_SETTINGS.snap.magneticPullRange) {
                    // ── PHASE 2: Magnetic Pull ──
                    const pullNorm = 1 - (dist / ENGINE_SETTINGS.snap.magneticPullRange);
                    // Cubic easing: gentle at edge, aggressive near center
                    const force = ENGINE_SETTINGS.snap.magneticForce * (pullNorm * pullNorm * pullNorm);

                    const slotWorldX = target.x + bestSlot.x;
                    const slotWorldY = target.y + bestSlot.y;

                    // Pull position
                    piece.x = Phaser.Math.Linear(piece.x, slotWorldX, force);
                    piece.y = Phaser.Math.Linear(piece.y, slotWorldY, force);

                    // Auto-rotate towards slot
                    const rotForce = force * 2;
                    piece.rotation = Phaser.Math.Angle.RotateTo(piece.rotation, bestSlot.rotation, rotForce);

                    // Spawn trail particles
                    this._spawnTrails(piece, slotWorldX, slotWorldY, FRACTIONS[piece.fKey].color);

                    // ── PHASE 3: Auto-Snap ──
                    const snapDist = Phaser.Math.Distance.Between(piece.x, piece.y, slotWorldX, slotWorldY);
                    if (snapDist < ENGINE_SETTINGS.snap.autoSnapRange) {
                        Logger.log(`Auto-Snap: ${piece.fKey} (${Math.round(snapDist)}px)`, 'INTERACTION');
                        piece.isDragging = false;
                        this._clearFeedback();
                        this._pulseTarget(1.0);
                        this._snapPiece(piece, bestSlot);
                        return;
                    }
                }
            }
        } else {
            this._pulseTarget(1.0);
        }
    }

    private _onDragEnd(piece: FractionPiece) {
        if (piece.snapped) return; // Already auto-snapped
        piece.isDragging = false;
        this._clearFeedback();
        this._pulseTarget(1.0);

        const target = this.targetSys.target;
        if (!target) return;

        const dist = Phaser.Math.Distance.Between(piece.x, piece.y, target.x, target.y);
        
        // Very generous drop acceptance zone
        if (dist < target.radius + 180) {
            this._trySnap(piece);
        } else {
            Logger.log(`Drop Rejected: Too far (${Math.round(dist)}px)`, 'INTERACTION', 'WARN');
            this._returnPiece(piece);
        }
    }

    // ─── SNAP LOGIC ─────────────────────────────────────────────────

    private _trySnap(piece: FractionPiece) {
        const target = this.targetSys.target!;
        const bestSlot = this.slotSys.getClosestSlot(piece.x, piece.y, target.x, target.y, this.shape);

        if (!bestSlot) {
            Logger.log('Drop Rejected: No available slot', 'INTERACTION', 'WARN');
            this._returnPiece(piece);
            return;
        }

        if (bestSlot.occupied) {
            Logger.log('Drop Rejected: Slot occupied', 'INTERACTION', 'WARN');
            this._returnPiece(piece);
            return;
        }

        const def = FRACTIONS[piece.fKey];
        const denom = def.denominator;
        const slotWorldX = target.x + bestSlot.x;
        const slotWorldY = target.y + bestSlot.y;
        const distToSlot = Phaser.Math.Distance.Between(piece.x, piece.y, slotWorldX, slotWorldY);

        // ── Universal: Direct proximity snap ──
        if (distToSlot < ENGINE_SETTINGS.snap.snapDistance) {
            Logger.log(`Snap Success: Proximity (${Math.round(distToSlot)}px) [${piece.fKey}]`, 'INTERACTION');
            this._snapPiece(piece, bestSlot);
            return;
        }

        // ── Circle-specific logic ──
        if (this.shape === 'circle') {
            // Whole pieces: snap anywhere inside the shape
            if (denom === 1) {
                const distToCenter = Phaser.Math.Distance.Between(piece.x, piece.y, target.x, target.y);
                if (distToCenter < target.radius + 60) {
                    Logger.log('Snap Success: Whole piece', 'INTERACTION');
                    this._snapPiece(piece, bestSlot);
                } else {
                    Logger.log(`Snap Rejected: Whole too far (${Math.round(distToCenter)}px)`, 'INTERACTION', 'WARN');
                    this._returnPiece(piece);
                }
                return;
            }

            // Multi-piece: angle-based matching
            const dx = piece.x - target.x;
            const dy = piece.y - target.y;
            const pieceAngle = Geometry.normalizeAngle(Math.atan2(dy, dx));
            const slotAngle = Geometry.normalizeAngle(bestSlot.rotation - Math.PI / 2);
            const angleDiff = Geometry.angleDifference(pieceAngle, slotAngle);

            if (angleDiff < ENGINE_SETTINGS.snap.angleThreshold) {
                Logger.log(`Snap Success: Angle (${angleDiff.toFixed(2)}rad) [${piece.fKey}]`, 'INTERACTION');
                this._snapPiece(piece, bestSlot);
            } else {
                // Instead of flat rejection, try if it's close enough overall
                const distToCenter = Phaser.Math.Distance.Between(piece.x, piece.y, target.x, target.y);
                if (distToCenter < target.radius * 0.5 && distToSlot < ENGINE_SETTINGS.snap.snapDistance * 1.5) {
                    Logger.log(`Snap Success: Override proximity (${Math.round(distToSlot)}px, angle ${angleDiff.toFixed(2)}rad)`, 'INTERACTION');
                    this._snapPiece(piece, bestSlot);
                } else {
                    Logger.log(`Snap Rejected: Angle (${angleDiff.toFixed(2)}rad > ${ENGINE_SETTINGS.snap.angleThreshold})`, 'INTERACTION', 'WARN');
                    this._returnPiece(piece, slotWorldX, slotWorldY);
                }
            }
            return;
        }

        // ── Square / Rectangle ──
        // Much more forgiving: if you're anywhere close, we accept
        const shapeMultiplier = this.shape === 'square' ? 2.0 : 2.5;
        const tolerance = ENGINE_SETTINGS.snap.snapDistance * shapeMultiplier;
        if (distToSlot < tolerance) {
            Logger.log(`Snap Success: ${this.shape} (${Math.round(distToSlot)}px) [${piece.fKey}]`, 'INTERACTION');
            this._snapPiece(piece, bestSlot);
        } else {
            Logger.log(`Snap Rejected: ${this.shape} (${Math.round(distToSlot)}px > ${Math.round(tolerance)}px)`, 'INTERACTION', 'WARN');
            this._returnPiece(piece, slotWorldX, slotWorldY);
        }
    }

    // ─── SNAP ANIMATION ─────────────────────────────────────────────

    private _snapPiece(piece: FractionPiece, slot: Slot) {
        if (!piece?.active || piece.snapped) return;

        slot.occupied = true;
        slot.piece = piece;
        piece.snapped = true;
        piece.disableInteractive();

        const target = this.targetSys.target!;
        const destX = target.x + slot.x;
        const destY = target.y + slot.y;

        // Multi-stage snap animation: fast approach → overshoot → settle
        this.scene.tweens.add({
            targets: piece,
            x: destX,
            y: destY,
            rotation: slot.rotation,
            scale: 1.02, // Slight overshoot
            duration: 250,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (!piece.active) return;

                // Settle down from overshoot
                this.scene.tweens.add({
                    targets: piece,
                    scale: 1,
                    duration: 150,
                    ease: 'Bounce.easeOut'
                });

                piece.updateLabelRotation();
                this.effects.createSnapEffect(piece.x, piece.y, FRACTIONS[piece.fKey].color, target.radius);

                // Gentle idle breathing
                this.scene.tweens.add({
                    targets: piece,
                    alpha: { from: 1, to: 0.85 },
                    yoyo: true,
                    repeat: -1,
                    duration: 2000,
                    ease: 'Sine.easeInOut'
                });

                const occupied = this.slotSys.slots.filter(s => s.occupied).length;
                const total = this.slotSys.slots.length;
                this.ui.updateProgress(occupied / total, occupied, total);
                this.scene.events.emit('piece-snapped');
            }
        });
    }

    // ─── REJECTION ANIMATION ────────────────────────────────────────

    private _returnPiece(piece: FractionPiece, hintX?: number, hintY?: number) {
        if (!piece?.active || piece.snapped) return;

        this.effects.showRejectionPulse(piece.x, piece.y);

        // If we know where the slot was, show a hint arrow pointing to it
        if (hintX !== undefined && hintY !== undefined) {
            this._showDirectionHint(piece.x, piece.y, hintX, hintY);
        }

        piece.isReturning = true;

        // Shake before returning
        this.scene.tweens.chain({
            targets: piece,
            tweens: [
                { x: piece.x - 6, duration: 40, ease: 'Sine.easeInOut' },
                { x: piece.x + 6, duration: 40, ease: 'Sine.easeInOut' },
                { x: piece.x - 3, duration: 40, ease: 'Sine.easeInOut' },
                { x: piece.x, duration: 40, ease: 'Sine.easeInOut' },
                {
                    x: piece.originPos.x,
                    y: piece.originPos.y,
                    scale: 0.8,
                    rotation: 0,
                    duration: ENGINE_SETTINGS.snap.returnDuration,
                    ease: 'Back.easeOut',
                    onComplete: () => { if (piece.active) piece.isReturning = false; }
                }
            ]
        });
    }

    private _showDirectionHint(fromX: number, fromY: number, toX: number, toY: number) {
        const g = this.scene.add.graphics().setDepth(25);
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const len = 30;
        const tipX = fromX + Math.cos(angle) * len;
        const tipY = fromY + Math.sin(angle) * len;
        const sz = 8;

        // Arrow body
        g.lineStyle(3, THEME.colors.magnetNear, 0.6);
        g.lineBetween(fromX, fromY, tipX, tipY);
        
        // Arrowhead
        g.fillStyle(THEME.colors.magnetNear, 0.6);
        g.beginPath();
        g.moveTo(tipX, tipY);
        g.lineTo(tipX - Math.cos(angle - 0.4) * sz, tipY - Math.sin(angle - 0.4) * sz);
        g.lineTo(tipX - Math.cos(angle + 0.4) * sz, tipY - Math.sin(angle + 0.4) * sz);
        g.closePath();
        g.fillPath();

        this.scene.tweens.add({
            targets: g, alpha: 0, duration: 800, ease: 'Cubic.easeOut',
            onComplete: () => g.destroy()
        });
    }

    // ─── VISUAL FEEDBACK ────────────────────────────────────────────

    private _pulseTarget(scale: number) {
        if (!this.targetSys.targetContainer) return;
        this.scene.tweens.add({
            targets: this.targetSys.targetContainer,
            scale, duration: 120, overwrite: true, ease: 'Sine.easeOut'
        });
    }

    private _clearFeedback() {
        this.magneticLine?.clear();
        this.slotHighlight?.clear();
        this.magneticArrow?.clear();
        this.glowGraphics?.clear();
    }

    // ── Piece Glow: soft radial glow around piece when in detection range ──
    private _drawPieceGlow(piece: FractionPiece, intensity: number) {
        if (!this.glowGraphics) return;
        const color = FRACTIONS[piece.fKey].color;
        const r = 40 + intensity * 30;

        // Multiple concentric circles for soft glow
        for (let i = 3; i >= 0; i--) {
            const layerR = r * (1 + i * 0.3);
            const alpha = intensity * 0.08 * (1 / (i + 1));
            this.glowGraphics.fillStyle(color, alpha);
            this.glowGraphics.fillCircle(piece.x, piece.y, layerR);
        }
    }

    // ── Magnetic Ribbon: energy stream from piece to target ──
    private _drawMagneticRibbon(piece: FractionPiece, intensity: number) {
        if (!this.magneticLine || !this.targetSys.target) return;
        const target = this.targetSys.target;
        const dx = target.x - piece.x;
        const dy = target.y - piece.y;
        const segments = 28;
        const time = this.scene.time.now;

        // Interpolate color from cool blue → hot cyan based on intensity
        const farColor = Phaser.Display.Color.ValueToColor(THEME.colors.magnetFar);
        const nearColor = Phaser.Display.Color.ValueToColor(THEME.colors.magnetNear);
        const interp = Phaser.Display.Color.Interpolate.ColorWithColor(farColor, nearColor, 100, intensity * 100);
        const ribbonColor = Phaser.Display.Color.GetColor(interp.r, interp.g, interp.b);

        // 3 ribbon layers with different phase offsets
        for (let layer = 0; layer < 3; layer++) {
            const speed = 0.0015 * (layer + 1);
            const phase = (time * speed) % (Math.PI * 2);
            const amp = (18 - layer * 5) * intensity;
            const lineWidth = (3 - layer * 0.5) * intensity;
            const alpha = (0.5 - layer * 0.12) * intensity;

            if (lineWidth < 0.5 || alpha < 0.02) continue;

            this.magneticLine.lineStyle(lineWidth, ribbonColor, alpha);
            this.magneticLine.beginPath();
            this.magneticLine.moveTo(piece.x, piece.y);

            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                // Perpendicular wave
                const perpX = -dy;
                const perpY = dx;
                const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
                const wave = Math.sin((t * 5 + phase) * Math.PI) * amp * (1 - t); // Fade wave near target

                this.magneticLine.lineTo(
                    piece.x + dx * t + (perpX / len) * wave,
                    piece.y + dy * t + (perpY / len) * wave
                );
            }
            this.magneticLine.strokePath();
        }

        this._drawMagneticArrow(intensity);
    }

    // ── Pulsing arrow above target ──
    private _drawMagneticArrow(intensity: number = 0.5) {
        if (!this.magneticArrow || !this.targetSys.target) return;
        const target = this.targetSys.target;
        this.magneticArrow.clear();

        const osc = Math.sin(this.scene.time.now / 300) * 8;
        const sz = 10;
        const ax = target.x;
        const ay = target.y - target.radius - 12 + osc;
        const alpha = 0.15 + intensity * 0.3;

        this.magneticArrow.fillStyle(THEME.colors.magnetNear, alpha);
        this.magneticArrow.beginPath();
        this.magneticArrow.moveTo(ax, ay);
        this.magneticArrow.lineTo(ax - sz, ay - sz * 1.6);
        this.magneticArrow.lineTo(ax + sz, ay - sz * 1.6);
        this.magneticArrow.closePath();
        this.magneticArrow.fillPath();
        this.magneticArrow.lineStyle(1.5, THEME.colors.magnetNear, alpha * 1.5);
        this.magneticArrow.strokePath();
    }

    // ── Slot highlight: breathing, shape-aware ──
    private _drawSlotHighlight(slot: Slot, fKey: string) {
        if (!this.slotHighlight || !this.targetSys.target) return;
        const { x, y, radius } = this.targetSys.target;
        const def = FRACTIONS[fKey];
        const time = this.scene.time.now;

        // Breathing pulse: smooth sine wave
        const breathe = Math.sin(time / ENGINE_SETTINGS.feedback.highlightBreathSpeed) * 0.5 + 0.5;
        const fillAlpha = 0.08 + breathe * 0.18;
        const strokeAlpha = 0.3 + breathe * 0.5;

        this.slotHighlight.fillStyle(def.color, fillAlpha);
        this.slotHighlight.lineStyle(2, def.color, strokeAlpha);
        this.slotHighlight.beginPath();

        if (this.shape === 'circle') {
            const angle = (Math.PI * 2) / def.denominator;
            const start = (slot.rotation - Math.PI / 2) - angle / 2;
            this.slotHighlight.moveTo(x, y);
            this.slotHighlight.arc(x, y, radius + breathe * 3, start, start + angle);
            this.slotHighlight.lineTo(x, y);
        } else if (this.shape === 'square') {
            const w = (radius * 2) / def.denominator;
            const pad = breathe * 2;
            this.slotHighlight.fillRect(x + slot.x - w / 2 - pad, y - radius - pad, w + pad * 2, radius * 2 + pad * 2);
            this.slotHighlight.strokeRect(x + slot.x - w / 2 - pad, y - radius - pad, w + pad * 2, radius * 2 + pad * 2);
        } else if (this.shape === 'rectangle') {
            const w = radius * 2.6;
            const h = (radius * 1.6) / def.denominator;
            const pad = breathe * 2;
            this.slotHighlight.fillRect(x - w / 2 - pad, y + slot.y - h / 2 - pad, w + pad * 2, h + pad * 2);
            this.slotHighlight.strokeRect(x - w / 2 - pad, y + slot.y - h / 2 - pad, w + pad * 2, h + pad * 2);
        }

        this.slotHighlight.fillPath();
        this.slotHighlight.strokePath();
    }

    // ─── TRAIL PARTICLES ────────────────────────────────────────────

    private _spawnTrails(piece: FractionPiece, targetX: number, targetY: number, color: number) {
        const count = ENGINE_SETTINGS.feedback.trailParticleCount;
        const dx = targetX - piece.x;
        const dy = targetY - piece.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        for (let i = 0; i < count; i++) {
            // Spawn near the piece, heading towards the target
            const spread = 15;
            this.trails.push({
                x: piece.x + (Math.random() - 0.5) * spread,
                y: piece.y + (Math.random() - 0.5) * spread,
                vx: (dx / dist) * (3 + Math.random() * 4),
                vy: (dy / dist) * (3 + Math.random() * 4),
                life: ENGINE_SETTINGS.feedback.trailLifetime,
                maxLife: ENGINE_SETTINGS.feedback.trailLifetime,
                color
            });
        }

        // Cap total particles
        if (this.trails.length > 80) {
            this.trails = this.trails.slice(-60);
        }
    }

    private _updateTrails() {
        if (!this.trailGraphics || this.trails.length === 0) return;
        this.trailGraphics.clear();

        const dt = this.scene.game.loop.delta;
        const surviving: typeof this.trails = [];

        for (const t of this.trails) {
            t.life -= dt;
            if (t.life <= 0) continue;

            t.x += t.vx;
            t.y += t.vy;
            // Slight gravity towards center
            t.vy += 0.03;

            const lifeRatio = t.life / t.maxLife;
            const size = 2.5 * lifeRatio;
            const alpha = 0.6 * lifeRatio;

            this.trailGraphics.fillStyle(t.color, alpha);
            this.trailGraphics.fillCircle(t.x, t.y, size);

            surviving.push(t);
        }

        this.trails = surviving;
    }
}
