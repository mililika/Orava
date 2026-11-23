import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { UsersRepository } from '../db/users.repository.js';
import { type AuthedRequest, IS_PUBLIC } from './decorators.js';
import { TokenVerifier } from './token-verifier.js';

/**
 * Global: every route needs `Authorization: Bearer <Supabase access token>` unless it's marked
 * `@Public()`, so a new route is protected by default. Puts our user (linked through
 * `users.auth_user_id`) on the request for `@CurrentUser()`.
 *
 * The token travels in a header, not a cookie, so the browser never attaches it to a request
 * another site makes: no CSRF check is needed.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenVerifier,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const [scheme, token] = req.get('authorization')?.split(' ') ?? [];
    const authUserId = scheme === 'Bearer' && token ? await this.tokens.userIdOf(token) : undefined;
    if (!authUserId) throw new UnauthorizedException('Please sign in again.');

    const user = await this.users.findByAuthUserId(authUserId);
    if (!user) {
      // A real Supabase login that the owner hasn't linked to a row in `users` yet.
      throw new UnauthorizedException({
        code: 'account_not_linked',
        message: "This login isn't set up for Orava yet.",
      });
    }

    (req as AuthedRequest).user = user;
    return true;
  }
}
