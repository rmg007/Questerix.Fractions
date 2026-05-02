/**
 * Unit tests for TTSService.
 * per docs/30-architecture/accessibility.md §7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
});
