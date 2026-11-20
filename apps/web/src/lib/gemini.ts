// Calls Gemini straight from the app over REST (no SDK, so it works in Expo Go, native and web).
//
// The key ships inside the app bundle, so anyone with the app can read it. Fine for a demo with a
// quota-capped key; for production move this call behind a small server or Firebase AI Logic.

import { fetch } from 'expo/fetch';

import { RateLimitError, reportLimit, takeRequest } from './rateLimit';

const KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
/**
 * Gemini 3.8 Flash with low thinking: quick and still sharp with numbers. Override with
 * EXPO_PUBLIC_GEMINI_MODEL in mobile/.env (gemini-3.5-flash-lite is quicker still,
 * gemini-4-hydrogen deeper).
 */
const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.8-flash';
/**
 * How long the model thinks before answering: minimal (fastest), low, medium, high.
 * Low keeps replies quick while still getting the € math right. Not every model takes every
 * level (Gemini 4 Hydrogen and gemini-3.8-flash have no "minimal"); if the API rejects it we
 * retry without it.
 */
const THINKING = process.env.EXPO_PUBLIC_GEMINI_THINKING || 'low';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

/** True when a real key is set (not missing, not the .env.example placeholder). */
export const geminiConfigured = !!KEY && !KEY.startsWith('YOUR-');

type Part = { text?: string; thought?: boolean };
interface Options {
  /** OpenAPI-style response schema: the reply is JSON text matching it. */
  schema?: object;
  /** Signed-in username: counts toward their hourly request limit (lib/rateLimit.ts). */
  user?: string;
}

/** Answer text of one response (or one streamed chunk), without the model's thoughts. */
const textOf = (data: unknown) =>
  (
    ((data as { candidates?: { content?: { parts?: Part[] } }[] })?.candidates?.[0]?.content
      ?.parts ?? []) as Part[]
  )
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text)
    .join('');

/**
 * POSTs to Gemini, retrying once without the thinking level if the model rejects it.
 * Returns the response once it is OK; throws a readable Error otherwise, or RateLimitError when
 * the user has used up this hour's requests.
 */
async function post(
  method: 'generateContent' | 'streamGenerateContent?alt=sse',
  system: string,
  turns: ChatTurn[],
  { schema, user }: Options,
) {
  if (!geminiConfigured) {
    throw new Error('Gemini is not configured. Set EXPO_PUBLIC_GEMINI_API_KEY in mobile/.env.');
  }
  if (user) {
    try {
      await takeRequest(user);
    } catch (e) {
      if (e instanceof RateLimitError) reportLimit(e); // shows the "limit reached" modal
      throw e;
    }
  }
  const call = async (thinking: boolean) => {
    try {
      return await fetch(`${ENDPOINT}/${MODEL}:${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY! },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
          generationConfig: {
            temperature: 0.4,
            ...(thinking ? { thinkingConfig: { thinkingLevel: THINKING } } : {}),
            ...(schema ? { responseMimeType: 'application/json', responseSchema: schema } : {}),
          },
        }),
      });
    } catch {
      throw new Error('Cannot reach Gemini. Check your connection.');
    }
  };
  const errorOf = async (res: Awaited<ReturnType<typeof call>>) => {
    const data = await res.json().catch(() => null);
    return (data?.error?.message as string | undefined) ?? `HTTP ${res.status}`;
  };

  let res = await call(true);
  if (res.ok) return res;
  let msg = await errorOf(res);
  // A model that doesn't take this thinking level: ask again with its default.
  if (res.status === 400 && /thinking/i.test(msg)) {
    res = await call(false);
    if (res.ok) return res;
    msg = await errorOf(res);
  }
  throw new Error(`Gemini error: ${msg}`);
}

/** Sends the conversation and returns Gemini's whole reply. Throws a readable Error. */
export async function askGemini(
  system: string,
  turns: ChatTurn[],
  options: Options = {},
): Promise<string> {
  const res = await post('generateContent', system, turns, options);
  const text = textOf(await res.json().catch(() => null)).trim();
  if (!text) throw new Error('Gemini returned an empty answer.');
  return text;
}

/**
 * Like askGemini, but streams: `onText` gets the reply so far each time a chunk arrives.
 * Resolves with the whole reply. Server-sent events, read with expo/fetch, which streams
 * response bodies on iOS and Android (and is the browser's fetch on web).
 */
export async function streamGemini(
  system: string,
  turns: ChatTurn[],
  onText: (soFar: string) => void,
  options: Options = {},
): Promise<string> {
  const res = await post('streamGenerateContent?alt=sse', system, turns, options);
  let text = '';
  let buffer = '';
  // Each event is a "data: {json}" line; a line can be split across network chunks.
  const take = (lines: string[]) => {
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      try {
        const chunk = textOf(JSON.parse(line.slice(5)));
        if (chunk) {
          text += chunk;
          onText(text);
        }
      } catch {
        // A keep-alive or malformed line: skip it.
      }
    }
  };

  const reader = res.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      take(lines);
    }
    take([buffer + decoder.decode()]);
  } else {
    // No readable body on this platform: everything at once.
    take((await res.text()).split(/\r?\n/));
  }

  text = text.trim();
  if (!text) throw new Error('Gemini returned an empty answer.');
  return text;
}
