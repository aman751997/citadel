// Pure model of a cache stampede in the first second after a hot key expires. No DOM.
export type Mitigation = 'none' | 'lock' | 'jitter' | 'swr';
export interface Input {
  requests: number;   // requests arriving in the same one-second window
  hitRatio: number;   // percent of them that still hit a warm key
  capacity: number;   // DB queries per second it can serve
  ttlSec: number;
  jitterPct: number;  // percent of TTL over which expiries are spread
  refillMs: number;   // time for one DB query to refill the key
  mitigation: Mitigation;
}
export interface Result { misses: number; queries: number; overloaded: boolean; waiting: number; waitMs: number; windowSec: number }

export const missesFor = (rps: number, hitRatio: number) => Math.round(rps * (100 - hitRatio) / 100);

export function stampede(i: Input): Result {
  const misses = missesFor(i.requests, i.hitRatio);
  const windowSec = Math.max(1, Math.round(i.ttlSec * i.jitterPct / 100));
  let queries = misses;
  if (i.mitigation === 'lock' || i.mitigation === 'swr') queries = misses > 0 ? 1 : 0;
  if (i.mitigation === 'jitter') queries = Math.ceil(misses / windowSec);
  // Users who must wait for a DB answer; stale-while-revalidate serves old data instead.
  const waiting = i.mitigation === 'swr' ? 0 : i.mitigation === 'lock' ? misses : queries;
  const queueMs = (queries / i.capacity) * 1000;
  const waitMs = waiting === 0 ? 0 : Math.round(Math.max(i.refillMs, queueMs));
  return { misses, queries, overloaded: queries > i.capacity, waiting, waitMs, windowSec };
}
