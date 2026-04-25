# Analysis Template -- Phase 2 Playtest

Per learning-hypotheses.md section 5: thresholds are frozen at validation-v1-prereg tag. Do not change success thresholds after data collection begins.

## 1. CSV Structure for Paper-Test Scores

Create one CSV file: validation-data/cycle-A/paper-scores.csv

Columns:
pseudonym,grade,item1_pre,item2_pre,item3_pre,item4_pre,item5_pre,item6_pre,item7_pre,item8_pre,pre_total,item1_post,item2_post,item3_post,item4_post,item5_post,item6_post,item7_post,item8_post,post_total,delta

- All item values: 1 (correct) or 0 (incorrect or NR).
- item7_pre / item7_post: enter the grade-appropriate value (number-line for G1+; K-substitute for K).
- delta = post_total - pre_total.

## 2. CSV Structure for Telemetry Summary

Create one CSV: validation-data/cycle-A/telemetry-summary.csv

Columns:
pseudonym,skillId,session1_accuracy,session2_accuracy,session3_accuracy,final_mastery_state,hints_s1_per_attempt,hints_s3_per_attempt,hint_reduction_ratio

Derived from per-student JSON exports.

## 3. Paired-Sample Comparison (H-01, H-02, H-03, H-05)

For each hypothesis, compute paired pre/post deltas:

  d_i = post_score_i - pre_score_i
  mean_d = mean(d_i)
  sd_d = std(d_i)
  n = number of students with both pre and post data

Paired t-test (n = 8-10):
  t = mean_d / (sd_d / sqrt(n))
  df = n - 1

Power note: With n = 8-10, this test is underpowered for small effects. A two-tailed paired t-test at alpha = 0.05 with n = 9 achieves ~50% power for a medium effect (d = 0.5). The goal is a go/no-go signal per learning-hypotheses.md section 4, not a publishable p-value. Focus on the pre-registered success threshold and falsification criterion.

### Hypothesis Decision Table

| H-ID | Pre mean | Post mean | Mean delta | Threshold met? | Falsified? | Result |
|------|----------|-----------|-----------|----------------|------------|--------|
| H-01 |          |           |           | >= +20 pp      | < +10 pp   |        |
| H-02 |          |           |           | >= +20 pp      | < +10 pp   |        |
| H-03 |          |           |           | >= +25 pp      | < +10 pp   |        |
| H-04 | telemetry|           |           | median retention >= 0.80 | < 0.65 | |
| H-05 |          |           |           | <= 1 regression > -10 pp | >= 3 regressions | |

## 4. Pre-Registration Tag Check

Before finalizing the analysis, confirm:

[ ] The validation-v1-prereg git tag exists on docs/40-validation/learning-hypotheses.md.
[ ] No success threshold or falsification criterion was modified after the tag date.
[ ] If any threshold was changed post-collection, document the reason here and apply the original threshold to this cycle's decision.

## 5. Qualitative Coding

### 5.1 Stuck Points

From observer notes, extract all F (frustration), P (long pause >15 s), and H (help-seeking) codes. Flag any pattern that appears in >= 3 of 8-10 students as a common stuck point.

| Stuck point description | Count (n students) | Example quote | Linked hypothesis |
|-------------------------|--------------------|---------------|------------------|
|                         |                    |               |                  |

### 5.2 UI Failures

Moments where >= 2 students showed confusion about an affordance:

| UI element | Description of confusion | Count |
|------------|--------------------------|-------|
|            |                          |       |

### 5.3 Surprises

| Description | Session # | Quote |
|-------------|-----------|-------|
|             |           |       |

## 6. Overall Decision

Per learning-hypotheses.md section 4:

[ ] Validated -- 4-5 P0 hypotheses supported, 0 falsified. Proceed to Phase 4.
[ ] Invalidated -- any P0 falsified. Stop. Identify failing hypothesis.
[ ] Inconclusive -- 3 supported, 0 falsified, 2 underpowered. Expand to Cycle C (16-20 students).
