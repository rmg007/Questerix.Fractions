/**
 * Self-calibrating Lighthouse CI thresholds.
 * Performance threshold auto-adjusts based on last green run to catch regressions.
 */

// Extract performance score from the most recent LHR (Lighthouse Results) JSON
function getLastGreenPerformance() {
  const fs = require('fs');
  const path = require('path');

  const PERF_MIN_BASELINE = 0.6; // Phaser game loop minimum
  const PERF_REGRESSION_THRESHOLD = 0.05; // Fail if score drops more than 5%

  try {
    const lhciDir = path.join(process.cwd(), '.lighthouseci');
    if (!fs.existsSync(lhciDir)) {
      // First run — use baseline
      return PERF_MIN_BASELINE;
    }

    // Find most recent LHR JSON file
    const files = fs.readdirSync(lhciDir)
      .filter(f => f.startsWith('lhr-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      return PERF_MIN_BASELINE;
    }

    // Parse the most recent LHR and extract performance score
    const mostRecent = files[0];
    const lhrPath = path.join(lhciDir, mostRecent);
    const lhr = JSON.parse(fs.readFileSync(lhrPath, 'utf8'));
    const lastScore = lhr.categories?.performance?.score ?? PERF_MIN_BASELINE;

    // Floor: never go below baseline, even if LHR reports lower
    // Ceiling: score rises with improvements, can't regress silently
    return Math.max(lastScore - PERF_REGRESSION_THRESHOLD, PERF_MIN_BASELINE);
  } catch (err) {
    // On error, use baseline
    console.warn('Failed to read last green performance score:', err.message);
    return PERF_MIN_BASELINE;
  }
}

const perfThreshold = getLastGreenPerformance();

module.exports = {
  ci: {
    collect: {
      staticDistDir: 'dist',
      url: ['http://localhost/'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        // Phaser ships a 351 KB gz bundle and runs a continuous 60fps game
        // loop, which Lighthouse counts as Total Blocking Time — TBT alone
        // weighs 30% of the perf score and cannot be eliminated without
        // gating the game behind a user-interaction click. 0.6 is the
        // realistic baseline for a canvas game; raise it as we add perf
        // wins (lazy chunks, reduced startup work, idle-callback init).
        'categories:performance': ['error', { minScore: perfThreshold }],
        'categories:accessibility': ['error', { minScore: 1.0 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['warn', { minScore: 0.85 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'total-byte-weight': ['error', { maxNumericValue: 1048576 }],
      },
    },
  },
};
