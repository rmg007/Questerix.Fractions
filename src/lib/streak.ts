/**
 * streak.ts — localStorage-based daily streak tracker.
 * Storage format per student: JSON { count: number, lastDate: string } (ISO date YYYY-MM-DD)
 * Key: `questerix.streak:${studentId || 'anon'}`
 */

interface StreakRecord {
  count: number;
  lastDate: string;
}

function storageKey(studentId: string | null): string {
  return `questerix.streak:${studentId ?? 'anon'}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns current streak count (0 if never played).
 */
export function getStreak(studentId: string | null): number {
  try {
    const raw = localStorage.getItem(storageKey(studentId));
    if (!raw) return 0;
    const record = JSON.parse(raw) as StreakRecord;
    return typeof record.count === 'number' ? record.count : 0;
  } catch {
    return 0;
  }
}

/**
 * Call when a session closes. Increments if played today or yesterday
 * (consecutive), resets to 1 if gap > 1 day. Returns new count.
 * Wraps all localStorage operations in try/catch; returns 0 on any error.
 */
export function updateStreak(studentId: string | null): number {
  try {
    const key = storageKey(studentId);
    const today = todayISO();
    const raw = localStorage.getItem(key);

    let newCount = 1;

    if (raw) {
      const record = JSON.parse(raw) as StreakRecord;
      const lastDate = record.lastDate;
      const prevCount = typeof record.count === 'number' ? record.count : 0;

      if (lastDate === today) {
        // Already played today — keep existing count
        newCount = prevCount;
      } else {
        // Check if yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayISO = yesterday.toISOString().slice(0, 10);

        if (lastDate === yesterdayISO) {
          // Consecutive day — increment
          newCount = prevCount + 1;
        } else {
          // Gap > 1 day — reset
          newCount = 1;
        }
      }
    }

    const updated: StreakRecord = { count: newCount, lastDate: today };
    localStorage.setItem(key, JSON.stringify(updated));
    return newCount;
  } catch {
    return 0;
  }
}
