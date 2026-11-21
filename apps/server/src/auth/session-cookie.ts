import type { CookieOptions } from 'express';

import { SESSION_TTL_MS } from './sessions.service.js';

export const SESSION_COOKIE = 'orava_session';

/**
 * httpOnly, so page scripts can't read the token. `SameSite=Lax` is enough: in production the
 * browser reaches the API through Vercel's `/api` rewrite (same origin), and locally
 * `localhost:8081` and `localhost:8080` are the same site. Lives as long as the session; set again
 * whenever the session slides. `res.clearCookie` ignores `maxAge`, so it takes the same options.
 */
export function sessionCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', path: '/', secure, maxAge: SESSION_TTL_MS };
}
