import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../config/app-config.js';
import type { ChatMessage } from '@orava/contracts';

import type { AiModel, AskOptions } from './ai-model.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
/** Gemini's answers that mean "too busy for this model right now": rate-limited or overloaded. */
const BUSY = new Set([429, 503]);

type Part = { text?: string; thought?: boolean };
interface Usage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: Part[] } }[];
  usageMetadata?: Usage;
}

/** Answer text of one response (or one streamed chunk), without the model's thoughts. */
const textOf = (data: GeminiResponse | null) =>
  (data?.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text)
    .join('');

/**
 * Gemini over REST with the server's AI Studio key. Asks GEMINI_MODEL; when Gemini rate-limits it
 * (429) or it's overloaded (503), asks GEMINI_FALLBACK_MODEL instead.
 */
@Injectable()
export class GeminiService implements AiModel {
  private readonly logger = new Logger(GeminiService.name);
  private readonly key: string | undefined;
  /** The model to ask, then the one to ask when Gemini rate-limits it. */
  private readonly models: string[];
  private readonly thinking: string;

  constructor(config: AppConfig) {
    this.key = config.get('GEMINI_API_KEY');
    const fallback = config.get('GEMINI_FALLBACK_MODEL');
    this.models = [config.get('GEMINI_MODEL'), ...(fallback ? [fallback] : [])];
    this.thinking = config.get('GEMINI_THINKING');
  }

  get available(): boolean {
    return !!this.key;
  }

  async ask(
    system: string,
    turns: ChatMessage[],
    { schema, signal }: AskOptions = {},
  ): Promise<string> {
    const started = Date.now();
    const { res, model } = await this.post('generateContent', system, turns, schema, signal);
    const data = (await res.json().catch(() => null)) as GeminiResponse | null;
    this.logUsage('ask', model, data?.usageMetadata, started);
    const text = textOf(data).trim();
    if (!text) throw new Error('Gemini returned an empty answer.');
    return text;
  }

  async stream(
    system: string,
    turns: ChatMessage[],
    onText: (soFar: string) => void,
    { signal }: Pick<AskOptions, 'signal'> = {},
  ): Promise<string> {
    const started = Date.now();
    const { res, model } = await this.post(
      'streamGenerateContent?alt=sse',
      system,
      turns,
      undefined,
      signal,
    );
    let text = '';
    let usage: Usage | undefined;
    // Each event is a "data: {json}" line; a line can be split across network chunks.
    const take = (lines: string[]) => {
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        let data: GeminiResponse;
        try {
          data = JSON.parse(line.slice(5)) as GeminiResponse;
        } catch {
          continue; // a keep-alive or malformed line
        }
        usage = data.usageMetadata ?? usage;
        const chunk = textOf(data);
        if (chunk) {
          text += chunk;
          onText(text);
        }
      }
    };

    const reader = res.body?.getReader();
    if (!reader) throw new Error('Gemini sent no response body.');
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      take(lines);
    }
    take([buffer + decoder.decode()]);
    this.logUsage('stream', model, usage, started);

    text = text.trim();
    if (!text) throw new Error('Gemini returned an empty answer.');
    return text;
  }

  /**
   * POSTs to Gemini: retries once without the thinking level if the model rejects it, and moves on
   * to the fallback model if this one is busy (429 or 503). Returns the OK response and the model
   * that gave it; throws otherwise. Both come before any text, so streaming isn't affected.
   */
  private async post(
    method: 'generateContent' | 'streamGenerateContent?alt=sse',
    system: string,
    turns: ChatMessage[],
    schema: object | undefined,
    signal: AbortSignal | undefined,
  ): Promise<{ res: Response; model: string }> {
    if (!this.key) throw new Error('GEMINI_API_KEY is not set.');
    const call = (model: string, thinking: boolean) =>
      fetch(`${ENDPOINT}/${model}:${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.key! },
        signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
          generationConfig: {
            temperature: 0.4,
            ...(thinking ? { thinkingConfig: { thinkingLevel: this.thinking } } : {}),
            ...(schema ? { responseMimeType: 'application/json', responseSchema: schema } : {}),
          },
        }),
      });
    const errorOf = async (res: Response) => {
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      return data?.error?.message ?? `HTTP ${res.status}`;
    };

    for (const [i, model] of this.models.entries()) {
      let res = await call(model, true);
      if (res.ok) return { res, model };
      let msg = await errorOf(res);
      // A model that doesn't take this thinking level: ask again with its default.
      if (res.status === 400 && /thinking/i.test(msg)) {
        res = await call(model, false);
        if (res.ok) return { res, model };
        msg = await errorOf(res);
      }
      const next = this.models[i + 1];
      if (!BUSY.has(res.status) || !next) throw new Error(`Gemini error (${res.status}): ${msg}`);
      this.logger.warn({ model, fallback: next }, 'Gemini model busy, using the fallback');
    }
    throw new Error('No Gemini model configured.');
  }

  /** Token counts per request, for the bill. Never the prompt or the reply. */
  private logUsage(
    kind: 'ask' | 'stream',
    model: string,
    usage: Usage | undefined,
    started: number,
  ): void {
    this.logger.log(
      {
        model,
        kind,
        inputTokens: usage?.promptTokenCount ?? null,
        outputTokens: usage?.candidatesTokenCount ?? null,
        thoughtTokens: usage?.thoughtsTokenCount ?? null,
        ms: Date.now() - started,
      },
      'Gemini usage',
    );
  }
}
