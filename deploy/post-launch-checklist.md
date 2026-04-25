# Post-Launch Monitoring Checklist — Week 1

No analytics. No dashboards. Manual checks only.
Per `docs/40-validation/privacy-notice.md`: no data leaves the device, so
server-side usage metrics do not exist and should not be sought.

---

## Daily (Days 1–7)

- [ ] Check GitHub Issues for new bug reports.
  - URL: `https://github.com/ryanmidogonzalez/questerix-fractions/issues`
  - Triage label: `bug` or `feedback`.
  - P1 bugs (app crashes, data loss) — fix within 24 h and redeploy.
  - P2 bugs (wrong answer accepted, hint not showing) — fix within 72 h.
  - P3 polish — batch into next release.

---

## Weekly

### Lighthouse Audit on Production URL

```bash
npx lighthouse https://your-domain.com \
  --output=html --output-path=./lighthouse-report.html \
  --chrome-flags="--headless"
```

Thresholds (per `docs/30-architecture/performance-budget.md`):

| Metric | Gate |
|--------|------|
| Performance score | ≥ 85 (CI); target ≥ 90 |
| Accessibility score | 100 |
| LCP | ≤ 2.5 s |
| Total transfer weight | ≤ 1,024 KB gzipped |

If any threshold fails, open a GitHub Issue tagged `performance` before the next deploy.

### Bundle Size Check

```bash
npm run build
# Then sum all JS chunks gzipped:
find dist -name '*.js' -exec gzip -c {} \; | wc -c
```

Expected: under 1,048,576 bytes (1.0 MB). Per `docs/30-architecture/performance-budget.md §1`.
If over budget, identify the offending chunk with `npx vite-bundle-visualizer` and open
a tracking issue before any further feature work.

---

## Manual (Ongoing)

- Ask 1–2 partner classrooms for free-text feedback using the Google Form linked from
  the About screen (see `deploy/feedback-form.md`). This is not a formal survey — a
  single casual question is enough: "Did the kids use it? What happened?"
- If a classroom reports a consistent confusion pattern, open a GitHub Issue tagged
  `ux` with a note about the grade band and the observed behavior.

---

## What This Checklist Does Not Include

- Server logs (no server).
- Page view counts (no analytics — per `privacy-notice.md`).
- Crash reporting services (no Sentry, no Datadog).
- A/B testing.

If you want to know whether the app is being used, ask the teachers directly.
