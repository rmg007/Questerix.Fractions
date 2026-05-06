/**
 * Version label with triple-tap researcher unlock-gate bypass (Phase 2a / D-1).
 * Extracted from SettingsScene to keep that file under the 600 LOC budget.
 */

import * as Phaser from 'phaser';
import { BODY_FONT } from '../utils/levelTheme';
import { HEX } from '../utils/colors';
import { toggleUnlockGateBypass, isUnlockGateBypassEnabled } from '../../lib/preferences';

const CW = 800;

export function attachVersionTapToggle(
  scene: Phaser.Scene,
  cx: number,
  y: number
): Phaser.GameObjects.Text {
  const sha = (import.meta.env.VITE_GIT_SHA as string | undefined) ?? 'dev';
  let tapCount = 0;
  let tapTimer: Phaser.Time.TimerEvent | null = null;
  let toast: Phaser.GameObjects.Text | null = null;

  const showToast = (msg: string): void => {
    toast?.destroy();
    toast = scene.add
      .text(CW / 2, 1240, msg, { fontSize: '28px', fontFamily: BODY_FONT, color: '#5848D6' })
      .setOrigin(0.5)
      .setDepth(5);
    scene.time.delayedCall(2000, () => {
      toast?.destroy();
      toast = null;
    });
  };

  const txt = scene.add
    .text(cx, y, `v ${sha}${isUnlockGateBypassEnabled() ? '  (researcher)' : ''}`, {
      fontSize: '24px',
      fontFamily: BODY_FONT,
      color: HEX.neutral600,
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setDepth(3);

  txt.on('pointerup', async () => {
    tapCount += 1;
    tapTimer?.remove();
    tapTimer = scene.time.delayedCall(800, () => {
      tapCount = 0;
    });
    if (tapCount >= 3) {
      tapCount = 0;
      const next = await toggleUnlockGateBypass();
      txt.setText(`v ${sha}${next ? '  (researcher)' : ''}`);
      showToast(next ? 'Researcher mode ON' : 'Researcher mode OFF');
    }
  });

  return txt;
}
