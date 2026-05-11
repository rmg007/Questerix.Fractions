import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { PixiStage } from '../PixiStage';
import { PointerManager } from '../pointers';
import { KeyboardManager, isConfirmationKey, isCancelKey } from '../keyboard';
import { createButton } from '../visual';
import { SPACING, TOUCH_TARGETS, COLORS } from '../tokens';
import type { InteractionModel } from '../../model/types';
import type {
  MakeQuestion,
  MakeState,
  MakeEvent,
  MakeAnswer,
} from '../../model/make';

interface MakeRendererProps {
  question: MakeQuestion;
  model: InteractionModel<MakeQuestion, MakeState, MakeEvent, MakeAnswer>;
  onAnswer?: (answer: MakeAnswer) => void;
  onStateChange?: (state: MakeState) => void;
  width?: number;
  height?: number;
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
    // TODO: implement pointer event handling for make
  };

  const handleKeyboardEvent = (event: { type: string; key: string }): void => {
    // TODO: implement keyboard event handling for make
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
    // TODO: implement rendering for make
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
      ariaLabel="Interactive canvas for make"
    />
  );
}
