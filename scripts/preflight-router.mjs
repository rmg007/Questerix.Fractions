#!/usr/bin/env node
/**
 * preflight-router.mjs
 *
 * Branch-aware preflight gate. Reads the current branch name and runs the
 * tier of checks proportional to the branch's blast radius:
 *
 *   chore/* docs/* plans/*       → light   (typecheck + lint)
 *   fix/*   test/*               → medium  (light + unit)
 *   feat/*  refactor/*           → full    (medium + integration + build + bundle)
 *   claude/* worktree-agent-* …  → full    (defensive default)
 *
 * Auto-escalation: a chore/docs/plans branch that touches src/** is
 * escalated to full tier with a stderr note. The branch prefix is a hint,
 * not a contract.
 *
 * Invoked by .husky/pre-push. Fails fast on the first failing step.
 *
 * Exit 0 = all checks passed
 * Exit 1 = a check failed (message printed) or git unavailable
 */

import { execSync, spawnSync } from 'node:child_process';

const TIERS = {
  light: ['typecheck', 'lint'],
  medium: ['typecheck', 'lint', 'test:unit:changed'],
  full: ['typecheck', 'lint', 'test:unit', 'test:integration', 'build', 'measure-bundle'],
};

function currentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function changedSrcPaths() {
  try {
    const base = execSync('git merge-base HEAD origin/main', { encoding: 'utf8' }).trim();
    const out = execSync(`git diff --name-only ${base}..HEAD`, { encoding: 'utf8' });
    return out.split('\n').filter((p) => p.startsWith('src/'));
  } catch {
    return [];
  }
}

function tierFor(branch) {
  if (/^(chore|docs|plans)\//.test(branch)) return 'light';
  if (/^(fix|test)\//.test(branch)) return 'medium';
  if (/^(feat|refactor)\//.test(branch)) return 'full';
  // claude/* and worktree-agent-* are agent branches; treat like fix/* —
  // medium by default, auto-escalated to full if src/** was touched.
  if (/^(claude\/|worktree-agent-)/.test(branch)) return 'medium';
  // main, detached, unknown — defensive default
  return 'full';
}

function run(script) {
  process.stdout.write(`  → npm run ${script}\n`);
  // shell: true is required on Windows so `npm` resolves to `npm.cmd`.
  const r = spawnSync('npm', ['run', script], { stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error(`\n✗ preflight failed at: npm run ${script}`);
    process.exit(1);
  }
}

const branch = currentBranch() || '(detached)';
let tier = tierFor(branch);

// Proactive auto-escalation: a "doc-only" branch that touched src/** is
// suspicious. Escalate to full tier rather than trusting the prefix.
if (tier === 'light') {
  const srcPaths = changedSrcPaths();
  if (srcPaths.length > 0) {
    console.error(`◇ auto-escalating: branch '${branch}' is prefixed for light tier but touches src/**:`);
    srcPaths.slice(0, 5).forEach((p) => console.error(`  - ${p}`));
    if (srcPaths.length > 5) console.error(`  - … and ${srcPaths.length - 5} more`);
    tier = 'full';
  }
}

const steps = TIERS[tier];

console.log(`▶ tier: ${tier}  (branch: ${branch})`);
for (const step of steps) run(step);
console.log(`✓ all checks passed (${tier})`);
