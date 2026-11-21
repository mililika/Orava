import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

import type { SessionUser } from '../db/sessions.repository.js';

export const IS_PUBLIC = 'orava:isPublic';

/** Lets a route through without a session. Every other route needs one (see SessionGuard). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** A request that got past SessionGuard. */
export interface AuthedRequest extends Request {
  user: SessionUser;
}

/** The signed-in user, set by SessionGuard. Only on routes without `@Public()`. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SessionUser =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user,
);
