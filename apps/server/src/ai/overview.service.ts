import { Inject, Injectable } from '@nestjs/common';
import { OverviewDto } from '@orava/contracts';

import type { User } from '../db/users.repository.js';
import { AI_MODEL, type AiModel, aiUnavailable } from './ai-model.js';
import { AiLimitsService } from './ai-limits.service.js';
import { plainText } from './coach.js';
import { MonthContextService } from './month-context.service.js';
import { OVERVIEW_SCHEMA, overviewPrompt } from './overview.js';

/** Most overviews kept in memory; the least recently used goes first. */
const MAX_CACHED = 5000;

/**
 * Orava's month overviews. Cached in memory per user and month together with the month's
 * signature, so a month is asked again only when its transactions change. Cache hits don't count
 * toward the AI limits. Lost on restart, which just means one new Gemini call.
 */
@Injectable()
export class OverviewService {
  /** `userId|month` → the overview and the signature it was made for. Map order = LRU order. */
  private readonly cache = new Map<string, { signature: string; overview: OverviewDto }>();
  /** Requests on their way, per `userId|month|signature`, so two screens asking share one. */
  private readonly inflight = new Map<string, Promise<OverviewDto>>();

  constructor(
    @Inject(AI_MODEL) private readonly model: AiModel,
    private readonly limits: AiLimitsService,
    private readonly months: MonthContextService,
  ) {}

  async get(user: User, month: string): Promise<OverviewDto> {
    // Without a model nothing is ever cached, so there's no point loading the month.
    if (!this.model.available) throw aiUnavailable();
    const ctx = await this.months.load(user, month);
    const key = `${user.id}|${month}`;
    const hit = this.cache.get(key);
    if (hit?.signature === ctx.signature) {
      this.cache.delete(key);
      this.cache.set(key, hit);
      return hit.overview;
    }

    const flightKey = `${key}|${ctx.signature}`;
    const pending = this.inflight.get(flightKey);
    if (pending) return pending;

    this.limits.take(user, 'overview');
    const request = (async () => {
      const raw = await this.model.ask(
        ctx.system(),
        [{ role: 'user', text: overviewPrompt(month, ctx.latest) }],
        { schema: OVERVIEW_SCHEMA },
      );
      // A reply in the wrong shape is Gemini's fault, not the request's: a plain Error (500).
      const parsed = OverviewDto.safeParse(JSON.parse(raw));
      if (!parsed.success) throw new Error('Gemini’s overview reply has the wrong shape.');
      const reply = parsed.data;
      const overview = {
        summary: plainText(reply.summary),
        good: plainText(reply.good),
        bad: plainText(reply.bad),
      };
      this.cache.delete(key);
      this.cache.set(key, { signature: ctx.signature, overview });
      if (this.cache.size > MAX_CACHED) this.cache.delete(this.cache.keys().next().value!);
      return overview;
    })().finally(() => this.inflight.delete(flightKey));
    this.inflight.set(flightKey, request);
    return request;
  }
}
