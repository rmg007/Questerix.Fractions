# pr-comment-update

Composite action for idempotent PR comment management. Every agent-dispatching
workflow uses this to post or update its findings on a PR without creating
duplicate comment spam.

## How it works

Each call embeds a hidden HTML marker in the comment body:

```
<!-- agent-comment: <comment-tag> -->
```

On subsequent runs the action searches the PR's comment list for that marker and
**updates** the existing comment in-place instead of creating a new one.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `comment-tag` | yes | — | Unique slot key, e.g. `c1-c10-audit`, `bundle-watch` |
| `content` | yes | — | Markdown body (the hidden marker is prepended automatically) |
| `pr-number` | yes | — | PR number to comment on |
| `github-token` | yes | — | Token with `pull-requests: write` |
| `mode` | no | `upsert` | `upsert` — create or update; `delete` — remove existing comment |

## Usage example

```yaml
- uses: ./.github/actions/pr-comment-update
  with:
    comment-tag: my-audit
    content: |
      ## My Audit Results
      All clear.
    pr-number: ${{ github.event.pull_request.number }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Delete mode example

```yaml
- uses: ./.github/actions/pr-comment-update
  with:
    comment-tag: my-audit
    content: ''          # ignored in delete mode
    pr-number: ${{ github.event.pull_request.number }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    mode: delete
```

## Notes

- The action paginates up to 100 comments when searching. For PRs with very
  many comments, place agent comments early so they appear in the first page.
- The `comment-tag` value must be unique per workflow — reusing the same tag
  across two workflows will cause them to overwrite each other's comment.
- Requires `pull-requests: write` (and `issues: write`) on the token because
  GitHub's comments API is under the Issues namespace.
