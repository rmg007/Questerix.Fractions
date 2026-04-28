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

const REQUIRED_ASSETS = ['/sw.js', '/manifest.json', '/curriculum/v1.json'];

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

async function checkUrl(url, label) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (res.ok) ok(label ?? url);
    else fail(label ?? url, `HTTP ${res.status}`);
    return res;
  } catch (err) {
    fail(label ?? url, err.message);
    return null;
  }
}

async function run() {
  console.log(`\nPost-deploy check → ${BASE_URL}\n`);

  // 1. Root responds 200
  const root = await fetch(BASE_URL, { redirect: 'follow' });
  if (root?.ok) ok(`Root responds ${root.status}`);
  else fail('Root responds 200', `got ${root?.status}`);

  // 2. Security headers
  console.log('\n  Security headers:');
  for (const [name, pattern] of Object.entries(REQUIRED_HEADERS)) {
    const value = root?.headers?.get(name) ?? '';
    if (pattern.test(value)) ok(`${name}: ${value}`);
    else fail(`${name}`, `got "${value}"`);
  }

  // 3. Key assets reachable
  console.log('\n  Key assets:');
  for (const path of REQUIRED_ASSETS) {
    await checkUrl(`${BASE_URL}${path}`, path);
  }

  // 4. SPA fallback — unknown path should return 200 (not 404)
  console.log('\n  SPA fallback:');
  const spa = await fetch(`${BASE_URL}/this-path-does-not-exist`, { redirect: 'follow' });
  if (spa?.ok) ok('Unknown path returns 200 (SPA fallback active)');
  else fail('SPA fallback', `got ${spa?.status}`);

  // Summary
  console.log(`\n  Passed: ${passed}  Failed: ${failed}\n`);
  if (failed > 0) {
    console.error(`Post-deploy check FAILED (${failed} issue${failed > 1 ? 's' : ''}).\n`);
    process.exit(1);
  }
  console.log('Post-deploy check PASSED.\n');
}

run();
