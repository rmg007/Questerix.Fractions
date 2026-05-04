/**
 * Mascot idle timer — handles periodic encouragement and transitions to sleep.
 */

import * as Phaser from 'phaser';

export interface IdleTimerState {
  events: Phaser.Time.TimerEvent[];
}

export function createIdleTimerState(): IdleTimerState {
  return { events: [] };
}

export function clearIdleTimer(state: IdleTimerState): void {
  for (const ev of state.events) {
    ev.destroy();
  }
  state.events = [];
}

import { MascotState } from './types';

export interface IdleTimerHandlers {
  setState: (state: MascotState) => void;
  showSpeechBubble: (text: string, durationMs: number) => void;
}

export function startIdleTimer(
  state: IdleTimerState,
  scene: Phaser.Scene,
  handlers: IdleTimerHandlers
): void {
  clearIdleTimer(state);

  const add = (delay: number, fn: () => void): void => {
    state.events.push(scene.time.addEvent({ delay, callback: fn }));
  };

  add(10_000, () => {
    handlers.setState('think');
    handlers.showSpeechBubble('Hmm... 🤔', 3000);
  });

  add(18_000, () => {
    handlers.setState('wave');
    handlers.showSpeechBubble('Psst! Over here! 👋', 3000);
  });

  add(28_000, () => {
    handlers.setState('cheer');
    handlers.showSpeechBubble("Let's go, I believe in you! ⭐", 3000);
  });

  add(38_000, () => {
    handlers.setState('sleep');
  });
}
