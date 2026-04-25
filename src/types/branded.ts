/**
 * Branded ID types for compile-time type safety.
 * Foreign keys are strings/numbers in IndexedDB — branding prevents
 * accidental cross-assignment at the TypeScript layer.
 */

type Brand<K, T> = K & { __brand: T };

// ── Static entity IDs ──────────────────────────────────────────────────────

/** Format: 'SK-NN' (e.g. 'SK-03'). per data-schema.md §2.3 */
export type SkillId = Brand<string, 'SkillId'>;

/** Format: 'MC-FAM-NN' (e.g. 'MC-WHB-02'). per data-schema.md §2.8 */
export type MisconceptionId = Brand<string, 'MisconceptionId'>;

/** Level number 1–9. per data-schema.md §2.5 */
export type LevelId = Brand<number, 'LevelId'>;

/** Activity slug (e.g. 'magnitude_scales'). per data-schema.md §2.4 */
export type ActivityId = Brand<string, 'ActivityId'>;

/** Format: 'q:<archetype-short>:L{N}:NNNN'. per data-schema.md §2.7 */
export type QuestionTemplateId = Brand<string, 'QuestionTemplateId'>;

/** References a code-side validator function. per data-schema.md §2.7 */
export type ValidatorId = Brand<string, 'ValidatorId'>;

/** Topic slug from scope-and-sequence. */
export type TopicId = Brand<string, 'TopicId'>;

// ── Dynamic entity IDs ─────────────────────────────────────────────────────

/** UUIDv4, client-generated. per data-schema.md §3.1 */
export type StudentId = Brand<string, 'StudentId'>;

/** UUID prefixed with activityId. per data-schema.md §3.2 */
export type SessionId = Brand<string, 'SessionId'>;

/** UUID. per data-schema.md §3.3 */
export type AttemptId = Brand<string, 'AttemptId'>;

// ── Smart constructors (runtime casts with no validation overhead) ─────────

export const SkillId = (s: string): SkillId => s as SkillId;
export const MisconceptionId = (s: string): MisconceptionId => s as MisconceptionId;
export const LevelId = (n: number): LevelId => n as LevelId;
export const ActivityId = (s: string): ActivityId => s as ActivityId;
export const QuestionTemplateId = (s: string): QuestionTemplateId => s as QuestionTemplateId;
export const ValidatorId = (s: string): ValidatorId => s as ValidatorId;
export const TopicId = (s: string): TopicId => s as TopicId;
export const StudentId = (s: string): StudentId => s as StudentId;
export const SessionId = (s: string): SessionId => s as SessionId;
export const AttemptId = (s: string): AttemptId => s as AttemptId;
