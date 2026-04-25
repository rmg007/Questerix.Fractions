#!/usr/bin/env node
// Wrapper to run the synthetic playtest with configurable session counts.
// Usage:
//   node scripts/run-synthetic-playtest.mjs
//   node scripts/run-synthetic-playtest.mjs --sessions-per-persona 5
//   node scripts/run-synthetic-playtest.mjs --sessions-per-persona 10 --personas Eager-K,Confident-G1

import { execSync } from 'child_process';

const args = process.argv.slice(2);

function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return defaultValue;
}

const sessionsPerPersona = parseInt(getArg('--sessions-per-persona', '25'), 10);
const personasArg = getArg('--personas', '');

if (isNaN(sessionsPerPersona) || sessionsPerPersona < 1) {
  console.error('--sessions-per-persona must be a positive integer');
  process.exit(1);
}

const totalEstimate = sessionsPerPersona * 4;
console.log(`[synthetic-playtest] Starting: ${sessionsPerPersona} sessions/persona × 4 personas = ${totalEstimate} total sessions`);
console.log(`[synthetic-playtest] Estimated time: ~${Math.ceil(totalEstimate * 15 / 60)} minutes (15s avg/session)`);

const env = {
  ...process.env,
  SYNTHETIC_SESSIONS_PER_PERSONA: String(sessionsPerPersona),
};
if (personasArg) {
  env.SYNTHETIC_PERSONAS = personasArg;
}

const playwrightArgs = [
  'npx playwright test',
  '--config=playwright.synthetic.config.ts',
  '--project=chromium',          // headless chromium only
  '--reporter=list',
].join(' ');

try {
  execSync(playwrightArgs, {
    env,
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  console.log('[synthetic-playtest] Run complete. Check tests/synthetic/results/ for the JSON report.');
} catch (err) {
  // Playwright exits non-zero on test failure — surface the exit code
  process.exit(err.status ?? 1);
}
