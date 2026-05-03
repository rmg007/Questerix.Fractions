---
name: "source-command-recreate-pr"
description: "Re-open an auto-closed PR with a merged-with-main head and rephrased title."
---

# source-command-recreate-pr

Use this skill when the user asks to run the migrated source command `recreate-pr`.

## Command Template

# /recreate-pr <pr-number>

Recovers from the dependabot-auto-merge title-substring auto-close (see `.Codex/learnings.md` 2026-05-01 github). Opens a fresh PR off the same head ref with the original body and a safe title.

## Steps

1. **Fetch the closed PR's metadata** via the GitHub MCP:
   ```
   mcp__github__pull_request_read pullNumber=<N> owner=<owner> repo=<repo>
   ```
   Capture `title`, `body`, `head.ref`, `base.ref`, `closed_by.login`, `created_at`, `closed_at`.

2. **Sanity check** that this is a same-cause auto-close:
   - `closed_at - created_at < 120 s`
   - `closed_by.login == "github-actions[bot]"` OR a comment from `github-actions[bot]` containing "pinned per C4"
   - PR title (lowercased) contains `phaser`, `dexie`, or `vite`
   If any fails, **stop and ask the user** — do not blindly recreate.

3. **Merge origin/main into the head ref locally**:
   ```bash
   git fetch origin
   git checkout <head.ref>
   git merge --no-edit origin/<base.ref>
   git push origin <head.ref>
   ```
   If conflicts arise, surface them to the user and stop.

4. **Compute a safe title.** Replace each pinned-package substring (case-insensitive):
   - `dexie` → `IndexedDB` or `DB`
   - `phaser` → `scene engine` or `runtime`
   - `vite` → `build`
   Keep the conventional-commit prefix intact; only rewrite words inside the description.

5. **Open the new PR** via:
   ```
   mcp__github__create_pull_request \
     title="<safe_title>" \
     head=<head.ref> \
     base=<base.ref> \
     body="(re-open of #<N> — auto-closed by dependabot-auto-merge title-substring guard. Original title: <original_title>)\n\n<original_body>"
   ```

6. **Verify and report.** Wait 60 s, then `mcp__github__pull_request_read` the new PR and confirm `state == "open"` and `closed_at == null`. Print the new PR URL plus a one-line note: `"Re-opened #<N> as #<M>. Apply Phase 5 root-cause patch to stop this recurring."`

## Refuse if

- Original PR was closed by a human (not `github-actions[bot]`).
- The closing comment doesn't mention C4 / pinned packages.
- Title doesn't contain any trigger substring — the cause is something else.
