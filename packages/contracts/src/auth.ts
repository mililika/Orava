// The signed-in user: `GET /api/me`. Signing in and out happens in the browser with Supabase Auth;
// every API request carries its access token as `Authorization: Bearer …`.

import { z } from 'zod';

/** The signed-in user, as the browser sees it. Nothing else about the user leaves the server. */
export const UserDto = z.object({
  id: z.uuid(),
  username: z.string(),
});
export type UserDto = z.infer<typeof UserDto>;

/** `GET /api/me` → 200 for a valid token of a user with an Orava account, 401 otherwise. */
export const MeResponse = z.object({ user: UserDto });
export type MeResponse = z.infer<typeof MeResponse>;
