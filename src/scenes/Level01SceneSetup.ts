/**
 * Level01SceneSetup — A11y, test hooks, device prefs, BKT mastery initialization.
 */

import { A11yLayer } from '@/components/A11yLayer';
import { TestHooks } from './utils/TestHooks';
import { tts } from '@/audio/TTSService';
import { sfx } from '@/audio/SFXService';
import { log } from '@/lib/log';

export interface A11ySetupOptions {
  onSubmit: () => void;
  onHint: () => void;
  onNudgeLeft: () => void;
  onNudgeRight: () => void;
  onSnapCenter: () => void;
  onBack: () => void;
}

export function setupA11yActions(opts: A11ySetupOptions): void {
  A11yLayer.unmountAll();
  A11yLayer.mountAction('a11y-submit', 'Check my answer', opts.onSubmit);
  A11yLayer.mountAction('a11y-hint', 'Get a hint', opts.onHint);
  A11yLayer.mountAction('a11y-move-left', 'Move partition line left', opts.onNudgeLeft);
  A11yLayer.mountAction('a11y-move-right', 'Move partition line right', opts.onNudgeRight);
  A11yLayer.mountAction(
    'a11y-snap-center',
    'Place partition at center for halves',
    opts.onSnapCenter
  );
  A11yLayer.mountAction('a11y-back', 'Back to main menu', opts.onBack);
}

export interface TestHookSetupOptions {
  onPartitionTarget: () => void;
  onHintBtn: () => void;
  onSessionComplete: () => void;
}

export function setupTestHooks(opts: TestHookSetupOptions): void {
  TestHooks.mountSentinel('level01-scene');
  TestHooks.mountInteractive('partition-target', opts.onPartitionTarget, {
    width: '120px',
    height: '120px',
    top: '35.16%',
    left: '50%',
  });
  TestHooks.mountInteractive('hint-btn', opts.onHintBtn, {
    width: '100px',
    height: '60px',
    top: '56.25%',
    left: '50%',
  });
  TestHooks.mountSentinel('hint-text');
  TestHooks.mountInteractive('session-complete-btn', opts.onSessionComplete, {
    width: '10px',
    height: '10px',
    top: '2%',
    left: '2%',
  });
}

export async function loadAudioPreferences(): Promise<void> {
  try {
    const { deviceMetaRepo } = await import('@/persistence/repositories/deviceMeta');
    const meta = await deviceMetaRepo.get();
    const audioOn = meta.preferences.audio ?? true;
    sfx.setEnabled(audioOn);
    const ttsOn = audioOn && (meta.preferences.ttsEnabled ?? true);
    tts.setEnabled(ttsOn);
    const vol = meta.preferences.volume ?? 0.8;
    tts.setVolume(vol);
    sfx.setVolume(vol);
  } catch {
    // Graceful fallback
  }
}

export async function loadInitialMastery(studentId: string | null): Promise<number | null> {
  if (!studentId) return null;
  try {
    const { skillMasteryRepo } = await import('@/persistence/repositories/skillMastery');
    const mastery = await skillMasteryRepo.get(
      studentId as import('@/types').StudentId,
      'skill.partition_halves' as import('@/types').SkillId
    );
    if (mastery) {
      log.bkt('session_start_mastery', {
        estimate: +mastery.masteryEstimate.toFixed(4),
        state: mastery.state,
      });
      return mastery.masteryEstimate;
    }
  } catch (err) {
    log.warn('BKT', 'initial_mastery_load_error', { error: String(err) });
  }
  return null;
}

export async function loadTemplatesForLevel1(): Promise<import('@/types').QuestionTemplate[]> {
  log.tmpl('load_start', { level: 1 });
  try {
    const { questionTemplateRepo } = await import('@/persistence/repositories/questionTemplate');
    const all = await questionTemplateRepo.getByLevel(1);
    const pool = all.filter((t) => t.archetype === 'partition').slice(0, 5);
    if (pool.length > 0) {
      log.tmpl('load_ok', { count: pool.length, source: 'dexie', ids: pool.map((t) => t.id) });
    } else {
      log.tmpl('load_empty', { source: 'dexie', fallback: 'synthetic' });
    }
    return pool;
  } catch (err) {
    log.warn('TMPL', 'load_error', { error: String(err), fallback: 'synthetic' });
    return [];
  }
}
