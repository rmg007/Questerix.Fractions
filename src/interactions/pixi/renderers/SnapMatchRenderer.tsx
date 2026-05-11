import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { PixiStage } from '../PixiStage';
import { PointerManager } from '../pointers';
import { KeyboardManager, isConfirmationKey, isCancelKey } from '../keyboard';
import { createButton, createText, createRect } from '../visual';
import { TOUCH_TARGETS, COLORS, STROKE, Z_INDEX, TYPOGRAPHY } from '../tokens';
import type { InteractionModel } from '../../model/types';
import type {
  SnapMatchQuestion,
  SnapMatchState,
  SnapMatchEvent,
  SnapMatchAnswer,
  MatchItem,
  MatchPair,
} from '../../model/snap_match';

interface SnapMatchRendererProps {
  question: SnapMatchQuestion;
  model: InteractionModel<SnapMatchQuestion, SnapMatchState, SnapMatchEvent, SnapMatchAnswer>;
  onAnswer?: (answer: SnapMatchAnswer) => void;
  onStateChange?: (state: SnapMatchState) => void;
  width?: number;
  height?: number;
}

interface DragState {
  isDragging: boolean;
  draggedItemId: string | undefined;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const SNAP_THRESHOLD = 90; // pixels, per activity-archetypes.md §label

export function SnapMatchRenderer({
  question,
  model,
  onAnswer,
  onStateChange,
  width = 500,
  height = 300,
}: SnapMatchRendererProps) {
  const stageRef = useRef<PIXI.Application | null>(null);
  const pointerMgrRef = useRef<PointerManager | null>(null);
  const keyboardMgrRef = useRef<KeyboardManager | null>(null);
  const stateRef = useRef<SnapMatchState>(model.initialize(question));
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    draggedItemId: undefined,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  useEffect(() => {
    const pointerMgr = new PointerManager({
      dragThreshold: 5,
      tapThreshold: 8,
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
    const state = stateRef.current;

    switch (event.type) {
      case 'drag-start': {
        if (event.targetId?.startsWith('match-item-')) {
          const itemId = event.targetId.replace('match-item-', '');
          dragState.isDragging = true;
          dragState.draggedItemId = itemId;
          dragState.startX = event.x ?? 0;
          dragState.startY = event.y ?? 0;
          dragState.currentX = event.x ?? 0;
          dragState.currentY = event.y ?? 0;
        }
        break;
      }
      case 'drag': {
        if (dragState.isDragging && event.x !== undefined && event.y !== undefined) {
          dragState.currentX = event.x;
          dragState.currentY = event.y;
          if (stageRef.current) {
            renderStage(stageRef.current, state);
          }
        }
        break;
      }
      case 'drag-end': {
        if (dragState.isDragging && dragState.draggedItemId) {
          // Snap to nearest right-column item
          const leftItems = state.leftItems ?? [];
          const rightItems = state.rightItems ?? [];
          const draggedLeft = leftItems.find((item) => item.id === dragState.draggedItemId);
          const endX = event.x ?? dragState.currentX;
          const endY = event.y ?? dragState.currentY;

          if (draggedLeft) {
            let bestRightId: string | undefined;
            let bestDist = Infinity;

            rightItems.forEach((rightItem: MatchItem, rightIdx: number) => {
              const rightX = width * 0.7;
              const rightY = 60 + rightIdx * 80;
              const dist = Math.hypot(endX - rightX, endY - rightY);
              if (dist < bestDist) {
                bestDist = dist;
                bestRightId = rightItem.id;
              }
            });

            if (bestDist <= SNAP_THRESHOLD && bestRightId !== undefined) {
              updateState({
                type: 'match-pair',
                leftId: dragState.draggedItemId ?? '',
                rightId: bestRightId,
              });
            }
          }
          dragState.isDragging = false;
          dragState.draggedItemId = undefined;
        }
        break;
      }
    }
  };

  const handleKeyboardEvent = (event: { type: string; key: string }): void => {
    if (event.type === 'keydown') {
      if (isConfirmationKey(event.key)) {
        updateState({ type: 'submit' });
      } else if (isCancelKey(event.key)) {
        updateState({ type: 'clear' });
      }
    }
  };

  const updateState = (event: SnapMatchEvent): void => {
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

  const renderBarModelFn = (
    gfx: PIXI.Graphics,
    x: number,
    y: number,
    numerator: number,
    denominator: number,
    color: number,
    width: number = 100,
    height: number = 30
  ): void => {
    const segmentWidth = width / denominator;
    gfx.lineStyle(STROKE.thin, COLORS.border);

    for (let i = 0; i < denominator; i++) {
      const segX = x + i * segmentWidth;
      const isFilled = i < numerator;
      gfx.beginFill(isFilled ? color : COLORS.backgroundDark, isFilled ? 0.8 : 0.2);
      gfx.drawRect(segX, y, segmentWidth, height);
      gfx.endFill();

      gfx.lineStyle(STROKE.thin, COLORS.border);
      gfx.drawRect(segX, y, segmentWidth, height);
    }
  };

  const renderStage = (app: PIXI.Application, state: SnapMatchState): void => {
    app.stage.removeChildren();

    const leftItems = state.leftItems ?? [];
    const rightItems = state.rightItems ?? [];
    const matchedPairs = state.matchedPairs ?? [];
    const dragState = dragStateRef.current;

    // Title
    const titleText = createText('Match the fractions', TYPOGRAPHY.heading, COLORS.textPrimary);
    titleText.anchor.set(0.5);
    titleText.x = width / 2;
    titleText.y = 20;
    titleText.zIndex = Z_INDEX.base;
    app.stage.addChild(titleText);

    leftItems.forEach((item: MatchItem, idx: number) => {
      const isMatched = matchedPairs.some((pair) => pair.leftId === item.id);
      if (isMatched) return;

      const itemY = 60 + idx * 80;
      const itemW = 100;
      const itemH = TOUCH_TARGETS.minimum;

      // Item background
      const itemBg = createRect(
        itemW,
        itemH,
        isMatched ? COLORS.disabled : COLORS.buttonInactive,
        COLORS.border,
        STROKE.normal
      );
      itemBg.x = 40;
      itemBg.y = itemY;
      itemBg.eventMode = 'static';
      itemBg.cursor = 'grab';
      itemBg.zIndex = Z_INDEX.interactive;
      (itemBg as unknown as { id: string }).id = `match-item-${item.id}`;
      app.stage.addChild(itemBg);

      // Item text label
      const label = createText(item.label ?? item.id, TYPOGRAPHY.small, COLORS.textPrimary);
      label.anchor.set(0.5);
      label.x = 40 + itemW / 2;
      label.y = itemY + itemH / 2;
      label.zIndex = Z_INDEX.interactive + 1;
      app.stage.addChild(label);
    });

    rightItems.forEach((item: MatchItem, idx: number) => {
      const itemY = 60 + idx * 80;
      const itemW = 120;
      const itemH = 45;

      // Right slot outline
      const slotBg = createRect(itemW, itemH, COLORS.backgroundDark, COLORS.border, STROKE.normal);
      slotBg.x = width * 0.7 - itemW / 2;
      slotBg.y = itemY;
      slotBg.zIndex = Z_INDEX.base;
      app.stage.addChild(slotBg);

      if (item.numerator !== undefined && item.denominator !== undefined) {
        const barGfx = new PIXI.Graphics();
        renderBarModelFn(
          barGfx,
          width * 0.7 - itemW / 2 + 10,
          itemY + 8,
          item.numerator,
          item.denominator,
          COLORS.primary,
          itemW - 20,
          itemH - 16
        );
        barGfx.zIndex = Z_INDEX.base + 1;
        app.stage.addChild(barGfx);
      } else {
        // Fallback to text label
        const label = createText(item.label ?? item.id, TYPOGRAPHY.small, COLORS.textPrimary);
        label.anchor.set(0.5);
        label.x = width * 0.7;
        label.y = itemY + itemH / 2;
        label.zIndex = Z_INDEX.base + 1;
        app.stage.addChild(label);
      }
    });

    // Dragged item (if currently dragging)
    if (dragState.isDragging && dragState.draggedItemId) {
      const draggedItem = leftItems.find((item) => item.id === dragState.draggedItemId);
      if (draggedItem) {
        const dragItemW = 100;
        const dragItemH = TOUCH_TARGETS.minimum;

        const dragBg = createRect(
          dragItemW,
          dragItemH,
          COLORS.buttonActive,
          COLORS.primary,
          STROKE.normal
        );
        dragBg.x = dragState.currentX - dragItemW / 2;
        dragBg.y = dragState.currentY - dragItemH / 2;
        dragBg.alpha = 0.9;
        dragBg.zIndex = Z_INDEX.overlay;
        app.stage.addChild(dragBg);

        const dragLabel = createText(
          draggedItem.label ?? draggedItem.id,
          TYPOGRAPHY.small,
          COLORS.textInverse
        );
        dragLabel.anchor.set(0.5);
        dragLabel.x = dragState.currentX;
        dragLabel.y = dragState.currentY;
        dragLabel.zIndex = Z_INDEX.overlay + 1;
        app.stage.addChild(dragLabel);
      }
    }

    // Matched pairs section (bottom)
    if (matchedPairs.length > 0) {
      const pairsY = height - 80;
      const pairsLabelText = createText('Matched pairs:', TYPOGRAPHY.small, COLORS.textPrimary);
      pairsLabelText.anchor.set(0.5);
      pairsLabelText.x = width / 2;
      pairsLabelText.y = pairsY;
      pairsLabelText.zIndex = Z_INDEX.base;
      app.stage.addChild(pairsLabelText);

      matchedPairs.forEach((pair: MatchPair, idx: number) => {
        const leftItem = leftItems.find((item: MatchItem) => item.id === pair.leftId);
        const rightItem = rightItems.find((item: MatchItem) => item.id === pair.rightId);
        if (!leftItem || !rightItem) return;

        const pairX = 60 + idx * 160;
        const pairY = pairsY + 35;
        const pairText = createText(`${leftItem.label} → ${rightItem.label}`, 12, COLORS.correct);
        pairText.anchor.set(0.5);
        pairText.x = pairX;
        pairText.y = pairY;
        pairText.zIndex = Z_INDEX.base;
        app.stage.addChild(pairText);
      });
    }

    // Submit button
    const btnY = height - 40;
    const btnWidth = 140;
    const btnHeight = TOUCH_TARGETS.button;
    const submitBtn = createButton({
      width: btnWidth,
      height: btnHeight,
      text: 'Submit',
      fill:
        matchedPairs.length === Math.min(leftItems.length, rightItems.length)
          ? COLORS.buttonActive
          : COLORS.buttonInactive,
      fillActive: COLORS.primary,
      textColor: COLORS.textInverse,
      fontSize: 14,
      id: 'submit-btn',
    });
    submitBtn.x = width / 2 - btnWidth / 2;
    submitBtn.y = btnY;
    submitBtn.zIndex = Z_INDEX.interactive;
    submitBtn.eventMode = 'static';
    app.stage.addChild(submitBtn);

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
      className="snap_match-renderer"
      ariaLabel="Drag items from left to match with items on right"
    />
  );
}
