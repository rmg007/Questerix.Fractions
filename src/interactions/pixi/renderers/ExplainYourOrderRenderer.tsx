import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { PixiStage } from '../PixiStage';
import { PointerManager, type PointerEvent } from '../pointers';
import { KeyboardManager, isConfirmationKey } from '../keyboard';
import { createText, createRect } from '../visual';
import { SPACING, COLORS, TYPOGRAPHY, STROKE } from '../tokens';
import type {
  ExplainYourOrderQuestion,
  ExplainYourOrderState,
  ExplainYourOrderEvent,
  ExplainYourOrderAnswer,
  FractionDef,
} from '../../model/explain_your_order';

interface ExplainYourOrderRendererProps {
  question: ExplainYourOrderQuestion;
  model: InteractionModel<
    ExplainYourOrderQuestion,
    ExplainYourOrderState,
    ExplainYourOrderEvent,
    ExplainYourOrderAnswer
  >;
  onAnswer?: (answer: ExplainYourOrderAnswer) => void;
  onStateChange?: (state: ExplainYourOrderState) => void;
  width?: number;
  height?: number;
}

export function ExplainYourOrderRenderer({
  question,
  model,
  onAnswer,
  onStateChange,
  width = 500,
  height = 500,
}: ExplainYourOrderRendererProps) {
  const stageRef = useRef<PIXI.Application | null>(null);
  const pointerMgrRef = useRef<PointerManager | null>(null);
  const keyboardMgrRef = useRef<KeyboardManager | null>(null);
  const stateRef = useRef<ExplainYourOrderState>(model.initialize(question));
  const dragStateRef = useRef<{ cardId: string; initialX: number; initialY: number } | null>(null);
  const slotsRef = useRef<
    Array<{ index: number; x: number; y: number; width: number; height: number }>
  >([]);

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
    if (event.type === 'drag-start' && event.targetId?.startsWith('explain-card-')) {
      const cardId = event.targetId.replace('explain-card-', '');
      dragStateRef.current = {
        cardId,
        initialX: event.x,
        initialY: event.y,
      };
    } else if (event.type === 'drag' && dragStateRef.current) {
      updateState({
        type: 'move-card',
        cardId: dragStateRef.current.cardId,
        x: event.x,
        y: event.y,
      });
    } else if (event.type === 'drag-end' && dragStateRef.current) {
      const { cardId } = dragStateRef.current;
      let closestSlotIndex = 0;
      let closestDist = Infinity;
      slotsRef.current.forEach((slot) => {
        const dist = Math.abs(event.x - slot.x);
        if (dist < closestDist) {
          closestDist = dist;
          closestSlotIndex = slot.index;
        }
      });
      updateState({ type: 'place-card', cardId, slotIndex: closestSlotIndex });
      dragStateRef.current = null;
    } else if (event.type === 'tap' && event.targetId?.startsWith('explain-rule-')) {
      const ruleId = event.targetId.replace('explain-rule-', '');
      updateState({ type: 'select-rule', ruleId });
    } else if (event.type === 'tap' && event.targetId === 'explain-submit') {
      updateState({ type: 'submit' });
    }
  };

  const handleKeyboardEvent = (event: { type: string; key: string }): void => {
    if (event.type === 'keydown' && isConfirmationKey(event.key)) {
      updateState({ type: 'submit' });
    }
  };

  const updateState = (event: ExplainYourOrderEvent): void => {
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

  const renderStage = (app: PIXI.Application, state: ExplainYourOrderState): void => {
    app.stage.removeChildren();
    slotsRef.current = [];

    // Phase 1: Ordering (top section)
    const instrText = createText('Drag cards to order them', TYPOGRAPHY.normal, COLORS.textPrimary);
    instrText.anchor.set(0.5);
    instrText.x = width / 2;
    instrText.y = SPACING.md;
    app.stage.addChild(instrText);

    const fracs = question.fractions ?? [];
    const numCards = fracs.length || 1;
    const cardW = Math.min(100, (width - 80) / numCards - 12);
    const cardH = 80;
    const gap = 12;
    const totalW = numCards * (cardW + gap) - gap;
    const sourceStartX = (width - totalW) / 2;
    const sourceY = height * 0.18;
    const slotY = height * 0.38;

    // Source cards (ordering phase)
    fracs.forEach((frac: FractionDef, i: number) => {
      const cx = sourceStartX + i * (cardW + gap) + cardW / 2;
      const cy = sourceY;

      const cardBg = createRect(cardW, cardH, COLORS.primaryLight, COLORS.border, STROKE.normal);
      cardBg.x = cx - cardW / 2;
      cardBg.y = cy - cardH / 2;
      cardBg.eventMode = 'static';
      cardBg.cursor = 'grab';
      (cardBg as unknown as { id: string }).id = `explain-card-${frac.id}`;
      app.stage.addChild(cardBg);

      const segW = (cardW - 4) / frac.denominator;
      for (let j = 0; j < frac.numerator; j++) {
        const segRect = createRect(segW - 1, cardH - 4, COLORS.correct, COLORS.border, STROKE.thin);
        segRect.x = cardBg.x + 2 + j * segW;
        segRect.y = cy - cardH / 2 + 2;
        app.stage.addChild(segRect);
      }

      const label = createText(
        `${frac.numerator}/${frac.denominator}`,
        TYPOGRAPHY.body,
        COLORS.textPrimary
      );
      label.anchor.set(0.5);
      label.x = cx;
      label.y = cy + cardH / 2 - SPACING.sm;
      app.stage.addChild(label);
    });

    // Slot outlines (ordering)
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

    // Phase 2: Explanation (bottom section)
    const explainPromptY = height * 0.5;
    const explainPrompt = createText(
      'Why did you order them this way?',
      TYPOGRAPHY.normal,
      COLORS.textPrimary
    );
    explainPrompt.anchor.set(0.5);
    explainPrompt.x = width / 2;
    explainPrompt.y = explainPromptY;
    app.stage.addChild(explainPrompt);

    const ruleOptions = [
      { id: 'same-denom', label: 'Same denominator — bigger numerator wins' },
      { id: 'benchmark', label: 'Used 0, 1/2, and 1 as guides' },
      { id: 'other', label: 'Used a different strategy' },
    ];

    const ruleButtonW = width * 0.8;
    const ruleButtonH = 44;
    const ruleStartY = explainPromptY + SPACING.lg;
    const ruleGap = ruleButtonH + SPACING.md;

    ruleOptions.forEach((rule: { id: string; label: string }, idx: number) => {
      const ruleY = ruleStartY + idx * ruleGap;
      const isSelected = state.selectedRuleId === rule.id;
      const ruleBg = createRect(
        ruleButtonW,
        ruleButtonH,
        isSelected ? COLORS.buttonActive : COLORS.buttonInactive,
        COLORS.border,
        STROKE.normal
      );
      ruleBg.x = (width - ruleButtonW) / 2;
      ruleBg.y = ruleY - ruleButtonH / 2;
      ruleBg.eventMode = 'static';
      ruleBg.cursor = 'pointer';
      (ruleBg as unknown as { id: string }).id = `explain-rule-${rule.id}`;
      app.stage.addChild(ruleBg);

      const ruleText = createText(rule.label, TYPOGRAPHY.small, COLORS.textPrimary);
      ruleText.anchor.set(0.5);
      ruleText.x = width / 2;
      ruleText.y = ruleY;
      app.stage.addChild(ruleText);
    });

    // Submit button
    const submitButtonW = 140;
    const submitButtonH = 44;
    const submitButtonX = width / 2;
    const submitButtonY = height * 0.92;
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
    (submitBg as unknown as { id: string }).id = 'explain-submit';
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
      className="explain_your_order-renderer"
      ariaLabel="Order fractions and explain your reasoning"
    />
  );
}
