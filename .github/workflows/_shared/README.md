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

## Pre-flight Setup

One-time setup required before any agent workflows will fire.

### 1. Repository Secret
Settings → Secrets and variables → Actions → New repository secret:
- Name: `ANTHROPIC_API_KEY`
- Value: your Anthropic API key (sk-ant-...)

### 2. Repository Variables
Settings → Secrets and variables → Actions → Variables tab → New repository variable:

| Name | Value | Purpose |
|---|---|---|
| `AGENT_AUTONOMY_ENABLED` | `false` | Master kill switch. Set to `true` after 1 week of observation. |
| `AGENT_DAILY_TOKEN_BUDGET` | `5000000` | Informational cap. Not yet hard-enforced in workflows. |

### 3. GITHUB_TOKEN Permissions
Settings → Actions → General → Workflow permissions:
- Select: "Read and write permissions"
- Check: "Allow GitHub Actions to create and approve pull requests"

### 4. Labels (create if missing)
Settings → Labels → New label:

| Name | Color | Used by |
|---|---|---|
| `claude:implement` | `#7057ff` | issue-to-copilot.yml |
| `copilot-assigned` | `#7057ff` | issue-to-copilot.yml |
| `autonomy-report` | `#0075ca` | telemetry-weekly.yml |
| `curriculum` | `#e4e669` | curriculum-loop.yml |
| `needs-attention` | `#d93f0b` | curriculum-loop.yml |

### 5. Test Kill Switch
After setup, manually trigger `bug-burndown` workflow with `AGENT_AUTONOMY_ENABLED=false`:
- Should complete immediately with a "::notice::Agent autonomy is disabled" log line
- No branch should be created, no PR should be opened

### 6. Enable
Set `AGENT_AUTONOMY_ENABLED=true` to activate all agent workflows.

## Adding a new prompt template

1. Create `.github/agent-prompts/<name>.md`.
2. Write the prompt in plain Markdown. Use `${{VAR}}` for any values the caller should supply at dispatch time.
3. Document which keys `context_json` must contain in the template file itself (a brief comment at the top is sufficient).
4. Call the workflow with `prompt_template: <name>` and supply matching keys in `context_json`.

No code changes are needed to `agent-dispatch.yml` when adding templates.
