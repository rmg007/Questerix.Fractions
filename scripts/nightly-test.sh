#!/usr/bin/env bash
# Nightly test SWARM — runs at 10:00 PM via Claude Code Routines.
#
# Architecture:
#   Phase 1 (deterministic, parallel bash) — postdeploy, Playwright, bundle, curl, git log
#   Phase 2 (Claude orchestrator) — fans out 5 specialist subagents in parallel:
#       • a11y-auditor       — accessibility regressions
#       • bundle-watcher     — size budget per chunk
#       • c1-c10-auditor     — constraint drift in commits since last report
#       • curriculum-byte-parity — deployed v1.json ≡ src/curriculum/bundle.json
#       • engine-determinism-auditor — non-deterministic calls in src/engine/
#   Phase 3 (synthesizer agent) — collects all subagent outputs, deduplicates,
#       classifies severity, diffs vs previous report, writes the markdown
#   Phase 4 (committer) — git add + commit + push + toast
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

DATE=$(date +%Y-%m-%d)
REPORT_DIR="PLANS/nightly"
REPORT_FILE="$REPORT_DIR/$DATE.md"
LOG_DIR=".claude/logs"
LOG_FILE="$LOG_DIR/nightly-test-$DATE.log"
SCREENSHOT_DIR="test-results/nightly-screenshots"
AGENT_OUT_DIR="test-results/nightly-agents-$DATE"

mkdir -p "$REPORT_DIR" "$LOG_DIR" "$AGENT_OUT_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "════════════════════════════════════════════════════════════"
echo "  Questerix Nightly SWARM — $DATE $(date +%H:%M:%S)"
echo "════════════════════════════════════════════════════════════"

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 1 — Deterministic data collection (parallel bash)
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ Phase 1: Deterministic data collection (parallel) ━━━"

(
  echo "  [1a] Postdeploy health check..."
  node scripts/postdeploy-check.mjs > "$AGENT_OUT_DIR/postdeploy.txt" 2>&1 || true
) &
PID_POSTDEPLOY=$!

(
  echo "  [1b] HTTP / security headers + asset availability..."
  BASE="https://fractions.questerix.com"
  {
    echo "## Security headers"
    curl -sI "$BASE" 2>&1
    echo ""
    echo "## Asset availability"
    for asset in /sw.js /registerSW.js /manifest.json /curriculum/v1.json; do
      status=$(curl -sI "$BASE$asset" | grep -i "^HTTP" | awk '{print $2}' | tr -d '\r')
      echo "$asset → HTTP $status"
    done
    echo ""
    echo "## Curriculum metadata"
    curl -sf "$BASE/curriculum/v1.json" 2>/dev/null | node -e "
      let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
        try { const j=JSON.parse(d); console.log('templates:' + (j.templates?.length??'?') + ' version:' + (j.version??'?')); }
        catch(e) { console.log('parse-error'); }
      });" 2>/dev/null || echo "fetch-failed"
  } > "$AGENT_OUT_DIR/http.txt" 2>&1
) &
PID_HTTP=$!

(
  echo "  [1c] Bundle size measurement..."
  node scripts/measure-bundle.mjs > "$AGENT_OUT_DIR/bundle.txt" 2>&1 || true
) &
PID_BUNDLE=$!

(
  echo "  [1d] Playwright suite (browser-check + smoke + responsive + settings + first-run)..."
  NIGHTLY_URL=https://fractions.questerix.com \
    npx playwright test \
      --config=playwright.nightly.config.ts \
      --reporter=list \
      > "$AGENT_OUT_DIR/playwright.txt" 2>&1 || true
) &
PID_PLAYWRIGHT=$!

(
  echo "  [1e] Git log + working tree state..."
  PREV_REPORT=$(ls "$REPORT_DIR"/*.md 2>/dev/null | sort | grep -v "$DATE" | tail -1 || true)
  PREV_DATE="(none)"
  if [ -n "$PREV_REPORT" ] && [ -f "$PREV_REPORT" ]; then
    PREV_DATE=$(basename "$PREV_REPORT" .md)
  fi
  {
    echo "## Previous report"
    echo "$PREV_DATE"
    echo ""
    echo "## Commits since last report"
    if [ -n "$PREV_REPORT" ]; then
      git log --oneline --since="$PREV_DATE 22:00" 2>&1 | head -30 || true
    else
      git log --oneline -20 || true
    fi
    echo ""
    echo "## Working tree (git status --short)"
    git status --short 2>&1 || true
  } > "$AGENT_OUT_DIR/git.txt" 2>&1
) &
PID_GIT=$!

# Wait for all parallel jobs
wait $PID_POSTDEPLOY $PID_HTTP $PID_BUNDLE $PID_PLAYWRIGHT $PID_GIT
echo "  ✓ All Phase 1 jobs complete"

# Establish PREV_REPORT for the synthesizer
PREV_REPORT=$(ls "$REPORT_DIR"/*.md 2>/dev/null | sort | grep -v "$DATE" | tail -1 || true)
PREV_DATE="(none)"
PREV_CONTENT=""
if [ -n "$PREV_REPORT" ] && [ -f "$PREV_REPORT" ]; then
  PREV_CONTENT=$(cat "$PREV_REPORT")
  PREV_DATE=$(basename "$PREV_REPORT" .md)
fi

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 2 — Claude orchestrator fans out specialist subagents (parallel)
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ Phase 2: Specialist subagent swarm (parallel) ━━━"

claude --dangerously-skip-permissions -p "
You are the SWARM ORCHESTRATOR for tonight's nightly test ($DATE).

Your job: spawn 5 specialist subagents IN PARALLEL via the Agent tool, each writing
its findings to a JSON file in $AGENT_OUT_DIR/. Then return when all 5 complete.

## Critical rule: spawn ALL 5 in a SINGLE message with 5 Agent tool calls.
This runs them concurrently. Sequential calls waste time.

## Read these files first to give each subagent context
- $AGENT_OUT_DIR/postdeploy.txt
- $AGENT_OUT_DIR/playwright.txt
- $AGENT_OUT_DIR/bundle.txt
- $AGENT_OUT_DIR/http.txt
- $AGENT_OUT_DIR/git.txt

## Subagent 1: a11y-auditor
Use subagent_type=a11y-auditor
Prompt:
  Review src/scenes/interactions/, src/components/, and any scenes with interactive elements
  for WCAG 2.1 AA regressions since commit listed in $AGENT_OUT_DIR/git.txt.
  Focus on: ARIA labels on new elements, touch target sizes, reduced-motion gating, A11yLayer parity.
  Also analyze the Playwright a11y output in $AGENT_OUT_DIR/playwright.txt.
  Write findings as JSON to $AGENT_OUT_DIR/a11y.json with structure:
  { agent: 'a11y-auditor', findings: [{ id, severity: 'critical'|'warning'|'info', title, source, why }] }

## Subagent 2: bundle-watcher
Use subagent_type=bundle-watcher
Prompt:
  Read $AGENT_OUT_DIR/bundle.txt and analyze bundle size against the 1 MB gzipped budget.
  Flag: total >1 MB (critical), total 900 KB–1 MB (warning), any chunk >90% of its budget.
  Compare to previous report in $REPORT_DIR/$PREV_DATE.md if it exists.
  Write findings as JSON to $AGENT_OUT_DIR/bundle.json same structure as above.

## Subagent 3: c1-c10-auditor
Use subagent_type=c1-c10-auditor
Prompt:
  Audit the commits listed in $AGENT_OUT_DIR/git.txt (commits since last report) for
  C1–C10 constraint violations. Especially check: localStorage usage outside C5 exceptions,
  new dependencies (C4), backend/network calls (C1), responsive range (C7).
  Write findings as JSON to $AGENT_OUT_DIR/c1c10.json same structure as above.

## Subagent 4: curriculum-byte-parity
Use subagent_type=curriculum-byte-parity
Prompt:
  Confirm public/curriculum/v1.json sha256 ≡ src/curriculum/bundle.json sha256.
  Also check the deployed-vs-repo hash from $SCREENSHOT_DIR/curriculum-hash.json if present.
  Write findings as JSON to $AGENT_OUT_DIR/curriculum.json same structure as above.

## Subagent 5: engine-determinism-auditor
Use subagent_type=engine-determinism-auditor
Prompt:
  Audit src/engine/** for direct host-global calls (Math.random, Date.now, crypto.randomUUID).
  Cross-reference against the commit list in $AGENT_OUT_DIR/git.txt to flag NEW violations.
  Write findings as JSON to $AGENT_OUT_DIR/engine.json same structure as above.

After all 5 return, write a one-line summary to $AGENT_OUT_DIR/swarm-summary.txt:
  Subagents complete: a11y=N findings, bundle=N, c1c10=N, curriculum=N, engine=N
"

echo "  ✓ Phase 2 complete — subagent JSONs in $AGENT_OUT_DIR/"

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 3 — Synthesizer agent writes the report
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ Phase 3: Synthesizer agent ━━━"

claude --dangerously-skip-permissions -p "
You are the SYNTHESIZER for tonight's nightly report ($DATE). Previous: $PREV_DATE.

## Your inputs (read all of these)

### Phase 1 deterministic outputs:
- $AGENT_OUT_DIR/postdeploy.txt (postdeploy 18-point check)
- $AGENT_OUT_DIR/http.txt (security headers + asset availability)
- $AGENT_OUT_DIR/bundle.txt (bundle size measurement)
- $AGENT_OUT_DIR/playwright.txt (Playwright full output)
- $AGENT_OUT_DIR/git.txt (commits since last report + working tree)

### Phase 2 specialist subagent JSONs (read each, treat as authoritative):
- $AGENT_OUT_DIR/a11y.json
- $AGENT_OUT_DIR/bundle.json
- $AGENT_OUT_DIR/c1c10.json
- $AGENT_OUT_DIR/curriculum.json
- $AGENT_OUT_DIR/engine.json

### Browser-check JSONs from Playwright:
- $SCREENSHOT_DIR/console.log
- $SCREENSHOT_DIR/localstorage.json
- $SCREENSHOT_DIR/canvas-sizing.json
- $SCREENSHOT_DIR/curriculum-hash.json

### Previous report ($PREV_DATE) for diff:
$PREV_CONTENT

## Known baseline — never flag as new
- 4x 'Access to storage is not allowed from this context' at boot (SW context, tracked)
- 'Persistence granted: false' at boot (browser default)
- unlockedLevels:* and completedLevels:* in localStorage (known C5 deviation)
- Canvas 800x1280 portrait (correct)
- 0 native focusable DOM elements (A11y layer handles keyboard — correct)

## Severity classification rules
- Consistent Playwright failure (failed all retries) = 🔴 Critical
- Flaky Playwright failure (passed on retry)        = 🟡 Warning
- Bundle >1 MB gzipped                              = 🔴 Critical
- Bundle 900 KB–1 MB                                = 🟡 Warning
- Curriculum sha256 mismatch                        = 🔴 Critical
- Subagent reports severity='critical'              = 🔴 Critical
- Subagent reports severity='warning'               = 🟡 Warning

## Deduplication rule
If two subagents report the same finding (e.g., a11y AND c1-c10 both flag the same change),
merge them into ONE entry and cite both sources.

## Write the report to $REPORT_FILE in this exact format:

# Nightly Report — $DATE

## Summary
- 🔴 Critical: N
- 🟡 Warning: N
- 🟢 Info: N
- 🆕 New since $PREV_DATE: N

## 🔴 Critical Findings
**[C-N]** Description — *Source: which agent / file / line* — *Why critical: one line*

## 🟡 Warnings
**[W-N]** Description — *Source: which agent / file*

## 🟢 Info / Observations
**[I-N]** Description (always include: bundle size, boot time, curriculum hash result, commit count)

## 🆕 New Since $PREV_DATE
List finding IDs not present in previous report

## ♻️ Unchanged from $PREV_DATE
List finding IDs carried over

## Swarm Audit Summary
| Subagent | Findings |
|----------|----------|
| a11y-auditor | N findings (severity breakdown) |
| bundle-watcher | N findings |
| c1-c10-auditor | N findings |
| curriculum-byte-parity | N findings |
| engine-determinism-auditor | N findings |

## Commits Since Last Report
One line per commit from git.txt

## Screenshots Captured
List files saved under test-results/nightly-screenshots/

## Unstaged Source Changes at Test Time
Files with unstaged changes — may be related to findings above
"

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 4 — Committer
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ Phase 4: Commit + push + notify ━━━"

if [ -f "$REPORT_FILE" ]; then
  git add "$REPORT_FILE"
  git diff --cached --quiet || git commit -m "chore: nightly report $DATE"
  git push origin main || echo "⚠️  git push failed — commit is local"

  CRITICAL=$(grep -c "🔴" "$REPORT_FILE" 2>/dev/null || echo "0")
  if [ "$CRITICAL" -gt 0 ]; then
    powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; \$n = [System.Windows.Forms.NotifyIcon]::new(); \$n.Icon = [System.Drawing.SystemIcons]::Warning; \$n.Visible = \$true; \$n.ShowBalloonTip(15000, 'Questerix Nightly', '🔴 $CRITICAL critical issues — PLANS/nightly/$DATE.md', 1)" || true
  else
    powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; \$n = [System.Windows.Forms.NotifyIcon]::new(); \$n.Icon = [System.Drawing.SystemIcons]::Information; \$n.Visible = \$true; \$n.ShowBalloonTip(10000, 'Questerix Nightly', '✅ All checks passed — $DATE', 0)" || true
  fi
else
  echo "❌ Synthesizer failed to write $REPORT_FILE"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Done — $REPORT_FILE"
echo "════════════════════════════════════════════════════════════"
