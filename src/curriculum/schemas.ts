/**
 * Curriculum bundle Zod schemas — defensive boundary at the curriculum loader.
 *
 * Phase 7.4 / harden R19: per-row validation for QuestionTemplate at the trust
 * boundary. Mirrors `QuestionTemplate` from `src/types/entities.ts` but is
 * permissive about unknown extra fields (`.passthrough()`) so an additive
 * change in the pipeline schema does not break runtime parsing.
 *
 * Failure mode: invalid rows are skipped with a structured warning; valid rows
 * continue to load. The loader never throws on a single bad row.
 */

import { z } from 'zod';
import { ARCHETYPES } from '../types/archetype';

// ── QuestionPrompt ──────────────────────────────────────────────────────────

/**
 * `QuestionTemplate.prompt` allows either:
 *   - a string (legacy / shorthand), or
 *   - an object with `text` (canonical, per data-schema.md §2.7).
 * Both forms are accepted at the loader boundary; the runtime guards normalise
 * to the object shape.
 */
const promptObjectSchema = z
  .object({
    text: z.string().min(1),
    ttsKey: z.string().optional(),
    localeStrings: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

const promptSchema = z.union([z.string().min(1), promptObjectSchema]);

// ── QuestionTemplate ────────────────────────────────────────────────────────

/**
 * Per-row schema for QuestionTemplate. Mirrors `QuestionTemplate` from
 * `src/types/entities.ts`. Extra fields are tolerated via `.passthrough()` —
 * the pipeline can add new metadata without breaking the runtime.
 *
 * Required fields enforce the exact contract that the question-flow code
 * relies on: `id`, `archetype`, `prompt`, `payload`, `validatorId`, and a
 * non-empty `skillIds` array. `correctAnswer` may be null/false/zero so we
 * only enforce its presence (not nullability).
 */
export const questionTemplateSchema = z
  .object({
    id: z.string().min(1),
    archetype: z.enum(ARCHETYPES),
    prompt: promptSchema,
    // payload may be any JSON value but must be present (defined and not null).
    payload: z.unknown().refine((v) => v !== undefined && v !== null, {
      message: 'payload is required',
    }),
    correctAnswer: z.unknown(),
    validatorId: z.string().min(1),
    skillIds: z.array(z.string().min(1)).min(1),
    misconceptionTraps: z.array(z.string()).optional().default([]),
    difficultyTier: z.enum(['easy', 'medium', 'hard']),
  })
  .passthrough();

export type QuestionTemplateInput = z.infer<typeof questionTemplateSchema>;

/**
 * Validate one row. Returns a discriminated union so callers can branch on
 * success without a try/catch. The error message flattens issue paths into a
 * single human-readable string for log emission.
 */
export function safeParseQuestionTemplate(
  row: unknown
):
  | { ok: true; value: QuestionTemplateInput }
  | { ok: false; issues: z.ZodIssue[]; message: string } {
  const parsed = questionTemplateSchema.safeParse(row);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }
  return {
    ok: false,
    issues: parsed.error.issues,
    message: parsed.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; '),
  };
}
