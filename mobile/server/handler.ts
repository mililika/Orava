// Request handling for the Orava AI server, separate from HTTP so it can be tested directly.
//
// Routes:
//   GET  /health     → { ok, ai }   (ai = a Gemini key is configured)
//   POST /interpret  { question, context } → { interpretation }   (validated, see ask.ts)
//   POST /explain    { question, facts }   → { text }             (checked against the facts)
//
// The API key stays here. Errors map to short codes; the app shows its own messages.

import {
  EXPLAIN_INSTRUCTION,
  EXPLAIN_SCHEMA,
  checkExplanation,
  interpretInstruction,
  interpretSchema,
  parseContext,
  parseFacts,
  parseQuestion,
  validateInterpretation,
} from '../src/orava/ai/ask';
import { GeminiError, generateJson } from '../src/orava/ai/gemini';

export interface HandlerConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  thinkingLevel?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Max AI requests per client per minute. */
  rateLimitPerMinute?: number;
  now?: () => number;
}

export interface Reply {
  status: number;
  body: Record<string, unknown>;
}

const err = (status: number, error: string): Reply => ({ status, body: { error } });

function fromGemini(e: unknown): Reply {
  if (e instanceof GeminiError) {
    if (e.code === 'timeout') return err(504, 'timeout');
    if (e.code === 'rate_limited') return err(429, 'busy');
    return err(502, 'ai_error');
  }
  return err(500, 'server_error');
}

export function createHandler(cfg: HandlerConfig) {
  const now = cfg.now ?? Date.now;
  const limit = cfg.rateLimitPerMinute ?? 20;
  const hits = new Map<string, number[]>();

  const allow = (client: string) => {
    const t = now();
    const recent = (hits.get(client) ?? []).filter((x) => t - x < 60_000);
    if (recent.length >= limit) {
      hits.set(client, recent);
      return false;
    }
    recent.push(t);
    hits.set(client, recent);
    return true;
  };

  const gemini = (system: string, prompt: string, schema: object, maxOutputTokens: number) =>
    generateJson({
      apiKey: cfg.apiKey as string,
      model: cfg.model,
      baseUrl: cfg.baseUrl,
      thinkingLevel: cfg.thinkingLevel,
      timeoutMs: cfg.timeoutMs ?? 8000,
      fetchImpl: cfg.fetchImpl,
      system,
      prompt,
      schema,
      maxOutputTokens,
    });

  return async function handle(
    method: string,
    path: string,
    body: unknown,
    client = 'local',
  ): Promise<Reply> {
    if (method === 'GET' && path === '/health') {
      return { status: 200, body: { ok: true, ai: Boolean(cfg.apiKey) } };
    }
    if (method !== 'POST' || (path !== '/interpret' && path !== '/explain')) {
      return err(404, 'not_found');
    }

    const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    const question = parseQuestion(b.question);
    if (!question) return err(400, 'bad_request');

    if (path === '/interpret') {
      const context = parseContext(b.context);
      if (!context) return err(400, 'bad_request');
      if (!cfg.apiKey) return err(503, 'ai_unavailable');
      if (!allow(client)) return err(429, 'busy');
      const names = context.categories.map((c) => c.category);
      try {
        const raw = await gemini(
          interpretInstruction(names),
          `Question: ${JSON.stringify(question)}`,
          interpretSchema(names),
          256,
        );
        return { status: 200, body: { interpretation: validateInterpretation(raw, context) } };
      } catch (e) {
        return fromGemini(e);
      }
    }

    const facts = parseFacts(b.facts);
    if (!facts) return err(400, 'bad_request');
    if (!cfg.apiKey) return err(503, 'ai_unavailable');
    if (!allow(client)) return err(429, 'busy');
    try {
      const raw = await gemini(
        EXPLAIN_INSTRUCTION,
        `Question: ${JSON.stringify(question)}\nFacts: ${JSON.stringify(facts)}`,
        EXPLAIN_SCHEMA,
        512,
      );
      const checked = checkExplanation(raw, facts);
      if (!checked.ok) return err(502, 'unsafe_output');
      return { status: 200, body: { text: checked.text } };
    } catch (e) {
      return fromGemini(e);
    }
  };
}
