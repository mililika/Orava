import { ServiceUnavailableException } from '@nestjs/common';

/** 503 `ai_unavailable`: no AI model is configured (GEMINI_API_KEY isn't set). */
export const aiUnavailable = () =>
  new ServiceUnavailableException({
    code: 'ai_unavailable',
    message: 'Orava’s AI isn’t available right now.',
  });
