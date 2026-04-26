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

  constructor() {
    this.synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
    this.enabled = !!this.synth;
  }

  speak(text: string, opts: TTSOptions = {}): void {
    if (!this.enabled || !this.synth) return;
    try {
      if (this.synth.speaking) this.synth.cancel(); // never overlap
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate ?? 0.95; // slightly slower for K-2
      u.pitch = opts.pitch ?? 1.05;
      if (opts.voice) {
        const v = this.synth.getVoices().find((v) => v.name === opts.voice);
        if (v) u.voice = v;
      }
      this.synth.speak(u);
    } catch {
      // Never throw — game must continue if TTS fails
    }
  }

  stop(): void {
    try {
      this.synth?.cancel();
    } catch {
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
}

export const tts = new TTSService();
