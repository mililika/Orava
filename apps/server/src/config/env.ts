import { z } from 'zod';

const DEV_WEB_ORIGIN = 'http://localhost:8081';

const OriginList = z
  .string()
  .transform((s) =>
    s
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.url()).min(1));

export const Env = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    WEB_ORIGIN: z.string().optional(),
    // The Supabase project's URL (https://<ref>.supabase.co); access tokens are checked against
    // its Auth signing keys.
    SUPABASE_URL: z.url({ protocol: /^https$/ }).transform((url) => url.replace(/\/+$/, '')),
    // Gemini (Google AI Studio API key). Optional: without it the AI routes answer 503
    // `ai_unavailable` and everything else works.
    GEMINI_API_KEY: z
      .string()
      .optional()
      .transform((v) => v?.trim() || undefined),
    GEMINI_MODEL: z.string().min(1).default('gemini-3.8-flash'),
    // Asked instead when GEMINI_MODEL is rate-limited (429) or overloaded (503). Empty = none.
    GEMINI_FALLBACK_MODEL: z
      .string()
      .default('gemini-3.5-flash-lite')
      .transform((v) => v.trim() || undefined),
    // How long the model thinks before answering. Not every model takes every level; if the API
    // rejects it, the request is retried without one.
    GEMINI_THINKING: z.enum(['minimal', 'low', 'medium', 'high']).default('low'),
    // Gemini requests per user per rolling hour, unless users.ai_hourly_limit says otherwise.
    AI_HOURLY_LIMIT: z.coerce.number().int().min(0).default(30),
    // Gemini requests per UTC day across all users: the last line of defence for the bill.
    AI_DAILY_LIMIT: z.coerce.number().int().min(0).default(2000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .transform((env, ctx) => {
    const raw = env.WEB_ORIGIN ?? (env.NODE_ENV === 'production' ? '' : DEV_WEB_ORIGIN);
    const origins = OriginList.safeParse(raw);
    if (!origins.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['WEB_ORIGIN'],
        message: 'Expected comma-separated URLs (required in production)',
      });
      return z.NEVER;
    }
    return { ...env, WEB_ORIGIN: origins.data };
  });
export type Env = z.infer<typeof Env>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = Env.safeParse(raw);
  if (!result.success) throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  return result.data;
}
