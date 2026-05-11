import { useSyncExternalStore } from 'react';
import { levelProgressionRepo } from 'src/persistence/repositories/levelProgression';
import type { LevelProgression, StudentId } from 'src/types';

// Single instance (singleton) for Phase 1
class LevelProgressionServiceImpl {
  private listeners = new Set<() => void>();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getProgressionForStudent(studentId: StudentId): Promise<LevelProgression | undefined> {
    return levelProgressionRepo.get(studentId);
  }
}

const levelProgressionService = new LevelProgressionServiceImpl();

// For non-React code (Pixi renderers), use the service directly
export { levelProgressionService };

// For React components, use the hook
export function useLevelProgression() {
  return useSyncExternalStore(
    (listener) => levelProgressionService.subscribe(listener),
    () => ({}) // This will be enhanced in Phase 2 with actual progression state
  );
}
