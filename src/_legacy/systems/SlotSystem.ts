import * as Phaser from 'phaser';
import { FRACTIONS, Level, ShapeType } from '../data/config';
import { Geometry } from '../utils/Geometry';
import FractionPiece from '../entities/FractionPiece';
import { GameSystem } from './core/BaseSystem';

export interface Slot {
    x: number;
    y: number;
    rotation: number;
    occupied: boolean;
    piece: FractionPiece | null;
}

/**
 * SlotSystem — manages snap targets. Circle slots now have real X/Y positions
 * at the visual center of each slice, enabling distance-based snapping.
 */
export default class SlotSystem implements GameSystem {
    public slots: Slot[] = [];

    constructor(_scene: Phaser.Scene) {}

    create(level: Level) {
        this.slots = [];
        const shape = level.shape || 'circle';
        const radius = 135;

        let cumulative = 0;

        level.fractions.forEach((fKey, _i) => {
            const def = FRACTIONS[fKey];
            const denom = def.denominator;

            if (shape === 'circle') {
                const step = (Math.PI * 2) / denom;
                const start = -Math.PI / 2 + cumulative;
                const centerAngle = Geometry.normalizeAngle(start + step / 2);

                // Position slot at the visual center of the slice
                // Using 55% of radius places it nicely inside the slice
                const slotRadius = denom === 1 ? 0 : radius * 0.55;
                this.slots.push({
                    x: Math.cos(centerAngle) * slotRadius,
                    y: Math.sin(centerAngle) * slotRadius,
                    rotation: centerAngle + Math.PI / 2,
                    occupied: false,
                    piece: null
                });
                cumulative += step;

            } else if (shape === 'square') {
                const totalWidth = radius * 2;
                const step = totalWidth / denom;
                const startX = -radius + cumulative;
                const centerX = startX + step / 2;

                this.slots.push({
                    x: centerX,
                    y: 0,
                    rotation: 0,
                    occupied: false,
                    piece: null
                });
                cumulative += step;

            } else if (shape === 'rectangle') {
                const totalHeight = radius * 1.6;
                const step = totalHeight / denom;
                const startY = -totalHeight / 2 + cumulative;
                const centerY = startY + step / 2;

                this.slots.push({
                    x: 0,
                    y: centerY,
                    rotation: 0,
                    occupied: false,
                    piece: null
                });
                cumulative += step;
            }
        });
    }

    /**
     * Find the closest free slot to a given world position.
     * Uses angle-based matching for circles, distance for others.
     */
    getClosestSlot(pieceX: number, pieceY: number, targetX: number, targetY: number, shape: ShapeType): Slot | null {
        let best: Slot | null = null;
        let minDiff = Infinity;

        if (shape === 'circle') {
            // Primary: angle-based matching
            const dx = pieceX - targetX;
            const dy = pieceY - targetY;
            const angle = Geometry.normalizeAngle(Math.atan2(dy, dx));

            this.slots.forEach(s => {
                if (s.occupied) return;
                const diff = Geometry.angleDifference(angle, s.rotation - Math.PI / 2);
                if (diff < minDiff) {
                    minDiff = diff;
                    best = s;
                }
            });
        } else {
            // Distance-based for square/rectangle
            this.slots.forEach(s => {
                if (s.occupied) return;
                const dist = Phaser.Math.Distance.Between(pieceX, pieceY, targetX + s.x, targetY + s.y);
                if (dist < minDiff) {
                    minDiff = dist;
                    best = s;
                }
            });
        }

        return best;
    }

    allOccupied(): boolean {
        return this.slots.length > 0 && this.slots.every(s => s.occupied);
    }

    destroy() {
        this.slots = [];
    }
}
