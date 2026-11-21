import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import { AppConfig } from '../config/app-config.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection on top of the `SameSite=Lax` cookie: a request that changes something must come
 * from the web app's own pages, i.e. carry an `Origin` header from `WEB_ORIGIN` or the server's
 * own origin. Browsers always send `Origin` on such requests; a missing one is refused too.
 *
 * Global, and runs before SessionGuard, so a cross-site request learns nothing about the session.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowed: Set<string>;

  constructor(config: AppConfig) {
    this.allowed = new Set(config.get('WEB_ORIGIN').map((o) => new URL(o).origin));
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;

    const origin = req.get('origin');
    if (origin && (this.allowed.has(origin) || origin === `${req.protocol}://${req.get('host')}`)) {
      return true;
    }
    throw new ForbiddenException('This request must come from the Orava web app.');
  }
}
