import * as Phaser from 'phaser';
import { THEME, Level } from '../data/config';
import { GameSystem } from './core/BaseSystem';

/**
 * UISystem — HUD: level label, progress counter, instructions, win text.
 */
export default class UISystem implements GameSystem {
    private scene: Phaser.Scene;
    private _elements: Phaser.GameObjects.GameObject[] = [];
    private progressCounter: Phaser.GameObjects.Text | null = null;
    private progressBar: Phaser.GameObjects.Graphics | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    create(level: Level, slotCount: number) {
        const { width } = this.scene.scale;

        const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
            (obj as any).isUI = true;
            this._elements.push(obj);
            return obj;
        };

        // Top Header Glass Panel
        const headerPanel = add(this.scene.add.graphics());
        headerPanel.fillStyle(0x000000, 0.4);
        headerPanel.fillRoundedRect(10, 15, width - 20, 60, 8);
        headerPanel.lineStyle(1, THEME.colors.primary, 0.2);
        headerPanel.strokeRoundedRect(10, 15, width - 20, 60, 8);

        // Level label
        add(this.scene.add.text(22, 28, `LEVEL ${level.id}`, {
            fontFamily: THEME.fonts.main, fontSize: '11px',
            color: '#a0aec0',
        }).setResolution(2));

        add(this.scene.add.text(22, 42, level.name.toUpperCase(), {
            fontFamily: THEME.fonts.main, fontSize: '15px',
            color: '#ffffff'
        }).setResolution(2));

        // Progress counter
        this.progressCounter = add(this.scene.add.text(width - 22, 32, `0 / ${slotCount}`, {
            fontFamily: THEME.fonts.main, fontSize: '22px',
            color: '#ffffff', stroke: '#000000', strokeThickness: 1
        }).setOrigin(1, 0).setResolution(2));

        // Thin progress bar
        this.progressBar = add(this.scene.add.graphics());
        this._drawBar(0, slotCount);
    }

    updateProgress(percent: number, occupied: number, total: number) {
        percent = Phaser.Math.Clamp(percent, 0, 1);
        if (!this.progressCounter?.active) return;
        this.progressCounter.setText(`${occupied} / ${total}`);
        this._drawBar(percent, total);
    }

    showWinText(_width: number, _height: number) {
        // We are moving to a purely visual "Core Restoration" celebrate as per the Beyond Perfect plan.
        // Legacy text prompts removed as requested.
    }

    destroy() {
        this._elements.forEach(e => { if (e?.active) e.destroy(); });
        this._elements = [];
        this.progressCounter = null;
        this.progressBar = null;
    }

    private _drawBar(percent: number, _total: number) {
        if (!this.progressBar?.active) return;
        const { width } = this.scene.scale;
        const bw = 200;
        const bh = 10;
        const bx = width / 2 - bw / 2;
        const by = 85; 
        const fill = Math.max((bw - 2) * percent, 0);

        this.progressBar.clear();
        this.progressBar.fillStyle(0x000000, 0.3);
        this.progressBar.fillRoundedRect(bx, by, bw, bh, 5);
        this.progressBar.lineStyle(1, THEME.colors.primary, 0.2);
        this.progressBar.strokeRoundedRect(bx, by, bw, bh, 5);

        if (fill > 0) {
            this.progressBar.fillStyle(THEME.colors.primary, 0.2);
            this.progressBar.fillRoundedRect(bx + 1, by + 1, fill, bh - 2, 4);
            this.progressBar.fillStyle(THEME.colors.primary, 0.85);
            this.progressBar.fillRoundedRect(bx + 2, by + 2, Math.max(0, fill - 2), bh - 4, 3);
        }
    }
}
