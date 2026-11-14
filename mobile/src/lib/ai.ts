// Talks to the Orava AI server (mobile/server). The Gemini key lives there, never in the app.
//
// The server address comes from EXPO_PUBLIC_ORAVA_AI_URL (not a secret), e.g.
// http://10.0.33.26:8787 for a phone on the same Wi-Fi. When it is not set, or the server
// reports that AI is off, the app hides "Ask Orava" and part A works as before.

import { useEffect, useState } from 'react';

import type { AskContext, Facts, Interpretation } from '../orava/ai/ask';
import { AiError, type AiTransport } from '../orava/ai/flow';

const AI_URL = process.env.EXPO_PUBLIC_ORAVA_AI_URL;

const MESSAGES: Record<string, string> = {
  timeout: 'Orava took too long to answer. Try again, or use the buttons below.',
  busy: 'Orava is busy right now. Try again in a minute, or use the buttons below.',
  ai_unavailable: 'Ask Orava is off right now. The buttons below still work.',
  bad_request: 'Orava couldn’t read that question. Try a shorter one.',
  network: 'Can’t reach Orava right now. Check your connection, or use the buttons below.',
};
const GENERIC = 'Orava couldn’t answer right now. Try again, or use the buttons below.';

async function withTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new AiError(MESSAGES.timeout));
    }, ms);
  });
  try {
    return await Promise.race([fetchImpl(url, { ...init, signal: controller.signal }), timeout]);
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError(MESSAGES.network);
  } finally {
    clearTimeout(timer);
  }
}

export function createAiClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 15000,
): AiTransport {
  const post = async (path: string, body: unknown) => {
    const res = await withTimeout(
      fetchImpl,
      `${baseUrl}${path}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      timeoutMs,
    );
    let json: Record<string, unknown> = {};
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      throw new AiError(GENERIC);
    }
    if (!res.ok) throw new AiError(MESSAGES[String(json.error)] ?? GENERIC);
    return json;
  };
  return {
    async interpret(question: string, context: AskContext): Promise<Interpretation> {
      const json = await post('/interpret', { question, context });
      const i = json.interpretation as Interpretation | undefined;
      if (!i || typeof i !== 'object' || typeof i.kind !== 'string') throw new AiError(GENERIC);
      return i;
    },
    async explain(question: string, facts: Facts): Promise<string> {
      const json = await post('/explain', { question, facts });
      if (typeof json.text !== 'string' || !json.text) throw new AiError(GENERIC);
      return json.text;
    },
  };
}

/** True only when a server is configured, reachable and has a Gemini key. */
export async function checkAiAvailable(
  baseUrl: string | undefined = AI_URL,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 3000,
): Promise<boolean> {
  if (!baseUrl) return false;
  try {
    const res = await withTimeout(fetchImpl, `${baseUrl}/health`, { method: 'GET' }, timeoutMs);
    if (!res.ok) return false;
    const json = (await res.json()) as { ai?: unknown };
    return json.ai === true;
  } catch {
    return false;
  }
}

/** The AI client when "Ask Orava" can be offered, otherwise null (checked once). */
export function useAskOrava(): AiTransport | null {
  const [client, setClient] = useState<AiTransport | null>(null);
  useEffect(() => {
    let alive = true;
    checkAiAvailable().then((ok) => {
      if (alive && ok && AI_URL) setClient(createAiClient(AI_URL));
    });
    return () => {
      alive = false;
    };
  }, []);
  return client;
}
