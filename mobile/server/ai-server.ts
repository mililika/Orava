// Orava AI server: a tiny local HTTP server that keeps the Gemini key off the phone.
//
//   npm run ai-server        (from mobile/)
//
// Reads server/.env.local (git-ignored):
//   GEMINI_API_KEY=...         required for AI; without it /health reports ai:false and the
//                              app simply hides "Ask Orava"
//   GEMINI_MODEL=...           optional, default gemini-3.5-flash-lite
//   GEMINI_THINKING_LEVEL=...  optional, default MINIMAL; set empty to omit
//   ORAVA_AI_PORT=8787, ORAVA_AI_HOST=0.0.0.0 (phone on the same Wi-Fi needs 0.0.0.0)
//
// No dependencies: Node's built-in http and fetch. Never logs the key or the question.

import { createServer } from 'node:http';

import { createHandler } from './handler';

const env = process.env;
const port = Number(env.ORAVA_AI_PORT ?? 8787);
const host = env.ORAVA_AI_HOST ?? '0.0.0.0';
const MAX_BODY = 8 * 1024;

const handle = createHandler({
  apiKey: env.GEMINI_API_KEY || undefined,
  model: env.GEMINI_MODEL || undefined,
  baseUrl: env.GEMINI_API_BASE || undefined, // tests point this at a local mock
  thinkingLevel: env.GEMINI_THINKING_LEVEL ?? 'MINIMAL',
  timeoutMs: Number(env.GEMINI_TIMEOUT_MS ?? 8000),
});

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
    console.log(`${req.method} ${req.url} → ${status}`);
  };

  let text = '';
  req.setEncoding('utf8');
  req.on('data', (c: string) => {
    text += c;
    if (text.length > MAX_BODY) {
      send(413, { error: 'too_large' });
      req.destroy();
    }
  });
  req.on('end', async () => {
    if (res.writableEnded) return;
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        return send(400, { error: 'bad_request' });
      }
    }
    const path = (req.url ?? '/').split('?')[0];
    const reply = await handle(req.method ?? 'GET', path, body, req.socket.remoteAddress ?? '?');
    send(reply.status, reply.body);
  });
});

server.listen(port, host, () => {
  console.log(
    `Orava AI server on http://${host}:${port} · AI ${env.GEMINI_API_KEY ? 'ON' : 'OFF (no GEMINI_API_KEY)'}`,
  );
});
