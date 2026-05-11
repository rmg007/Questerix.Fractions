import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { PixiStage } from '../PixiStage';
import { PointerManager } from '../pointers';
import { KeyboardManager, isConfirmationKey } from '../keyboard';
import { createButton, createRect, createText } from '../visual';
import { SPACING, TOUCH_TARGETS, COLORS, TYPOGRAPHY, STROKE } from '../tokens';
import type { InteractionModel } from '../../model/types';
import type {
  IdentifyQuestion,
  IdentifyState,
  IdentifyEvent,
  IdentifyAnswer,
} from '../../model/identify';

interface IdentifyRendererProps {
  question: IdentifyQuestion;
  model: InteractionModel<IdentifyQuestion, IdentifyState, IdentifyEvent, IdentifyAnswer>;
  onAnswer?: (answer: IdentifyAnswer) => void;
  onStateChange?: (state: IdentifyState) => void;
  width?: number;
  height?: number;
}

const OPTION_CARD_WIDTH = 100;
const OPTION_CARD_HEIGHT = 120;

export function IdentifyRenderer({
  question,
  model,
  onAnswer,
  onStateChange,
  width = 500,
  height = 400,
}: IdentifyRendererProps) {
  const stageRef = useRef<PIXI.Application | null>(null);
  const pointerMgrRef = useRef<PointerManager | null>(null);
  const keyboardMgrRef = useRef<KeyboardManager | null>(null);
  const stateRef = useRef<IdentifyState>(model.initialize(question));
  const optionCountRef = useRef<number>(question.optionCount ?? 3);

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
    if (event.type === 'tap' && event.targetId?.startsWith('identify-option-')) {
      const indexStr = event.targetId.replace('identify-option-', '');
      const index = parseInt(indexStr, 10);
      if (!isNaN(index)) {
        updateState({ type: 'select-option', index });
      }
    } else if (event.type === 'tap' && event.targetId === 'identify-submit') {
      updateState({ type: 'submit' });
    }
  };

  const handleKeyboardEvent = (event: { type: string; key: string }): void => {
    if (event.type === 'keydown' && isConfirmationKey(event.key)) {
      updateState({ type: 'submit' });
    }
  };

  const updateState = (event: IdentifyEvent): void => {
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

  const renderStage = (app: PIXI.Application, state: IdentifyState): void => {
    app.stage.removeChildren();

    const centerX = width / 2;
    const titleY = SPACING.lg;
    const cardsY = height / 2 - 40;
    const submitY = height - 80;
    const optionCount = optionCountRef.current;

    // Title
    const title = createText(
      'Which one shows the fraction?',
      TYPOGRAPHY.heading,
      COLORS.textPrimary
    );
    title.anchor.set(0.5);
    title.x = centerX;
    title.y = titleY;
    app.stage.addChild(title);

    // Option cards
    const cardWidth = Math.min(OPTION_CARD_WIDTH, (width - 60) / optionCount);
    const spacing = 12;
    const totalCardsWidth = optionCount * cardWidth + (optionCount - 1) * spacing;
    const startX = centerX - totalCardsWidth / 2;

    for (let i = 0; i < optionCount; i++) {
      const cardX = startX + i * (cardWidth + spacing) + cardWidth / 2;
      const isSelected = state.selectedIndex === i;

      // Card background
      const bgColor = isSelected ? COLORS.selected : COLORS.buttonInactive;
      const borderColor = isSelected ? COLORS.primary : COLORS.border;
      const borderWidth = isSelected ? STROKE.medium : STROKE.thin;

      const cardBg = createRect(cardWidth, OPTION_CARD_HEIGHT, bgColor, borderColor, borderWidth);
      cardBg.x = cardX - cardWidth / 2;
      cardBg.y = cardsY - OPTION_CARD_HEIGHT / 2;
      cardBg.eventMode = 'static';
      cardBg.cursor = 'pointer';
      (cardBg as unknown as { id: string }).id = `identify-option-${i}`;
      app.stage.addChild(cardBg);

      // Option label (fallback text)
      const label = createText(
        question.optionLabels?.[i] ?? `Option ${i + 1}`,
        TYPOGRAPHY.normal,
        COLORS.textPrimary
      );
      label.anchor.set(0.5);
      label.x = cardX;
      label.y = cardsY;
      app.stage.addChild(label);
    }

    // Submit button (enabled only if selected)
    const submitBtn = createButton({
      width: 160,
      height: TOUCH_TARGETS.button,
      text: 'Check ✓',
      fill: state.selectedIndex !== null ? COLORS.buttonActive : COLORS.buttonInactive,
      fillActive: COLORS.primary,
      textColor: COLORS.textPrimary,
      fontSize: TYPOGRAPHY.normal,
      id: 'identify-submit',
    });
    submitBtn.x = centerX - 80;
    submitBtn.y = submitY;
    (submitBtn as unknown as { id: string }).id = 'identify-submit';
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
      className="identify-renderer"
      ariaLabel="Interactive canvas for identify"
    />
  );
}
