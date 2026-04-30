---
description: Run the full pre-merge gate (typecheck, lint, unit, integration, build, bundle guard)
---

Run the same checks CI runs, in order, stopping on the first failure. Report a one-line PASS/FAIL per stage.

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run build
npm run measure-bundle
```

If any stage fails, do not run the next one. Show the failing output and propose a fix without editing files.
