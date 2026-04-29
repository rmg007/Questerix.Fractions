## Summary

<!-- What does this PR do? One or two sentences. -->

## Constraint References

<!-- Which of C1–C10 does this PR touch or verify compliance with?
     List the relevant constraints and confirm they are still satisfied.
     Constraints are defined in docs/00-foundation/constraints.md. -->

| Constraint                     | Status                  |
| ------------------------------ | ----------------------- |
| C1 — no backend                | not affected / verified |
| C2 — no teacher/parent surface | not affected / verified |
| C3 — fractions only            | not affected / verified |

## Test Plan

<!-- How did you test this? Check all that apply. -->

- [ ] `npm run typecheck` passes
- [ ] `npm run test:unit` passes
- [ ] `npm run test:e2e` passes (Playwright, Chromium)
- [ ] `npm run build` succeeds
- [ ] Bundle size guard passes (gzipped JS ≤ 1.0 MB)
- [ ] Manual smoke test on mobile (iOS Safari or Android Chrome)

## Bundle Size Delta

<!-- Run `npm run build` before and after your change.
     Paste the gzipped JS total from each. -->

|        | Gzipped JS (bytes) |
| ------ | ------------------ |
| Before |                    |
| After  |                    |
| Delta  |                    |

If the delta is > 10% of any single budget slice, add a written justification here.
Per `docs/30-architecture/performance-budget.md §5`.
