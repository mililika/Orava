// Minimal Gemini client for the Orava AI server. Server-side only: it needs the API key.
//
// Uses models.generateContent with a JSON response schema (official docs, checked 2026-11-14:
// POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent,
// auth header `x-goog-api-key`, `generationConfig.responseMimeType` + `responseJsonSchema`,
// text in `candidates[].content.parts[].text`). No temperature: newer models ignore it.
//
// `fetchImpl` is injectable so tests never call the real API.

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';
export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

export type GeminiErrorCode =
  'timeout' | 'network' | 'rate_limited' | 'http' | 'blocked' | 'incomplete' | 'empty' | 'bad_json';

export class GeminiError extends Error {
  readonly code: GeminiErrorCode;
  readonly status?: number;
  constructor(code: GeminiErrorCode, status?: number) {
    super(`Gemini ${code}${status ? ` (${status})` : ''}`);
    this.code = code;
    this.status = status;
  }
}

export interface GeminiOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  system: string;
  prompt: string;
  schema: object;
  maxOutputTokens?: number;
  /** e.g. "MINIMAL"; omit (empty) to send no thinkingConfig. */
  thinkingLevel?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Calls generateContent and returns the parsed JSON object the model produced. */
export async function generateJson(o: GeminiOptions): Promise<unknown> {
  const doFetch = o.fetchImpl ?? fetch;
  const url = `${o.baseUrl ?? GEMINI_BASE_URL}/v1beta/models/${encodeURIComponent(
    o.model ?? DEFAULT_MODEL,
  )}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: o.system }] },
    contents: [{ role: 'user', parts: [{ text: o.prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: o.schema,
      maxOutputTokens: o.maxOutputTokens ?? 512,
      ...(o.thinkingLevel ? { thinkingConfig: { thinkingLevel: o.thinkingLevel } } : {}),
    },
  };

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new GeminiError('timeout'));
    }, o.timeoutMs ?? 8000);
  });

  let res: Response;
  try {
    res = await Promise.race([
      doFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': o.apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      }),
      timeout,
    ]);
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof GeminiError) throw e;
    throw new GeminiError('network');
  }

  let json: unknown;
  try {
    if (res.status === 429) throw new GeminiError('rate_limited', 429);
    if (!res.ok) throw new GeminiError('http', res.status);
    json = await Promise.race([res.json(), timeout]);
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof GeminiError) throw e;
    throw new GeminiError('bad_json');
  }
  clearTimeout(timer);

  const r = json as {
    promptFeedback?: { blockReason?: string };
    candidates?: {
      finishReason?: string;
      content?: { parts?: { text?: string; thought?: boolean }[] };
    }[];
  };
  if (r?.promptFeedback?.blockReason) throw new GeminiError('blocked');
  const candidate = r?.candidates?.[0];
  if (!candidate) throw new GeminiError('empty');
  if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'PROHIBITED_CONTENT') {
    throw new GeminiError('blocked');
  }
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    throw new GeminiError('incomplete');
  }
  const text = (candidate.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
  if (!text.trim()) throw new GeminiError('empty');
  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError('bad_json');
  }
}
