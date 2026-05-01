/**
 * MotionBudget — per-surface cap on simultaneous animations.
 *
 * Per ux-elevation.md §5 ("Motion budget per surface"):
 *   Menu                                  3
 *   Loading                               2
 *   Question screen, idle                 2
 *   Question screen, after answer         1
 *   Trophy / session complete             3
 *   World map                             3
 *
 * Reduced-motion replaces all budgets with 0 (ambient motion is suppressed;
 * Reaction state changes are still allowed because they communicate state,
 * not vibe — callers must drop scale/burst embellishments).
 *
 * This module is intentionally framework-agnostic: it tracks slot
 * acquisition / release independent of Phaser. Both ux-elevation and
 * harden-and-polish (R36) consume it.
 */

export type Surface =
  | 'menu'
  | 'loading'
  | 'question-idle'
  | 'question-reaction'
  | 'trophy'
  | 'world-map';

const FULL_BUDGET: Readonly<Record<Surface, number>> = {
  menu: 3,
  loading: 2,
  'question-idle': 2,
  'question-reaction': 1,
  trophy: 3,
  'world-map': 3,
};

export type Priority = 'low' | 'normal' | 'high';

export interface SlotHandle {
  /** Stable id for tracking + auto-eviction. */
  id: number;
  /** Caller-supplied label for diagnostics and tests. */
  label: string;
  /** Lower means more evictable; reactions are 'high' and thus protected. */
  priority: Priority;
  /** Called when the slot is auto-evicted to free space for a new request. */
  onEvict?: () => void;
}

export interface MotionBudget {
  /** Try to acquire a slot. Returns the handle if granted, null if denied. */
  acquire(label: string, priority?: Priority, onEvict?: () => void): SlotHandle | null;
  /** Release a previously-acquired slot. Idempotent. */
  release(handle: SlotHandle): void;
  /** Currently-held slots (read-only snapshot). */
  active(): readonly SlotHandle[];
  /** Numeric cap applied right now (after reduced-motion adjustment). */
  budget(): number;
  /** True iff every slot is occupied right now. */
  isFull(): boolean;
}

const PRIORITY_RANK: Record<Priority, number> = { low: 0, normal: 1, high: 2 };

/**
 * Create a MotionBudget for a surface.
 *
 * @param surface  Logical surface name (drives the cap).
 * @param reduced  Whether reduced motion is active (caps to 0 if so).
 */
export function createMotionBudget(surface: Surface, reduced = false): MotionBudget {
  const cap = reduced ? 0 : FULL_BUDGET[surface];
  const slots: SlotHandle[] = [];
  let nextId = 1;

  const acquire: MotionBudget['acquire'] = (label, priority = 'normal', onEvict) => {
    if (cap === 0) return null;

    if (slots.length >= cap) {
      // Find the lowest-priority slot we can evict (must be strictly lower
      // than the requested priority).
      const requestedRank = PRIORITY_RANK[priority];
      let victimIndex = -1;
      let victimRank = requestedRank;
      for (let i = 0; i < slots.length; i++) {
        const r = PRIORITY_RANK[slots[i]!.priority]!;
        if (r < victimRank) {
          victimRank = r;
          victimIndex = i;
        }
      }
      if (victimIndex < 0) {
        return null;
      }
      const victim = slots[victimIndex]!; // victimIndex >= 0 guarded above
      slots.splice(victimIndex, 1);
      victim.onEvict?.();
    }

    const handle: SlotHandle = onEvict
      ? { id: nextId++, label, priority, onEvict }
      : { id: nextId++, label, priority };
    slots.push(handle);
    return handle;
  };

  const release: MotionBudget['release'] = (handle) => {
    const i = slots.findIndex((s) => s.id === handle.id);
    if (i >= 0) slots.splice(i, 1);
  };

  return {
    acquire,
    release,
    active: () => slots.slice(),
    budget: () => cap,
    isFull: () => slots.length >= cap,
  };
}

/** Default cap table, exported for tests and documentation. */
export const SURFACE_BUDGET = FULL_BUDGET;
