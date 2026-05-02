/**
 * TTSService — Web Speech API wrapper for K-2 prompt audio.
 * Uses browser-native SpeechSynthesis; no third-party calls (privacy-clean).
 * Gracefully no-ops if speechSynthesis is undefined (jsdom, test env, unsupported browsers).
 * per docs/30-architecture/accessibility.md §7
 */

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  voice?: string;
}

export class TTSService {
  private enabled: boolean;
  private synth: SpeechSynthesis | null;
  private voicesReady: Promise<void>;
  /** Volume level, 0–1. Applied to each SpeechSynthesisUtterance. */
  private volume: number = 0.8;

  constructor() {
    this.synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
    this.enabled = !!this.synth;

    // R10: iOS TTS onvoiceschanged listener. On iOS Safari, voices load asynchronously.
    // Without waiting for onvoiceschanged, the first speak() call may fire before voices
    // populate, causing silent failure. Promise resolves once voices are ready, OR after
    // a 1500 ms watchdog so speak() never deadlocks on browsers where voices stay empty.
    this.voicesReady = new Promise<void>((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }
      if (this.synth.getVoices().length > 0) {
        resolve();
        return;
      }
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const onChanged = () => {
        if (this.synth && this.synth.getVoices().length > 0) settle();
      };
      // Prefer addEventListener so we don't clobber a host page's own handler.
      if (typeof this.synth.addEventListener === 'function') {
        this.synth.addEventListener('voiceschanged', onChanged);
      } else {
        this.synth.onvoiceschanged = onChanged;
      }
      // Watchdog: cap waits at 1500 ms so a permanently empty voice list cannot
      // strand every speak() call. On unsupported browsers we'd otherwise hang.
      setTimeout(settle, 1500);
    });
  }

  async speak(text: string, opts: TTSOptions = {}): Promise<void> {
    if (!this.enabled || !this.synth) return;
    try {
      await this.voicesReady;
      if (this.synth.speaking) this.synth.cancel(); // never overlap
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate ?? 0.95; // slightly slower for K-2
      u.pitch = opts.pitch ?? 1.05;
      u.volume = this.volume;
      if (opts.voice) {
        const v = this.synth.getVoices().find((v) => v.name === opts.voice);
        if (v) u.voice = v;
      }
      this.synth.speak(u);
    } catch (err) {
      // Never throw — game must continue if TTS fails
    }
  }

  stop(): void {
    try {
      this.synth?.cancel();
    } catch (err) {
      // safe to swallow
    }
  }

  isAvailable(): boolean {
    return this.enabled;
  }

  setEnabled(on: boolean): void {
    this.enabled = on && !!this.synth;
    if (!on) this.stop();
  }

  /**
   * Set the volume for subsequent utterances (0–1).
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.volume;
  }
}

export const tts = new TTSService();
