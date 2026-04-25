import * as Phaser from 'phaser';

export type ShapeType = 'circle' | 'square' | 'rectangle';

export interface Level {
    id: number;
    name: string;
    shape: ShapeType;
    fractions: string[];
}

export const THEME = {
    colors: {
        bg: 0x050810,
        bgGradient: 0x0a1020,
        primary: 0x00ffd1,
        secondary: 0xff00ff,
        warning: 0xff6600,
        success: 0x00ff00,
        slot: 0x1a243d,
        // New: richer palette for interaction states
        magnetNear: 0x00ffaa,   
        magnetFar: 0x4488ff,
        snapGlow: 0xffffff,
        rejectSoft: 0xff9944,
    },
    fonts: {
        main: 'Orbitron, sans-serif',
        display: 'Rajdhani, sans-serif'
    }
};

export const FRACTIONS: Record<string, { denominator: number, color: number, label: string }> = {
    'whole': { denominator: 1, color: 0x00ffd1, label: '1' },
    'half': { denominator: 2, color: 0xff00ff, label: '1/2' },
    'third': { denominator: 3, color: 0x0088ff, label: '1/3' },
    'fourth': { denominator: 4, color: 0xffcc00, label: '1/4' },
    'sixth': { denominator: 6, color: 0x00ff88, label: '1/6' },
    'eighth': { denominator: 8, color: 0xff3366, label: '1/8' }
};

export const LEVELS: Level[] = [
    // --- CIRCLE CATEGORY ---
    { id: 101, name: 'C-01: Singular Core', shape: 'circle', fractions: ['whole'] },
    { id: 102, name: 'C-02: Binary Split', shape: 'circle', fractions: ['half', 'half'] },
    { id: 103, name: 'C-03: Triple Sync', shape: 'circle', fractions: ['third', 'third', 'third'] },
    { id: 104, name: 'C-04: Quad Matrix', shape: 'circle', fractions: ['fourth', 'fourth', 'fourth', 'fourth'] },
    { id: 105, name: 'C-05: Hexa Grid', shape: 'circle', fractions: ['sixth', 'sixth', 'sixth', 'sixth', 'sixth', 'sixth'] },
    { id: 106, name: 'C-06: Octo Pulse', shape: 'circle', fractions: ['eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth'] },
    { id: 107, name: 'C-07: Mixed Ring', shape: 'circle', fractions: ['half', 'fourth', 'fourth'] },
    { id: 108, name: 'C-08: Complex Orbit', shape: 'circle', fractions: ['third', 'sixth', 'sixth', 'sixth'] },

    // --- SQUARE CATEGORY ---
    { id: 201, name: 'S-01: Solid Block', shape: 'square', fractions: ['whole'] },
    { id: 202, name: 'S-02: Vertical Dual', shape: 'square', fractions: ['half', 'half'] },
    { id: 203, name: 'S-03: Triple Column', shape: 'square', fractions: ['third', 'third', 'third'] },
    { id: 204, name: 'S-04: Quad Slices', shape: 'square', fractions: ['fourth', 'fourth', 'fourth', 'fourth'] },
    { id: 205, name: 'S-05: Data Strip 6', shape: 'square', fractions: ['sixth', 'sixth', 'sixth', 'sixth', 'sixth', 'sixth'] },
    { id: 206, name: 'S-06: Fine Partition', shape: 'square', fractions: ['eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth'] },
    { id: 207, name: 'S-07: Asymmetric 1', shape: 'square', fractions: ['half', 'fourth', 'fourth'] },
    { id: 208, name: 'S-08: Asymmetric 2', shape: 'square', fractions: ['third', 'sixth', 'sixth', 'sixth'] },

    // --- RECTANGLE CATEGORY ---
    { id: 301, name: 'R-01: Wide Core', shape: 'rectangle', fractions: ['whole'] },
    { id: 302, name: 'R-02: Horizontal Dual', shape: 'rectangle', fractions: ['half', 'half'] },
    { id: 303, name: 'R-03: Triple Layer', shape: 'rectangle', fractions: ['third', 'third', 'third'] },
    { id: 304, name: 'R-04: Quad Stack', shape: 'rectangle', fractions: ['fourth', 'fourth', 'fourth', 'fourth'] },
    { id: 305, name: 'R-05: Sector 6 Wide', shape: 'rectangle', fractions: ['sixth', 'sixth', 'sixth', 'sixth', 'sixth', 'sixth'] },
    { id: 306, name: 'R-06: High Density R', shape: 'rectangle', fractions: ['eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth', 'eighth'] },
    { id: 307, name: 'R-07: Mixed Stack 1', shape: 'rectangle', fractions: ['half', 'fourth', 'fourth'] },
    { id: 308, name: 'R-08: Mixed Stack 2', shape: 'rectangle', fractions: ['third', 'sixth', 'sixth', 'sixth'] }
];

export const ENGINE_SETTINGS = {
    snap: {
        // Phase 1: Detection — piece enters gravitational field
        detectionRange: 320,
        // Phase 2: Magnetic Pull — piece is actively attracted
        magneticPullRange: 220,
        // Phase 3: Auto-Snap — piece locks in automatically (no drop needed)
        autoSnapRange: 40,
        // Force applied during magnetic pull (cubic easing)
        magneticForce: 0.28,
        // Max distance from slot center to accept a manual drop
        snapDistance: 90,
        // Max angle deviation for circle slot matching (radians, ~55°)
        angleThreshold: 0.95,
        // Return-to-origin animation duration
        returnDuration: 350,
        // Haptic feedback thresholds
        haptic: {
            light: 10,
            medium: 25,
            heavy: 40
        }
    },
    // Visual feedback tuning
    feedback: {
        // Glow radius multiplier when piece is in detection range
        glowScale: 1.8,
        // Slot highlight breathing speed (ms per cycle)
        highlightBreathSpeed: 300,
        // Number of particle trails during magnetic pull
        trailParticleCount: 8,
        // Trail particle lifetime in ms
        trailLifetime: 400
    }
};

export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 430,
    height: 932,
    backgroundColor: '#050810',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    }
};

export function validateConfig() {
    if (!LEVELS.length) throw new Error('No levels defined');
}
