import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { PixiStage } from '../PixiStage';
import { PointerManager } from '../pointers';
import { KeyboardManager, isConfirmationKey, isCancelKey } from '../keyboard';
import { createButton, createText } from '../visual';
import type { InteractionModel } from '../../model/types';
import { COLORS, STROKE, Z_INDEX, TYPOGRAPHY } from '../tokens';
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

  const handlePointerEvent = (event: { type: string; targetId?: string }): void => {
    if (event.type === 'tap') {
      if (event.targetId === 'relation-less') {
        updateState({ type: 'select-relation', relation: 'less' });
      } else if (event.targetId === 'relation-equal') {
        updateState({ type: 'select-relation', relation: 'equal' });
      } else if (event.targetId === 'relation-greater') {
        updateState({ type: 'select-relation', relation: 'greater' });
      }
    }
  };

  const handleKeyboardEvent = (event: { type: string; key: string }): void => {
    if (event.type === 'keydown') {
      if (isConfirmationKey(event.key)) {
        // Default to 'equal' on Enter
        updateState({ type: 'select-relation', relation: 'equal' });
      } else if (isCancelKey(event.key)) {
        updateState({ type: 'clear-selection' });
      }
    }
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
      stageRef.current.stage.removeChildren();
      renderStageContent(stageRef.current, newState);
    }
  };

  const renderBarModel = (
    gfx: PIXI.Graphics,
    x: number,
    y: number,
    numerator: number,
    denominator: number,
    color: number,
    width: number = 200,
    height: number = 40
  ): void => {
    const segmentWidth = width / denominator;
    gfx.lineStyle(STROKE.normal, COLORS.border);

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

  const renderStageContent = (app: PIXI.Application, state: CompareState): void => {
    const centerX = width / 2;
    const startY = 50;
    const barW = 180;
    const barH = 40;
    const barGap = 80;

    const titleText = createText(
      'Which fraction is bigger?',
      TYPOGRAPHY.heading,
      COLORS.textPrimary
    );
    titleText.anchor.set(0.5);
    titleText.x = centerX;
    titleText.y = startY - 30;
    titleText.zIndex = Z_INDEX.base;
    app.stage.addChild(titleText);

    const leftBarGfx = new PIXI.Graphics();
    renderBarModel(
      leftBarGfx,
      centerX - barW / 2,
      startY,
      state.leftNumerator,
      state.leftDenominator,
      COLORS.warning,
      barW,
      barH
    );
    leftBarGfx.zIndex = Z_INDEX.base + 1;
    app.stage.addChild(leftBarGfx);

    const leftLabelText = createText(
      `${state.leftNumerator}/${state.leftDenominator}`,
      TYPOGRAPHY.small,
      COLORS.textPrimary
    );
    leftLabelText.anchor.set(0.5);
    leftLabelText.x = centerX - barW / 2;
    leftLabelText.y = startY + barH + 15;
    leftLabelText.zIndex = Z_INDEX.base;
    app.stage.addChild(leftLabelText);

    const rightBarGfx = new PIXI.Graphics();
    renderBarModel(
      rightBarGfx,
      centerX - barW / 2,
      startY + barH + barGap,
      state.rightNumerator,
      state.rightDenominator,
      COLORS.primary,
      barW,
      barH
    );
    rightBarGfx.zIndex = Z_INDEX.base + 1;
    app.stage.addChild(rightBarGfx);

    const rightLabelText = createText(
      `${state.rightNumerator}/${state.rightDenominator}`,
      TYPOGRAPHY.small,
      COLORS.textPrimary
    );
    rightLabelText.anchor.set(0.5);
    rightLabelText.x = centerX - barW / 2;
    rightLabelText.y = startY + barH + barGap + barH + 15;
    rightLabelText.zIndex = Z_INDEX.base;
    app.stage.addChild(rightLabelText);

    const btnY = startY + barH + barGap * 2 + 50;
    const btnWidth = 120;
    const btnHeight = 48;
    const btnSpacing = 20;

    const relations: Array<{ id: string; label: string; val: 'less' | 'equal' | 'greater' }> = [
      { id: 'relation-less', label: 'Left <', val: 'less' },
      { id: 'relation-equal', label: 'Equal', val: 'equal' },
      { id: 'relation-greater', label: 'Left >', val: 'greater' },
    ];

    relations.forEach((rel, i) => {
      const totalWidth = btnWidth * 3 + btnSpacing * 2;
      const offsetX = i * (btnWidth + btnSpacing) - totalWidth / 2;

      const btn = createButton({
        width: btnWidth,
        height: btnHeight,
        text: rel.label,
        fill: state.selectedRelation === rel.val ? COLORS.buttonActive : COLORS.buttonInactive,
        fillActive: COLORS.primary,
        textColor: state.selectedRelation === rel.val ? COLORS.textInverse : COLORS.textPrimary,
        fontSize: 14,
        id: rel.id,
      });
      btn.x = centerX + offsetX;
      btn.y = btnY;
      btn.zIndex = Z_INDEX.interactive;
      btn.eventMode = 'static';
      app.stage.addChild(btn);
    });

    if (pointerMgrRef.current) {
      app.stage.eventMode = 'static';
      app.stage.interactiveChildren = true;
      pointerMgrRef.current.attach(app.stage);
    }
  };

  const handleReady = (app: PIXI.Application): void => {
    stageRef.current = app;
    renderStageContent(app, stateRef.current);
  };

  return (
    <PixiStage
      width={width}
      height={height}
      backgroundColor={COLORS.backgroundLight}
      onReady={handleReady}
      className="compare-renderer"
      ariaLabel="Compare two fractions and select which is larger"
    />
  );
}
