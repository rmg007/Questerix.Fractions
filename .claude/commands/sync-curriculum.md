---
description: Rebuild and validate curriculum bundles after pipeline output changes
---

Run after any change under `pipeline/output/` to keep `public/curriculum/v1.json` and `src/curriculum/bundle.json` in sync.

```bash
npm run build:curriculum
npm run validate:curriculum
npm run test:unit -- --filter validators
```

Both curriculum files are written together by `build:curriculum` — never edit them by hand. If `validate:curriculum` fails, the pipeline output is the source of truth; fix the generator or the schema rather than patching the JSON.
