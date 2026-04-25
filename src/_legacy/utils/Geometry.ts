import * as Phaser from 'phaser';

/**
 * Geometric utilities for circular layout and fraction calculation.
 */
export const Geometry = {
    /** 
     * Normalizes an angle to the range (-π, π] 
     */
    normalizeAngle(a: number): number {
        while (a > Math.PI) a -= Math.PI * 2;
        while (a <= -Math.PI) a += Math.PI * 2;
        return a;
    },

    /**
     * Calculates the angular difference between two angles in radians.
     */
    angleDifference(a: number, b: number): number {
        let diff = Math.abs(this.normalizeAngle(a) - this.normalizeAngle(b));
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        return diff;
    },

    /**
     * Generates a brighter version of a hex color.
     */
    brighten(color: number, percent: number = 40): number {
        return Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.IntegerToColor(color),
            Phaser.Display.Color.IntegerToColor(0xffffff),
            100, percent
        ).color;
    }
};
