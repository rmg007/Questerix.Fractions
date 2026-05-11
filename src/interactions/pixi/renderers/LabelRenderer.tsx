import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { PixiStage } from '../PixiStage';
import { PointerManager } from '../pointers';
import { KeyboardManager, isConfirmationKey } from '../keyboard';
import { createButton, createRect, createText } from '../visual';
import { SPACING, TOUCH_TARGETS, COLORS, TYPOGRAPHY, STROKE } from '../tokens';
import type { LabelQuestion, LabelState, LabelEvent, LabelAnswer } from '../../model/label';

interface LabelRendererProps {
  question: LabelQuestion;
  model: InteractionModel<LabelQuestion, LabelState, LabelEvent, LabelAnswer>;
  onAnswer?: (answer: LabelAnswer) => void;
  onStateChange?: (state: LabelState) => void;
  width?: number;
  height?: number;
}

const REGION_BOX_SIZE = 90;
const LABEL_TILE_WIDTH = 100;
const LABEL_TILE_HEIGHT = 60;
const SNAP_DISTANCE = 90;

export function LabelRenderer({
  question,
  model,
  onAnswer,
  onStateChange,
  width = 500,
  height = 450,
}: LabelRendererProps) {
  const stageRef = useRef<PIXI.Application | null>(null);
  const pointerMgrRef = useRef<PointerManager | null>(null);
  const keyboardMgrRef = useRef<KeyboardManager | null>(null);
  const stateRef = useRef<LabelState>(model.initialize(question));
  const draggingLabelRef = useRef<string | null>(null);
  const regionPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  const labels = question.labels ?? [{ id: 'half', text: 'one half' }];
  const regions = question.regions ?? [
    { id: 'r0', alt: 'left' },
    { id: 'r1', alt: 'right' },
  ];

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

  const handlePointerEvent = (event: {
    type: string;
    targetId?: string;
    x?: number;
    y?: number;
  }): void => {
    if (event.type === 'pointerdown' && event.targetId?.startsWith('label-tile-')) {
      const labelId = event.targetId.replace('label-tile-', '');
      draggingLabelRef.current = labelId;
      updateState({
        type: 'drag-start',
        labelId,
        x: event.x ?? 0,
        y: event.y ?? 0,
      });
    } else if (event.type === 'pointermove' && draggingLabelRef.current) {
      updateState({
        type: 'drag-move',
        x: event.x ?? 0,
        y: event.y ?? 0,
      });
    } else if (event.type === 'pointerup' && draggingLabelRef.current) {
      // Check if over any region for snap
      let snapRegionId: string | undefined;
      for (const [regionId, pos] of Object.entries(regionPositionsRef.current)) {
        const dist = Math.hypot((event.x ?? 0) - pos.x, (event.y ?? 0) - pos.y);
        if (dist < SNAP_DISTANCE) {
          snapRegionId = regionId;
          break;
        }
      }
      const dragEndEvent: Omit<Extract<LabelEvent, { type: 'drag-end' }>, 'regionId'> & {
        regionId?: string;
      } = {
        type: 'drag-end',
        x: event.x ?? 0,
        y: event.y ?? 0,
      };
      if (snapRegionId !== undefined) {
        dragEndEvent.regionId = snapRegionId;
      }
      updateState(dragEndEvent);
      draggingLabelRef.current = null;
    } else if (event.type === 'tap' && event.targetId === 'label-submit') {
      updateState({ type: 'submit' });
    }
  };

  const handleKeyboardEvent = (event: { type: string; key: string }): void => {
    if (event.type === 'keydown' && isConfirmationKey(event.key)) {
      updateState({ type: 'submit' });
    }
  };

  const updateState = (event: LabelEvent): void => {
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

  const renderStage = (app: PIXI.Application, state: LabelState): void => {
    app.stage.removeChildren();

    const centerX = width / 2;
    const regionsY = height / 3;
    const labelsY = height * 0.65;
    const submitY = height - 60;

    // Title
    const title = createText('Label the regions', TYPOGRAPHY.heading, COLORS.textPrimary);
    title.anchor.set(0.5);
    title.x = centerX;
    title.y = SPACING.lg;
    app.stage.addChild(title);

    // Draw regions
    const regionSpacing = REGION_BOX_SIZE + SPACING.lg;
    const regionsWidth = regions.length * regionSpacing;
    const regionsStartX = centerX - regionsWidth / 2 + REGION_BOX_SIZE / 2;

    regionPositionsRef.current = {};

    regions.forEach((region, i) => {
      const regionX = regionsStartX + i * regionSpacing;

      // Region box
      const regionBg = createRect(
        REGION_BOX_SIZE,
        REGION_BOX_SIZE,
        COLORS.backgroundDark,
        COLORS.border,
        STROKE.thin
      );
      regionBg.x = regionX - REGION_BOX_SIZE / 2;
      regionBg.y = regionsY - REGION_BOX_SIZE / 2;
      app.stage.addChild(regionBg);

      // Region label
      const regionLabel = createText(
        region.alt ?? region.id,
        TYPOGRAPHY.small,
        COLORS.textSecondary
      );
      regionLabel.anchor.set(0.5);
      regionLabel.x = regionX;
      regionLabel.y = regionsY - REGION_BOX_SIZE / 2 + SPACING.lg;
      app.stage.addChild(regionLabel);

      // Placed label text (shown when a label snaps to this region)
      const placedLabel = createText('', TYPOGRAPHY.normal, COLORS.primary);
      placedLabel.anchor.set(0.5);
      placedLabel.x = regionX;
      placedLabel.y = regionsY;
      placedLabel.name = `placed-${region.id}`;
      if (state.placements[region.id]) {
        const label = labels.find((l) => l.id === state.placements[region.id]);
        if (label) {
          placedLabel.text = label.text;
        }
      }
      app.stage.addChild(placedLabel);

      regionPositionsRef.current[region.id] = { x: regionX, y: regionsY };
    });

    // Draw label tiles
    const tilesWidth = labels.length * (LABEL_TILE_WIDTH + SPACING.md);
    const tilesStartX = centerX - tilesWidth / 2 + LABEL_TILE_WIDTH / 2;

    labels.forEach((label, i) => {
      const tileX = tilesStartX + i * (LABEL_TILE_WIDTH + SPACING.md);
      const isPlaced = Object.values(state.placements).includes(label.id);

      // Tile background
      const tileBg = createRect(
        LABEL_TILE_WIDTH,
        LABEL_TILE_HEIGHT,
        isPlaced ? COLORS.correct : COLORS.selected,
        COLORS.primary,
        STROKE.thin
      );
      tileBg.x = tileX - LABEL_TILE_WIDTH / 2;
      tileBg.y = labelsY - LABEL_TILE_HEIGHT / 2;
      tileBg.eventMode = 'static';
      tileBg.cursor = 'grab';
      (tileBg as unknown as { id: string }).id = `label-tile-${label.id}`;
      app.stage.addChild(tileBg);

      // Tile text
      const tileText = createText(label.text, TYPOGRAPHY.small, COLORS.textPrimary);
      tileText.anchor.set(0.5);
      tileText.x = tileX;
      tileText.y = labelsY;
      app.stage.addChild(tileText);
    });

    // Submit button
    const submitBtn = createButton({
      width: 160,
      height: TOUCH_TARGETS.button,
      text: 'Check ✓',
      fill: Object.keys(state.placements).length > 0 ? COLORS.buttonActive : COLORS.buttonInactive,
      fillActive: COLORS.primary,
      textColor: COLORS.textPrimary,
      fontSize: TYPOGRAPHY.normal,
      id: 'label-submit',
    });
    submitBtn.x = centerX - 80;
    submitBtn.y = submitY;
    (submitBtn as unknown as { id: string }).id = 'label-submit';
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
      className="label-renderer"
      ariaLabel="Interactive canvas for label"
    />
  );
}
