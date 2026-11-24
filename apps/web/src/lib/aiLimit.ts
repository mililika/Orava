// "Orava's AI limit is reached": lib/api.ts reports every 429 `ai_limit` here, and LimitModal
// shows it. The limits themselves are counted on the server.

/** "5 min" until `at` (at least "1 min"). */
export function minutesUntil(at: number) {
  return `${Math.max(1, Math.ceil((at - Date.now()) / 60000))} min`;
}

export interface AiLimitHit {
  /** The server's words, e.g. "This account can ask Orava 30 times an hour." */
  message: string;
  /** When the next request is allowed, ms since epoch. */
  retryAt: number;
}

type Listener = (hit: AiLimitHit) => void;
const listeners = new Set<Listener>();

export function onLimitReached(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportLimit(hit: AiLimitHit) {
  listeners.forEach((l) => l(hit));
}
