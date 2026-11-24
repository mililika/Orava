import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { AiLimitDetails } from '@orava/contracts';

import { AppConfig } from '../config/app-config.js';
import type { User } from '../db/users.repository.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * How many Gemini requests are allowed: per user per rolling hour (`users.ai_hourly_limit`, else
 * AI_HOURLY_LIMIT) and across all users per UTC day (AI_DAILY_LIMIT). Counted in this server's
 * memory, so each instance counts on its own and a restart starts again (see todo/09-later.md).
 */
@Injectable()
export class AiLimitsService {
  private readonly logger = new Logger(AiLimitsService.name);
  /** Request times in the last hour, per user id. */
  private readonly recent = new Map<string, number[]>();
  private today = { day: 0, count: 0 };
  private lastSweep = 0;

  constructor(private readonly config: AppConfig) {}

  /**
   * Records one request for `user`, or throws 429 `ai_limit` if a limit is reached. Checks and
   * records in one synchronous step, so two parallel requests can't both take the last slot.
   */
  take(user: User, kind: 'overview' | 'chat'): void {
    const now = Date.now();
    this.sweep(now);
    const limit = user.aiHourlyLimit ?? this.config.get('AI_HOURLY_LIMIT');
    const times = (this.recent.get(user.id) ?? []).filter((t) => t > now - HOUR);
    if (times.length >= limit) {
      this.logger.warn({ userId: user.id, kind, limit }, 'AI hourly limit reached');
      throw limitReached(
        `This account can ask Orava ${limit === 1 ? 'once' : `${limit} times`} an hour.`,
        (times[0] ?? now) + HOUR,
        limit,
      );
    }

    const day = Math.floor(now / DAY);
    if (this.today.day !== day) this.today = { day, count: 0 };
    if (this.today.count >= this.config.get('AI_DAILY_LIMIT')) {
      this.logger.warn({ kind }, 'AI daily limit reached');
      throw limitReached('Orava has answered all it can for today.', (day + 1) * DAY, null);
    }

    times.push(now);
    this.recent.set(user.id, times);
    this.today.count += 1;
  }

  /** Once an hour, forgets users with no request in the last hour, so the map stays small. */
  private sweep(now: number): void {
    if (now - this.lastSweep < HOUR) return;
    this.lastSweep = now;
    for (const [id, times] of this.recent) {
      if (!times.some((t) => t > now - HOUR)) this.recent.delete(id);
    }
  }
}

function limitReached(message: string, retryAt: number, limit: number | null): HttpException {
  const details: AiLimitDetails = { retryAt, limit };
  const body = { code: 'ai_limit', message, details };
  return new HttpException(body, HttpStatus.TOO_MANY_REQUESTS);
}
