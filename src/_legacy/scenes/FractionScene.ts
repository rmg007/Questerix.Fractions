import * as Phaser from 'phaser';
import { LEVELS, Level, THEME } from '../data/config';
import { Logger } from '../systems/core/LoggerSystem';

import BackgroundSystem from '../systems/BackgroundSystem';
import TargetSystem from '../systems/TargetSystem';
import SlotSystem from '../systems/SlotSystem';
import PaletteSystem from '../systems/PaletteSystem';
import DragSystem from '../systems/DragSystem';
import EffectsSystem from '../systems/EffectsSystem';
import UISystem from '../systems/UISystem';
import { GameSystem } from '../systems/core/BaseSystem';

export default class FractionScene extends Phaser.Scene {
    private currentLevelIndex: number = 0;
    
    // Core Modular Systems
    private systems: Record<string, GameSystem> = {};

    constructor() {
        super({ key: 'FractionScene' });
    }

    init(data: { levelId?: number }) {
        if (data.levelId) {
            const idx = LEVELS.findIndex(l => l.id === data.levelId);
            if (idx !== -1) {
                this.currentLevelIndex = idx;
            }
        }
    }

    create() {
        // 1. Initialize all systems as a registry
        this.systems = {
            bg: new BackgroundSystem(this),
            target: new TargetSystem(this),
            slots: new SlotSystem(this),
            palette: new PaletteSystem(this),
            drag: new DragSystem(this),
            effects: new EffectsSystem(this),
            ui: new UISystem(this)
        };

        // 2. Global background initialization
        this.systems.bg.create!();

        // 3. Event orchestration
        this.events.on('piece-snapped', this._checkWin, this);
        
        // 4. Load initial level
        this._loadLevel(LEVELS[this.currentLevelIndex]);

        // 5. Back to Menu button
        this._createMenuBtn();
    }

    private _createMenuBtn() {
        const btn = this.add.container(60, 40);
        const bg = this.add.graphics();
        bg.fillStyle(0x1a243d, 0.8);
        bg.lineStyle(1, THEME.colors.primary, 0.5);
        bg.fillRoundedRect(-40, -15, 80, 30, 4);
        bg.strokeRoundedRect(-40, -15, 80, 30, 4);
        
        const txt = this.add.text(0, 0, '< MENU', { 
            fontFamily: THEME.fonts.display, 
            fontSize: '14px', 
            color: '#00ffd1' 
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setInteractive(new Phaser.Geom.Rectangle(-40, -15, 80, 30), Phaser.Geom.Rectangle.Contains)
            .on('pointerdown', () => this.scene.start('MenuScene'))
            .on('pointerover', () => { bg.setAlpha(1); txt.setScale(1.1); })
            .on('pointerout', () => { bg.setAlpha(0.8); txt.setScale(1); });
    }

    private _loadLevel(level: Level) {
        if (!level || !level.name) {
            Logger.log('Critical Error: Attempted to load invalid level', 'SYSTEM', 'ERROR');
            return;
        }
        
        Logger.log(`Level Load: ${level.name} (Shape: ${level.shape})`, 'SYSTEM');
        this.tweens.killAll();

        // Standardized bulk cleanup for local-state systems
        ['target', 'slots', 'palette', 'drag', 'ui'].forEach(k => this.systems[k].destroy());

        // Level-specific initialization sequence
        const { target, slots, palette, drag, ui, effects } = this.systems as any;
        
        target.create(level);
        slots.create(level);
        palette.create(level, target.target!);
        drag.attach(palette.pieces, slots, target, effects, ui, level.shape || 'circle');
        ui.create(level, slots.slots.length);
    }

    private _checkWin() {
        if (!(this.systems.slots as any).allOccupied()) return;

        const levelName = LEVELS[this.currentLevelIndex].name;
        Logger.log(`Level Complete: ${levelName}`, 'SYSTEM');
        
        const { width, height } = this.scale;
        const { effects, ui } = this.systems as any;

        effects.winFlash(width, height);
        ui.showWinText(width, height);

        this.time.delayedCall(2200, () => {
            this.currentLevelIndex = (this.currentLevelIndex + 1) % LEVELS.length;
            this._loadLevel(LEVELS[this.currentLevelIndex]);
        });
    }

    update() {
        // Standardized bulk updates
        Object.values(this.systems).forEach(sys => sys.update?.());
    }

    destroy() {
        // Standardized global cleanup
        Object.values(this.systems).forEach(sys => sys.destroy());
    }
}
