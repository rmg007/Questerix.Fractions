#!/usr/bin/env node
/**
 * preflight-router.mjs
 *
 * Branch-aware preflight gate. Reads the current branch name and runs the
 * tier of checks proportional to the branch's blast radius:
 *
 *   doc-only diff (any branch)   → doc-only (lint only — ~5s with cache)
 *   chore/* docs/* plans/*       → light    (typecheck + lint)
 *   fix/*   test/*               → medium   (light + unit:changed)
 *   feat/*  refactor/*           → full     (medium + integration + build + bundle)
 *   claude/* worktree-agent-* …  → medium   (auto-escalates if src/** touched)
 *
 * Two diff-based overrides on top of the branch-prefix tier:
 *   - Auto-escalation: a chore/docs/plans branch that touches src/** is
 *     escalated to full tier with a stderr note. The branch prefix is a hint,
 *     not a contract.
 *   - Doc-only downgrade: any branch whose diff is purely documentation
 *     (PLANS/, docs/, *.md, .claude/learnings.md, .claude/agents/*.md, …)
 *     is downgraded to the lint-only tier. Doc PRs do not need typecheck or
 *     tests; the lint cache makes this finish in ~5s.
 *
 * Invoked by .husky/pre-push. Fails fast on the first failing step.
 *
 * Exit 0 = all checks passed
 * Exit 1 = a check failed (message printed) or git unavailable
 */

import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const TIERS = {
  'doc-only': ['lint'],
  light: ['typecheck', 'lint'],
  medium: ['typecheck', 'lint', 'test:unit:changed'],
  full: ['typecheck', 'lint', 'test:unit', 'test:integration', 'build', 'measure-bundle'],
};

/**
 * Files whose change should NOT trigger code checks. A diff that contains
 * only paths matching this list is safe for the lint-only tier — no .ts
 * compiled, no test affected, no bundle delta possible.
 */
export const DOC_PATTERNS = [
  /^PLANS\//,
  /^docs\//,
  /^README\.md$/,
  /^CLAUDE\.md$/,
  /^CHANGELOG\.md$/,
  /^LICENSE(\..+)?$/,
  /^\.claude\/learnings\.md$/,
  /^\.claude\/_session-log\.md$/,
  /^\.claude\/agents\/[^/]+\.md$/,
  /^\.claude\/commands\/[^/]+\.md$/,
  /^\.github\/PULL_REQUEST_TEMPLATE\.md$/,
  /^\.github\/pull_request_template\.md$/,
  /^\.github\/ISSUE_TEMPLATE\//,
  /^\.github\/CODEOWNERS$/,
];

export function isDocOnly(paths) {
  if (!paths || paths.length === 0) return false;
  return paths.every((p) => DOC_PATTERNS.some((re) => re.test(p)));
}

export function tierFor(branch) {
  if (/^(chore|docs|plans)\//.test(branch)) return 'light';
  if (/^(fix|test)\//.test(branch)) return 'medium';
  if (/^(feat|refactor)\//.test(branch)) return 'full';
  // claude/* and worktree-agent-* are agent branches; treat like fix/* —
  // medium by default, auto-escalated to full if src/** was touched.
  if (/^(claude\/|worktree-agent-)/.test(branch)) return 'medium';
  // main, detached, unknown — defensive default
  return 'full';
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
    return out.split('\n').filter((p) => p.length > 0);
  } catch {
    return [];
  }
}

function run(script) {
  process.stdout.write(`  → npm run ${script}\n`);
  const r = spawnSync('npm', ['run', script], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n✗ preflight failed at: npm run ${script}`);
    process.exit(1);
  }
}

function main() {
  const branch = currentBranch() || '(detached)';
  let tier = tierFor(branch);
  const allPaths = changedPaths();
  const srcPaths = allPaths.filter((p) => p.startsWith('src/'));

  // Proactive auto-escalation: a "doc-only" prefix branch that touched src/**
  // is suspicious. Escalate to full tier rather than trusting the prefix.
  if (tier === 'light' && srcPaths.length > 0) {
    console.error(
      `◇ auto-escalating: branch '${branch}' is prefixed for light tier but touches src/**:`,
    );
    srcPaths.slice(0, 5).forEach((p) => console.error(`  - ${p}`));
    if (srcPaths.length > 5) console.error(`  - … and ${srcPaths.length - 5} more`);
    tier = 'full';
  }

  // Doc-only downgrade: a diff that touches only docs cannot break code.
  // Skip typecheck + tests + build; lint stays as a cheap sanity check (it
  // runs against src/ via the eslint cache, ~5s when src/ is unchanged).
  // Note: this fires regardless of branch prefix because the diff content
  // is the source of truth — a feat/* branch with only doc edits is fine
  // to skip, and the branch is presumably part of a wider feature where
  // the actual src/ work landed in another commit/branch.
  if (allPaths.length > 0 && isDocOnly(allPaths)) {
    console.log(`◇ doc-only diff detected (${allPaths.length} file(s)) — running lint-only tier`);
    tier = 'doc-only';
  }

  const steps = TIERS[tier];

  console.log(`▶ tier: ${tier}  (branch: ${branch})`);
  for (const step of steps) run(step);
  console.log(`✓ all checks passed (${tier})`);
}

// Only run main when invoked directly, not when imported by tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
