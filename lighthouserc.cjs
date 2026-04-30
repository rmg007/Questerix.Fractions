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
        'categories:performance': ['error', { minScore: 0.6 }],
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
