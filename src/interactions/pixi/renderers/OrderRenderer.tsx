import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { PixiStage } from '../PixiStage';
import { PointerManager, type PointerEvent } from '../pointers';
import { KeyboardManager, isConfirmationKey } from '../keyboard';
import { createText, createRect } from '../visual';
import { SPACING, COLORS, TYPOGRAPHY, STROKE } from '../tokens';
import type {
  OrderQuestion,
  OrderState,
  OrderEvent,
  OrderAnswer,
  FractionDef,
} from '../../model/order';

interface OrderRendererProps {
  question: OrderQuestion;
  model: InteractionModel<OrderQuestion, OrderState, OrderEvent, OrderAnswer>;
  onAnswer?: (answer: OrderAnswer) => void;
  onStateChange?: (state: OrderState) => void;
  width?: number;
  height?: number;
}

interface CardInfo {
  id: string;
  label: string;
  numerator: number;
  denominator: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SlotInfo {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function OrderRenderer({
  question,
  model,
  onAnswer,
  onStateChange,
  width = 500,
  height = 450,
}: OrderRendererProps) {
  const stageRef = useRef<PIXI.Application | null>(null);
  const pointerMgrRef = useRef<PointerManager | null>(null);
  const keyboardMgrRef = useRef<KeyboardManager | null>(null);
  const stateRef = useRef<OrderState>(model.initialize(question));
  const cardsRef = useRef<Map<string, CardInfo>>(new Map());
  const slotsRef = useRef<SlotInfo[]>([]);
  const dragStateRef = useRef<{ cardId: string; initialX: number; initialY: number } | null>(null);

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
    if (event.type === 'drag-start' && event.targetId?.startsWith('order-card-')) {
      const cardId = event.targetId.replace('order-card-', '');
      const card = cardsRef.current.get(cardId);
      if (card) {
        dragStateRef.current = {
          cardId,
          initialX: event.x,
          initialY: event.y,
        };
      }
    } else if (event.type === 'drag' && dragStateRef.current) {
      const { cardId } = dragStateRef.current;
      updateState({ type: 'move-card', cardId, x: event.x, y: event.y });
    } else if (event.type === 'drag-end' && dragStateRef.current) {
      const { cardId } = dragStateRef.current;
      // Snap to nearest slot
      let closestSlotIndex = 0;
      let closestDist = Infinity;
      slotsRef.current.forEach((slot) => {
        const dist = Math.hypot(event.x - slot.x, event.y - slot.y);
        if (dist < closestDist) {
          closestDist = dist;
          closestSlotIndex = slot.index;
        }
      });
      updateState({ type: 'place-card', cardId, slotIndex: closestSlotIndex });
      dragStateRef.current = null;
    } else if (event.type === 'tap' && event.targetId === 'order-submit') {
      updateState({ type: 'submit' });
    }
  };

  const handleKeyboardEvent = (event: { type: string; key: string }): void => {
    if (event.type === 'keydown' && isConfirmationKey(event.key)) {
      updateState({ type: 'submit' });
    }
  };

  const updateState = (event: OrderEvent): void => {
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

  const renderStage = (app: PIXI.Application, state: OrderState): void => {
    app.stage.removeChildren();
    cardsRef.current.clear();
    slotsRef.current = [];

    // Instruction
    const instrText = createText(
      'Drag cards to order from smallest to largest',
      TYPOGRAPHY.normal,
      COLORS.textPrimary
    );
    instrText.anchor.set(0.5);
    instrText.x = width / 2;
    instrText.y = SPACING.md;
    app.stage.addChild(instrText);

    // Parse fractions from question
    const fracs = question.fractions ?? [];
    const numCards = fracs.length || 1;

    // Calculate card dimensions
    const cardW = Math.min(100, (width - 80) / numCards - 12);
    const cardH = 80;
    const gap = 12;
    const totalW = numCards * (cardW + gap) - gap;
    const sourceStartX = (width - totalW) / 2;
    const sourceY = height * 0.18;

    // Calculate slot dimensions
    const slotY = height * 0.65;

    // Draw source cards (top lane)
    fracs.forEach((frac: FractionDef, i: number) => {
      const cx = sourceStartX + i * (cardW + gap) + cardW / 2;
      const cy = sourceY;

      // Card background
      const cardBg = createRect(cardW, cardH, COLORS.primaryLight, COLORS.border, STROKE.normal);
      cardBg.x = cx - cardW / 2;
      cardBg.y = cy - cardH / 2;
      cardBg.eventMode = 'static';
      cardBg.cursor = 'grab';
      (cardBg as unknown as { id: string }).id = `order-card-${frac.id}`;
      app.stage.addChild(cardBg);

      // Fraction segments
      const segW = (cardW - 4) / frac.denominator;
      for (let j = 0; j < frac.numerator; j++) {
        const segRect = createRect(segW - 1, cardH - 4, COLORS.correct, COLORS.border, STROKE.thin);
        segRect.x = cardBg.x + 2 + j * segW;
        segRect.y = cy - cardH / 2 + 2;
        app.stage.addChild(segRect);
      }

      // Label
      const label = createText(
        `${frac.numerator}/${frac.denominator}`,
        TYPOGRAPHY.body,
        COLORS.textPrimary
      );
      label.anchor.set(0.5);
      label.x = cx;
      label.y = cy + cardH / 2 - SPACING.sm;
      app.stage.addChild(label);

      cardsRef.current.set(frac.id, {
        id: frac.id,
        label: frac.label,
        numerator: frac.numerator,
        denominator: frac.denominator,
        x: cx,
        y: cy,
        width: cardW,
        height: cardH,
      });
    });

    // Draw slot outlines (bottom lane)
    for (let i = 0; i < numCards; i++) {
      const slotX = sourceStartX + i * (cardW + gap) + cardW / 2;
      const slotBg = createRect(
        cardW,
        cardH + 8,
        COLORS.backgroundDark,
        COLORS.border,
        STROKE.normal
      );
      slotBg.x = slotX - cardW / 2;
      slotBg.y = slotY - (cardH + 8) / 2;
      app.stage.addChild(slotBg);

      // Slot index label
      const slotLabel = createText(`${i + 1}`, TYPOGRAPHY.heading, COLORS.textSecondary);
      slotLabel.anchor.set(0.5);
      slotLabel.x = slotX;
      slotLabel.y = slotY + (cardH + 8) / 2 - SPACING.md;
      app.stage.addChild(slotLabel);

      slotsRef.current.push({
        index: i,
        x: slotX,
        y: slotY,
        width: cardW,
        height: cardH + 8,
      });
    }

    // Render cards in their placed positions
    Object.entries(state.placedCards || {}).forEach(([slotIndex, cardId]) => {
      const card = cardsRef.current.get(cardId);
      const slotIdx = parseInt(slotIndex);
      const slot = slotsRef.current[slotIdx];
      if (card && slot) {
        const cardBg = createRect(cardW, cardH, COLORS.primary, COLORS.border, STROKE.normal);
        cardBg.x = slot.x - cardW / 2;
        cardBg.y = slot.y - cardH / 2;
        app.stage.addChild(cardBg);

        const segW = (cardW - 4) / card.denominator;
        for (let j = 0; j < card.numerator; j++) {
          const segRect = createRect(
            segW - 1,
            cardH - 4,
            COLORS.correct,
            COLORS.border,
            STROKE.thin
          );
          segRect.x = cardBg.x + 2 + j * segW;
          segRect.y = cardBg.y + 2;
          app.stage.addChild(segRect);
        }

        const label = createText(
          `${card.numerator}/${card.denominator}`,
          TYPOGRAPHY.body,
          COLORS.textPrimary
        );
        label.anchor.set(0.5);
        label.x = slot.x;
        label.y = slot.y + cardH / 2 - SPACING.sm;
        app.stage.addChild(label);
      }
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
    (submitBg as unknown as { id: string }).id = 'order-submit';
    app.stage.addChild(submitBg);

    const submitText = createText('Check Order', TYPOGRAPHY.normal, COLORS.textInverse);
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
      className="order-renderer"
      ariaLabel="Order fractions from smallest to largest"
    />
  );
}
