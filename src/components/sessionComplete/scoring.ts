/**
 * SessionCompleteOverlay scoring logic.
 * trophy stars and accuracy calculations.
 */

export function starsFromAccuracy(correct: number, total: number): 1 | 2 | 3 {
  if (total === 0) return 1;
  const acc = correct / total;
  if (acc >= 0.9) return 3;
  if (acc >= 0.6) return 2;
  return 1;
}

export function calculateAccuracy(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}
