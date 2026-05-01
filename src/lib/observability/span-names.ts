/**
 * Central registry of OpenTelemetry span names used throughout the app.
 *
 * Conventions (see ./README.md):
 * - Each leaf is a string literal in `<domain>.<verb>` form.
 * - Add a new span by adding a leaf here, then importing the constant at the
 *   call site. Never pass a bare string to `tracerService.startSpan(...)`.
 *
 * Phase 12 (code-quality-2026-05-01): convention + scaffolding.
 */
export const SPAN_NAMES = {
  DB: {
    MUTATE: 'db.mutate',
    GET: 'db.get',
    QUERY: 'db.query',
  },
  SCENE: {
    INIT: 'scene.init',
    CREATE: 'scene.create',
    SHUTDOWN: 'scene.shutdown',
  },
  QUESTION: {
    LOAD: 'question.load',
    VALIDATE: 'question.validate',
    SUBMIT: 'question.submit',
  },
  MASTERY: {
    UPDATE: 'mastery.update',
  },
  HINT: {
    REQUEST: 'hint.request',
  },
  TTS: {
    SPEAK: 'tts.speak',
  },
} as const;

/**
 * Recursively extracts the union of all string-literal leaf values from a
 * nested const-object. The result is a precise string-literal union, not
 * `string`, so call sites get an exhaustive autocomplete + compile-time check.
 */
type Leaves<T> = T extends string
  ? T
  : T extends Record<string, unknown>
    ? { [K in keyof T]: Leaves<T[K]> }[keyof T]
    : never;

/**
 * Union of every span name registered in {@link SPAN_NAMES}. Use this at
 * call sites that accept a span name parameter.
 */
export type SpanName = Leaves<typeof SPAN_NAMES>;
