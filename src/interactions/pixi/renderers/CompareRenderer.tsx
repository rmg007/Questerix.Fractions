import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { PixiStage } from '../PixiStage';
import { PointerManager } from '../pointers';
import { KeyboardManager, isConfirmationKey, isCancelKey } from '../keyboard';
import { createButton } from '../visual';
import { SPACING, TOUCH_TARGETS, COLORS } from '../tokens';
import type { InteractionModel } from '../../model/types';
import type {
  CompareQuestion,
  CompareState,
  CompareEvent,
  CompareAnswer,
} from '../../model/compare';

interface CompareRendererProps {
  question: CompareQuestion;
  model: InteractionModel<CompareQuestion, CompareState, CompareEvent, CompareAnswer>;
  onAnswer?: (answer: CompareAnswer) => void;
  onStateChange?: (state: CompareState) => void;
  width?: number;
  height?: number;
}

export function CompareRenderer({
  question,
  model,
  onAnswer,
  onStateChange,
  width = 500,
  height = 300,
}: CompareRendererProps) {
  const stageRef = useRef<PIXI.Application | null>(null);
  const pointerMgrRef = useRef<PointerManager | null>(null);
  const keyboardMgrRef = useRef<KeyboardManager | null>(null);
  const stateRef = useRef<CompareState>(model.initialize(question));

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
    // TODO: implement pointer event handling for compare
  };

  const handleKeyboardEvent = (event: { type: string; key: string }): void => {
    // TODO: implement keyboard event handling for compare
  };

  const updateState = (event: CompareEvent): void => {
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

  const renderStage = (app: PIXI.Application, state: CompareState): void => {
    app.stage.removeChildren();
    // TODO: implement rendering for compare
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
      className="compare-renderer"
      ariaLabel="Interactive canvas for compare"
    />
  );
}
