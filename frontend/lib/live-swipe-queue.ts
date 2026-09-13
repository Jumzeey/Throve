import type { LiveSession } from '@/data/types';

export type LiveSwipeQueue = {
  ids: string[];
  index: number;
  prevId: string | null;
  nextId: string | null;
};

/**
 * Ordered queue of currently live sessions for Instagram-style vertical swipe.
 * Preserves liveNow order (viewers desc from the API).
 */
export function buildLiveSwipeQueue(
  liveNow: LiveSession[],
  currentId: string | undefined,
  opts?: { excludeHost?: string },
): LiveSwipeQueue {
  const ids = liveNow
    .filter((session) => session.status === 'live')
    .filter((session) => (opts?.excludeHost ? session.host !== opts.excludeHost : true))
    .map((session) => session.id);

  // Always keep the current live in the queue even if filters removed it
  // (e.g. viewing your own broadcast as a viewer deep link).
  if (currentId && !ids.includes(currentId)) {
    ids.unshift(currentId);
  }

  const index = currentId ? ids.indexOf(currentId) : -1;
  if (index < 0) {
    return { ids, index: -1, prevId: null, nextId: null };
  }

  return {
    ids,
    index,
    prevId: index > 0 ? ids[index - 1] ?? null : null,
    nextId: index < ids.length - 1 ? ids[index + 1] ?? null : null,
  };
}
