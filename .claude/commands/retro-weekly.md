---
description: Weekly token-cost rollup — group _session-log.md by day, print percentiles, flag outliers
---

Read `.claude/_session-log.md`, group entries by date, report token-usage patterns over 7 days. **Read-only.**

## Steps

1. `tail -200 .claude/_session-log.md` — last ~7 days of pre-compact lines.
2. Parse the Phase 8 format:
   ```
   [YYYY-MM-DD HH:MM] pre-compact | session: <id> | tokens: <N|unknown> | version: <v> | claudemd: <N>b | memory: <N>b | hooks-fired: <N> | diag-size: <N>b | branch: <b> | dirty: <N> files | last-commit: <sha>
   ```
3. **Token field is currently always `unknown`** — Anthropic's hook env contract does not expose a per-session token count (verified Phase 8, 2026-05-02). Use `diag-size` as the activity proxy: it grows monotonically with session length and tool-call density.
4. For each day with ≥1 numeric `diag-size`: count, p50, p90, max, branches generating p90+.
5. **Outlier:** session whose `diag-size` ≥ 1.5× the 7-day p90, OR ≥3 pre-compacts on the same branch in a day.
6. Output a markdown table:

   ```
   ## Weekly activity rollup (YYYY-MM-DD → YYYY-MM-DD)

   | Date | Sessions | p50 diag-size | p90 diag-size | Max | Outlier branch(es) |
   | --- | --- | --- | --- | --- | --- |
   ```

7. End: "Outliers worth a `/retro` post-mortem: <list>." or "No outliers — activity budget healthy."
8. If every line shows `diag-size: unknown`, surface that as a config issue: `jq` may be missing or the diagnostics file path was unset when the hook fired.
