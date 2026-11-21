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
    // How many proxies in front of the server append to X-Forwarded-For, so `req.ip` is the
    // browser's address (login throttling keys on it). 0 locally; behind Vercel → Cloud Run it's 2.
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
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
