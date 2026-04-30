# AGENTS.md

This file exists for tools that read `AGENTS.md` (Codex, Aider, Cursor, etc.).

**The full agent guide is [`CLAUDE.md`](./CLAUDE.md)** — commands, architecture map, hard rules, constraints table, active bugs, key doc pointers, and the continuous self-improvement system.

Quick orientation:

```bash
npm run dev:app              # http://localhost:5000
npm run typecheck            # must be clean
npm run test:unit            # Vitest
npm run test:e2e             # Playwright (Chromium)
npm run build                # tsc + vite (prebuild syncs curriculum)
npm run build:curriculum     # sync public/curriculum/v1.json + src/curriculum/bundle.json
```

Constraints: no backend, no React/Redux, no new frameworks, no data egress (C1–C10 in `docs/00-foundation/constraints.md`).

Slash commands: `/preflight` `/sync-curriculum` `/diag` `/learn` `/retro` `/sprint-status` `/c5-check` `/test-changed` `/decision`

Subagents (delegate via Agent tool): `c1-c10-auditor` `bundle-watcher` `validator-parity-checker` `a11y-auditor`
