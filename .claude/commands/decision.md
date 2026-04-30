---
description: Append a new architectural decision entry to docs/00-foundation/decision-log.md
argument-hint: <short title of the decision>
---

Record an architectural decision while the context is fresh. Format matches the existing D-01 through D-20 entries in `docs/00-foundation/decision-log.md`.

## Steps

1. Read the last few entries in `docs/00-foundation/decision-log.md` to:
   - Find the next `D-NN` number (increment the highest existing one)
   - Match the format exactly (heading level, fields used)

2. If `$ARGUMENTS` is empty, ask: "What's the decision? Describe context, the decision itself, and consequences in 2–4 sentences."

3. Draft the entry:
   ```markdown
   ## D-NN — <title>
   **Date:** <YYYY-MM-DD>
   **Status:** decided
   **Context:** <1–2 sentences: what problem prompted this>
   **Decision:** <1–2 sentences: what was decided and why>
   **Consequences:** <1–2 sentences: what this enables/forecloses>
   **Constraint refs:** <C-N if applicable>
   ```

4. Show the draft and ask for confirmation before appending.

5. On confirmation, append after the last existing entry (before any "— end —" marker). Do not rewrite the file.

6. Suggest adding a corresponding entry to `CHANGELOG.md` [Unreleased] if the decision affects user-visible behavior.
