---
description: Weekly token-cost rollup — group _session-log.md by day, print percentiles, flag outliers
---

Read `.claude/_session-log.md`, group entries by date, report token-usage patterns over 7 days. **Read-only.**

## Steps

1. `tail -200 .claude/_session-log.md` — last ~7 days of pre-compact lines.
2. Parse format: `[YYYY-MM-DD HH:MM] pre-compact | session: <id> | tokens: <N|unknown> | branch: <b> | ...`
3. For each day with ≥1 numeric `tokens:`: count, p50, p90, max, branches generating p90+.
4. **Outlier:** session whose tokens ≥ 1.5× the 7-day p90, OR ≥3 pre-compacts on the same branch in a day.
5. Output a markdown table:

```
## Weekly token rollup (YYYY-MM-DD → YYYY-MM-DD)

| Date | Sessions | p50 tokens | p90 tokens | Max | Outlier branch(es) |
| --- | --- | --- | --- | --- | --- |
```

6. End: "Outliers worth a `/retro` post-mortem: <list>." or "No outliers — token budget healthy."
