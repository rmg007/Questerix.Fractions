import { useSyncExternalStore } from 'react';

// Phase 1: Audio service is a stub. Phase 2+ will integrate with existing audio infrastructure.
// For now, we prepare the service structure so the pattern is consistent across all services.

class AudioServiceImpl {
  private listeners = new Set<() => void>();
  private isPlaying = false;

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return { isPlaying: this.isPlaying };
  }

  play(soundKey: string) {
    this.isPlaying = true;
    this.notifyListeners();
    // Phase 2: integrate with actual audio system
    console.log(`[Audio] Playing: ${soundKey}`);
  }

  stop() {
    this.isPlaying = false;
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l());
  }
}

const audioService = new AudioServiceImpl();

export function useAudio() {
  return useSyncExternalStore(
    (listener) => audioService.subscribe(listener),
    () => audioService.getSnapshot()
  );
}

export { audioService };
