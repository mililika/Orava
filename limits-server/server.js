// Per-user Gemini request limits, kept in limits.json next to this file.
//
// limits.json is an array of { username, limit, currentUsage }. It is read on every request, so
// hand edits apply immediately; reset someone by setting currentUsage back to 0. There is no
// automatic reset. Requests are handled one at a time, so two can't both take the last slot.
//
//   POST /take            { "username": "demo" } -> 200 allowed / 429 used up / 400 bad username
//   GET  /usage/:username -> that user's entry, or 404
//   GET  /health          -> 200 ok
//
// Listens on 127.0.0.1 only; nginx proxies https://<domain>/api/ to it.

const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3001;
const FILE = process.env.LIMITS_FILE || path.join(__dirname, 'limits.json');

const readLimits = () => {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (!Array.isArray(data)) throw new Error(`${FILE} must contain an array`);
  return data;
};

const writeLimits = (data) => {
  const tmp = `${FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, FILE);
};

const find = (data, username) => {
  const name = username.toLowerCase();
  return data.find((u) => typeof u?.username === 'string' && u.username.toLowerCase() === name);
};

// One request at a time: each handler waits for the previous one.
let queue = Promise.resolve();
const serial = (fn) => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const send = (res, status, body) => {
  const json = typeof body !== 'string';
  res.writeHead(status, {
    ...CORS,
    'Content-Type': json ? 'application/json' : 'text/plain; charset=utf-8',
  });
  res.end(json ? JSON.stringify(body) : body);
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 10_000) {
        reject(new Error('body too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const validName = (u) => typeof u === 'string' && u.trim().length > 0 && u.length <= 100;

const entry = (u) => ({ username: u.username, limit: u.limit, currentUsage: u.currentUsage ?? 0 });

async function take(req, res) {
  let username;
  try {
    username = JSON.parse(await readBody(req))?.username;
  } catch {
    return send(res, 400, { error: 'body must be JSON like {"username": "demo"}' });
  }
  if (!validName(username)) return send(res, 400, { error: 'missing or invalid username' });
  username = username.trim();

  return serial(() => {
    const data = readLimits();
    const user = find(data, username);
    if (!user || typeof user.limit !== 'number') return send(res, 200, { allowed: true, limit: null });
    const used = Number(user.currentUsage) || 0;
    if (used >= user.limit) {
      return send(res, 429, { allowed: false, limit: user.limit, currentUsage: used });
    }
    user.currentUsage = used + 1;
    writeLimits(data);
    send(res, 200, { allowed: true, limit: user.limit, currentUsage: user.currentUsage });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, 'ok');
    if (req.method === 'POST' && url.pathname === '/take') return await take(req, res);
    const m = url.pathname.match(/^\/usage\/([^/]+)$/);
    if (req.method === 'GET' && m) {
      const user = find(readLimits(), decodeURIComponent(m[1]));
      return user ? send(res, 200, entry(user)) : send(res, 404, { error: 'unknown user' });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: 'server error' });
  }
});

server.listen(PORT, HOST, () => console.log(`limits-server on http://${HOST}:${PORT}, data ${FILE}`));
