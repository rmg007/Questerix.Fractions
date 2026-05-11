/**
 * Pixi renderer for equal_or_not interaction.
 * Displays two buttons (Equal / Not Equal) and manages pointer/keyboard input.
 * Per React+PixiJS migration plan §5
 */

import { useEffect, useRef } from 'react';
import type { CSSProperties, FocusEvent as ReactFocusEvent } from 'react';
import * as PIXI from 'pixi.js';
import { PixiStage } from '../PixiStage';
import { PointerManager } from '../pointers';
import { KeyboardManager, isCancelKey } from '../keyboard';
import { createButton } from '../visual';
import { SPACING, TOUCH_TARGETS, COLORS } from '../tokens';
import type { InteractionModel } from '../../model/types';
import type {
  EqualOrNotQuestion,
  EqualOrNotState,
  EqualOrNotEvent,
  EqualOrNotAnswer,
} from '../../model/equal_or_not';

interface EqualOrNotRendererProps {
  question: EqualOrNotQuestion;
  model: InteractionModel<EqualOrNotQuestion, EqualOrNotState, EqualOrNotEvent, EqualOrNotAnswer>;
  onAnswer?: (answer: EqualOrNotAnswer) => void;
  onStateChange?: (state: EqualOrNotState) => void;
  width?: number;
  height?: number;
}

/**
 * Pixi-based equal_or_not renderer.
 * Renders two buttons and handles all interaction logic.
 */
export function EqualOrNotRenderer({
  question,
  model,
  onAnswer,
  onStateChange,
  width = 500,
  height = 300,
}: EqualOrNotRendererProps) {
  const stageRef = useRef<PIXI.Application | null>(null);
  const pointerMgrRef = useRef<PointerManager | null>(null);
  const keyboardMgrRef = useRef<KeyboardManager | null>(null);
  const stateRef = useRef<EqualOrNotState>(model.initialize(question));

  useEffect(() => {
    // Initialize pointer and keyboard managers
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
    if (event.type === 'tap') {
      const targetId = event.targetId;
      if (targetId === 'equal-btn') {
        updateState({ type: 'select-equal' });
      } else if (targetId === 'not-equal-btn') {
        updateState({ type: 'select-not-equal' });
      }
    }
  };

  const handleKeyboardEvent = (event: { type: string; key: string }): void => {
    if (event.type === 'keydown') {
      // Enter/Space confirmation is handled natively by the DOM <button>
      // mirrors in the returned JSX. A window-level Enter/Space handler here
      // would unconditionally route confirmation to one choice and prevent
      // keyboard users from selecting Not-Equal.
      if (isCancelKey(event.key)) {
        // On Escape, clear selection
        updateState({ type: 'clear-selection' });
      }
    }
  };

  const updateState = (event: EqualOrNotEvent): void => {
    const newState = model.reduce(stateRef.current, event);
    stateRef.current = newState;

    if (onStateChange) {
      onStateChange(newState);
    }

    const answer = model.toAnswer(newState);
    if (answer && onAnswer) {
      onAnswer(answer);
    }

    // Re-render Pixi stage
    if (stageRef.current) {
      renderStage(stageRef.current, newState);
    }
  };

  const renderStage = (app: PIXI.Application, state: EqualOrNotState): void => {
    // Clear stage
    app.stage.removeChildren();

    // Title/question text
    const titleText = new PIXI.Text('Are these fractions equal?', {
      fontFamily: 'Arial',
      fontSize: 24,
      fill: COLORS.textPrimary,
      align: 'center',
    });
    titleText.anchor.set(0.5);
    titleText.x = width / 2;
    titleText.y = SPACING.xl;
    app.stage.addChild(titleText);

    // Equal button
    const equalBtn = createButton({
      width: TOUCH_TARGETS.button,
      height: TOUCH_TARGETS.button,
      text: 'Equal',
      fill: state.selectedChoice === 'equal' ? COLORS.buttonActive : COLORS.buttonInactive,
      fillActive: COLORS.buttonActive,
      textColor: COLORS.textPrimary,
      fontSize: 16,
      id: 'equal-btn',
    });
    equalBtn.x = width / 2 - TOUCH_TARGETS.button - SPACING.md;
    equalBtn.y = height / 2;
    app.stage.addChild(equalBtn);

    // Not Equal button
    const notEqualBtn = createButton({
      width: TOUCH_TARGETS.button,
      height: TOUCH_TARGETS.button,
      text: 'Not Equal',
      fill: state.selectedChoice === 'not_equal' ? COLORS.buttonActive : COLORS.buttonInactive,
      fillActive: COLORS.buttonActive,
      textColor: COLORS.textPrimary,
      fontSize: 16,
      id: 'not-equal-btn',
    });
    notEqualBtn.x = width / 2 + SPACING.md;
    notEqualBtn.y = height / 2;
    app.stage.addChild(notEqualBtn);

    // Enable pointer interactions on stage
    if (pointerMgrRef.current && app.stage) {
      pointerMgrRef.current.attach(app.stage);
    }
  };

  const handleReady = (app: PIXI.Application): void => {
    stageRef.current = app;
    renderStage(app, stateRef.current);
  };

  // DOM-mirror handlers: native <button> elements below give assistive tech
  // and keyboard users a way to choose either option. <button> handles
  // Enter/Space activation natively, so no window-level shortcut is needed.
  const handleEqualClick = (): void => {
    updateState({ type: 'select-equal' });
  };
  const handleNotEqualClick = (): void => {
    updateState({ type: 'select-not-equal' });
  };

  // Visually-hidden style: keeps the DOM mirrors focusable and clickable but
  // off-screen so the Pixi canvas owns the visual presentation. The buttons
  // become visible (with a focus outline) when focused via keyboard.
  const srOnlyStyle: CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    border: 0,
  };
  const srOnlyFocusStyle: CSSProperties = {
    position: 'static',
    width: 'auto',
    height: 'auto',
    margin: 0,
    overflow: 'visible',
    clip: 'auto',
    whiteSpace: 'normal',
    outline: '2px solid #1a73e8',
    outlineOffset: '2px',
  };
  const applyFocus = (e: ReactFocusEvent<HTMLButtonElement>): void => {
    Object.assign(e.currentTarget.style, srOnlyFocusStyle);
  };
  const applyBlur = (e: ReactFocusEvent<HTMLButtonElement>): void => {
    Object.assign(e.currentTarget.style, srOnlyStyle);
  };

  return (
    <div className="equal-or-not-renderer-wrapper" style={{ position: 'relative' }}>
      <PixiStage
        width={width}
        height={height}
        backgroundColor={COLORS.backgroundLight}
        onReady={handleReady}
        className="equal-or-not-renderer"
        ariaLabel="Choose whether the fractions are equal"
      />
      <button
        type="button"
        aria-label="Equal"
        data-testid="equal-or-not-equal-mirror"
        style={srOnlyStyle}
        onClick={handleEqualClick}
        onFocus={applyFocus}
        onBlur={applyBlur}
      >
        Equal
      </button>
      <button
        type="button"
        aria-label="Not Equal"
        data-testid="equal-or-not-not-equal-mirror"
        style={srOnlyStyle}
        onClick={handleNotEqualClick}
        onFocus={applyFocus}
        onBlur={applyBlur}
      >
        Not Equal
      </button>
    </div>
  );
}
