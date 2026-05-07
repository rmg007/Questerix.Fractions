#!/usr/bin/env node
/**
 * preflight-router.mjs
 *
 * Content-aware preflight gate. Inspects the diff vs origin/main, classifies
 * each changed path into a blast level, and runs the smallest tier that
 * covers the highest blast in the diff. The branch prefix is a hint, not a
 * contract — the diff is the source of truth.
 *
 *   blast 0 (none)    docs/plans/markdown/LICENSE                       → skip
 *   blast 1 (light)   .github/, .husky/, .claude/, .editorconfig, etc.  → typecheck + lint
 *   blast 2 (medium)  src/validators/, src/engine/, src/types/, tests/  → light + changed-unit
 *   blast 3 (full)    src/scenes/, src/components/, src/persistence/,
 *                     src/lib/, src/main.ts, src/curriculum/,
 *                     public/curriculum/, package*.json, vite/tsconfig/
 *                     eslint/prettier configs, pipeline/output/          → medium + integration + build + bundle
 *
 * Effective tier = max(branch-prefix tier, content-driven tier). Branch wins
 * when it claims more (e.g. claude/* defaults to medium even on tiny diffs);
 * content wins when the diff is bigger than the prefix suggests
 * (auto-escalation). Both directions are reported.
 *
 * Manual override: SKIP_PREFLIGHT=1 git push  (skip tier checks entirely;
 * branch-name and workflow-drift guards in pre-push still run).
 *
 * Invoked by .husky/pre-push. Fails fast on the first failing step.
 *
 * Exit 0 = all checks passed
 * Exit 1 = a check failed (message printed) or git unavailable
 */

import { execSync, spawnSync } from 'node:child_process';

const TIER_ORDER = ['none', 'light', 'medium', 'full'];
const TIERS = {
  none: [],
  light: ['typecheck', 'lint'],
  medium: ['typecheck', 'lint', 'test:unit:changed'],
  full: ['typecheck', 'lint', 'test:unit', 'test:integration', 'build', 'measure-bundle'],
};

// Path → blast level. First match wins. Order matters: more specific patterns
// must come before broader ones.
const PATH_RULES = [
  // blast 0 — pure docs/plans, no checks needed
  { tier: 'none', re: /^PLANS\// },
  { tier: 'none', re: /^docs\// },
  { tier: 'none', re: /^\.claude\/learnings\.md$/ },
  { tier: 'none', re: /^[^/]+\.md$/ },
  { tier: 'none', re: /^LICENSE$/ },

  // blast 3 — runtime/config (must come BEFORE the broad src/ rule below)
  { tier: 'full', re: /^package(-lock)?\.json$/ },
  { tier: 'full', re: /^vite\.config\.(ts|mjs|js)$/ },
  { tier: 'full', re: /^vitest(\..*)?\.config\.(ts|mjs|js)$/ },
  { tier: 'full', re: /^playwright\.config\.(ts|mjs|js)$/ },
  { tier: 'full', re: /^tsconfig.*\.json$/ },
  { tier: 'full', re: /^\.eslintrc.*$/ },
  { tier: 'full', re: /^\.prettierrc.*$/ },
  { tier: 'full', re: /^public\/curriculum\// },
  { tier: 'full', re: /^src\/curriculum\// },
  { tier: 'full', re: /^src\/main\.ts$/ },
  { tier: 'full', re: /^src\/scenes\// },
  { tier: 'full', re: /^src\/components\// },
  { tier: 'full', re: /^src\/persistence\// },
  { tier: 'full', re: /^src\/lib\// },
  { tier: 'full', re: /^pipeline\/output\// },

  // blast 2 — pure logic & types, unit tests cover these
  { tier: 'medium', re: /^src\/validators\// },
  { tier: 'medium', re: /^src\/engine\// },
  { tier: 'medium', re: /^src\/types\// },
  { tier: 'medium', re: /^tests\// },
  { tier: 'medium', re: /^.*\.(test|spec)\.tsx?$/ },
  { tier: 'medium', re: /^pipeline\/(?!output\/)/ }, // pipeline source, not output

  // blast 1 — meta / non-runtime
  { tier: 'light', re: /^\.github\// },
  { tier: 'light', re: /^\.husky\// },
  { tier: 'light', re: /^\.claude\// },
  { tier: 'light', re: /^scripts\// },
  { tier: 'light', re: /^\.editorconfig$/ },
  { tier: 'light', re: /^\.gitignore$/ },
  { tier: 'light', re: /^\.npmrc$/ },

  // blast 3 default for anything we didn't explicitly classify (defensive)
  { tier: 'full', re: /^src\// },
];

function classify(path) {
  for (const rule of PATH_RULES) if (rule.re.test(path)) return rule.tier;
  return 'full'; // unknown path — defensive default
}

function maxTier(a, b) {
  return TIER_ORDER.indexOf(a) > TIER_ORDER.indexOf(b) ? a : b;
}

function currentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function changedPaths() {
  try {
    const base = execSync('git merge-base HEAD origin/main', { encoding: 'utf8' }).trim();
    const out = execSync(`git diff --name-only ${base}..HEAD`, { encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function tierForBranch(branch) {
  if (/^(chore|docs|plans)\//.test(branch)) return 'light';
  if (/^(fix|test)\//.test(branch)) return 'medium';
  if (/^(feat|refactor)\//.test(branch)) return 'full';
  if (/^(claude\/|worktree-agent-)/.test(branch)) return 'medium';
  if (branch === 'main') return 'none'; // content-only on trunk — no branch override
  return 'full'; // release/*, detached
}

function tierForContent(paths) {
  if (paths.length === 0) return 'none';
  return paths.reduce((acc, p) => maxTier(acc, classify(p)), 'none');
}

function run(script) {
  process.stdout.write(`  → npm run ${script}\n`);
  const r = spawnSync('npm', ['run', script], { stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error(`\n✗ preflight failed at: npm run ${script}`);
    process.exit(1);
  }
}

const branch = currentBranch() || '(detached)';

if (process.env.SKIP_PREFLIGHT === '1') {
  console.log(`▶ tier: none  (SKIP_PREFLIGHT=1 set — branch: ${branch})`);
  console.log('✓ preflight skipped by env override');
  process.exit(0);
}

const allChanged = changedPaths();
const branchTier = tierForBranch(branch);
const contentTier = tierForContent(allChanged);
const tier = maxTier(branchTier, contentTier);

// Report decision
console.log(`▶ tier: ${tier}  (branch: ${branch})`);
console.log(`  branch-tier: ${branchTier}  |  content-tier: ${contentTier}  |  files: ${allChanged.length}`);

if (contentTier !== branchTier) {
  if (TIER_ORDER.indexOf(contentTier) > TIER_ORDER.indexOf(branchTier)) {
    console.error(`  ◇ auto-escalation: diff content forces tier '${contentTier}' over branch '${branchTier}'`);
  } else {
    console.log(`  ◇ branch tier '${branchTier}' is more conservative than content '${contentTier}' — running branch tier`);
  }
}

if (tier === 'none') {
  console.log('✓ preflight skipped (no build-relevant changes)');
  process.exit(0);
}

for (const step of TIERS[tier]) run(step);
console.log(`✓ all checks passed (${tier})`);
