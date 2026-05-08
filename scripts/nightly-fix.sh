#!/usr/bin/env bash
# Nightly fix SWARM — runs at 11:30 PM via Claude Code Routines.
#
# Architecture (4 rounds, follows CLAUDE.md swarm guidance):
#
#   Round 1 — TRIAGER (single agent, read-only)
#     Reads tonight's report, classifies each finding as AUTO-FIX or HUMAN-REVIEW,
#     partitions AUTO-FIX items into "fix groups" with ZERO file overlap between groups.
#     Output: $AGENT_OUT_DIR/triage.json
#
#   Round 2 — PARALLEL FIXERS (one agent per fix group)
#     Each fixer owns exactly one set of files. Spawned in a single message
#     for true parallel execution. Each runs typecheck + lint on its own diff,
#     reverts if either fails, commits if both pass.
#     Forbidden file lists are passed explicitly per agent.
#
#   Round 3 — VERIFIER (single agent, sequential)
#     Pulls all fixer commits onto $BRANCH, runs full unit suite + nightly
#     Playwright on chromium-desktop. Records results.
#
#   Round 4 — PR CREATOR (single agent)
#     Opens PR with structured body, writes PR record, sends toast.
#
# Recursion guard: spawned subagents NEVER auto-invoke other agents. Only the
# orchestrator at each round-boundary does.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

DATE=$(date +%Y-%m-%d)
REPORT_FILE="PLANS/nightly/$DATE.md"
BRANCH="fix/$(date +%Y-%m-%d)-nightly"
LOG_DIR=".claude/logs"
LOG_FILE="$LOG_DIR/nightly-fix-$DATE.log"
PR_RECORD="PLANS/nightly/$DATE-fix-pr.md"
AGENT_OUT_DIR="test-results/nightly-fix-$DATE"

mkdir -p "$LOG_DIR" "$AGENT_OUT_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "════════════════════════════════════════════════════════════"
echo "  Questerix Nightly Fix SWARM — $DATE $(date +%H:%M:%S)"
echo "════════════════════════════════════════════════════════════"

# ── Guard: report must exist ──────────────────────────────────────────────────
if [ ! -f "$REPORT_FILE" ]; then
  echo "❌ No nightly report at $REPORT_FILE — run nightly-test.sh first."
  exit 1
fi

# ── Guard: skip if nothing to fix ────────────────────────────────────────────
CRITICAL_COUNT=$(grep -c "🔴" "$REPORT_FILE" 2>/dev/null || echo "0")
WARNING_COUNT=$(grep -c "🟡" "$REPORT_FILE" 2>/dev/null || echo "0")
TOTAL_FIXABLE=$((CRITICAL_COUNT + WARNING_COUNT))

if [ "$TOTAL_FIXABLE" -eq 0 ]; then
  echo "✅ No critical or warning findings — nothing to fix."
  powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; \$n = [System.Windows.Forms.NotifyIcon]::new(); \$n.Icon = [System.Drawing.SystemIcons]::Information; \$n.Visible = \$true; \$n.ShowBalloonTip(10000, 'Questerix Fix Agent', '✅ Nothing to fix tonight', 0)" || true
  exit 0
fi

echo "Found $CRITICAL_COUNT critical + $WARNING_COUNT warnings."

# ── Stash + branch setup ─────────────────────────────────────────────────────
STASH_MSG="nightly-fix-$DATE-pre-branch-stash"
STASHED=false
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠️  Working tree dirty — stashing..."
  git stash push -m "$STASH_MSG"
  STASHED=true
fi

git checkout main
git pull origin main

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "Branch $BRANCH exists — checking out and rebasing onto main..."
  git checkout "$BRANCH"
  git rebase main || { echo "❌ Rebase conflict — aborting"; git rebase --abort; exit 1; }
else
  git checkout -b "$BRANCH"
fi
echo "Branch: $BRANCH"

REPORT_CONTENT=$(cat "$REPORT_FILE")

# ═══════════════════════════════════════════════════════════════════════════════
# ROUND 1 — TRIAGER
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ Round 1: Triager (classify + partition findings) ━━━"

claude --dangerously-skip-permissions -p "
You are the TRIAGER for tonight's nightly fix ($DATE).

## Input
Report content:
$REPORT_CONTENT

## Your task
For each 🔴 Critical and 🟡 Warning finding, classify it:

### AUTO-FIX (safe to fix autonomously)
- Coordinate / layout number causing overlap (e.g., status text y=1095 bleeding into button at y=1105)
- Missing or wrong wait/timeout in a Playwright test
- Obvious typo or wrong constant in src/
- Missing .gitignore entry for noise files
- Stale test data, removed testid, simple selector update

### HUMAN-REVIEW (do NOT touch)
- WebKit/iOS Safari IndexedDB or SW timing failures (deep investigation required)
- Anything requiring UX/design judgment
- Security headers (set in Cloudflare/wrangler, not src/)
- Known baseline issues
- Anything where the root cause is unclear after reading the source

## After classifying, partition AUTO-FIX items by file
Group findings such that NO TWO GROUPS touch the same file. This enables parallel fixing.

Read the source files first to determine which files each finding actually touches.
DO NOT GUESS — open the file and verify.

## Output JSON to $AGENT_OUT_DIR/triage.json with this structure:

{
  \"date\": \"$DATE\",
  \"branch\": \"$BRANCH\",
  \"total_findings\": N,
  \"auto_fix_count\": N,
  \"human_review_count\": N,
  \"groups\": [
    {
      \"group_id\": \"G1\",
      \"findings\": [\"C-1\", \"W-2\"],
      \"files_owned\": [\"src/scenes/SettingsScene.ts\"],
      \"forbidden_files\": [\"<all files in other groups>\"],
      \"description\": \"Status text overlap fix — move y=1095 to y=1060\",
      \"fix_strategy\": \"Read SettingsScene.ts, find statusText.y assignment, change to 1060\"
    }
  ],
  \"human_review\": [
    {
      \"finding_id\": \"C-1\",
      \"reason\": \"WebKit IndexedDB timing — needs deep investigation, not band-aid timeout\"
    }
  ]
}

## Forbidden across the board (never propose touching these)
- pipeline/, public/curriculum/, src/curriculum/bundle.json
- .github/, wrangler.toml, package.json, package-lock.json
- Any committed file under PLANS/_archive/
"

if [ ! -f "$AGENT_OUT_DIR/triage.json" ]; then
  echo "❌ Triager did not produce $AGENT_OUT_DIR/triage.json"
  exit 1
fi

GROUP_COUNT=$(node -e "const t=require('./$AGENT_OUT_DIR/triage.json'); console.log((t.groups||[]).length)" 2>/dev/null || echo "0")
AUTO_FIX_COUNT=$(node -e "const t=require('./$AGENT_OUT_DIR/triage.json'); console.log(t.auto_fix_count||0)" 2>/dev/null || echo "0")
HUMAN_REVIEW_COUNT=$(node -e "const t=require('./$AGENT_OUT_DIR/triage.json'); console.log(t.human_review_count||0)" 2>/dev/null || echo "0")

echo "  Triage: $AUTO_FIX_COUNT auto-fix, $HUMAN_REVIEW_COUNT human-review, partitioned into $GROUP_COUNT groups"

# ── Short-circuit: nothing safe to auto-fix ──────────────────────────────────
if [ "$GROUP_COUNT" -eq 0 ]; then
  echo "All findings need human review — no auto-fixes possible."
  cat > "$PR_RECORD" <<EOF
# Fix PR — $DATE
Result: NO PR CREATED — all $TOTAL_FIXABLE findings require human review.
Triage: $AGENT_OUT_DIR/triage.json
EOF
  if [ "$STASHED" = true ]; then git stash pop || true; fi
  powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; \$n = [System.Windows.Forms.NotifyIcon]::new(); \$n.Icon = [System.Drawing.SystemIcons]::Warning; \$n.Visible = \$true; \$n.ShowBalloonTip(15000, 'Questerix Fix Agent', 'All findings need human review — no PR', 1)" || true
  exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════════
# ROUND 2 — PARALLEL FIXERS (one agent per group, fanned out in single message)
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ Round 2: Parallel fixers (one per file group) ━━━"

claude --dangerously-skip-permissions -p "
You are the FIXER ORCHESTRATOR for tonight ($DATE).

## Read $AGENT_OUT_DIR/triage.json — it contains \$GROUP_COUNT fix groups, each
owning a disjoint set of files.

## Critical execution rule
Spawn ALL fix groups IN PARALLEL via the Agent tool, in a SINGLE message.
Each Agent call uses subagent_type=general-purpose with a prompt containing:
  - This group's description and fix_strategy
  - This group's files_owned (allowed)
  - This group's forbidden_files (must not touch)
  - The full report content (for context only):
$REPORT_CONTENT

## Per-fixer-agent prompt template
Each spawned agent receives:

  You are a fix agent for finding group <group_id>. Branch: $BRANCH.

  ## Allowed files (you may read and edit only these)
  <files_owned>

  ## FORBIDDEN files — DO NOT touch any of these even if relevant
  <forbidden_files>

  ## Findings to fix in this group
  <findings + descriptions from the report>

  ## Strategy
  <fix_strategy from triage.json>

  ## Steps
  1. Read each allowed file to understand context
  2. Make the minimal change(s) — do not refactor
  3. Run: npm run typecheck (only check that your edits do not break it)
  4. Run: npm run lint
  5. If either fails: git checkout -- <allowed files>, return JSON:
       { group_id, status: 'reverted', reason: 'typecheck/lint failure', error: '<message>' }
  6. If both pass:
       git add <allowed files>
       git commit -m 'fix(<scope>): <description> [nightly-$DATE group <group_id>]'
       Return JSON: { group_id, status: 'committed', commit_sha: '<sha>', files: [...], finding_ids: [...] }

  Save the JSON to $AGENT_OUT_DIR/<group_id>.json before returning.

## After all fixer agents return
Read each $AGENT_OUT_DIR/G*.json and write a roll-up to $AGENT_OUT_DIR/round2-results.json:
  { committed_groups: [...], reverted_groups: [...], total_commits: N }
"

# Collect Round 2 results
COMMITS_BEFORE_VERIFY=$(git rev-list --count HEAD ^main 2>/dev/null || echo "0")
echo "  ✓ Round 2 complete — $COMMITS_BEFORE_VERIFY commits on branch"

# ═══════════════════════════════════════════════════════════════════════════════
# ROUND 3 — VERIFIER (sequential, runs full test suite)
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ Round 3: Verifier (test:unit + nightly Playwright) ━━━"

# Run tests directly in bash — no LLM needed for deterministic verification
TEST_UNIT_OK=false
TEST_E2E_OK=false

echo "  Running typecheck + lint + test:unit..."
if npm run typecheck > "$AGENT_OUT_DIR/verify-typecheck.txt" 2>&1 \
   && npm run lint > "$AGENT_OUT_DIR/verify-lint.txt" 2>&1 \
   && npm run test:unit > "$AGENT_OUT_DIR/verify-unit.txt" 2>&1; then
  TEST_UNIT_OK=true
  echo "    ✓ unit suite passed"
else
  echo "    ❌ unit suite failed — see $AGENT_OUT_DIR/verify-*.txt"
fi

echo "  Running nightly Playwright (chromium-desktop only)..."
if NIGHTLY_URL=https://fractions.questerix.com \
   npx playwright test --config=playwright.nightly.config.ts \
     --reporter=list --project=chromium-desktop \
     > "$AGENT_OUT_DIR/verify-e2e.txt" 2>&1; then
  TEST_E2E_OK=true
  echo "    ✓ chromium-desktop e2e passed"
else
  echo "    ⚠️  some e2e tests still failing (this may be expected — see body of PR)"
fi

cat > "$AGENT_OUT_DIR/verify-results.json" <<EOF
{
  "unit_suite": $TEST_UNIT_OK,
  "e2e_chromium": $TEST_E2E_OK,
  "commits_on_branch": $COMMITS_BEFORE_VERIFY
}
EOF

# If unit suite failed, revert any commits that might have caused it
if [ "$TEST_UNIT_OK" = false ]; then
  echo "  ⚠️  Unit suite failed after fixes — DO NOT push."
  cat > "$PR_RECORD" <<EOF
# Fix PR — $DATE
Result: NO PR CREATED — unit suite regressed after fixes.
Branch: $BRANCH (kept locally for inspection)
Verify outputs: $AGENT_OUT_DIR/verify-*.txt
Triage: $AGENT_OUT_DIR/triage.json
EOF
  if [ "$STASHED" = true ]; then git stash pop || true; fi
  powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; \$n = [System.Windows.Forms.NotifyIcon]::new(); \$n.Icon = [System.Drawing.SystemIcons]::Error; \$n.Visible = \$true; \$n.ShowBalloonTip(15000, 'Questerix Fix Agent', 'Unit suite regressed — no PR. Branch kept for inspection.', 2)" || true
  exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# ROUND 4 — PR CREATOR
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ Round 4: PR creator ━━━"

if [ "$COMMITS_BEFORE_VERIFY" -eq 0 ]; then
  echo "  No commits on branch — all groups reverted. Skipping PR."
  cat > "$PR_RECORD" <<EOF
# Fix PR — $DATE
Result: NO PR CREATED — all fixer groups reverted (typecheck/lint failures).
Triage: $AGENT_OUT_DIR/triage.json
Round 2 results: $AGENT_OUT_DIR/round2-results.json
EOF
  if [ "$STASHED" = true ]; then git stash pop || true; fi
  exit 0
fi

git push -u origin "$BRANCH"

# ── Build PR body from agent outputs ─────────────────────────────────────────
FIXES_TABLE=$(node -e "
const fs = require('fs');
const t = require('./$AGENT_OUT_DIR/triage.json');
const rows = (t.groups || []).map(g => {
  const gFile = './$AGENT_OUT_DIR/' + g.group_id + '.json';
  let status = 'pending';
  try { status = require(gFile).status || 'pending'; } catch(e) {}
  const files = (g.files_owned || []).map(f => f.split('/').pop()).join(', ');
  return '| ' + g.group_id + ' | ' + (g.findings||[]).join(', ') + ' | ' + files + ' | ' + g.description + ' | ' + status + ' |';
}).join('\n');
console.log('| Group | Finding(s) | File(s) | Change | Status |\n|-------|-----------|---------|--------|--------|\n' + (rows || '| — | — | — | all groups reverted | reverted |'));
" 2>/dev/null || echo "| — | — | — | see triage.json | — |")

HUMAN_TABLE=$(node -e "
const t = require('./$AGENT_OUT_DIR/triage.json');
const rows = (t.human_review || []).map(h => '| [' + h.finding_id + '] | ' + h.reason + ' |').join('\n');
console.log('| Finding | Reason |\n|---------|--------|\n' + (rows || '| — | none |'));
" 2>/dev/null || echo "| — | — |")

VERIFY_E2E=$(tail -5 "$AGENT_OUT_DIR/verify-e2e.txt" 2>/dev/null || echo "not run")
COMMITS_LOG=$(git log "main..$BRANCH" --oneline 2>/dev/null || echo "(none)")

PR_BODY="## Fixes Applied
$FIXES_TABLE

## Needs Human Review
$HUMAN_TABLE

## Verification
- Unit suite: PASS (typecheck + lint + test:unit)
- E2E chromium-desktop: $VERIFY_E2E
- webkit-mobile / mobile-portrait: NOT RUN (chromium-only)

## Commits
$COMMITS_LOG

🤖 Nightly fix swarm — $DATE"

PR_URL=$(gh pr create \
  --title "fix: nightly findings $DATE" \
  --body "$PR_BODY" \
  --base main \
  --head "$BRANCH" 2>&1)

echo "  PR: $PR_URL"

# ── Queue auto-merge (fires when CI test check passes) ───────────────────────
if echo "$PR_URL" | grep -q "github.com"; then
  gh pr merge "$PR_URL" --auto --squash 2>&1 && echo "  ✓ Auto-merge queued — will merge when CI passes" || echo "  ⚠️  Auto-merge queue failed — merge manually"
fi

# ── Write PR record ───────────────────────────────────────────────────────────
AUTO_COUNT=$(node -e "const t=require('./$AGENT_OUT_DIR/triage.json'); console.log(t.auto_fix_count||0)" 2>/dev/null || echo "?")
HUMAN_COUNT=$(node -e "const t=require('./$AGENT_OUT_DIR/triage.json'); console.log(t.human_review_count||0)" 2>/dev/null || echo "?")
cat > "$PR_RECORD" <<EOF
# Fix PR — $DATE
PR: $PR_URL
Auto-fixed groups: $AUTO_COUNT
Needs human review: $HUMAN_COUNT
Auto-merge: queued (merges when CI test passes)
EOF

# ── Toast ─────────────────────────────────────────────────────────────────────
powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; \$n = [System.Windows.Forms.NotifyIcon]::new(); \$n.Icon = [System.Drawing.SystemIcons]::Information; \$n.Visible = \$true; \$n.ShowBalloonTip(15000, 'Questerix Fix Swarm', 'PR auto-merging when CI passes — $DATE', 0)" || true

# ── Restore stash ────────────────────────────────────────────────────────────
if [ "$STASHED" = true ]; then
  echo ""
  echo "Restoring stash ($STASH_MSG)..."
  git stash pop || echo "⚠️  Stash pop had conflicts — resolve manually with: git stash show -p"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Done — check $PR_RECORD"
echo "════════════════════════════════════════════════════════════"
