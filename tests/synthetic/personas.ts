// Simulated K-2 kid personas for synthetic playtest harness
// per playtest-protocol.md §5 (telemetry) and K-2 math norms (NAEP 2022, Common Core grade-band expectations)
// Accuracy distributions loosely calibrated to observed K-2 fraction performance on novel tasks.

export interface Persona {
  readonly name: string;
  /** 0..1 probability of correct answer at a given level (1-9) */
  accuracyByLevel(level: number): number;
  /** Think-time before answering, in milliseconds */
  responseTimeMs(): number;
  /** Probability of asking for a hint after a wrong answer */
  hintProbability(): number;
  /** Probability of abandoning the session mid-way (per-session, not per-attempt) */
  abandonProbability(): number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function uniformMs(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

// ─── Eager-K ────────────────────────────────────────────────────────────────
// Kindergartener, high motivation, below-grade fraction knowledge.
// Accuracy high at L1 (identification of halves: ~0.55 per K norms), declining
// steeply as levels introduce thirds/fourths/partitioning.
// Fast tap times — engaged but impulsive.
// Rarely asks for hints (doesn't know they exist), rarely abandons.
const EagerK: Persona = {
  name: 'Eager-K',
  accuracyByLevel(level: number): number {
    // L1: 0.55, L5: 0.35, L9: 0.20 — near-linear decline
    const base = 0.55 - (level - 1) * 0.04375;
    return clamp(base + (Math.random() * 0.08 - 0.04), 0.05, 0.95);
  },
  responseTimeMs(): number {
    // Eager, quick tapper: 1500–3500 ms
    return uniformMs(1500, 3500);
  },
  hintProbability(): number {
    return 0.08;
  },
  abandonProbability(): number {
    return 0.05;
  },
};

// ─── Hesitant-K ─────────────────────────────────────────────────────────────
// Kindergartener, anxious, slow to commit, similar accuracy to Eager-K at L1.
// Long think times, likely to ask for hints, moderate abandon rate (loses interest).
const HesitantK: Persona = {
  name: 'Hesitant-K',
  accuracyByLevel(level: number): number {
    // L1: 0.50, declining to 0.15 at L9 — slightly worse than Eager-K
    const base = 0.5 - (level - 1) * 0.04375;
    return clamp(base + (Math.random() * 0.1 - 0.05), 0.05, 0.9);
  },
  responseTimeMs(): number {
    // Hesitant: 4000–9000 ms, occasionally very long
    const base = uniformMs(4000, 9000);
    // 15% chance of extra-long pause (distraction / anxiety)
    return Math.random() < 0.15 ? base + uniformMs(3000, 8000) : base;
  },
  hintProbability(): number {
    return 0.35;
  },
  abandonProbability(): number {
    return 0.12;
  },
};

// ─── Confident-G1 ───────────────────────────────────────────────────────────
// Grade 1, has heard "halves" and "fourths", moderate-to-good accuracy on L1-L5.
// Accuracy peaks around L4-L5 (partitioning with familiar denominators) then
// declines at L7-L9 (more abstract). Models growth-then-ceiling pattern.
// Moderate speed, low hint use, low abandon rate.
const ConfidentG1: Persona = {
  name: 'Confident-G1',
  accuracyByLevel(level: number): number {
    // Rises from 0.40 at L1 → peaks 0.75 at L5 → falls to 0.45 at L9
    let base: number;
    if (level <= 5) {
      base = 0.4 + (level - 1) * 0.0875; // 0.40 → 0.75
    } else {
      base = 0.75 - (level - 5) * 0.075; // 0.75 → 0.45
    }
    return clamp(base + (Math.random() * 0.1 - 0.05), 0.1, 0.95);
  },
  responseTimeMs(): number {
    // Moderate: 2500–6000 ms
    return uniformMs(2500, 6000);
  },
  hintProbability(): number {
    return 0.18;
  },
  abandonProbability(): number {
    return 0.04;
  },
};

// ─── Distractible-G2 ─────────────────────────────────────────────────────────
// Grade 2, reasonable fraction knowledge but attention wanders wildly.
// High accuracy when focused (up to 0.70 at L3-L5), but bursts of very fast
// random taps and very long pauses both occur. Notable abandon rate.
// Response time distribution is bimodal: fast impulsive OR slow distracted.
const DistractibleG2: Persona = {
  name: 'Distractible-G2',
  accuracyByLevel(level: number): number {
    // G2 norms: better baseline than K (0.60 at L1), but distractibility
    // introduces variance. Peak ~0.72 at L4, then falls with complexity.
    const base = level <= 4 ? 0.6 + (level - 1) * 0.04 : 0.72 - (level - 4) * 0.055;
    // Extra noise: distractible → wider variance
    return clamp(base + (Math.random() * 0.2 - 0.1), 0.05, 0.95);
  },
  responseTimeMs(): number {
    // Bimodal: 30% chance fast-impulsive (500-1800 ms), else slow/distracted (3000-12000 ms)
    if (Math.random() < 0.3) {
      return uniformMs(500, 1800);
    }
    return uniformMs(3000, 12000);
  },
  hintProbability(): number {
    return 0.22;
  },
  abandonProbability(): number {
    return 0.15;
  },
};

export const ALL_PERSONAS: readonly Persona[] = [EagerK, HesitantK, ConfidentG1, DistractibleG2];
export { EagerK, HesitantK, ConfidentG1, DistractibleG2 };
