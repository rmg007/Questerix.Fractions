import * as Phaser from 'phaser';
import { LEVELS, THEME, ShapeType } from '../data/config';
import BackgroundSystem from '../systems/BackgroundSystem';

export default class MenuScene extends Phaser.Scene {
    private bgSystem!: BackgroundSystem;
    private currentCategory: ShapeType | 'main' = 'main';
    private menuContainer!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        this.bgSystem = new BackgroundSystem(this);
        this.bgSystem.create();

        const { width, height } = this.scale;

        // Title
        this.add.text(width / 2, 80, 'QUESTERIX', {
            fontFamily: THEME.fonts.main,
            fontSize: '48px',
            color: '#00ffd1'
        }).setOrigin(0.5).setAlpha(0.8);

        this.add.text(width / 2, 130, 'FRACTION CALIBRATOR', {
            fontFamily: THEME.fonts.display,
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5).setAlpha(0.4).setLetterSpacing(4);

        this.menuContainer = this.add.container(0, 0);
        this.showMainMenu();
    }

    private showMainMenu() {
        this.menuContainer.removeAll(true);
        this.currentCategory = 'main';
        const { width, height } = this.scale;

        const categories: { label: string, shape: ShapeType }[] = [
            { label: 'CIRCLE EXAMPLES', shape: 'circle' },
            { label: 'SQUARE EXAMPLES', shape: 'square' },
            { label: 'RECTANGLE EXAMPLES', shape: 'rectangle' }
        ];

        categories.forEach((cat, i) => {
            this.createMenuButton(width / 2, 300 + i * 100, cat.label, () => {
                this.showSubMenu(cat.shape);
            });
        });
    }

    private showSubMenu(shape: ShapeType) {
        this.menuContainer.removeAll(true);
        this.currentCategory = shape;
        const { width, height } = this.scale;

        // Header
        this.add.text(width / 2, 220, `${shape.toUpperCase()} LEVELS`, {
            fontFamily: THEME.fonts.display,
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5).setAlpha(0.6);

        const filteredLevels = LEVELS.filter(l => l.shape === shape);

        // Simple grid for levels
        filteredLevels.forEach((level, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = width / 2 - 120 + col * 240;
            const y = 300 + row * 80;

            this.createMenuButton(x, y, level.name.split(':')[0], () => {
                this.scene.start('FractionScene', { levelId: level.id });
                console.log(`Starting level: ${level.id}`);
            }, 200);
        });

        // Back button
        this.createMenuButton(width / 2, height - 100, 'BACK TO CATEGORIES', () => {
            this.showMainMenu();
        }, 360);
    }

    private createMenuButton(x: number, y: number, text: string, callback: () => void, btnWidth: number = 360) {
        const btn = this.add.container(x, y);
        
        const bg = this.add.graphics();
        bg.fillStyle(0x1a243d, 0.6);
        bg.lineStyle(2, 0x00ffd1, 0.3);
        bg.fillRoundedRect(-btnWidth/2, -25, btnWidth, 50, 4);
        bg.strokeRoundedRect(-btnWidth/2, -25, btnWidth, 50, 4);
        
        const label = this.add.text(0, 0, text, {
            fontFamily: THEME.fonts.display,
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);

        btn.add([bg, label]);
        btn.setSize(btnWidth, 50);
        btn.setInteractive({ useHandCursor: true })
           .on('pointerover', () => {
               bg.clear();
               bg.fillStyle(0x00ffd1, 0.2);
               bg.lineStyle(2, 0x00ffd1, 1);
               bg.fillRoundedRect(-btnWidth/2, -25, btnWidth, 50, 4);
               bg.strokeRoundedRect(-btnWidth/2, -25, btnWidth, 50, 4);
               label.setScale(1.05);
           })
           .on('pointerout', () => {
               bg.clear();
               bg.fillStyle(0x1a243d, 0.6);
               bg.lineStyle(2, 0x00ffd1, 0.3);
               bg.fillRoundedRect(-btnWidth/2, -25, btnWidth, 50, 4);
               bg.strokeRoundedRect(-btnWidth/2, -25, btnWidth, 50, 4);
               label.setScale(1);
           })
           .on('pointerdown', callback);

        this.menuContainer.add(btn);
        return btn;
    }
}
