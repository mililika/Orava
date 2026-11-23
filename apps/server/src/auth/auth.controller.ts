import { Controller, Get } from '@nestjs/common';
import type { MeResponse } from '@orava/contracts';

import type { User } from '../db/users.repository.js';
import { CurrentUser } from './decorators.js';

/** Sign-in and sign-out happen in the browser with Supabase Auth; this only says who's signed in. */
@Controller()
export class AuthController {
  /** 200 `{ user }` for a valid token of a linked user; AuthGuard answers 401 otherwise. */
  @Get('me')
  me(@CurrentUser() user: User): MeResponse {
    return { user: { id: user.id, username: user.username } };
  }
}
