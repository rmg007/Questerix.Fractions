import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { PixiStage } from '../PixiStage';
import { PointerManager } from '../pointers';
import { KeyboardManager, isConfirmationKey, isCancelKey } from '../keyboard';
import { createButton, createText } from '../visual';
import { TOUCH_TARGETS, COLORS, STROKE, Z_INDEX, TYPOGRAPHY } from '../tokens';
import type { InteractionModel } from '../../model/types';
import type { MakeQuestion, MakeState, MakeEvent, MakeAnswer } from '../../model/make';

interface MakeRendererProps {
  question: MakeQuestion;
  model: InteractionModel<MakeQuestion, MakeState, MakeEvent, MakeAnswer>;
  onAnswer?: (answer: MakeAnswer) => void;
  onStateChange?: (state: MakeState) => void;
  width?: number;
  height?: number;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  handleId?: string;
}

export function MakeRenderer({
  question,
  model,
  onAnswer,
  onStateChange,
  width = 500,
  height = 300,
}: MakeRendererProps) {
  const stageRef = useRef<PIXI.Application | null>(null);
  const pointerMgrRef = useRef<PointerManager | null>(null);
  const keyboardMgrRef = useRef<KeyboardManager | null>(null);
  const stateRef = useRef<MakeState>(model.initialize(question));
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  useEffect(() => {
    const pointerMgr = new PointerManager({
      dragThreshold: 5,
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

  const handlePointerEvent = (event: {
    type: string;
    targetId?: string;
    x?: number;
    y?: number;
    deltaX?: number;
    deltaY?: number;
  }): void => {
    const dragState = dragStateRef.current;

    switch (event.type) {
      case 'tap': {
        if (event.targetId?.startsWith('region-')) {
          const regionId = event.targetId.replace('region-', '');
          updateState({ type: 'toggle-shade', regionId });
        } else if (event.targetId === 'confirm-fold-btn') {
          updateState({ type: 'confirm-fold' });
        } else if (event.targetId === 'submit-btn') {
          updateState({ type: 'submit' });
        }
        break;
      }
      case 'drag-start': {
        if (event.targetId?.startsWith('fold-handle-')) {
          dragState.isDragging = true;
          dragState.startX = event.x ?? 0;
          dragState.startY = event.y ?? 0;
          dragState.currentX = event.x ?? 0;
          dragState.currentY = event.y ?? 0;
          dragState.handleId = event.targetId;
        }
        break;
      }
      case 'drag': {
        if (dragState.isDragging && event.x !== undefined && event.y !== undefined) {
          dragState.currentX = event.x;
          dragState.currentY = event.y;
          if (stageRef.current) {
            renderStage(stageRef.current, stateRef.current);
          }
        }
        break;
      }
      case 'drag-end': {
        if (dragState.isDragging) {
          dragState.isDragging = false;
          const deltaX = (event.x ?? 0) - dragState.startX;
          const dragDelta = Math.abs(deltaX) > 0.1 ? deltaX : 0;
          updateState({ type: 'move-fold-line', delta: dragDelta });
        }
        break;
      }
    }
  };

  const handleKeyboardEvent = (event: { type: string; key: string }): void => {
    if (event.type === 'keydown') {
      if (isConfirmationKey(event.key)) {
        const state = stateRef.current;
        if (state.phase === 'partition') {
          updateState({ type: 'confirm-fold' });
        } else if (state.phase === 'shade') {
          updateState({ type: 'submit' });
        }
      } else if (isCancelKey(event.key)) {
        updateState({ type: 'cancel' });
      }
    }
  };

  const updateState = (event: MakeEvent): void => {
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

  const renderStage = (app: PIXI.Application, state: MakeState): void => {
    app.stage.removeChildren();

    const shapeW = 280;
    const shapeH = 360;
    const centerX = width / 2;
    const centerY = height / 2 - 40;
    const minX = centerX - shapeW / 2;
    const maxX = centerX + shapeW / 2;
    const dragState = dragStateRef.current;

    // Calculate fold line position (0..1 progress across shape)
    const foldProgress = Math.max(0, Math.min(1, state.foldPosition ?? 0.5));
    const foldX = minX + foldProgress * shapeW;

    // Draw shape background
    const shapeGfx = new PIXI.Graphics();
    shapeGfx.beginFill(COLORS.backgroundLight);
    shapeGfx.lineStyle(STROKE.normal, COLORS.border);
    shapeGfx.drawRect(minX, centerY - shapeH / 2, shapeW, shapeH);
    shapeGfx.endFill();
    shapeGfx.zIndex = Z_INDEX.base;
    app.stage.addChild(shapeGfx);

    // Draw fold line (dashed)
    const foldLineGfx = new PIXI.Graphics();
    foldLineGfx.lineStyle(STROKE.normal, COLORS.primary);
    const topY = centerY - shapeH / 2;
    const bottomY = centerY + shapeH / 2;

    // Dashed line approximation
    const dashLen = 10;
    const gapLen = 5;
    let y = topY;
    while (y < bottomY) {
      const nextY = Math.min(y + dashLen, bottomY);
      foldLineGfx.moveTo(foldX, y);
      foldLineGfx.lineTo(foldX, nextY);
      y = nextY + gapLen;
    }
    foldLineGfx.zIndex = Z_INDEX.interactive;
    app.stage.addChild(foldLineGfx);

    // Draw fold handle (draggable)
    const handleSize = TOUCH_TARGETS.minimum;
    const handleGfx = new PIXI.Graphics();
    const actualFoldX = dragState.isDragging ? dragState.currentX : foldX;
    handleGfx.beginFill(COLORS.buttonActive);
    handleGfx.lineStyle(STROKE.normal, COLORS.primary);
    handleGfx.drawRect(
      actualFoldX - handleSize / 2,
      centerY - handleSize / 2,
      handleSize,
      handleSize
    );
    handleGfx.endFill();
    handleGfx.eventMode = 'static';
    handleGfx.cursor = 'grab';
    handleGfx.zIndex = Z_INDEX.interactive + 1;
    (handleGfx as unknown as { id: string }).id = 'fold-handle-main';
    app.stage.addChild(handleGfx);

    // Render regions (left and right of fold line)
    if (state.phase === 'shade') {
      const regionW = actualFoldX - minX;
      const leftRegionGfx = new PIXI.Graphics();
      leftRegionGfx.beginFill(
        state.shadedRegions?.includes('left') ? COLORS.correct : COLORS.backgroundDark,
        0.4
      );
      leftRegionGfx.drawRect(minX, centerY - shapeH / 2, regionW, shapeH);
      leftRegionGfx.endFill();
      leftRegionGfx.eventMode = 'static';
      leftRegionGfx.cursor = 'pointer';
      leftRegionGfx.zIndex = Z_INDEX.base + 1;
      (leftRegionGfx as unknown as { id: string }).id = 'region-left';
      app.stage.addChild(leftRegionGfx);

      const rightRegionGfx = new PIXI.Graphics();
      const rightRegionW = maxX - actualFoldX;
      rightRegionGfx.beginFill(
        state.shadedRegions?.includes('right') ? COLORS.correct : COLORS.backgroundDark,
        0.4
      );
      rightRegionGfx.drawRect(actualFoldX, centerY - shapeH / 2, rightRegionW, shapeH);
      rightRegionGfx.endFill();
      rightRegionGfx.eventMode = 'static';
      rightRegionGfx.cursor = 'pointer';
      rightRegionGfx.zIndex = Z_INDEX.base + 1;
      (rightRegionGfx as unknown as { id: string }).id = 'region-right';
      app.stage.addChild(rightRegionGfx);
    }

    // Phase indicator text
    const phaseText = createText(
      state.phase === 'partition'
        ? 'Drag the fold line to create two equal parts'
        : `Tap ${state.targetShaded ?? 1} region(s) to shade`,
      TYPOGRAPHY.normal,
      COLORS.textPrimary
    );
    phaseText.anchor.set(0.5);
    phaseText.x = centerX;
    phaseText.y = centerY + shapeH / 2 + 50;
    phaseText.zIndex = Z_INDEX.base;
    app.stage.addChild(phaseText);

    // Action button
    const btnY = centerY + shapeH / 2 + 110;
    const btnWidth = 180;
    const btnHeight = TOUCH_TARGETS.button;
    let btnText: string;
    let btnId: string;

    if (state.phase === 'partition') {
      btnText = 'Confirm Fold';
      btnId = 'confirm-fold-btn';
    } else {
      btnText = 'Submit';
      btnId = 'submit-btn';
    }

    const btn = createButton({
      width: btnWidth,
      height: btnHeight,
      text: btnText,
      fill: COLORS.buttonActive,
      fillActive: COLORS.primary,
      textColor: COLORS.textInverse,
      fontSize: TYPOGRAPHY.normal,
      id: btnId,
    });
    btn.x = centerX - btnWidth / 2;
    btn.y = btnY;
    btn.zIndex = Z_INDEX.interactive;
    btn.eventMode = 'static';
    app.stage.addChild(btn);

    // Attach pointer manager
    if (pointerMgrRef.current) {
      app.stage.eventMode = 'static';
      app.stage.interactiveChildren = true;
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
      className="make-renderer"
      ariaLabel="Interactive canvas: Drag fold line to create parts, then tap regions to shade"
    />
  );
}
