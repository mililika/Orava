// Shapes used by every area of the API: the error body, the error codes, and a month.

import { z } from 'zod';

/** Every error code the API sends. The web app switches on these, never on messages. */
export const ERROR_CODES = [
  'validation_failed',
  'unauthorized',
  'not_found',
  'rate_limited',
  'ai_limit',
  'ai_unavailable',
  'conflict',
  'internal',
] as const;

export const ErrorCode = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCode>;

/** The body of every non-2xx response: `{ error: { code, message, details? } }`. */
export const ApiErrorBody = z.object({
  error: z.object({
    code: ErrorCode,
    /** Plain-language message, safe to show to the user. */
    message: z.string(),
    /** Extra machine-readable info, e.g. the zod issues for `validation_failed`. */
    details: z.unknown().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

/** A calendar month, YYYY-MM. */
export const Month = z.string().regex(/^\d{4}-\d{2}$/, 'Expected a month as YYYY-MM');
export type Month = z.infer<typeof Month>;
