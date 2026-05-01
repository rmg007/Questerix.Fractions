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

2. **Fallback:** read `.claude/_session-log.md` and report the most recent `pre-compact` line — its `tokens:` field is the harness's own count.

3. Output:

```
## Token economy — this session

- File reads: <N> files, ~<M> lines total. Largest: <path> (<lines>).
- Tool outputs: <N> calls. Heaviest: <tool name> @ <approx-chars>.
- Assistant prose: ~<words> words across <turns> turns.
- Skill / subagent: <list, or "none">.

Most recent harness telemetry: <copy line from _session-log.md, or "no token field">.
```

4. End with: "Run `/retro` if this session is closing." Do not auto-run anything.
