import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

import { AppConfig } from '../config/app-config.js';
import { type AuthedRequest, IS_PUBLIC } from './decorators.js';
import { SESSION_COOKIE, sessionCookieOptions } from './session-cookie.js';
import { SessionsService } from './sessions.service.js';

/**
 * Global: every route needs a valid session cookie unless it's marked `@Public()`, so a new
 * route is protected by default. Puts the user on the request for `@CurrentUser()`.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
    private readonly config: AppConfig,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    const session = typeof token === 'string' ? await this.sessions.get(token) : undefined;
    if (!session) throw new UnauthorizedException('Please sign in again.');

    if (session.renewed) {
      http
        .getResponse<Response>()
        .cookie(SESSION_COOKIE, token, sessionCookieOptions(this.config.isProd));
    }
    (req as AuthedRequest).user = session.user;
    return true;
  }
}
