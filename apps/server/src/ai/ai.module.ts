import { Module } from '@nestjs/common';

import { AI_MODEL } from './ai-model.js';
import { AiController } from './ai.controller.js';
import { AiLimitsService } from './ai-limits.service.js';
import { GeminiService } from './gemini.service.js';
import { MonthContextService } from './month-context.service.js';
import { OverviewService } from './overview.service.js';

/** Orava's AI: month overviews and the chat. The prompt and the Gemini key never leave here. */
@Module({
  controllers: [AiController],
  providers: [
    { provide: AI_MODEL, useClass: GeminiService },
    AiLimitsService,
    MonthContextService,
    OverviewService,
  ],
})
export class AiModule {}
