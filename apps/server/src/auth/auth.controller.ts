import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginRequest, type LoginResponse, type MeResponse, type UserDto } from '@orava/contracts';
import type { Request, Response } from 'express';

import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AppConfig } from '../config/app-config.js';
import type { SessionUser } from '../db/sessions.repository.js';
import { UsersRepository } from '../db/users.repository.js';
import { CurrentUser, Public } from './decorators.js';
import { LoginAttempts } from './login-attempts.js';
import { PasswordService } from './password.service.js';
import { SESSION_COOKIE, sessionCookieOptions } from './session-cookie.js';
import { SessionsService } from './sessions.service.js';

/** Never says which part was wrong. */
const WRONG_LOGIN = 'Wrong username or password.';

function toDto(user: { id: string; username: string }): UserDto {
  return { id: user.id, username: user.username };
}

@Controller()
export class AuthController {
  constructor(
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly attempts: LoginAttempts,
    private readonly config: AppConfig,
  ) {}

  /** 200 `{ user }` and the session cookie · 401 wrong login · 429 too many failures. */
  @Public()
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginRequest)) body: LoginRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const ip = req.ip ?? 'unknown';
    const retryAfter = this.attempts.retryAfter(ip, body.username);
    if (retryAfter > 0) {
      res.setHeader('Retry-After', String(retryAfter));
      throw new HttpException(
        { code: 'rate_limited', message: 'Too many failed sign-ins. Try again in a few minutes.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // An unknown username still costs one bcrypt check, so timing doesn't tell the two apart.
    const user = await this.users.findByUsername(body.username);
    const ok = user
      ? await this.passwords.verify(body.password, user.passwordHash)
      : await this.passwords.verifyDummy(body.password);
    if (!user || !ok) {
      this.attempts.recordFailure(ip, body.username);
      throw new UnauthorizedException(WRONG_LOGIN);
    }

    this.attempts.recordSuccess(body.username);
    const token = await this.sessions.create(user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(this.config.isProd));
    return { user: toDto(user) };
  }

  /** 204, session deleted and cookie cleared. Public: signing out without a session is harmless. */
  @Public()
  @Post('auth/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string') await this.sessions.delete(token);
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions(this.config.isProd));
  }

  /** 200 `{ user }` while the session is valid; SessionGuard answers 401 otherwise. */
  @Get('me')
  me(@CurrentUser() user: SessionUser): MeResponse {
    return { user: toDto(user) };
  }
}
