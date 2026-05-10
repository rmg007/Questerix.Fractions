---
description: Re-open an auto-closed PR with a merged-with-main head and rephrased title.
---

# /recreate-pr <pr-number>

Recovers from the dependabot-auto-merge title-substring auto-close (see `.claude/learnings.md` 2026-05-01 github). Opens a fresh PR off the same head ref with the original body and a safe title.

## Steps

1. **Fetch the closed PR's metadata** via `gh`:
   ```bash
   gh pr view <N> --json title,body,headRefName,baseRefName,closedAt,author --jq '.'
   ```
   Capture `title`, `body`, `headRefName`, `baseRefName`, `closedAt`.

2. **Sanity check** that this is a same-cause auto-close:
   - PR was closed within 120 s of creation (compare `closedAt` to `createdAt` from `gh pr view <N> --json createdAt`)
   - `gh pr view <N> --comments --json comments` — look for a `github-actions[bot]` comment containing "pinned per C4"
   - PR title (lowercased) contains `phaser`, `dexie`, or `vite`
   If any fails, **stop and ask the user** — do not blindly recreate.

3. **Merge origin/main into the head ref locally**:
   ```bash
   git fetch origin
   git checkout <headRefName>
   git merge --no-edit origin/<baseRefName>
   git push origin <headRefName>
   ```
   If conflicts arise, surface them to the user and stop.

4. **Compute a safe title.** Replace each pinned-package substring (case-insensitive):
   - `dexie` → `IndexedDB` or `DB`
   - `phaser` → `scene engine` or `runtime`
   - `vite` → `build`
   Keep the conventional-commit prefix intact; only rewrite words inside the description.

5. **Open the new PR** via `gh`:
   ```bash
   gh pr create \
     --title "<safe_title>" \
     --head <headRefName> \
     --base <baseRefName> \
     --body "(re-open of #<N> — auto-closed by dependabot-auto-merge title-substring guard. Original title: <original_title>)

   <original_body>"
   ```

6. **Verify and report.** Run:
   ```bash
   gh pr view --json state,closedAt,number,url
   ```
   Confirm `state == "OPEN"` and `closedAt == null`. Print the new PR URL plus: `"Re-opened #<N> as #<M>. Apply Phase 5 root-cause patch to stop this recurring."`

## Refuse if

- Original PR was closed by a human (not `github-actions[bot]`).
- The closing comment doesn't mention C4 / pinned packages.
- Title doesn't contain any trigger substring — the cause is something else.
