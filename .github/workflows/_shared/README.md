# Agent Dispatch — Shared Workflow

## Overview

`agent-dispatch.yml` is the single reusable entry point for all Claude Code agent invocations in this repository. Every workflow that needs to run an agent calls this one via `workflow_call`.

## Calling agent-dispatch from another workflow

Minimal example:

```yaml
jobs:
  run-agent:
    uses: ./.github/workflows/_shared/agent-dispatch.yml
    with:
      prompt_template: bug-fix
      context_json: '{"BUG_ID":"BUG-02","BUG_DESCRIPTION":"Validation never passes","TARGET_BRANCH":"fix/2026-05-01-bug-02"}'
      working_branch: fix/2026-05-01-bug-02
      pr_number: 42
      timeout_minutes: 30
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The caller receives two outputs:
- `outcome` — `success`, `partial`, `skipped`, or `failed`
- `summary` — first 500 characters of agent stdout

## Required repository variables

| Variable | Default | Purpose |
|---|---|---|
| `AGENT_AUTONOMY_ENABLED` | `false` | Master kill-switch. Set to `true` to allow agents to run. When `false`, all agent jobs skip with a notice and return `outcome=skipped`. |
| `AGENT_DAILY_TOKEN_BUDGET` | informational, not yet enforced | Records the intended daily token ceiling for audit purposes. No enforcement logic exists yet. |

Both variables are set under **Settings → Secrets and variables → Actions → Variables** in the repository.

## Prompt template format

Templates live in `.github/agent-prompts/` as Markdown files. The template name passed to `prompt_template` is the filename without the `.md` extension.

Placeholders use `${{VAR}}` syntax (double braces). At runtime the workflow reads `context_json`, parses it with `jq`, and replaces every `${{KEY}}` in the template with the corresponding value.

Example template snippet:

```markdown
Bug to fix: ${{BUG_ID}} — ${{BUG_DESCRIPTION}}
```

With `context_json`:

```json
{"BUG_ID": "BUG-01", "BUG_DESCRIPTION": "Wrong prompt on partition scene"}
```

Becomes:

```
Bug to fix: BUG-01 — Wrong prompt on partition scene
```

Substitution is literal string replacement. Keys not present in `context_json` are left as-is.

## Adding a new prompt template

1. Create `.github/agent-prompts/<name>.md`.
2. Write the prompt in plain Markdown. Use `${{VAR}}` for any values the caller should supply at dispatch time.
3. Document which keys `context_json` must contain in the template file itself (a brief comment at the top is sufficient).
4. Call the workflow with `prompt_template: <name>` and supply matching keys in `context_json`.

No code changes are needed to `agent-dispatch.yml` when adding templates.
