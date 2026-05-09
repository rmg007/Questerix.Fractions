/**
 * Version label with triple-tap researcher unlock-gate bypass (Phase 2a / D-1).
 * Extracted from SettingsScene to keep that file under the 600 LOC budget.
 */

import * as Phaser from 'phaser';
import { BODY_FONT } from '../utils/levelTheme';
import { HEX } from '../utils/colors';
import { toggleUnlockGateBypass, isUnlockGateBypassEnabled } from '../../lib/preferences';
import { A11yLayer } from '../../components/A11yLayer';

const CW = 800;
// C7: ≥44 CSS px ≈ 100 canvas px @ 360 vw
const HIT_W = 360;
const HIT_H = 100;

function buildVersionLabel(sha: string, date: string): string {
  const researcher = isUnlockGateBypassEnabled() ? '  (researcher)' : '';
  return `v ${sha} · ${date}${researcher}`;
}

export function attachVersionTapToggle(
  scene: Phaser.Scene,
  cx: number,
  y: number
): Phaser.GameObjects.Text {
  const sha = (import.meta.env.VITE_GIT_SHA as string | undefined) ?? 'dev';
  const rawTime = (import.meta.env.VITE_BUILD_TIME as string | undefined) ?? '';
  const date = rawTime.length >= 10 ? rawTime.slice(0, 10) : new Date().toISOString().slice(0, 10);

  let tapCount = 0;
  let tapTimer: Phaser.Time.TimerEvent | null = null;
  let toast: Phaser.GameObjects.Text | null = null;

  const showToast = (msg: string): void => {
    toast?.destroy();
    toast = scene.add
      .text(CW / 2, y - 60, msg, { fontSize: '28px', fontFamily: BODY_FONT, color: '#5848D6' })
      .setOrigin(0.5)
      .setDepth(5);
    scene.time.delayedCall(2000, () => {
      toast?.destroy();
      toast = null;
    });
  };

  const txt = scene.add
    .text(cx, y, buildVersionLabel(sha, date), {
      fontSize: '32px',
      fontFamily: BODY_FONT,
      color: HEX.neutral600,
    })
    .setOrigin(0.5)
    .setDepth(3);

  // C7: invisible hit zone ≥100 canvas px tall (≥44 CSS px @ 360 vw)
  const hitZone = scene.add
    .rectangle(cx, y, HIT_W, HIT_H, 0x000000, 0)
    .setInteractive({ useHandCursor: true })
    .setDepth(4);

  hitZone.on('pointerup', async () => {
    tapCount += 1;
    tapTimer?.remove();
    tapTimer = scene.time.delayedCall(800, () => {
      tapCount = 0;
    });
    if (tapCount >= 3) {
      tapCount = 0;
      const next = await toggleUnlockGateBypass();
      txt.setText(buildVersionLabel(sha, date));
      showToast(next ? 'Researcher mode ON' : 'Researcher mode OFF');
    }
  });

  // A11yLayer parity: a single deliberate DOM activation toggles directly
  // (independent of the 3-tap counter so it never races with pointer taps).
  A11yLayer.mountAction('settings-version-toggle', 'Toggle researcher mode', () => {
    void (async () => {
      const next = await toggleUnlockGateBypass();
      txt.setText(buildVersionLabel(sha, date));
      showToast(next ? 'Researcher mode ON' : 'Researcher mode OFF');
    })();
  });

  return txt;
}
