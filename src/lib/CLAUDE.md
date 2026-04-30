# lib/ — Shared Utilities

Framework-independent helpers. No Phaser. No IndexedDB. Importable from anywhere.

## Files

| File / Dir | Purpose |
|-----------|---------|
| `i18n/` | String catalog (`catalog.ts`) and format helpers (`format.ts`). All user-visible strings go here — no bare string literals in scene code. |
| `observability/` | OpenTelemetry + Sentry wrappers. **Env-gated: only active when `VITE_OTLP_URL` (OTel) or `dsn` (Sentry) is set.** Default MVP builds: no egress. Still costs bundle space. |
| `preferences.ts` | User preferences (high-contrast, reduced-motion). Backed by IndexedDB via a small wrapper. Read with `getPreferences()`, write with `setPreference(key, value)`. |
| `log.ts` | Dev-only structured logger. Controlled by `localStorage.LOG`. Categories: `'Q'` (question flow), `'VALID'` (validator), `'BKT'` (mastery), etc. Silenced in prod unless explicitly set. |
| `logger.ts` | Production error logger used by `observability/errorReporter.ts`. Always writes locally; forwards to Sentry only when initialized with a DSN. |
| `motionBudget.ts` | `shouldAnimate(): boolean` — check before any tween. Respects `prefers-reduced-motion`. Always call this instead of a bare media query. |
| `cognitiveLoad.ts` | Computes cognitive load score for a set of on-screen elements. Used by interactions to decide whether to show all UI at once or stage it. |
| `copyLinter.ts` | Validates user-facing strings against readability rules (grade level, sentence length). Run in pipeline, not at runtime. |
| `mascotCopy.ts` | Mastery-aware copy strings for the mascot character. |
| `persona/quest.ts` | Quest persona copy (character voice lines). |

## Rules

- **No side effects at import time.** All setup is explicit function calls, never module-level code.
- **No Phaser imports.** This layer is below the game engine in the dep graph.
- **No direct DOM manipulation except in `SkipLink.ts` (component).** DOM work belongs in components or `A11yLayer`.
- **`motionBudget.shouldAnimate()`** — every scene/component that creates tweens must call this. The check is cheap; skipping it is a WCAG violation.

## Adding a string

1. Add the key to `i18n/catalog.ts` under the right namespace.
2. Add translations if multi-locale (currently `en` only).
3. Use `t('namespace.key')` at the call site — never inline string literals in scene or component code.
