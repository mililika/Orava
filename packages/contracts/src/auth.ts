// Login, logout and the signed-in user: `POST /api/auth/login`, `POST /api/auth/logout`,
// `GET /api/me`. The session itself travels in an httpOnly cookie, never in a body.

import { z } from 'zod';

/**
 * `POST /api/auth/login`. The username is trimmed and lowercased here, the way the database
 * stores it, so "Demo " signs in as `demo`. The password is taken exactly as typed.
 */
export const LoginRequest = z.object({
  username: z.string().trim().toLowerCase().min(1).max(64),
  password: z.string().min(1).max(256),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

/** The signed-in user, as the browser sees it. Nothing else about the user leaves the server. */
export const UserDto = z.object({
  id: z.uuid(),
  username: z.string(),
});
export type UserDto = z.infer<typeof UserDto>;

/** `POST /api/auth/login` → 200, with the session cookie set. */
export const LoginResponse = z.object({ user: UserDto });
export type LoginResponse = z.infer<typeof LoginResponse>;

/** `GET /api/me` → 200 while the session cookie is valid, 401 otherwise. */
export const MeResponse = z.object({ user: UserDto });
export type MeResponse = z.infer<typeof MeResponse>;
