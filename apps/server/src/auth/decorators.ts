import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

import type { User } from '../db/users.repository.js';

export const IS_PUBLIC = 'orava:isPublic';

/** Lets a route through without signing in. Every other route needs a token (see AuthGuard). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** A request that got past AuthGuard. */
export interface AuthedRequest extends Request {
  user: User;
}

/** The signed-in user, set by AuthGuard. Only on routes without `@Public()`. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User => ctx.switchToHttp().getRequest<AuthedRequest>().user,
);
