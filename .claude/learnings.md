# Agent Learnings

Append-only log of non-obvious gotchas, patterns, and shortcuts that surface during work. Read this at session start; append to it whenever you discover something a future agent would benefit from knowing.

**Format:** one entry per gotcha. Newest at the top. Keep entries to 1–3 lines. Use `/learn <text>` to append from the command line.

```
YYYY-MM-DD <area>: <gotcha or shortcut> [#commit-or-branch]
```

**Bar for inclusion:** something that cost you debugging time, that contradicted apparent docs, or that an agent reading CLAUDE.md alone wouldn't have known. Skip the obvious.

**Bar for exclusion:** if the entry would belong in `CLAUDE.md` (architectural rule, command reference) — put it there instead. This file is for the long tail of small lessons.

---

## Entries (newest first)

<!-- Append new lines below this marker. /learn handles the date prefix. -->

2026-04-30 git: Branch names MUST include a date — format `<type>/YYYY-MM-DD-<slug>`. Branches without dates accumulate silently and become stale/conflicted. Full rules in `docs/00-foundation/git-workflow.md` and the Git workflow section of CLAUDE.md.

2026-04-30 setup: Curriculum lives in TWO files (`public/curriculum/v1.json` and `src/curriculum/bundle.json`). They MUST be byte-identical — only `npm run build:curriculum` writes them.
2026-04-30 mascot: Use `mascot.setState('idle')`, never `mascot.idle()` — ESLint blocks the latter because the DOM sentinel mirror won't update.
2026-04-30 c5: `unlockedLevels:<studentId>` and `completedLevels:<studentId>` localStorage keys are a **known C5 deviation** in `MenuScene` and `LevelMapScene`. Don't extend; the proper home is a Dexie `progressionStat` row.
2026-04-30 obs: OpenTelemetry + Sentry are bundled but env-gated (`VITE_OTLP_URL`, `dsn`). Default builds emit no network traffic, but the code still counts against the 1 MB gzip budget.
