/**
 * SFXService — procedural sound effects for correct-answer feedback and level completion.
 * Uses Web Audio API oscillators; no external assets, privacy-clean.
 * Gracefully no-ops if AudioContext is unavailable (jsdom, test env, unsupported browsers).
 * Respects the same audio mute preference as TTSService (call setEnabled alongside tts.setEnabled).
 * per docs/30-architecture/accessibility.md §7
 */

type AudioContextWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

export class SFXService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  /** Volume multiplier, 0–1. Scales the base gain of 0.35. */
  private volume: number = 0.8;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        // AudioContext must be created (or resumed) after a user gesture; by answer time it's fine.
        const win = window as AudioContextWindow;
        const AudioCtx = win.AudioContext ?? win.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Play a short two-note ascending ding for a correct answer.
   * Tones: E5 (659 Hz) → G5 (784 Hz), 80 ms each, sine wave.
   */
  playCorrect(): void {
    this.playNotes([659, 784], 0.08, 'sine', 0.35 * this.volume);
  }

  /**
   * Play a short descending two-note tone for an incorrect answer.
   * Tones: G4 (392 Hz) → D4 (294 Hz), 70 ms each, sine wave.
   * Softer gain than playCorrect — present but not harsh.
   */
  playIncorrect(): void {
    this.playNotes([392, 294], 0.07, 'sine', 0.18 * this.volume);
  }

  /**
   * Play a four-note ascending celebratory jingle for session complete.
   * Tones: C5 → E5 → G5 → C6, 110 ms each, sine wave.
   * Optional pitchMultiplier stretches all frequencies (e.g. 1.25 for perfect-session fanfare).
   */
  playComplete(pitchMultiplier = 1): void {
    const freqs = [523, 659, 784, 1047].map((f) => f * pitchMultiplier);
    this.playNotes(freqs, 0.11, 'sine', 0.35 * this.volume);
  }

  /**
   * Play a five-note ascending streak jingle for "3 in a row!" milestone.
   * Tones: C5 → E5 → G5 → B5 → C6, 80 ms each, sine wave.
   * Distinctly longer than playCorrect and more exciting than playComplete.
   */
  playStreak(): void {
    this.playNotes([523, 659, 784, 988, 1047], 0.08, 'sine', 0.32 * this.volume);
  }

  /**
   * Play a brief ascending glissando when the partition snaps to the correct position.
   * Simulates a 200ms glissando from ~80 Hz to ~200 Hz using a four-note ascending pattern.
   * Triangle wave for crisp tactile feel, gain 0.15.
   * T13: Enhanced snap feedback for visual celebration.
   */
  playSnap(): void {
    // Use ascending tones to simulate upward glissando effect
    this.playNotes([82, 110, 165, 196], 0.05, 'triangle', 0.15 * this.volume);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set the volume multiplier (0–1). Scales base gain of 0.35.
   * e.g. volume=0.8 → gain 0.28; volume=1.0 → gain 0.35; volume=0 → silent.
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.volume;
  }

  private playNotes(
    frequencies: number[],
    noteDuration: number,
    type: OscillatorType,
    gain: number
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const startTime = ctx.currentTime + 0.01; // small buffer to avoid clicks
      for (let i = 0; i < frequencies.length; i++) {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequencies[i]!, startTime + i * noteDuration);

        // Short attack + decay envelope to avoid harsh clicks
        gainNode.gain.setValueAtTime(0, startTime + i * noteDuration);
        gainNode.gain.linearRampToValueAtTime(gain, startTime + i * noteDuration + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          startTime + i * noteDuration + noteDuration
        );

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(startTime + i * noteDuration);
        osc.stop(startTime + i * noteDuration + noteDuration);
      }
    } catch {
      // Never throw — game must continue if SFX fails
    }
  }
}

export const sfx = new SFXService();
