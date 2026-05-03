/**
 * SFXService — file-based sound effects using Web Audio API.
 * Buffers are fetched and decoded lazily on first play, then cached.
 * Gracefully no-ops if AudioContext is unavailable (jsdom, test env, unsupported browsers).
 * Respects the same audio mute preference as TTSService (call setEnabled alongside tts.setEnabled).
 * per docs/30-architecture/accessibility.md §7
 */

type AudioContextWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const SFX_BASE = '/audio/sfx/';

const SFX_FILES = {
  correct: 'phaserUp1.ogg',
  incorrect: 'phaserDown1.ogg',
  complete: 'powerUp11.ogg',
  perfectFanfare: 'powerUp12.ogg',
  streak: 'threeTone1.ogg',
  snap: 'pepSound1.ogg',
} as const;

type SFXKey = keyof typeof SFX_FILES;

export class SFXService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.8;
  private buffers = new Map<SFXKey, AudioBuffer>();

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const win = window as AudioContextWindow;
        const AudioCtx = win.AudioContext ?? win.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private async loadBuffer(key: SFXKey): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(key);
    if (cached) return cached;

    const ctx = this.getContext();
    if (!ctx) return null;

    try {
      const res = await fetch(SFX_BASE + SFX_FILES[key]);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(key, audioBuffer);
      return audioBuffer;
    } catch {
      return null;
    }
  }

  private playKey(key: SFXKey): void {
    void this.loadBuffer(key).then((buffer) => {
      if (!buffer) return;
      const ctx = this.getContext();
      if (!ctx) return;
      try {
        const source = ctx.createBufferSource();
        const gainNode = ctx.createGain();
        source.buffer = buffer;
        gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start();
      } catch {
        // Never throw — game must continue if SFX fails
      }
    });
  }

  /** Preload all buffers eagerly (call from PreloadScene to avoid first-play latency). */
  preload(): void {
    for (const key of Object.keys(SFX_FILES) as SFXKey[]) {
      void this.loadBuffer(key);
    }
  }

  playCorrect(): void {
    this.playKey('correct');
  }

  playIncorrect(): void {
    this.playKey('incorrect');
  }

  playComplete(_pitchMultiplier = 1): void {
    this.playKey('complete');
  }

  playPerfectFanfare(): void {
    this.playKey('perfectFanfare');
  }

  playStreak(): void {
    this.playKey('streak');
  }

  playSnap(): void {
    this.playKey('snap');
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.volume;
  }
}

export const sfx = new SFXService();
