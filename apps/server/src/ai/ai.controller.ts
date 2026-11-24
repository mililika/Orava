import { Body, Controller, Get, Logger, Post, Query, Res } from '@nestjs/common';
import { ChatEvent, ChatRequest, OverviewQuery, type OverviewResponse } from '@orava/contracts';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { User } from '../db/users.repository.js';
import { AiLimitsService } from './ai-limits.service.js';
import { aiUnavailable } from './ai-unavailable.js';
import { plainText } from './coach.js';
import { GeminiService } from './gemini.service.js';
import { MonthContextService } from './month-context.service.js';
import { OverviewService } from './overview.service.js';

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly model: GeminiService,
    private readonly limits: AiLimitsService,
    private readonly months: MonthContextService,
    private readonly overviews: OverviewService,
  ) {}

  /** Orava's read of a month: cached until the month's transactions change. */
  @Get('overview')
  async overview(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(OverviewQuery)) { month }: OverviewQuery,
  ): Promise<OverviewResponse> {
    return { overview: await this.overviews.get(user, month) };
  }

  /**
   * Ask Orava: streams the reply as server-sent events (`data: <ChatEvent JSON>`). Errors before
   * the stream starts (validation, limit, no model) are normal JSON errors; after it starts, an
   * `error` event. Written by hand because NestJS's @Sse() only supports GET.
   */
  @Post('chat')
  async chat(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(ChatRequest)) body: ChatRequest,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.model.available) throw aiUnavailable();
    const ctx = await this.months.load(user, body.month);
    this.limits.take(user, 'chat');

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // The browser went away (closed the chat or the tab): stop asking Gemini.
    const abort = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) abort.abort();
    });
    const send = (event: ChatEvent) => res.write(`data: ${JSON.stringify(event)}\n\n`);

    try {
      const reply = await this.model.stream(
        ctx.system(),
        body.messages,
        (soFar) => send({ type: 'delta', text: plainText(soFar) }),
        { signal: abort.signal },
      );
      send({ type: 'done', text: plainText(reply) });
    } catch (e) {
      if (abort.signal.aborted) return;
      this.logger.error(e);
      send({ type: 'error', code: 'internal', message: 'Orava couldn’t answer just now.' });
    } finally {
      res.end();
    }
  }
}
