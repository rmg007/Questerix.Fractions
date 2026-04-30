# Synthetic Playtest Harness

Runs 100 simulated K-2 kid sessions in headless Chromium to surface bugs and UX issues before any real child plays.
Implements the telemetry goals from `docs/40-validation/playtest-protocol.md §5`.

## Running

```bash
# Full run: 4 personas × 25 sessions = 100 total (~25 min)
npm run playtest:synthetic

# Quick run: 4 personas × 5 sessions = 20 total (~5 min, for fast feedback loops)
npm run playtest:synthetic:quick

# Custom
node scripts/run-synthetic-playtest.mjs --sessions-per-persona 10
```

Results are written to `tests/synthetic/results/<timestamp>.json`.

## The 4 Personas

| Persona             | L1 Accuracy | Response Time                       | Abandon Rate | Notes                                              |
| ------------------- | ----------- | ----------------------------------- | ------------ | -------------------------------------------------- |
| **Eager-K**         | 0.55        | 1500–3500 ms                        | 5%           | Fast tapper, declining accuracy L1→L9 (K norms)    |
| **Hesitant-K**      | 0.50        | 4000–17000 ms                       | 12%          | Anxious, long pauses, high hint use                |
| **Confident-G1**    | 0.40        | 2500–6000 ms                        | 4%           | Accuracy rises to 0.75 at L5 then falls (G1 norms) |
| **Distractible-G2** | 0.60        | bimodal: 500–1800ms OR 3000–12000ms | 15%          | Best baseline, but high variance and abandon rate  |

Accuracy profiles are loosely calibrated to NAEP 2022 K-2 fraction performance data and Common Core grade-band expectations.

## What the Harness Measures

- **Completion rate** — did the session finish 5 attempts without crashing or hanging?
- **Abandonment rate** — per-persona probability of bailing mid-session
- **Crash count** — uncaught JS errors or unhandled promise rejections
- **Feedback latency** — ms from user click to `feedback-overlay` visible (must be <800ms p90)
- **Per-archetype error rate** — proxy for content-quality issues by level
- **Session duration** — mean and p95

## Pass/Fail Criteria

| Criterion            | Threshold                  |
| -------------------- | -------------------------- |
| Completion rate      | ≥ 95%                      |
| Crashes              | 0                          |
| Feedback latency p90 | < 800ms (≥90% of attempts) |

## Interpreting a Regression

A CI run that was passing last week but now fails means something changed. Common patterns:

- **Sudden uptick in abandonment for one persona** — a specific level or question type became harder to interact with (e.g., a hit target shrank, a button moved). Check `perPersona[name].abandoned` rising.
- **Rising per-archetype error rate** — content data for a level changed in a way that makes the partition target harder to hit programmatically. May indicate a valid UX issue or a DOM selector drift.
- **Feedback latency failures** — something in the game loop became slow (new asset loads, BKT computation, Phaser render budget exceeded). Check `feedbackLatencyP95Ms`.
- **Crash count > 0** — look at `consoleErrors` in the result JSON for `[uncaught]` entries; these are real JS exceptions.

## CI Schedule

The harness runs weekly (Monday 06:00 UTC) via `.github/workflows/synthetic-playtest.yml` and on-demand via `workflow_dispatch`. Results are uploaded as a GitHub Actions artifact for 30 days.
