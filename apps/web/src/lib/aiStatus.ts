// Orava's AI status on this device. lib/api.ts reports every 429 `ai_limit` (LimitModal pops up,
// the chat is grayed out until the limit resets) and every 503 `ai_unavailable` (the server has
// no Gemini key: the chat stays grayed out until sign-out or a reload). Both clear on sign-out,
// so the next user doesn't inherit them. The limits themselves are counted on the server.

import { useSyncExternalStore } from 'react';

import { onSignedOut } from './auth';

export interface AiLimitHit {
  /** The server's words, e.g. "This account can ask Orava 30 times an hour." */
  message: string;
  /** When the next request is allowed, ms since epoch. */
  retryAt: number;
}

/** Why Orava can't be asked right now: no Gemini key on the server, or the AI limit is reached. */
export type AiBlock = 'unavailable' | 'limited';

let unavailable = false;
let limited = false;
let limitTimer: ReturnType<typeof setTimeout> | undefined;
const limitListeners = new Set<(hit: AiLimitHit) => void>();
const statusListeners = new Set<() => void>();

const subscribe = <T>(set: Set<T>, listener: T) => {
  set.add(listener);
  return () => {
    set.delete(listener);
  };
};

export const onLimitReached = (listener: (hit: AiLimitHit) => void) =>
  subscribe(limitListeners, listener);

const statusChanged = () => statusListeners.forEach((l) => l());
const subscribeStatus = (listener: () => void) => subscribe(statusListeners, listener);
const currentBlock = (): AiBlock | null =>
  unavailable ? 'unavailable' : limited ? 'limited' : null;

export function reportLimit(hit: AiLimitHit) {
  limitListeners.forEach((l) => l(hit));
  limited = true;
  clearTimeout(limitTimer);
  limitTimer = setTimeout(
    () => {
      limited = false;
      statusChanged();
    },
    Math.max(0, hit.retryAt - Date.now()),
  );
  statusChanged();
}

export function reportUnavailable() {
  unavailable = true;
  statusChanged();
}

onSignedOut(() => {
  clearTimeout(limitTimer);
  unavailable = false;
  limited = false;
  statusChanged();
});

/** Why Orava can't be asked right now, or null when it can. */
export const useAiBlocked = () => useSyncExternalStore(subscribeStatus, currentBlock);
