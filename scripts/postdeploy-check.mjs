#!/usr/bin/env node
// Post-deployment health check for fractions.questerix.com
// Verifies the live site is up, headers are correct, and key assets are reachable.
// Exit code 0 = all checks passed. Exit code 1 = one or more checks failed.

const BASE_URL = process.env.DEPLOY_URL ?? 'https://fractions.questerix.com';

const REQUIRED_HEADERS = {
  'strict-transport-security': /max-age=\d+/,
  'x-frame-options': /DENY/i,
  'x-content-type-options': /nosniff/i,
  'content-security-policy': /default-src 'self'/,
  'referrer-policy': /no-referrer/,
};

// Assets that must return HTTP 200 with the correct Content-Type
const TYPED_ASSETS = [
  { path: '/sw.js', type: /javascript/ },
  { path: '/registerSW.js', type: /javascript/ },
  { path: '/manifest.json', type: /json/ },
  { path: '/manifest.webmanifest', type: /json|webmanifest/ },
  { path: '/curriculum/v1.json', type: /json/ },
];

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✅  ${label}`);
  passed++;
}

function fail(label, detail = '') {
  console.error(`  ❌  ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

async function run() {
  console.log(`\nPost-deploy check → ${BASE_URL}\n`);

  // 1. Root responds 200, with cache-buster to bypass any CDN edge caching
  const cacheBuster = `?t=${Date.now()}`;
  const root = await fetch(BASE_URL + cacheBuster, { redirect: 'follow', cache: 'no-store' });
  if (root?.ok) ok(`Root responds ${root.status}`);
  else {
    fail('Root responds 200', `got ${root?.status}`);
    process.exit(1);
  }

  // 2. Security headers
  console.log('\n  Security headers:');
  for (const [name, pattern] of Object.entries(REQUIRED_HEADERS)) {
    const value = root?.headers?.get(name) ?? '';
    if (pattern.test(value)) ok(`${name}`);
    else fail(`${name}`, `got "${value}"`);
  }

  // 3. Assets — correct HTTP status AND Content-Type (catches SPA fallback serving HTML as JS)
  console.log('\n  Assets (status + MIME):');
  for (const { path, type } of TYPED_ASSETS) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, { redirect: 'follow' });
      const ct = res.headers.get('content-type') ?? '';
      if (!res.ok) fail(path, `HTTP ${res.status}`);
      else if (!type.test(ct)) fail(path, `wrong MIME "${ct}" — SPA fallback may be intercepting`);
      else ok(`${path} (${res.status}, ${ct.split(';')[0].trim()})`);
    } catch (err) {
      fail(path, err.message);
    }
  }

  // 4. SPA fallback — unknown path must return 200 with HTML (not 404)
  console.log('\n  SPA fallback:');
  const spa = await fetch(`${BASE_URL}/this-path-does-not-exist`, { redirect: 'follow' });
  const spaCt = spa?.headers?.get('content-type') ?? '';
  if (spa?.ok && /html/.test(spaCt)) ok('Unknown path → 200 text/html (SPA fallback active)');
  else fail('SPA fallback', `got ${spa?.status} ${spaCt}`);

  // 5. Privacy — Cloudflare Analytics beacon must NOT appear in the HTML
  console.log('\n  Privacy:');
  const html = await root.text().catch(() => '');
  if (html.includes('cloudflareinsights.com') || html.includes('beacon.min.js')) {
    fail(
      'No CF Analytics beacon in HTML',
      'disable Web Analytics in Cloudflare dashboard → Pages project → Settings'
    );
  } else {
    ok('No third-party analytics scripts injected');
  }

  // 6. Build version — confirm the deploy that just happened is what's live
  console.log('\n  Build version:');
  const sha = (html.match(/<meta name="x-build-sha" content="([^"]+)"/) || [])[1];
  const buildTime = (html.match(/<meta name="x-build-time" content="([^"]+)"/) || [])[1];
  if (sha && sha !== 'unknown') ok(`x-build-sha: ${sha}`);
  else fail('x-build-sha meta missing', 'add <meta name="x-build-sha"> to index.html');
  if (buildTime) ok(`x-build-time: ${buildTime}`);
  else fail('x-build-time meta missing', '');

  // 7. Storage compatibility — COEP:require-corp causes IndexedDB "storage access
  // not allowed from this context" in embedded/iframe testers. We don't use
  // SharedArrayBuffer, so it must NOT be present.
  console.log('\n  Storage compatibility:');
  const coep = root?.headers?.get('cross-origin-embedder-policy') ?? '';
  if (coep.includes('require-corp') || coep.includes('credentialless')) {
    fail('COEP must not be require-corp', `got "${coep}" — breaks IndexedDB in embedded contexts`);
  } else {
    ok('No restrictive COEP header (IndexedDB works in iframes/testers)');
  }

  // Summary
  console.log(`\n  Passed: ${passed}  Failed: ${failed}\n`);
  if (failed > 0) {
    console.error(`Post-deploy check FAILED (${failed} issue${failed > 1 ? 's' : ''}).\n`);
    process.exit(1);
  }
  console.log('Post-deploy check PASSED.\n');
}

run();
