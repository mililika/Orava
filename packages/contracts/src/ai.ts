// Orava's AI: the month overview (`GET /api/ai/overview`) and the Ask Orava chat
// (`POST /api/ai/chat`, streamed as server-sent events). The browser sends only a month and the
// visible conversation; the server builds the prompt from its own data.

import { z } from 'zod';

import { Month } from './common';

/** `GET /api/ai/overview?month=YYYY-MM`. */
export const OverviewQuery = z.object({ month: Month });
export type OverviewQuery = z.infer<typeof OverviewQuery>;

/** Gemini's read of a month for the Orava card. Also the schema its JSON reply is checked with. */
export const OverviewDto = z.object({
  /** One short sentence: how the month looks. */
  summary: z.string(),
  /** The best thing, with a number. */
  good: z.string(),
  /** The biggest problem or risk, with a fix. */
  bad: z.string(),
});
export type OverviewDto = z.infer<typeof OverviewDto>;

export const OverviewResponse = z.object({ overview: OverviewDto });
export type OverviewResponse = z.infer<typeof OverviewResponse>;

/** Most messages of a conversation the client sends: the newest ones. */
export const MAX_CHAT_MESSAGES = 20;
/** Longest message, in characters. */
export const MAX_CHAT_MESSAGE_LENGTH = 2000;

export const ChatMessage = z.object({
  role: z.enum(['user', 'model']),
  text: z.string().trim().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

/** `POST /api/ai/chat`: the visible conversation, ending with the user's question. */
export const ChatRequest = z.object({
  /** The month the user is looking at; Orava answers about it. */
  month: Month,
  messages: z
    .array(ChatMessage)
    .min(1)
    .max(MAX_CHAT_MESSAGES)
    .refine((m) => m.at(-1)?.role === 'user', 'The last message must be the user’s'),
});
export type ChatRequest = z.infer<typeof ChatRequest>;

/**
 * `details` of a 429 `ai_limit` error (in the usual ApiErrorBody, next to a readable `message`). `limit` is the user's hourly limit, or null when the
 * server's daily cap across all users was hit.
 */
export const AiLimitDetails = z.object({
  /** When the next request is allowed, ms since epoch. */
  retryAt: z.number(),
  limit: z.number().nullable(),
});
export type AiLimitDetails = z.infer<typeof AiLimitDetails>;

/**
 * One server-sent event of `POST /api/ai/chat`, sent as `data: <JSON>`. `delta` carries the whole
 * reply so far (not just the new chunk); the stream ends after `done` or `error`.
 */
export const ChatEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), text: z.string() }),
  z.object({ type: z.literal('done'), text: z.string() }),
  /** Failed after the stream started. Limits and "no AI" are checked before: JSON errors. */
  z.object({ type: z.literal('error'), code: z.literal('internal'), message: z.string() }),
]);
export type ChatEvent = z.infer<typeof ChatEvent>;
