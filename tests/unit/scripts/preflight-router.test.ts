/**
 * Unit tests for scripts/preflight-router.mjs pure helpers.
 *
 * The router is invoked by .husky/pre-push. The pure tier-mapping and
 * doc-only-detection logic is exported so it can be tested without
 * spawning npm or shelling out to git.
 */

import { describe, expect, it } from 'vitest';

// @ts-expect-error — .mjs script with no .d.ts; runtime types only.
import { TIERS, DOC_PATTERNS, isDocOnly, tierFor } from '../../../scripts/preflight-router.mjs';

describe('preflight-router tierFor', () => {
  it('routes chore/docs/plans branches to light tier', () => {
    expect(tierFor('chore/2026-05-02-foo')).toBe('light');
    expect(tierFor('docs/2026-05-02-foo')).toBe('light');
    expect(tierFor('plans/2026-05-02-foo')).toBe('light');
  });

  it('routes fix/test branches to medium tier', () => {
    expect(tierFor('fix/2026-05-02-foo')).toBe('medium');
    expect(tierFor('test/2026-05-02-foo')).toBe('medium');
  });

  it('routes feat/refactor branches to full tier', () => {
    expect(tierFor('feat/2026-05-02-foo')).toBe('full');
    expect(tierFor('refactor/2026-05-02-foo')).toBe('full');
  });

  it('routes claude/* and worktree-agent-* to medium (auto-escalates on src/ touch)', () => {
    expect(tierFor('claude/blast-radius-preflight-phase-2-T9Onb')).toBe('medium');
    expect(tierFor('worktree-agent-abc123')).toBe('medium');
  });

  it('falls back to full tier for main, detached, or unrecognized branches', () => {
    expect(tierFor('main')).toBe('full');
    expect(tierFor('')).toBe('full');
    expect(tierFor('random-branch-name')).toBe('full');
  });
});

describe('preflight-router isDocOnly', () => {
  it('returns false for an empty diff (defensive — never skip checks on no info)', () => {
    expect(isDocOnly([])).toBe(false);
  });

  it('returns true when every path is documentation', () => {
    expect(
      isDocOnly([
        'PLANS/PLAN.md',
        'docs/30-architecture/test-strategy.md',
        'CLAUDE.md',
        'README.md',
        '.claude/learnings.md',
        '.claude/agents/c1-c10-auditor.md',
        '.claude/commands/retro.md',
      ])
    ).toBe(true);
  });

  it('returns false if any path is source code', () => {
    expect(isDocOnly(['PLANS/PLAN.md', 'src/scenes/MenuScene.ts'])).toBe(false);
    expect(isDocOnly(['CLAUDE.md', 'scripts/build-curriculum.mjs'])).toBe(false);
  });

  it('returns false for workflow / config / package changes', () => {
    expect(isDocOnly(['.github/workflows/ci.yml'])).toBe(false);
    expect(isDocOnly(['package.json'])).toBe(false);
    expect(isDocOnly(['.claude/settings.json'])).toBe(false);
    expect(isDocOnly(['tsconfig.json'])).toBe(false);
  });

  it('treats nested PLANS and docs paths as documentation', () => {
    expect(isDocOnly(['PLANS/_archive/foo.md', 'docs/00-foundation/decision-log.md'])).toBe(true);
  });

  it('treats GitHub PR template + ISSUE_TEMPLATE + CODEOWNERS as documentation', () => {
    expect(
      isDocOnly([
        '.github/PULL_REQUEST_TEMPLATE.md',
        '.github/ISSUE_TEMPLATE/bug_report.md',
        '.github/CODEOWNERS',
      ])
    ).toBe(true);
  });
});

describe('preflight-router TIERS', () => {
  it('doc-only tier is lint-only — no typecheck, no tests, no build', () => {
    expect(TIERS['doc-only']).toEqual(['lint']);
  });

  it('light tier is typecheck + lint', () => {
    expect(TIERS.light).toEqual(['typecheck', 'lint']);
  });

  it('medium tier adds changed-only unit tests', () => {
    expect(TIERS.medium).toContain('test:unit:changed');
  });

  it('full tier includes integration, build, and bundle measurement', () => {
    expect(TIERS.full).toContain('test:integration');
    expect(TIERS.full).toContain('build');
    expect(TIERS.full).toContain('measure-bundle');
  });
});

describe('preflight-router DOC_PATTERNS coverage', () => {
  it('exports a non-empty allowlist of doc-path patterns', () => {
    expect(Array.isArray(DOC_PATTERNS)).toBe(true);
    expect(DOC_PATTERNS.length).toBeGreaterThan(0);
    DOC_PATTERNS.forEach((re: unknown) => expect(re).toBeInstanceOf(RegExp));
  });
});
