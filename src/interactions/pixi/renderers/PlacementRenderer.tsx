import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { PixiStage } from '../PixiStage';
import { PointerManager, type PointerEvent } from '../pointers';
import { KeyboardManager, isConfirmationKey } from '../keyboard';
import { createText, createRect, createLine } from '../visual';
import { SPACING, COLORS, TYPOGRAPHY, STROKE } from '../tokens';
import type {
  PlacementQuestion,
  PlacementState,
  PlacementEvent,
  PlacementAnswer,
} from '../../model/placement';

interface PlacementRendererProps {
  question: PlacementQuestion;
  model: InteractionModel<PlacementQuestion, PlacementState, PlacementEvent, PlacementAnswer>;
  onAnswer?: (answer: PlacementAnswer) => void;
  onStateChange?: (state: PlacementState) => void;
  width?: number;
  height?: number;
}

interface PlacementRenderState {
  lineX: number;
  lineY: number;
  lineLength: number;
  markerRadius: number;
  tickY: number;
  submitButtonX: number;
  submitButtonY: number;
}

export function PlacementRenderer({
  question,
  model,
  onAnswer,
  onStateChange,
  width = 500,
  height = 400,
}: PlacementRendererProps) {
  const stageRef = useRef<PIXI.Application | null>(null);
  const pointerMgrRef = useRef<PointerManager | null>(null);
  const keyboardMgrRef = useRef<KeyboardManager | null>(null);
  const stateRef = useRef<PlacementState>(model.initialize(question));
  const renderStateRef = useRef<PlacementRenderState | null>(null);
  const dragStateRef = useRef<{ isDragging: boolean; initialX: number } | null>(null);

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
    const renderState = renderStateRef.current;
    if (!renderState) return;

    if (event.type === 'drag-start' && event.targetId === 'placement-marker') {
      dragStateRef.current = {
        isDragging: true,
        initialX: event.x,
      };
    } else if (event.type === 'drag' && dragStateRef.current?.isDragging) {
      // Constrain marker to horizontal axis (number line).
      // X position maps to [0, 1] decimal value.
      const clampedX = Math.max(
        renderState.lineX,
        Math.min(renderState.lineX + renderState.lineLength, event.x)
      );
      const newPosition = (clampedX - renderState.lineX) / renderState.lineLength;
      updateState({ type: 'place-marker', position: Math.max(0, Math.min(1, newPosition)) });
    } else if (event.type === 'drag-end') {
      dragStateRef.current = null;
    } else if (event.type === 'tap' && event.targetId === 'placement-submit') {
      updateState({ type: 'submit' });
    }
  };

  const handleKeyboardEvent = (event: { type: string; key: string }): void => {
    if (event.type === 'keydown') {
      if (isConfirmationKey(event.key)) {
        updateState({ type: 'submit' });
      } else if (event.key === 'ArrowLeft') {
        const current = stateRef.current.position ?? 0;
        updateState({ type: 'place-marker', position: Math.max(0, current - 0.05) });
      } else if (event.key === 'ArrowRight') {
        const current = stateRef.current.position ?? 0;
        updateState({ type: 'place-marker', position: Math.min(1, current + 0.05) });
      }
    }
  };

  const updateState = (event: PlacementEvent): void => {
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

  const renderStage = (app: PIXI.Application, state: PlacementState): void => {
    app.stage.removeChildren();

    // Layout calculations
    const lineX = width * 0.2;
    const lineLength = width * 0.6;
    const lineY = height * 0.35;
    const markerRadius = 22;
    const tickY = lineY;
    const submitButtonX = width / 2;
    const submitButtonY = height * 0.85;

    renderStateRef.current = {
      lineX,
      lineY,
      lineLength,
      markerRadius,
      tickY,
      submitButtonX,
      submitButtonY,
    };

    // Instruction text
    const instrText = createText(
      'Drag the marker to place the fraction',
      TYPOGRAPHY.normal,
      COLORS.textPrimary
    );
    instrText.anchor.set(0.5);
    instrText.x = width / 2;
    instrText.y = SPACING.md;
    app.stage.addChild(instrText);

    // Fraction bar model (top visualization)
    const barWidth = 200;
    const barHeight = 40;
    const barX = width / 2;
    const barY = height * 0.15;
    const numerator = question.numerator ?? 1;
    const denominator = question.denominator ?? 2;

    // Draw bar background
    const barBg = createRect(barWidth, barHeight, COLORS.primary, COLORS.border, STROKE.normal);
    barBg.x = barX - barWidth / 2;
    barBg.y = barY - barHeight / 2;
    app.stage.addChild(barBg);

    // Draw bar segments
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

    // Bar label
    const barLabel = createText(
      `${numerator}/${denominator}`,
      TYPOGRAPHY.heading,
      COLORS.textPrimary
    );
    barLabel.anchor.set(0.5);
    barLabel.x = barX;
    barLabel.y = barY + barHeight * 0.6;
    app.stage.addChild(barLabel);

    // Number line
    const lineStart = createLine(
      lineX,
      lineY,
      lineX + lineLength,
      lineY,
      COLORS.border,
      STROKE.normal
    );
    app.stage.addChild(lineStart);

    // Draw tick marks: 0, benchmark fractions, 1
    const benchmarkTicks = [0, 0.5, 1]; // 0, 1/2, 1
    benchmarkTicks.forEach((tick) => {
      const tickX = lineX + tick * lineLength;
      const tickLine = createLine(tickX, tickY - 6, tickX, tickY + 6, COLORS.border, STROKE.normal);
      app.stage.addChild(tickLine);

      const tickLabel = createText(
        tick === 0 ? '0' : tick === 0.5 ? '1/2' : '1',
        TYPOGRAPHY.body,
        COLORS.textSecondary
      );
      tickLabel.anchor.set(0.5);
      tickLabel.x = tickX;
      tickLabel.y = tickY + 20;
      app.stage.addChild(tickLabel);
    });

    // Marker (draggable circle)
    const markerPosition = state.position ?? 0.5;
    const markerX = lineX + markerPosition * lineLength;
    const markerCircle = new PIXI.Graphics();
    markerCircle.beginFill(COLORS.buttonActive);
    markerCircle.lineStyle(STROKE.normal, COLORS.border);
    markerCircle.drawCircle(0, 0, markerRadius);
    markerCircle.endFill();
    markerCircle.x = markerX;
    markerCircle.y = lineY;
    markerCircle.eventMode = 'static';
    markerCircle.cursor = 'grab';
    (markerCircle as unknown as { id: string }).id = 'placement-marker';
    app.stage.addChild(markerCircle);

    // Submit button
    const submitButtonW = 140;
    const submitButtonH = 44;
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
    (submitBg as unknown as { id: string }).id = 'placement-submit';
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
      className="placement-renderer"
      ariaLabel="Place a fraction on the number line"
    />
  );
}
