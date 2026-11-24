import { ServiceUnavailableException } from '@nestjs/common';
import type { ChatMessage } from '@orava/contracts';

export interface AskOptions {
  /** OpenAPI-style response schema: the reply is JSON text matching it. */
  schema?: object;
  signal?: AbortSignal;
}

/**
 * The language model behind Orava. GeminiService (AI Studio key) implements it today; another
 * provider (e.g. Vertex AI) can replace it by providing AI_MODEL, without touching the callers.
 */
export interface AiModel {
  /** False when the model isn't configured; callers then answer 503 `ai_unavailable`. */
  readonly available: boolean;
  /** The whole reply. Throws if the model can't answer. */
  ask(system: string, turns: ChatMessage[], options?: AskOptions): Promise<string>;
  /** Streams the reply: `onText` gets the reply so far as chunks arrive. Resolves with all of it. */
  stream(
    system: string,
    turns: ChatMessage[],
    onText: (soFar: string) => void,
    options?: Pick<AskOptions, 'signal'>,
  ): Promise<string>;
}

/** Injection token: `@Inject(AI_MODEL) private readonly model: AiModel`. */
export const AI_MODEL = Symbol('AI_MODEL');

/** 503 `ai_unavailable`: no AI model is configured (GEMINI_API_KEY isn't set). */
export const aiUnavailable = () =>
  new ServiceUnavailableException({
    code: 'ai_unavailable',
    message: 'Orava’s AI isn’t available right now.',
  });
