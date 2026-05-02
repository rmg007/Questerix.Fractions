---
description: Summarize this session's token cost — file reads vs tool output vs assistant prose
---

Estimate where this session's tokens went. **Do not call any tools that aren't strictly needed** — every tool call adds to the count you're trying to measure.

## Steps

1. **Self-introspection (preferred):** if you can recall the rough shape of this session, produce a four-line breakdown:
   - Files read (count + biggest 3 by line count)
   - Tool outputs returned (count + biggest 3 by char length)
   - Assistant prose written (rough word count)
   - Skill / subagent invocations (count + names)

2. **Live diagnostics (Phase 8):** if `$CLAUDE_CODE_DIAGNOSTICS_FILE` is set and the file exists, run a single `jq` pass to extract proxy metrics for *this* session (no token field exists in the env contract — see `.claude/learnings.md` 2026-05-01 entry):
   ```bash
   D="$CLAUDE_CODE_DIAGNOSTICS_FILE"
   [ -n "$D" ] && [ -f "$D" ] && jq -r '
     [
       "claudemd_bytes=" + (([.[] | select(.event=="user_context_completed") | .data.claudemd_length] | last | tostring)),
       "memory_bytes="   + (([.[] | select(.event=="memory_files_completed") | .data.total_content_length] | last | tostring)),
       "hooks_fired="    + (([.[] | select(.event=="hook_spawn_completed")] | length | tostring)),
       "diag_lines="     + (length | tostring)
     ] | join(" | ")
   ' --slurp "$D"
   ```

3. **Historical fallback:** read the most recent `pre-compact` line from `.claude/_session-log.md`. The schema (Phase 8): `tokens: <N|unknown>` (always `unknown` until Anthropic exposes a live count), plus `claudemd: <bytes>b | memory: <bytes>b | hooks-fired: <N> | diag-size: <bytes>b`.

4. Output:

```
## Token economy — this session

- File reads: <N> files, ~<M> lines total. Largest: <path> (<lines>).
- Tool outputs: <N> calls. Heaviest: <tool name> @ <approx-chars>.
- Assistant prose: ~<words> words across <turns> turns.
- Skill / subagent: <list, or "none">.
- Live diagnostics: claudemd=<bytes>b memory=<bytes>b hooks-fired=<N> diag-lines=<N>  (or "unavailable").

Most recent harness telemetry: <copy line from _session-log.md, or "no log yet">.
```

5. End with: "Run `/retro` if this session is closing." Do not auto-run anything.
