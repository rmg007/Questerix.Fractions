import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { PixiStage } from '../PixiStage';
import { PointerManager, type PointerEvent } from '../pointers';
import { KeyboardManager, isConfirmationKey } from '../keyboard';
import { createText, createRect, createLine } from '../visual';
import { SPACING, COLORS, TYPOGRAPHY, STROKE } from '../tokens';
import type {
  BenchmarkQuestion,
  BenchmarkState,
  BenchmarkEvent,
  BenchmarkAnswer,
} from '../../model/benchmark';

interface BenchmarkRendererProps {
  question: BenchmarkQuestion;
  model: InteractionModel<BenchmarkQuestion, BenchmarkState, BenchmarkEvent, BenchmarkAnswer>;
  onAnswer?: (answer: BenchmarkAnswer) => void;
  onStateChange?: (state: BenchmarkState) => void;
  width?: number;
  height?: number;
}

type Zone = 'zero' | 'half' | 'one';

export function BenchmarkRenderer({
  question,
  model,
  onAnswer,
  onStateChange,
  width = 500,
  height = 400,
}: BenchmarkRendererProps) {
  const stageRef = useRef<PIXI.Application | null>(null);
  const pointerMgrRef = useRef<PointerManager | null>(null);
  const keyboardMgrRef = useRef<KeyboardManager | null>(null);
  const stateRef = useRef<BenchmarkState>(model.initialize(question));

  useEffect(() => {
    const pointerMgr = new PointerManager({
      onEvent: (event) => handlePointerEvent(event),
    });
    pointerMgrRef.current = pointerMgr;

    const keyboardMgr = new KeyboardManager({
      onEvent: (event) => handleKeyboardEvent(event),
    });
    keyboardMgr.attach();
    keyboardMgrRef.current = keyboardMgr;

    return () => {
      keyboardMgr.detach();
    };
  }, []);

  const handlePointerEvent = (event: PointerEvent): void => {
    if (event.type === 'tap' && event.targetId) {
      const zone = event.targetId.replace('benchmark-zone-', '') as Zone;
      updateState({ type: 'select-zone', zone });
    }
  };

  const handleKeyboardEvent = (event: { type: string; key: string }): void => {
    if (event.type === 'keydown') {
      const zones: Zone[] = ['zero', 'half', 'one'];
      const currentZone = stateRef.current.selectedZone;
      const zoneIndex = currentZone ? zones.indexOf(currentZone) : -1;

      if (event.key === 'ArrowLeft' && zoneIndex > 0) {
        updateState({ type: 'select-zone', zone: zones[zoneIndex - 1]! });
      } else if (event.key === 'ArrowRight' && zoneIndex < zones.length - 1) {
        updateState({ type: 'select-zone', zone: zones[zoneIndex + 1]! });
      } else if (isConfirmationKey(event.key)) {
        updateState({ type: 'submit' });
      }
    }
  };

  const updateState = (event: BenchmarkEvent): void => {
    const newState = model.reduce(stateRef.current, event);
    stateRef.current = newState;

    if (onStateChange) {
      onStateChange(newState);
    }

    const answer = model.toAnswer(newState);
    if (answer && onAnswer) {
      onAnswer(answer);
    }

    if (stageRef.current) {
      renderStage(stageRef.current, newState);
    }
  };

  const renderStage = (app: PIXI.Application, state: BenchmarkState): void => {
    app.stage.removeChildren();

    // Instruction
    const instrText = createText(
      'Which benchmark is this fraction closest to?',
      TYPOGRAPHY.normal,
      COLORS.textPrimary
    );
    instrText.anchor.set(0.5);
    instrText.x = width / 2;
    instrText.y = SPACING.md;
    app.stage.addChild(instrText);

    // Target fraction bar
    const barWidth = 180;
    const barHeight = 40;
    const barX = width / 2;
    const barY = height * 0.18;
    const numerator = question.numerator ?? 1;
    const denominator = question.denominator ?? 4;

    const barBg = createRect(barWidth, barHeight, COLORS.primary, COLORS.border, STROKE.normal);
    barBg.x = barX - barWidth / 2;
    barBg.y = barY - barHeight / 2;
    app.stage.addChild(barBg);

    // Shaded segments
    const segmentWidth = barWidth / denominator;
    for (let i = 0; i < numerator; i++) {
      const segRect = createRect(
        segmentWidth - 1,
        barHeight - 2,
        COLORS.correct,
        COLORS.border,
        STROKE.thin
      );
      segRect.x = barBg.x + i * segmentWidth;
      segRect.y = barY - barHeight / 2 + 1;
      app.stage.addChild(segRect);
    }

    // Fraction label
    const fracLabel = createText(
      `${numerator}/${denominator}`,
      TYPOGRAPHY.heading,
      COLORS.textPrimary
    );
    fracLabel.anchor.set(0.5);
    fracLabel.x = barX;
    fracLabel.y = barY + barHeight * 0.6;
    app.stage.addChild(fracLabel);

    // Number line showing benchmarks
    const lineY = height * 0.35;
    const lineLength = width * 0.6;
    const lineStartX = (width - lineLength) / 2;
    const line = createLine(
      lineStartX,
      lineY,
      lineStartX + lineLength,
      lineY,
      COLORS.border,
      STROKE.normal
    );
    app.stage.addChild(line);

    // Benchmark ticks
    const benchmarks = [
      { value: 0, label: '0' },
      { value: 0.5, label: '1/2' },
      { value: 1, label: '1' },
    ];
    benchmarks.forEach(({ value, label }) => {
      const tickX = lineStartX + value * lineLength;
      const tick = createLine(tickX, lineY - 8, tickX, lineY + 8, COLORS.border, STROKE.normal);
      app.stage.addChild(tick);

      const tickLabel = createText(label, TYPOGRAPHY.body, COLORS.textSecondary);
      tickLabel.anchor.set(0.5);
      tickLabel.x = tickX;
      tickLabel.y = lineY + 20;
      app.stage.addChild(tickLabel);
    });

    // Three drop zones
    const zones: Array<{ key: Zone; label: string; x: number }> = [
      { key: 'zero', label: 'Closer to 0', x: width * 0.17 },
      { key: 'half', label: 'Closer to 1/2', x: width * 0.5 },
      { key: 'one', label: 'Closer to 1', x: width * 0.83 },
    ];
    const zoneButtonW = 110;
    const zoneButtonH = 60;
    const zoneY = height * 0.65;

    zones.forEach(({ key, label, x }) => {
      const isSelected = state.selectedZone === key;
      const zoneColor = isSelected ? COLORS.buttonActive : COLORS.buttonInactive;
      const zoneBg = createRect(zoneButtonW, zoneButtonH, zoneColor, COLORS.border, STROKE.normal);
      zoneBg.x = x - zoneButtonW / 2;
      zoneBg.y = zoneY - zoneButtonH / 2;
      zoneBg.eventMode = 'static';
      zoneBg.cursor = 'pointer';
      (zoneBg as unknown as { id: string }).id = `benchmark-zone-${key}`;
      app.stage.addChild(zoneBg);

      const zoneLabel = createText(label, TYPOGRAPHY.small, COLORS.textPrimary, 'Arial');
      zoneLabel.anchor.set(0.5);
      zoneLabel.x = x;
      zoneLabel.y = zoneY;
      app.stage.addChild(zoneLabel);
    });

    // Submit button
    const submitButtonW = 140;
    const submitButtonH = 44;
    const submitButtonX = width / 2;
    const submitButtonY = height * 0.88;
    const submitBg = createRect(
      submitButtonW,
      submitButtonH,
      COLORS.primary,
      COLORS.border,
      STROKE.normal
    );
    submitBg.x = submitButtonX - submitButtonW / 2;
    submitBg.y = submitButtonY - submitButtonH / 2;
    submitBg.eventMode = 'static';
    submitBg.cursor = 'pointer';
    (submitBg as unknown as { id: string }).id = 'benchmark-submit';
    app.stage.addChild(submitBg);

    const submitText = createText('Submit', TYPOGRAPHY.normal, COLORS.textInverse);
    submitText.anchor.set(0.5);
    submitText.x = submitButtonX;
    submitText.y = submitButtonY;
    app.stage.addChild(submitText);

    if (pointerMgrRef.current && app.stage) {
      pointerMgrRef.current.attach(app.stage);
    }
  };

  const handleReady = (app: PIXI.Application): void => {
    stageRef.current = app;
    renderStage(app, stateRef.current);
  };

  return (
    <PixiStage
      width={width}
      height={height}
      backgroundColor={COLORS.backgroundLight}
      onReady={handleReady}
      className="benchmark-renderer"
      ariaLabel="Categorize fraction by benchmark"
    />
  );
}
