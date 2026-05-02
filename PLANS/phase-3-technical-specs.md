---
title: Phase 3 Technical Specifications
date: 2026-04-25
section: Architecture & Implementation Details
---

# Phase 3 Technical Specifications

Detailed technical specs for new components, interactions, and detectors.

---

## 1. SymbolicFractionDisplay Component

**Purpose:** Lightweight Phaser Text component rendering fraction notation (e.g., `3/4`) below bar models.

**Location:** `src/components/SymbolicFractionDisplay.ts`

### 1.1 Class Definition

```typescript
import * as Phaser from 'phaser';
import { HEX } from '../scenes/utils/colors';

export interface SymbolicFractionDisplayOptions {
  fontSize?: string;           // default: '24px'
  color?: string;              // default: HEX.neutral900
  fallbackLabel?: boolean;     // default: false (use 'a of b' for L1–L2)
}

export class SymbolicFractionDisplay {
  private textObject: Phaser.GameObjects.Text;
  private numerator: number;
  private denominator: number;
  private useFallback: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    numerator: number,
    denominator: number,
    options?: SymbolicFractionDisplayOptions,
  ) {
    this.numerator = numerator;
    this.denominator = denominator;
    this.useFallback = options?.fallbackLabel ?? false;

    const fontSize = options?.fontSize ?? '24px';
    const color = options?.color ?? HEX.neutral900;
    const text = this.formatFraction(numerator, denominator);

    this.textObject = scene.add.text(x, y, text, {
      fontSize,
      fontFamily: '"Nunito", system-ui, sans-serif',
      color,
      align: 'center',
    }).setOrigin(0.5);
  }

  private formatFraction(n: number, d: number): string {
    if (this.useFallback) {
      return `${n} of ${d}`;
    }
    return `${n}/${d}`;
  }

  setFraction(numerator: number, denominator: number): void {
    this.numerator = numerator;
    this.denominator = denominator;
    this.textObject.setText(this.formatFraction(numerator, denominator));
  }

  getTextObject(): Phaser.GameObjects.Text {
    return this.textObject;
  }

  destroy(): void {
    this.textObject.destroy();
  }
}
```

### 1.2 Integration in CompareInteraction

**File:** `src/scenes/interactions/CompareInteraction.ts`

```typescript
// After creating BarModel instances:
const symbolA = new SymbolicFractionDisplay(
  scene,
  centerX - 180,      // below left bar
  centerY - 80 + barH + 60,
  aFrac.n,
  aFrac.d,
  { fontSize: '20px' }
);

const symbolB = new SymbolicFractionDisplay(
  scene,
  centerX + 180,      // below right bar
  centerY - 80 + barH + gap + barH + 60,
  bFrac.n,
  bFrac.d,
  { fontSize: '20px' }
);

// Store for cleanup
this.gameObjects.push(symbolA.getTextObject());
this.gameObjects.push(symbolB.getTextObject());
```

### 1.3 Viewport Testing

Test on:
- **Desktop (1280×800):** symbols spaced comfortably below bars
- **Tablet (iPad, 768×1024):** bars at 200px width, symbols at 20px font (readable)
- **Mobile (360×800):** bars at 180px width (tight but functional), symbols at 18px font, check no overlap with buttons below

---

## 2. Misconception Detectors

**Location:** `src/engine/misconceptionDetectors.ts`

### 2.1 Detector Base Pattern

Each detector:
1. Accepts `attempts: AttemptRecord[]` (sorted by timestamp, newest first)
2. Filters attempts matching archetype + level criteria
3. Scans for pattern in last 5–8 attempts
4. Returns `MisconceptionFlag` if pattern ≥ threshold, else `null`

### 2.2 DetectWHB01 — Whole-Number Bias (Numerator)

**Trigger:** L6+ `compare` activities where larger numerator is misleading.

**Pattern:** Student picks "relation > " (top bigger) on items where numerator is large but value is actually small.

**Implementation:**

```typescript
import type { AttemptRecord, MisconceptionFlag, StudentId } from '@/types';

export function detectWHB01(
  attempts: AttemptRecord[],
  level: number,
  studentId?: StudentId,
): MisconceptionFlag | null {
  if (level < 6) return null;  // L6+
  
  // Filter compare attempts
  const compareAttempts = attempts.filter(
    (a) => a.studentAnswer?.archetype === 'compare'
  );
  if (compareAttempts.length < 5) return null;

  // Count times student chose '>' when correct was '=' or '<'
  // (i.e., chose larger numerator when it was wrong)
  let trapsHit = 0;
  for (const attempt of compareAttempts.slice(0, 8)) {
    const { studentAnswer, correct } = attempt;
    if (!correct && studentAnswer?.relation === '>') {
      // Student picked "top bigger" but was wrong
      // Likely WHB-01 pattern: numerator led them astray
      trapsHit++;
    }
  }

  const trapRate = trapsHit / compareAttempts.slice(0, 8).length;
  if (trapRate >= 0.6) {
    return {
      id: `flag:${Date.now()}:${studentId}:whb01` as import('@/types').MisconceptionFlagId,
      studentId: studentId ?? 'anonymous',
      misconceptionId: 'MC-WHB-01',
      level,
      timestamp: Date.now(),
      confidence: Math.min(trapRate, 1.0),
      detectorVersion: '1.0.0',
    };
  }
  return null;
}
```

### 2.3 DetectWHB02 — Whole-Number Bias (Denominator)

**Trigger:** L7+ `compare` activities with same numerator, different denominators.

**Pattern:** Student picks larger denominator (which yields smaller fraction) ≥ 60% of time.

```typescript
export function detectWHB02(
  attempts: AttemptRecord[],
  level: number,
  studentId?: StudentId,
): MisconceptionFlag | null {
  if (level < 7) return null;  // L7+
  
  // Filter compare attempts with same numerator
  const compareAttempts = attempts.filter(
    (a) => a.studentAnswer?.archetype === 'compare' &&
           a.questionPayload?.archetype === 'compare'
  );
  if (compareAttempts.length < 5) return null;

  // On items like "1/2 vs 1/8", student picks "1/8 is bigger" (wrong, denominator bias)
  let trapsHit = 0;
  for (const attempt of compareAttempts.slice(0, 8)) {
    const { studentAnswer, correct } = attempt;
    // Heuristic: if student was wrong on a compare with larger-denominator trap
    if (!correct && studentAnswer?.relation === '>') {
      trapsHit++;
    }
  }

  const trapRate = trapsHit / compareAttempts.slice(0, 8).length;
  if (trapRate >= 0.6) {
    return {
      id: `flag:${Date.now()}:${studentId}:whb02` as import('@/types').MisconceptionFlagId,
      studentId: studentId ?? 'anonymous',
      misconceptionId: 'MC-WHB-02',
      level,
      timestamp: Date.now(),
      confidence: trapRate,
      detectorVersion: '1.0.0',
    };
  }
  return null;
}
```

### 2.4 DetectMAG01 — Magnitude Blindness

**Trigger:** L8–L9 comparison + ordering attempts.

**Pattern:** Accuracy on Tier-3 (no scaffolding) items < 50% AND avg errorMagnitude > 0.20.

```typescript
export function detectMAG01(
  attempts: AttemptRecord[],
  level: number,
  studentId?: StudentId,
): MisconceptionFlag | null {
  if (level < 8) return null;  // L8+
  
  const tier3Attempts = attempts.filter(
    (a) => a.difficultyTier === 'hard' &&
           (a.studentAnswer?.archetype === 'compare' ||
            a.studentAnswer?.archetype === 'order')
  );
  if (tier3Attempts.length < 5) return null;

  let correctCount = 0;
  let totalErrorMagnitude = 0;
  
  for (const attempt of tier3Attempts) {
    if (attempt.correct) {
      correctCount++;
    }
    // errorMagnitude from validator result
    if (attempt.errorMagnitude !== undefined) {
      totalErrorMagnitude += attempt.errorMagnitude;
    }
  }

  const accuracy = correctCount / tier3Attempts.length;
  const avgError = totalErrorMagnitude / tier3Attempts.length;

  if (accuracy < 0.5 && avgError > 0.2) {
    return {
      id: `flag:${Date.now()}:${studentId}:mag01` as import('@/types').MisconceptionFlagId,
      studentId: studentId ?? 'anonymous',
      misconceptionId: 'MC-MAG-01',
      level,
      timestamp: Date.now(),
      confidence: Math.min(0.5 + (avgError * 0.5), 1.0),  // Confidence rises with error magnitude
      detectorVersion: '1.0.0',
    };
  }
  return null;
}
```

### 2.5 DetectPRX01 — Proximity-to-1 Confusion

**Trigger:** L8 `benchmark_sort` activities where correct answer is "almost_one".

**Pattern:** Student places in "half" or "almost_half" zone ≥ 50% of time.

```typescript
export function detectPRX01(
  attempts: AttemptRecord[],
  level: number,
  studentId?: StudentId,
): MisconceptionFlag | null {
  if (level < 8) return null;  // L8+
  
  const benchmarkAttempts = attempts.filter(
    (a) => a.studentAnswer?.archetype === 'benchmark' &&
           a.questionPayload?.archetype === 'benchmark'
  );
  if (benchmarkAttempts.length < 4) return null;

  // Count times student placed in wrong zone when answer was "almost_one"
  let misplacedCount = 0;
  for (const attempt of benchmarkAttempts.slice(0, 8)) {
    const { studentAnswer, correct, questionPayload } = attempt;
    const correctZone = questionPayload?.correctZone;  // e.g., 'almost_one'
    
    if (correctZone === 'almost_one' && !correct) {
      // Student placed incorrectly on an "almost_one" item
      const studentZone = studentAnswer?.placedZone;
      if (studentZone === 'half' || studentZone === 'almost_half') {
        misplacedCount++;
      }
    }
  }

  const misplaceRate = misplacedCount / benchmarkAttempts.slice(0, 8).length;
  if (misplaceRate >= 0.5) {
    return {
      id: `flag:${Date.now()}:${studentId}:prx01` as import('@/types').MisconceptionFlagId,
      studentId: studentId ?? 'anonymous',
      misconceptionId: 'MC-PRX-01',
      level,
      timestamp: Date.now(),
      confidence: misplaceRate,
      detectorVersion: '1.0.0',
    };
  }
  return null;
}
```

### 2.6 Integration in LevelScene

**File:** `src/scenes/LevelScene.ts`, method `onCommit()`

```typescript
import { detectWHB01, detectWHB02, detectMAG01, detectPRX01 } from '@/engine/misconceptionDetectors';

private async onCommit(payload: unknown): Promise<void> {
  if (this.inputLocked) return;
  this.lastPayload = payload;

  // ... existing validation logic ...

  // Run misconception detectors
  try {
    const { attemptRepo, misconceptionFlagRepo } = await import('@/persistence/repositories');
    const recentAttempts = await attemptRepo.getLastN(this.studentId, 8);
    
    const flag =
      detectWHB01(recentAttempts, this.levelNumber, this.studentId) ??
      detectWHB02(recentAttempts, this.levelNumber, this.studentId) ??
      detectMAG01(recentAttempts, this.levelNumber, this.studentId) ??
      detectPRX01(recentAttempts, this.levelNumber, this.studentId);

    if (flag) {
      await misconceptionFlagRepo.insert(flag);
      console.info(`[LevelScene] Misconception detected: ${flag.misconceptionId} (confidence: ${flag.confidence.toFixed(2)})`);
    }
  } catch (err) {
    console.warn('[LevelScene] Misconception detector error:', err);
    // Continue — detectors are optional, do not block validation
  }

  // ... rest of logic ...
}
```

---

## 3. BenchmarkInteraction

**Location:** `src/scenes/interactions/BenchmarkInteraction.ts`

### 3.1 Class Structure

```typescript
import * as Phaser from 'phaser';
import { CLR, HEX } from '../utils/colors';
import type { Interaction, InteractionContext } from './types';

interface BenchmarkPayload {
  fractions: Array<{ numerator: number; denominator: number; label?: string }>;
  correctZones: Array<'zero' | 'almost_half' | 'half' | 'almost_one' | 'one'>;
  labels?: {
    zone0?: string;   // "Close to 0"
    zone25?: string;  // "1/4"
    zone50?: string;  // "1/2"
    zone75?: string;  // "3/4"
    zone100?: string; // "Close to 1"
  };
}

export class BenchmarkInteraction implements Interaction {
  readonly archetype = 'benchmark' as const;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private cards: FractionCard[] = [];
  private zones: DropZone[] = [];

  mount(ctx: InteractionContext): void {
    const { scene, template, centerX, centerY, onCommit, width, height } = ctx;
    const payload = template.payload as BenchmarkPayload;

    // Render number line
    this.renderNumberLine(scene, centerX, centerY);

    // Render drop zones (4 zones between landmarks)
    this.renderZones(scene, centerX, centerY);

    // Render fraction cards (draggable)
    this.renderCards(scene, centerX, centerY, payload.fractions, onCommit);
  }

  private renderNumberLine(scene: Phaser.Scene, centerX: number, centerY: number): void {
    const lineY = centerY + 40;
    const lineWidth = 500;
    const x0 = centerX - lineWidth / 2;
    const x1 = centerX + lineWidth / 2;

    // Line
    const line = scene.add.line(centerX, lineY, x0, 0, x1, 0, CLR.neutral400, 2);
    this.gameObjects.push(line);

    // Landmarks: 0, 1/4, 1/2, 3/4, 1
    const landmarks = [
      { val: 0, label: '0' },
      { val: 0.25, label: '1/4' },
      { val: 0.5, label: '1/2' },
      { val: 0.75, label: '3/4' },
      { val: 1, label: '1' },
    ];

    landmarks.forEach(({ val, label }) => {
      const x = x0 + val * lineWidth;
      const tick = scene.add.line(x, lineY, 0, -8, 0, 8, CLR.neutral600, 2);
      const txt = scene.add.text(x, lineY + 20, label, {
        fontSize: '14px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        color: HEX.neutral600,
      }).setOrigin(0.5);
      this.gameObjects.push(tick, txt);
    });
  }

  private renderZones(scene: Phaser.Scene, centerX: number, centerY: number): void {
    const lineY = centerY + 40;
    const lineWidth = 500;
    const x0 = centerX - lineWidth / 2;

    // Zone dividers and drop zones
    const zoneBoundaries = [0, 0.25, 0.5, 0.75, 1];
    const zones: DropZone[] = [];

    for (let i = 0; i < zoneBoundaries.length - 1; i++) {
      const zoneX0 = x0 + zoneBoundaries[i] * lineWidth;
      const zoneX1 = x0 + zoneBoundaries[i + 1] * lineWidth;
      const zoneCenterX = (zoneX0 + zoneX1) / 2;
      const zoneWidth = zoneX1 - zoneX0;

      // Zone rectangle (semi-transparent background)
      const zoneRectY = lineY + 60;
      const zoneRect = scene.add.rectangle(
        zoneCenterX,
        zoneRectY,
        zoneWidth,
        80,
        CLR.primarySoft,
        0.1
      ).setDepth(1);

      const zoneLabel = scene.add.text(zoneCenterX, zoneRectY - 25, this.zoneLabel(i), {
        fontSize: '12px',
        fontFamily: '"Nunito", system-ui, sans-serif',
        color: HEX.neutral600,
      }).setOrigin(0.5).setDepth(2);

      this.gameObjects.push(zoneRect, zoneLabel);
      zones.push({
        index: i,
        x0: zoneX0,
        x1: zoneX1,
        centerX: zoneCenterX,
        centerY: zoneRectY,
      });
    }

    this.zones = zones;
  }

  private zoneLabel(zoneIndex: number): string {
    const labels = ['0–1/4', '1/4–1/2', '1/2–3/4', '3/4–1'];
    return labels[zoneIndex] ?? '';
  }

  private renderCards(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    fractions: BenchmarkPayload['fractions'],
    onCommit: (payload: unknown) => void,
  ): void {
    const startY = centerY - 200;
    const cardGap = 110;

    fractions.forEach((frac, i) => {
      const card = new FractionCard(scene, {
        x: centerX - (fractions.length * cardGap) / 2 + i * cardGap,
        y: startY,
        numerator: frac.numerator,
        denominator: frac.denominator,
        label: frac.label,
        onDrop: (droppedZoneIndex) => {
          const zoneIndex = droppedZoneIndex ?? -1;
          const correct = zoneIndex === i; // Simplified: assumes correctZones[i] matches zoneIndex
          onCommit({
            fractionIndex: i,
            placedZone: zoneIndex,
            correct,
          });
        },
      });
      this.cards.push(card);
      this.gameObjects.push(card.getDisplayObject());
    });
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.cards.forEach((c) => c.destroy());
    this.cards = [];
    this.zones = [];
  }
}

// Helper: FractionCard
class FractionCard {
  private displayObject: Phaser.GameObjects.Container;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  constructor(
    scene: Phaser.Scene,
    opts: {
      x: number;
      y: number;
      numerator: number;
      denominator: number;
      label?: string;
      onDrop: (zoneIndex: number | null) => void;
    },
  ) {
    const { x, y, numerator, denominator, label, onDrop } = opts;

    const bg = scene.add.rectangle(x, y, 80, 80, CLR.accentA);
    const text = scene.add.text(x, y, label ?? `${numerator}/${denominator}`, {
      fontSize: '18px',
      fontFamily: '"Nunito", system-ui, sans-serif',
      color: HEX.neutral0,
      align: 'center',
    }).setOrigin(0.5);

    const hit = scene.add.rectangle(x, y, 80, 80, 0, 0)
      .setInteractive({ useHandCursor: true, draggable: true });

    hit.on('dragstart', () => {
      this.isDragging = true;
      bg.setFillStyle(CLR.primary);
    });

    hit.on('drag', (pointer: Phaser.Input.Pointer) => {
      const newX = pointer.x;
      const newY = pointer.y;
      bg.setPosition(newX, newY);
      text.setPosition(newX, newY);
      hit.setPosition(newX, newY);
    });

    hit.on('dragend', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = false;
      bg.setFillStyle(CLR.accentA);

      // Detect which zone the card was dropped in
      // (simplified: snap to nearest zone center)
      const droppedZone = this.detectZoneAtPoint(pointer.x, pointer.y);
      onDrop(droppedZone);

      // Snap to zone center if valid
      if (droppedZone !== null) {
        // This would require access to zones array; refactor if needed
        // For now, reset to start position
        bg.setPosition(x, y);
        text.setPosition(x, y);
        hit.setPosition(x, y);
      }
    });

    this.displayObject = scene.add.container(0, 0, [bg, text, hit]);
  }

  private detectZoneAtPoint(x: number, y: number): number | null {
    // Placeholder: would compare x against zone boundaries
    // For now, return null (no zone detected)
    return null;
  }

  getDisplayObject(): Phaser.GameObjects.Container {
    return this.displayObject;
  }

  destroy(): void {
    this.displayObject.destroy();
  }
}
```

### 3.2 Performance Constraints

Per C9 timing budget:
- **Easy tier:** Session goal = 5 questions, each < 2.5 min → total < 12.5 min
- **Measure:** Timestamp each question load + answer submit
- **Test:** On iPad + Chrome with 3G throttle (representative playtest environment)

---

## 4. OrderInteraction

**Location:** `src/scenes/interactions/OrderInteraction.ts`

### 4.1 Class Structure

```typescript
import * as Phaser from 'phaser';
import { CLR, HEX } from '../utils/colors';
import type { Interaction, InteractionContext } from './types';

interface OrderPayload {
  fractions: Array<{ numerator: number; denominator: number; label?: string }>;
  correctOrder: number[];  // indices in ascending order
}

export class OrderInteraction implements Interaction {
  readonly archetype = 'order' as const;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private availableCards: FractionCardOrder[] = [];
  private sequenceCards: FractionCardOrder[] = [];
  private correctOrder: number[] = [];

  mount(ctx: InteractionContext): void {
    const { scene, template, centerX, centerY, onCommit } = ctx;
    const payload = template.payload as OrderPayload;

    this.correctOrder = payload.correctOrder;

    // Render "Available" section (left side)
    this.renderAvailableCards(scene, centerX - 200, centerY - 100, payload.fractions);

    // Render "Your Order" section (right side, drop zone)
    this.renderSequenceZone(scene, centerX + 200, centerY - 100);

    // Render "Done" button
    this.renderDoneButton(scene, centerX, centerY + 200, onCommit);
  }

  private renderAvailableCards(
    scene: Phaser.Scene,
    x: number,
    y: number,
    fractions: OrderPayload['fractions'],
  ): void {
    const title = scene.add.text(x, y - 40, 'Pick one:', {
      fontSize: '16px',
      fontFamily: '"Nunito", system-ui, sans-serif',
      color: HEX.neutral600,
    }).setOrigin(0.5);
    this.gameObjects.push(title);

    const cardGap = 90;
    fractions.forEach((frac, i) => {
      const card = new FractionCardOrder(scene, {
        x: x - (fractions.length * cardGap) / 2 + i * cardGap,
        y,
        numerator: frac.numerator,
        denominator: frac.denominator,
        label: frac.label,
        onTap: () => this.moveCardToSequence(i, card),
      });
      this.availableCards.push(card);
      this.gameObjects.push(card.getDisplayObject());
    });
  }

  private renderSequenceZone(scene: Phaser.Scene, x: number, y: number): void {
    const title = scene.add.text(x, y - 40, 'Your order:', {
      fontSize: '16px',
      fontFamily: '"Nunito", system-ui, sans-serif',
      color: HEX.neutral600,
    }).setOrigin(0.5);
    this.gameObjects.push(title);

    // Draw a drop zone rectangle
    const zoneRect = scene.add.rectangle(x, y + 40, 120, 200, CLR.primarySoft, 0.2)
      .setStrokeStyle(2, CLR.primary);
    this.gameObjects.push(zoneRect);
  }

  private moveCardToSequence(index: number, card: FractionCardOrder): void {
    // Move card from available to sequence
    card.moveToSequence();
    this.sequenceCards.push(card);
    // Remove from available
    const idx = this.availableCards.indexOf(card);
    if (idx > -1) {
      this.availableCards.splice(idx, 1);
    }
  }

  private renderDoneButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onCommit: (payload: unknown) => void,
  ): void {
    const bg = scene.add.rectangle(x, y, 160, 56, CLR.primary);
    const label = scene.add.text(x, y, 'Done', {
      fontSize: '20px',
      fontFamily: '"Nunito", system-ui, sans-serif',
      fontStyle: 'bold',
      color: HEX.neutral0,
    }).setOrigin(0.5);
    const hit = scene.add.rectangle(x, y, 160, 56, 0, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerup', () => {
      const order = this.sequenceCards.map((c) => c.getIndex());
      onCommit({
        order,
        correct: order.toString() === this.correctOrder.toString(),
      });
    });

    this.gameObjects.push(bg, label, hit);
  }

  unmount(): void {
    this.gameObjects.forEach((o) => o.destroy());
    this.gameObjects = [];
    this.availableCards.forEach((c) => c.destroy());
    this.availableCards = [];
    this.sequenceCards.forEach((c) => c.destroy());
    this.sequenceCards = [];
  }
}

// Helper: FractionCardOrder (tappable card)
class FractionCardOrder {
  private displayObject: Phaser.GameObjects.Container;
  private index: number;

  constructor(
    scene: Phaser.Scene,
    opts: {
      x: number;
      y: number;
      numerator: number;
      denominator: number;
      label?: string;
      onTap: () => void;
    },
  ) {
    const { x, y, numerator, denominator, label, onTap } = opts;

    const bg = scene.add.rectangle(x, y, 80, 80, CLR.accentA);
    const text = scene.add.text(x, y, label ?? `${numerator}/${denominator}`, {
      fontSize: '18px',
      fontFamily: '"Nunito", system-ui, sans-serif',
      color: HEX.neutral0,
      align: 'center',
    }).setOrigin(0.5);

    const hit = scene.add.rectangle(x, y, 80, 80, 0, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerup', onTap);

    this.displayObject = scene.add.container(0, 0, [bg, text, hit]);
  }

  getDisplayObject(): Phaser.GameObjects.Container {
    return this.displayObject;
  }

  getIndex(): number {
    return this.index;
  }

  moveToSequence(): void {
    // Animate or reposition card to sequence zone
    // (Simplified: just hide from available view)
  }

  destroy(): void {
    this.displayObject.destroy();
  }
}
```

---

## 5. Data Schema Additions

### 5.1 MisconceptionFlag (already defined, verify in `src/types/index.ts`)

```typescript
export type MisconceptionFlagId = string & { readonly __brand: 'MisconceptionFlagId' };

export interface MisconceptionFlag {
  id: MisconceptionFlagId;
  studentId: StudentId;
  misconceptionId: MisconceptionId;  // e.g., 'MC-WHB-01'
  level: number;
  timestamp: number;
  confidence: number;  // 0–1 confidence in detection
  detectorVersion: string;
}
```

### 5.2 Updated AttemptRecord (ensure these fields exist)

```typescript
export interface AttemptRecord {
  id: AttemptId;
  sessionId: SessionId;
  studentId: StudentId;
  levelNumber: number;
  questionId: QuestionTemplateId;
  archetype: ArchetypeId;
  
  // Attempt data
  studentAnswer: unknown;  // Shape depends on archetype
  correct: boolean;
  outcome: 'EXACT' | 'CLOSE' | 'WRONG';
  errorMagnitude?: number;  // Distance from correct (0–1)
  
  // Context
  difficultyTier: 'easy' | 'medium' | 'hard';
  hintCount: number;
  attemptNumber: number;
  timeSpentMs: number;
  
  // Metadata
  timestamp: number;
  deviceInfo?: {
    platform: 'web' | 'ios' | 'android';
    viewport: { width: number; height: number };
  };
}
```

---

## 6. Test Fixtures & Stubs

### 6.1 Mock AttemptRecord (for detector tests)

```typescript
export function createMockAttempt(overrides?: Partial<AttemptRecord>): AttemptRecord {
  return {
    id: 'attempt:test' as AttemptId,
    sessionId: 'session:test' as SessionId,
    studentId: 'student:test' as StudentId,
    levelNumber: 6,
    questionId: 'q:test' as QuestionTemplateId,
    archetype: 'compare',
    studentAnswer: { relation: '>' },
    correct: false,
    outcome: 'WRONG',
    errorMagnitude: 0.5,
    difficultyTier: 'easy',
    hintCount: 0,
    attemptNumber: 1,
    timeSpentMs: 5000,
    timestamp: Date.now(),
    ...overrides,
  };
}
```

### 6.2 Detector Test Template

```typescript
describe('misconceptionDetectors', () => {
  describe('detectWHB01', () => {
    it('should flag when pattern >= 60%', () => {
      const attempts = [
        createMockAttempt({ correct: false, studentAnswer: { relation: '>' } }),
        createMockAttempt({ correct: false, studentAnswer: { relation: '>' } }),
        createMockAttempt({ correct: false, studentAnswer: { relation: '>' } }),
        createMockAttempt({ correct: true, studentAnswer: { relation: '=' } }),
      ];
      
      const flag = detectWHB01(attempts, 6);
      expect(flag).toBeDefined();
      expect(flag?.misconceptionId).toBe('MC-WHB-01');
      expect(flag?.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should not flag when pattern < 60%', () => {
      const attempts = [
        createMockAttempt({ correct: true }),
        createMockAttempt({ correct: true }),
        createMockAttempt({ correct: false, studentAnswer: { relation: '>' } }),
        createMockAttempt({ correct: true }),
      ];
      
      const flag = detectWHB01(attempts, 6);
      expect(flag).toBeNull();
    });

    it('should return null on levels < 6', () => {
      const attempts = [
        createMockAttempt({ correct: false, studentAnswer: { relation: '>' } }),
        createMockAttempt({ correct: false, studentAnswer: { relation: '>' } }),
        createMockAttempt({ correct: false, studentAnswer: { relation: '>' } }),
      ];
      
      const flag = detectWHB01(attempts, 5);  // Level 5
      expect(flag).toBeNull();
    });

    it('should return null on < 5 attempts', () => {
      const attempts = [
        createMockAttempt({ correct: false, studentAnswer: { relation: '>' } }),
        createMockAttempt({ correct: false, studentAnswer: { relation: '>' } }),
      ];
      
      const flag = detectWHB01(attempts, 6);
      expect(flag).toBeNull();
    });
  });
});
```

---

## 7. Integration Checklist

### Before L6–L7 Gate

- [ ] SymbolicFractionDisplay renders below bars on all viewports (360px, 768px, 1280px)
- [ ] CompareInteraction stores correct/incorrect in attempts table
- [ ] detectWHB01 + detectWHB02 called in LevelScene.onCommit()
- [ ] Misconception flags written to misconceptionFlagsRepo
- [ ] Unit tests pass: 100% coverage of detector logic

### Before L8 Gate

- [ ] BenchmarkInteraction drag-to-zone works; zones detected correctly
- [ ] Card snap animations smooth (no visual glitches on iPad)
- [ ] Easy tier timing < 13 min (measure on real device with 3G throttle)
- [ ] detectMAG01 + detectPRX01 integrated + tested

### Before L9 Gate

- [ ] OrderInteraction tappable cards + sequence zone
- [ ] Ordering validator working (reuse existing)
- [ ] All interactions destroy cleanly (no memory leaks)

---

*End of Technical Specifications*
