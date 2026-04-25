import * as Phaser from 'phaser';
import { THEME, FRACTIONS, ShapeType } from '../data/config';
import { Geometry } from '../utils/Geometry';

/**
 * FractionPiece — Encapsulated game object representing a single slice of a fraction.
 */
export default class FractionPiece extends Phaser.GameObjects.Container {
    public readonly fKey: string;
    public originPos: { x: number; y: number };
    
    public snapped: boolean = false;
    public isDragging: boolean = false;
    public isReturning: boolean = false;
    
    public readonly shape: ShapeType;
    public readonly index: number;
    public readonly total: number;
    
    private graphics: Phaser.GameObjects.Graphics;
    private label: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, key: string, targetRadius: number, shape: ShapeType, index: number, total: number) {
        super(scene, x, y);
        this.fKey = key;
        this.originPos = { x, y };
        this.shape = shape;
        this.index = index;
        this.total = total;

        const def = FRACTIONS[key];
        const r = targetRadius;

        // 1. Graphics Body
        this.graphics = scene.add.graphics();
        this._drawBody(def, r);

        // 2. Label
        const { lx, ly } = this._getLabelPos(r);
        const fontSize = Math.max(12, 34 - def.denominator * 2);
        
        this.label = scene.add.text(
            lx, 
            ly, 
            def.label, 
            {
                fontFamily: THEME.fonts.main,
                fontSize: `${fontSize}px`,
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: Math.max(3, 7 - def.denominator),
            }
        ).setOrigin(0.5).setResolution(2);
        this.label.setShadow(0, 0, '#' + def.color.toString(16), 12, true, true);

        // 3. Assemble and Interactive
        this.add([this.graphics, this.label]);
        this.setScale(0.8);
        
        const hitArea = this._getHitArea(r);
        this.setInteractive(hitArea.geom, hitArea.contains);
        
        scene.input.setDraggable(this);
        scene.add.existing(this);
    }

    private _drawBody(def: any, r: number) {
        const g = this.graphics;
        g.clear();
        const color = def.color;
        const rimColor = Geometry.brighten(color, 40);

        g.fillStyle(color, 0.95);
        g.lineStyle(3, rimColor, 0.8);

        if (this.shape === 'circle') {
            const angle = (Math.PI * 2) / def.denominator;
            const start = -Math.PI / 2 - angle / 2;
            g.beginPath();
            g.moveTo(0, 0);
            g.arc(0, 0, r, start, start + angle);
            g.lineTo(0, 0);
            g.fillPath();
            g.strokePath();
        } else if (this.shape === 'square') {
            const w = (r * 2) / def.denominator;
            const h = r * 2;
            g.fillRect(-w/2, -h/2, w, h);
            g.strokeRect(-w/2, -h/2, w, h);
        } else if (this.shape === 'rectangle') {
            const w = r * 2.6; // Wider
            const h = (r * 1.6) / def.denominator; // Horizontal slice height
            g.fillRect(-w/2, -h/2, w, h); // Draw centered horizontal layer
            g.strokeRect(-w/2, -h/2, w, h);
        }
    }

    private _getLabelPos(r: number) {
        if (this.shape === 'circle') {
            const angle = (Math.PI * 2) / this.total;
            const midAngle = -Math.PI / 2; 
            const dist = this.total === 1 ? 0 : r * 0.54;
            return { lx: Math.cos(midAngle) * dist, ly: Math.sin(midAngle) * dist };
        }
        return { lx: 0, ly: 0 };
    }

    private _getHitArea(r: number) {
        if (this.shape === 'square') {
            const w = (r * 2) / this.total;
            return { geom: new Phaser.Geom.Rectangle(-w/2, -r, w, r*2), contains: Phaser.Geom.Rectangle.Contains };
        }
        if (this.shape === 'rectangle') {
            const w = r * 2.6;
            const h = (r * 1.6) / this.total;
            return { geom: new Phaser.Geom.Rectangle(-w/2, -h/2, w, h), contains: Phaser.Geom.Rectangle.Contains };
        }
        return { geom: new Phaser.Geom.Circle(0, 0, r), contains: Phaser.Geom.Circle.Contains };
    }

    updateLabelRotation() {
        this.label.rotation = -this.rotation;
    }
}
