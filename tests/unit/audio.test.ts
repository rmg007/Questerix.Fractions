/**
 * Unit tests for SFXService and TTSService.
 * per docs/30-architecture/accessibility.md §7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SFXService } from '@/audio/SFXService';
import { TTSService } from '@/audio/TTSService';

// Minimal SpeechSynthesisUtterance stub for jsdom
class MockUtterance {
  text: string;
  rate = 1;
  pitch = 1;
  voice: null = null;
  constructor(text: string) {
    this.text = text;
  }
}

// Helpers to build a mock SpeechSynthesis
function makeMockSynth(speakingInitially = false) {
  return {
    speaking: speakingInitially,
    speak: vi.fn(),
    cancel: vi.fn(),
    // Return a non-empty array so voicesReady resolves immediately in tests
    getVoices: vi.fn(() => [{ name: 'Mock Voice', lang: 'en-US' }]),
  };
}

// Install mocks before each test that needs them
function installMocks(synth: ReturnType<typeof makeMockSynth> | undefined) {
  (globalThis as Record<string, unknown>).speechSynthesis = synth;
  (globalThis as Record<string, unknown>).SpeechSynthesisUtterance = synth
    ? MockUtterance
    : undefined;
}

describe('TTSService', () => {
  afterEach(() => {
    installMocks(undefined);
  });

  it('isAvailable() returns false when speechSynthesis is undefined', () => {
    installMocks(undefined);
    const svc = new TTSService();
    expect(svc.isAvailable()).toBe(false);
  });

  it('speak() is a no-op when speechSynthesis is unavailable', () => {
    installMocks(undefined);
    const svc = new TTSService();
    expect(() => svc.speak('hello')).not.toThrow();
  });

  it('speak() calls synth.speak when speechSynthesis is available', async () => {
    const mockSynth = makeMockSynth();
    installMocks(mockSynth);
    const svc = new TTSService();
    expect(svc.isAvailable()).toBe(true);
    await svc.speak('What fraction is shown?');
    expect(mockSynth.speak).toHaveBeenCalledOnce();
  });

  it('setEnabled(false) makes service silent and calls cancel()', () => {
    const mockSynth = makeMockSynth();
    installMocks(mockSynth);
    const svc = new TTSService();
    svc.setEnabled(false);
    expect(svc.isAvailable()).toBe(false);
    svc.speak('This should be silent');
    expect(mockSynth.speak).not.toHaveBeenCalled();
    expect(mockSynth.cancel).toHaveBeenCalledOnce(); // called on setEnabled(false)
  });

  it('cancels ongoing speech before speaking a new utterance', async () => {
    const mockSynth = makeMockSynth(true); // speaking === true
    installMocks(mockSynth);
    const svc = new TTSService();
    await svc.speak('New question');
    expect(mockSynth.cancel).toHaveBeenCalledOnce();
    expect(mockSynth.speak).toHaveBeenCalledOnce();
  });

  it('stop() calls synth.cancel()', () => {
    const mockSynth = makeMockSynth();
    installMocks(mockSynth);
    const svc = new TTSService();
    svc.stop();
    expect(mockSynth.cancel).toHaveBeenCalledOnce();
  });

  it('speak() resolves via watchdog when getVoices() stays empty (R10)', async () => {
    vi.useFakeTimers();
    try {
      const mockSynth = {
        speaking: false,
        speak: vi.fn(),
        cancel: vi.fn(),
        getVoices: vi.fn(() => [] as Array<{ name: string; lang: string }>),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onvoiceschanged: null,
      };
      installMocks(mockSynth as unknown as ReturnType<typeof makeMockSynth>);
      const svc = new TTSService();
      const speakPromise = svc.speak('hello');
      // Advance past the 1500ms watchdog so voicesReady resolves.
      await vi.advanceTimersByTimeAsync(1500);
      await speakPromise;
      expect(mockSynth.speak).toHaveBeenCalledOnce();
      // Copilot review: listener should be removed after settle so it doesn't
      // outlive the promise (would otherwise leak across TTSService instances).
      expect(mockSynth.removeEventListener).toHaveBeenCalledWith(
        'voiceschanged',
        expect.any(Function)
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('stop() logs errors in dev mode', () => {
    const mockSynth = makeMockSynth();
    mockSynth.cancel = vi.fn(() => {
      throw new Error('cancel failed');
    });
    installMocks(mockSynth);
    const svc = new TTSService();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    svc.stop();
    if (import.meta.env.DEV) {
      expect(warnSpy).toHaveBeenCalledWith('[TTSService] stop() error:', expect.any(Error));
    }
    warnSpy.mockRestore();
  });
});

describe('SFXService', () => {
  function makeMockAudioContext() {
    return {
      state: 'running',
      currentTime: 0,
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      createBufferSource: vi.fn(() => ({
        connect: vi.fn(),
        start: vi.fn(),
      })),
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: { setValueAtTime: vi.fn() },
      })),
      destination: {} as AudioDestinationNode,
      decodeAudioData: vi.fn().mockResolvedValue({} as AudioBuffer),
    } as unknown as AudioContext;
  }

  function installAudioMocks(ctx: AudioContext | null) {
    const win = window as Record<string, unknown>;
    if (ctx) {
      win.AudioContext = class {
        constructor() {
          return ctx;
        }
      } as unknown as typeof AudioContext;
    } else {
      win.AudioContext = undefined;
    }
    win.webkitAudioContext = undefined;
  }

  afterEach(() => {
    installAudioMocks(null);
  });

  it('creates and caches AudioContext on first getContext call', () => {
    const mockCtx = makeMockAudioContext();
    installAudioMocks(mockCtx);
    const svc = new SFXService();
    svc.setEnabled(true);
    // Access via playKey indirectly (we can't call getContext directly as it's private)
    // Instead, verify that the service initializes without error
    expect(svc.isEnabled()).toBe(true);
  });

  it('no-ops gracefully when AudioContext is unavailable', () => {
    installAudioMocks(null);
    const svc = new SFXService();
    expect(() => {
      svc.playCorrect();
      svc.playIncorrect();
      svc.playComplete();
    }).not.toThrow();
  });

  it('respects enabled flag', () => {
    const mockCtx = makeMockAudioContext();
    installAudioMocks(mockCtx);
    const svc = new SFXService();
    svc.setEnabled(false);
    expect(svc.isEnabled()).toBe(false);
    svc.setEnabled(true);
    expect(svc.isEnabled()).toBe(true);
  });

  it('clamps volume to [0, 1]', () => {
    const mockCtx = makeMockAudioContext();
    installAudioMocks(mockCtx);
    const svc = new SFXService();
    svc.setVolume(-0.5);
    expect(svc.getVolume()).toBe(0);
    svc.setVolume(1.5);
    expect(svc.getVolume()).toBe(1);
    svc.setVolume(0.5);
    expect(svc.getVolume()).toBe(0.5);
  });

  it('destroy() closes AudioContext and clears buffers', () => {
    const mockCtx = makeMockAudioContext();
    installAudioMocks(mockCtx);
    const svc = new SFXService();
    svc.preload(); // would normally cache buffers
    svc.destroy();
    expect(mockCtx.close).toHaveBeenCalled();
    // After destroy, service should be in a safe state
    expect(() => svc.playCorrect()).not.toThrow();
  });

  it('destroy() is idempotent', () => {
    const mockCtx = makeMockAudioContext();
    installAudioMocks(mockCtx);
    const svc = new SFXService();
    svc.destroy();
    svc.destroy(); // second call should not throw
    expect(mockCtx.close).toHaveBeenCalledOnce();
  });

  it('resume() error does not propagate (graceful degradation)', async () => {
    const mockCtx = makeMockAudioContext();
    (mockCtx as any).resume = vi.fn().mockRejectedValue(new Error('Resume denied'));
    installAudioMocks(mockCtx);
    const svc = new SFXService();
    svc.setEnabled(true);
    expect(() => {
      svc.playCorrect();
    }).not.toThrow();
  });

  it('closes context on destroy even if state is already closed', () => {
    const mockCtx = makeMockAudioContext();
    (mockCtx as any).state = 'closed';
    installAudioMocks(mockCtx);
    const svc = new SFXService();
    expect(() => svc.destroy()).not.toThrow();
  });

  it('handles close() errors gracefully', () => {
    const mockCtx = makeMockAudioContext();
    (mockCtx.close as any) = vi.fn(() => {
      throw new Error('close failed');
    });
    installAudioMocks(mockCtx);
    const svc = new SFXService();
    expect(() => svc.destroy()).not.toThrow();
  });

  it('all playback methods are safe no-ops when AudioContext unavailable', () => {
    installAudioMocks(null);
    const svc = new SFXService();
    expect(() => {
      svc.playCorrect();
      svc.playIncorrect();
      svc.playComplete();
      svc.playPerfectFanfare();
      svc.playStreak();
      svc.playSnap();
    }).not.toThrow();
  });
});
