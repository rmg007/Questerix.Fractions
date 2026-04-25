module.exports = {
  ci: {
    collect: {
      staticDistDir: 'dist',
      url: ['http://localhost/'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance':   ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 1.0 }],
        'categories:best-practices':['error', { minScore: 0.95 }],
        'categories:seo':           ['warn',  { minScore: 0.85 }],
        'first-contentful-paint':   ['warn',  { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn',  { maxNumericValue: 2500 }],
        'total-byte-weight':        ['error', { maxNumericValue: 1048576 }],
      }
    }
  }
};
