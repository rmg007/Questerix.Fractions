import { useSyncExternalStore } from 'react';
import { checkReduceMotion, isHighContrastEnabled } from 'src/lib/preferences';

interface Preferences {
  reducedMotion: boolean;
  highContrast: boolean;
}

// Single instance (singleton) for Phase 1
class PreferencesServiceImpl {
  private listeners = new Set<() => void>();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): Preferences {
    return {
      reducedMotion: checkReduceMotion(),
      highContrast: isHighContrastEnabled(),
    };
  }
}

const preferencesService = new PreferencesServiceImpl();

export function usePreferences() {
  return useSyncExternalStore(
    (listener) => preferencesService.subscribe(listener),
    () => preferencesService.getSnapshot()
  );
}

export { preferencesService };
