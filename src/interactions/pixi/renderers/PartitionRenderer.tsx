import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { PixiStage } from '../PixiStage';
import { PointerManager } from '../pointers';
import { KeyboardManager, isConfirmationKey } from '../keyboard';
import { createButton, createText } from '../visual';
import { SPACING, TOUCH_TARGETS, COLORS, TYPOGRAPHY, STROKE } from '../tokens';
import type { InteractionModel } from '../../model/types';
import type {
  PartitionQuestion,
  PartitionState,
  PartitionEvent,
  PartitionAnswer,
} from '../../model/partition';

interface PartitionRendererProps {
  question: PartitionQuestion;
  model: InteractionModel<PartitionQuestion, PartitionState, PartitionEvent, PartitionAnswer>;
  onAnswer?: (answer: PartitionAnswer) => void;
  onStateChange?: (state: PartitionState) => void;
  width?: number;
  height?: number;
}

const SHAPE_WIDTH = 280;
const SHAPE_HEIGHT = 280;
const DIVIDER_STROKE = STROKE.bold;

export function PartitionRenderer({
  question,
  model,
  onAnswer,
  onStateChange,
  width = 500,
  height = 400,
}: PartitionRendererProps) {
  const stageRef = useRef<PIXI.Application | null>(null);
  const pointerMgrRef = useRef<PointerManager | null>(null);
  const keyboardMgrRef = useRef<KeyboardManager | null>(null);
  const stateRef = useRef<PartitionState>(model.initialize(question));
  const shapeContainerRef = useRef<PIXI.Container | null>(null);
  const dividerRef = useRef<PIXI.Graphics | null>(null);
  const isInteractingRef = useRef(false);

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

  const handlePointerEvent = (event: { type: string; targetId?: string }): void => {
    if (event.type === 'pointerdown' && event.targetId === 'partition-divider') {
      isInteractingRef.current = true;
    } else if (event.type === 'pointermove') {
      if (isInteractingRef.current && event.targetId === 'partition-divider') {
        // Position from pointer event — will be enriched in renderStage
        const containerX = shapeContainerRef.current?.x ?? width / 2;
        const pointerX = containerX - SHAPE_WIDTH / 2; // Estimate based on shape center
        updateState({ type: 'drag-move', x: pointerX + SHAPE_WIDTH / 2 });
      }
    } else if (event.type === 'pointerup') {
      if (isInteractingRef.current) {
        isInteractingRef.current = false;
        const newX = stateRef.current.dividerX ?? width / 2;
        updateState({ type: 'drag-end', x: newX });
      }
    } else if (event.type === 'tap' && event.targetId === 'partition-submit') {
      updateState({ type: 'submit' });
    }
  };

  const handleKeyboardEvent = (event: { type: string; key: string }): void => {
    if (event.type === 'keydown') {
      if (isConfirmationKey(event.key)) {
        updateState({ type: 'submit' });
      }
    }
  };

  const updateState = (event: PartitionEvent): void => {
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

  const renderStage = (app: PIXI.Application, state: PartitionState): void => {
    app.stage.removeChildren();

    const centerX = width / 2;
    const shapeY = height / 3;
    const submitY = height - 80;

    // Title
    const title = createText('Divide into equal parts', TYPOGRAPHY.heading, COLORS.textPrimary);
    title.anchor.set(0.5);
    title.x = centerX;
    title.y = SPACING.lg;
    app.stage.addChild(title);

    // Shape container (rectangle partition)
    const shapeContainer = new PIXI.Container();
    shapeContainer.x = centerX;
    shapeContainer.y = shapeY;
    shapeContainerRef.current = shapeContainer;

    // Draw the shape (rectangle)
    const shapeGraphics = new PIXI.Graphics();
    shapeGraphics.beginFill(COLORS.backgroundDark);
    shapeGraphics.lineStyle(STROKE.medium, COLORS.textPrimary);
    shapeGraphics.drawRect(-SHAPE_WIDTH / 2, -SHAPE_HEIGHT / 2, SHAPE_WIDTH, SHAPE_HEIGHT);
    shapeGraphics.endFill();
    shapeContainer.addChild(shapeGraphics);

    // Draw divider line
    const dividerGraphics = new PIXI.Graphics();
    dividerGraphics.lineStyle(DIVIDER_STROKE, COLORS.primary);
    const dividerLocalX = (state.dividerX ?? centerX) - centerX;
    dividerGraphics.moveTo(dividerLocalX, -SHAPE_HEIGHT / 2);
    dividerGraphics.lineTo(dividerLocalX, SHAPE_HEIGHT / 2);
    dividerRef.current = dividerGraphics;
    shapeContainer.addChild(dividerGraphics);

    // Draggable divider handle
    const handleSize = TOUCH_TARGETS.minimum;
    const dividerHandle = new PIXI.Graphics();
    dividerHandle.beginFill(COLORS.primary);
    dividerHandle.drawRect(dividerLocalX - handleSize / 2, -handleSize / 2, handleSize, handleSize);
    dividerHandle.endFill();
    dividerHandle.eventMode = 'static';
    dividerHandle.cursor = 'ew-resize';
    (dividerHandle as unknown as { id: string }).id = 'partition-divider';
    shapeContainer.addChild(dividerHandle);

    app.stage.addChild(shapeContainer);

    // Submit button
    const submitBtn = createButton({
      width: 160,
      height: TOUCH_TARGETS.button,
      text: 'Check ✓',
      fill: COLORS.buttonInactive,
      fillActive: COLORS.buttonActive,
      textColor: COLORS.textPrimary,
      fontSize: TYPOGRAPHY.normal,
      id: 'partition-submit',
    });
    submitBtn.x = centerX - 80;
    submitBtn.y = submitY;
    (submitBtn as unknown as { id: string }).id = 'partition-submit';
    app.stage.addChild(submitBtn);

    // Enable pointer interactions on stage
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
      className="partition-renderer"
      ariaLabel="Interactive canvas for partition"
    />
  );
}
