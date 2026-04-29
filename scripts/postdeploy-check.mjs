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

  // 1. Root responds 200, with cache-buster to bypass any CDN edge caching.
  // Use random + timestamp so two close runs don't share the same edge cache key.
  const cacheBuster = `?nocache=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const root = await fetch(BASE_URL + cacheBuster, {
    redirect: 'follow',
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
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

  // 6a. LCP candidate present — splash <h1> in HTML so first paint has meaningful
  // content even before the 351 KB Phaser chunk loads. (Speeds up Largest
  // Contentful Paint from ~5s on cold loads to ~600ms.)
  console.log('\n  LCP readiness:');
  if (/id="splash"/.test(html) && /<h1[^>]*>Questerix Fractions<\/h1>/.test(html)) {
    ok('Splash <h1> present in HTML (LCP candidate ready before JS executes)');
  } else {
    fail('Splash missing from HTML', 'index.html should include #splash with <h1>');
  }

  // 6b. Build version — confirm the deploy that just happened is what's live
  console.log('\n  Build version:');
  const sha = (html.match(/<meta name="x-build-sha" content="([^"]+)"/) || [])[1];
  const buildTime = (html.match(/<meta name="x-build-time" content="([^"]+)"/) || [])[1];
  if (sha && sha !== 'unknown') ok(`x-build-sha: ${sha}`);
  else fail('x-build-sha meta missing', 'add <meta name="x-build-sha"> to index.html');
  if (buildTime) ok(`x-build-time: ${buildTime}`);
  else fail('x-build-time meta missing', '');

  // 7. Accessibility — verify A11yLayer code shipped (runtime-mounted DOM buttons
  // mirror canvas controls per WCAG 4.1.2). The scenes chunk is dynamically
  // imported, so we extract its URL from the entry JS.
  console.log('\n  Accessibility:');
  const markers = ['qf-a11y-layer', 'data-a11y-id'];
  const seedUrls = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
  const allUrls = new Set(seedUrls);
  // Walk entry JS for chunk references (e.g. "scenes-XXXX.js")
  for (const u of seedUrls) {
    try {
      const r = await fetch(new URL(u, BASE_URL).href, { redirect: 'follow' });
      const js = await r.text();
      for (const m of js.matchAll(/["'`](\/?assets\/[\w.-]+\.js)["'`]/g)) {
        allUrls.add(m[1].startsWith('/') ? m[1] : '/' + m[1]);
      }
    } catch {
      /* skip */
    }
  }
  let foundIn = '';
  for (const u of allUrls) {
    try {
      const r = await fetch(new URL(u, BASE_URL).href, { redirect: 'follow' });
      const js = await r.text();
      if (markers.every((m) => js.includes(m))) {
        foundIn = u;
        break;
      }
    } catch {
      /* skip */
    }
  }
  if (foundIn) ok(`A11yLayer code shipped (found in ${foundIn})`);
  else fail('A11yLayer markers missing from all chunks', `checked ${allUrls.size} scripts`);

  // 8. Storage compatibility — COEP:require-corp causes IndexedDB "storage access
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
