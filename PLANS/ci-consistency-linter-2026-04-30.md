---
title: CI Consistency Linter — Autonomous Drift Catcher
status: proposed
owner: solo
created: 2026-04-30
applies_to: [mvp, infra]
---

# CI Consistency Linter

## 1. Problem

Six failures shipped to CI in this session. All six were the same shape: **two config files disagreed**, and the disagreement was only surfaced by a 6-minute CI cascade.

| # | Config A | Config B | Symptom |
|---|----------|----------|---------|
| 1 | `playwright.config.ts` declares `iPhone SE 2020` (WebKit), `iPhone 12` (WebKit) | `ci.yml` runs `playwright install --with-deps chromium` | All WebKit jobs fail with "Executable doesn't exist" |
| 2 | `vite.config.ts` pins `server.port: 5000` | `synthetic-playtest.yml` runs `wait-on http://localhost:5173` | Workflow times out after 30s before dev server is even checked |
| 3 | `BootScene.ts` only mounts `boot-start-btn` when URL has `?testHooks=1` | 6 spec files do `page.goto('/')` | E2E tests time out at 15s on a button that auto-advanced past |
| 4 | `lighthouserc.cjs` requires `categories:performance ≥ 0.85` | App ships Phaser (351 KB gz, continuous 60fps loop → ~80s TBT) | Lighthouse CI fails on every push |
| 5 | `playwright.config.ts` `baseURL: 'http://localhost:5000?testHooks=1'` | URL spec drops query when resolving absolute paths via `page.goto('/')` | Misleading config — query never reaches the page |
| 6 | `mascot-reactions.spec.ts` line 127 `{ timeout: 3000 }` for `menu-scene` | Other call sites in same file use `8000` | Flake on slower CI runners |

Each loop cost ~6 minutes of CI wait + the tokens to read logs and patch. Total session waste: estimated 4–5 push cycles × 6 min = ~25 min of pure waiting. None of these required runtime to detect — every one was statically catchable by reading both files together.

## 2. Goal

A linter that can never be bypassed by inattention: it runs **in three independent places**, so even if I forget, even if I skip a hook, CI itself will refuse to waste time on a job whose config is incoherent.

Non-goals: replacing CI runs, replacing tests, replacing typecheck/lint. This is a fast (<5s) **cross-file consistency** layer that sits beneath the existing test pyramid.

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ scripts/check-ci-consistency.mjs    (single source of truth)    │
│  • parses YAML workflows + TS configs                           │
│  • emits structured violations { file, line, rule, message }    │
│  • exit 0/1                                                     │
└──┬─────────────────┬──────────────────┬─────────────────────────┘
   │                 │                  │
   ▼                 ▼                  ▼
┌──────────┐    ┌──────────┐      ┌──────────────────┐
│ Claude   │    │ git      │      │ GitHub Actions   │
│ PostTool │    │ pre-push │      │ consistency job  │
│ Use hook │    │ hook     │      │ (needs: gate)    │
└──────────┘    └──────────┘      └──────────────────┘
   inline         pre-network       pre-CI cascade
   feedback       block             fast-fail (<30s)
```

Three layers, descending defence-in-depth:

1. **PostToolUse hook** — fastest feedback, in my own loop. Runs after any `Edit`/`Write` to a config file. If violations exist, they appear in my next prompt as `<system-reminder>` text so I cannot continue without seeing them.
2. **`.husky/pre-push`** — last local guard. Blocks the network call. Cheap (~2s).
3. **`ci.yml` first job** — backstop if hook + pre-push were both skipped. 20s job that gates the 6-minute cascade.

## 4. Rules (initial set)

Each rule = one self-contained `assert` function. New rules can be added without touching others.

| ID | Rule | Detection |
|----|------|-----------|
| R1 | Playwright projects ⊆ CI-installed browsers | Parse `playwright.config.ts` `projects[].use.devices`, map to `chromium`/`webkit`/`firefox`, diff against `--with-deps <list>` in workflow YAML. |
| R2 | Vite `server.port` matches every `localhost:<n>` reference in workflow YAML and `playwright.config.ts` `webServer.port` | Read port from `vite.config.ts`, regex-grep `localhost:\d+` across `.github/workflows/*.yml` and playwright config. |
| R3 | Tests touching `boot-start-btn` must `page.goto` a path with `?testHooks=1` | AST-grep all `tests/**/*.spec.ts` for `boot-start-btn` references; for each, walk back to the nearest `page.goto` call; assert URL contains `testHooks=1`. |
| R4 | Test `data-testid` strings exist as `TestHooks.mountSentinel`/`mountInteractive` calls in `src/` | Collect testid set from `tests/**/*.spec.ts`, collect mount calls from `src/**/*.ts`, fail on testid in tests that's never mounted. |
| R5 | `lighthouserc.cjs` thresholds vs documented baseline | Track expected baseline in `lighthouserc.cjs` JSDoc comment; assert thresholds don't exceed baseline + 0.05 without an explicit override comment. (Catches regressions: someone bumps to 0.95, ships, fails.) |
| R6 | Playwright `baseURL` query strings warn | Query string in `baseURL` is a footgun (`page.goto('/')` drops it). Warn unless every `goto` is also a full URL. |
| R7 | Timeout consistency within a spec file | Same locator pattern (e.g. `[data-testid="menu-scene"]`) used with multiple `{ timeout: ... }` values in the same file → warn (likely flake). |

Rules R1–R4 = errors. R5–R7 = warnings (don't block, just surface).

## 5. Implementation Steps

1. **Linter core** — `scripts/check-ci-consistency.mjs`
   - Single ESM file, no new dependencies (use Node built-ins + tree-sitter via existing `@typescript-eslint/parser` already in devDeps for AST parsing of TS).
   - Rule registry: `rules: Array<{ id: string, severity: 'error' | 'warn', check: () => Violation[] }>`.
   - Output: TTY-friendly grouped by file, JSON for machine consumption (`--json`).

2. **`npm run check:ci`** script in `package.json` — direct invocation.

3. **`.husky/pre-push`** — installs `husky` if not already present; hook runs `npm run check:ci`. ~2s.

4. **`.github/workflows/ci.yml`** — new first job `consistency`, runs `npm ci && npm run check:ci`. All other jobs add `needs: consistency`.

5. **`.claude/settings.json`** — `PostToolUse` hook that pattern-matches paths `playwright.config.ts | vite.config.ts | lighthouserc.cjs | .github/workflows/**/*.yml | tests/**/*.spec.ts | src/scenes/utils/TestHooks.ts` and runs `npm run check:ci`. Output piped into the conversation as a system reminder.

6. **Self-test** — `tests/unit/scripts/checkCiConsistency.test.ts`. Each rule gets a fixture pair (consistent + drifted) under `tests/fixtures/ci-consistency/`. Rules can't ship without their own test.

7. **Bootstrap run** — once wired up, run on `main`. Today's known violations (R5 just got fixed; R6 we removed the query baseURL; the rest are clean) should produce zero output.

## 6. Acceptance criteria

- All 6 failure classes from this session would have been caught by `npm run check:ci` in <5s. Verified with a regression fixture per rule.
- `ci.yml`'s `consistency` job runs in <30s on `ubuntu-latest`.
- PostToolUse hook adds <2s latency per qualifying edit (uncached). Cached re-runs <500ms.
- Pre-push hook adds <3s on a clean tree.
- Adding a 7th rule = ~30 lines + 2 fixtures, no infrastructure changes.

## 7. Risks & rollback

- **False positives**: a rule incorrectly flags a legitimate config. Mitigation: every rule has both an error and a documented escape hatch (e.g. comment `// ci-lint:ignore=R3` on the offending line).
- **AST parser drift**: `@typescript-eslint/parser` major version change might break TS parsing. Mitigation: pin in `package.json`, snapshot-test the parsing layer.
- **Hook bypass**: `git push --no-verify`. Accepted — this is the user's escape hatch, and the CI `consistency` job is the backstop.
- **Rollback**: linter is purely additive. Disable by removing the `consistency` job from `ci.yml` and the `pre-push` hook; nothing else depends on it.

## 8. Out of scope (deferred)

- Running CI workflows end-to-end locally (requires `act` + Docker, separate decision).
- Lighthouse score regression tracking over time (requires LHCI server).
- Auto-fix mode — linter reports, doesn't patch. (Auto-fix risks silently rewriting workflows; not worth it.)

## 9. Effort estimate

| Step | Effort |
|------|--------|
| Linter core + R1–R4 rules | 25 min |
| R5–R7 rules | 10 min |
| Fixtures + self-test | 15 min |
| Husky pre-push + npm script | 5 min |
| `ci.yml` consistency job | 5 min |
| `.claude/settings.json` PostToolUse hook | 10 min |
| Documentation in CLAUDE.md | 5 min |
| **Total** | **~75 min** |

## 10. Open questions

1. **Hook scope**: should PostToolUse hook also run when `package.json` changes? (Catches dependency-version drift between `playwright` package version and `playwright install` browser channel.) → Lean yes, low cost.
2. **Severity of R7 (timeout consistency)**: warn-only initially, promote to error if it catches real flakes within 2 weeks.
3. **Should R3 (testHooks=1) be a stricter contract** — i.e., codify "any spec that touches a Phaser scene must use `?testHooks=1`"? Currently scoped narrowly to `boot-start-btn`. → Start narrow, widen if violations recur.
