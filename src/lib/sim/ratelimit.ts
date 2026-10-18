// Pure rate-limiter logic for TokenBucketSim. Time is a plain number of simulated seconds.
export interface Limiter {
  allow(t: number): boolean;
  level(t: number): number; // token bucket: tokens left; windows: requests counted so far
}

export class TokenBucket implements Limiter {
  tokens: number;
  last = 0;
  capacity: number;
  refillPerSec: number;
  constructor(capacity: number, refillPerSec: number) { this.capacity = capacity; this.refillPerSec = refillPerSec; this.tokens = capacity; }
  private refill(t: number) {
    this.tokens = Math.min(this.capacity, this.tokens + (t - this.last) * this.refillPerSec);
    this.last = t;
  }
  allow(t: number) {
    this.refill(t);
    if (this.tokens >= 1) { this.tokens -= 1; return true; }
    return false;
  }
  level(t: number) { return Math.min(this.capacity, this.tokens + (t - this.last) * this.refillPerSec); }
}

export class FixedWindow implements Limiter {
  private win = 0;
  private count = 0;
  limit: number;
  windowSec: number;
  constructor(limit: number, windowSec: number) { this.limit = limit; this.windowSec = windowSec; }
  private roll(t: number) {
    const w = Math.floor(t / this.windowSec);
    if (w !== this.win) { this.win = w; this.count = 0; }
  }
  allow(t: number) {
    this.roll(t);
    if (this.count < this.limit) { this.count++; return true; }
    return false;
  }
  level(t: number) { return Math.floor(t / this.windowSec) === this.win ? this.count : 0; }
}

export class SlidingLog implements Limiter {
  private log: number[] = [];
  limit: number;
  windowSec: number;
  constructor(limit: number, windowSec: number) { this.limit = limit; this.windowSec = windowSec; }
  private trim(t: number) { while (this.log.length && this.log[0] <= t - this.windowSec) this.log.shift(); }
  allow(t: number) {
    this.trim(t);
    if (this.log.length < this.limit) { this.log.push(t); return true; }
    return false;
  }
  level(t: number) { return this.log.filter((x) => x > t - this.windowSec).length; }
}

// Most allowed requests inside any span of `span` seconds (half-open, like the window limiters use).
export function maxInSpan(times: number[], span: number): number {
  let best = 0, lo = 0;
  for (let hi = 0; hi < times.length; hi++) {
    while (times[hi] - times[lo] >= span) lo++;
    best = Math.max(best, hi - lo + 1);
  }
  return best;
}

export type Algo = 'bucket' | 'fixed' | 'sliding';
export const ALGOS: Algo[] = ['bucket', 'fixed', 'sliding'];

export interface Params { capacity: number; refill: number; reqRate: number; windowSec: number }
export interface Req { t: number; ok: boolean }
export interface Sample { t: number; v: number }
export interface Lane { limiter: Limiter; reqs: Req[]; samples: Sample[]; allowed: number; rejected: number }

export const windowLimit = (p: Params) => Math.max(1, Math.round(p.refill * p.windowSec));

function makeLimiter(a: Algo, p: Params): Limiter {
  if (a === 'bucket') return new TokenBucket(p.capacity, p.refill);
  if (a === 'fixed') return new FixedWindow(windowLimit(p), p.windowSec);
  return new SlidingLog(windowLimit(p), p.windowSec);
}

// Feeds the same arrival stream (steady rate + scheduled bursts) to all three limiters.
export class RateSim {
  now = 0;
  lanes!: Record<Algo, Lane>;
  params: Params;
  private nextArrival = Infinity;
  private scheduled: { t: number; n: number }[] = [];
  constructor(params: Params, startAt = 0) { this.params = params; this.reset(startAt); }

  reset(startAt = 0) {
    this.now = startAt;
    this.scheduled = [];
    const mk = (a: Algo): Lane => {
      const limiter = makeLimiter(a, this.params);
      return { limiter, reqs: [], samples: [{ t: startAt, v: limiter.level(startAt) }], allowed: 0, rejected: 0 };
    };
    this.lanes = { bucket: mk('bucket'), fixed: mk('fixed'), sliding: mk('sliding') };
    // The first Limiter instances were built at t=0; a late start must not count as idle refill time.
    if (startAt > 0) (this.lanes.bucket.limiter as TokenBucket).last = startAt;
    this.nextArrival = this.params.reqRate > 0 ? startAt + 1 / this.params.reqRate : Infinity;
  }

  setReqRate(rate: number) {
    this.params.reqRate = rate;
    this.nextArrival = rate > 0 ? this.now + 1 / rate : Infinity;
  }

  scheduleBurst(t: number, n: number) { this.scheduled.push({ t, n }); this.scheduled.sort((a, b) => a.t - b.t); }
  burst(n: number) { this.fire(this.now, n); }

  private fire(t: number, n: number) {
    for (const a of ALGOS) {
      const lane = this.lanes[a];
      lane.samples.push({ t, v: lane.limiter.level(t) }); // pre-event point keeps the drop vertical
      for (let i = 0; i < n; i++) {
        const ok = lane.limiter.allow(t);
        lane.reqs.push({ t, ok });
        if (ok) lane.allowed++; else lane.rejected++;
      }
      lane.samples.push({ t, v: lane.limiter.level(t) });
    }
  }

  advance(dt: number) {
    const end = this.now + dt;
    for (;;) {
      const sched = this.scheduled.length ? this.scheduled[0].t : Infinity;
      const t = Math.min(sched, this.nextArrival);
      if (t > end) break;
      this.now = t;
      if (sched <= this.nextArrival) { this.fire(t, this.scheduled.shift()!.n); }
      else { this.fire(t, 1); this.nextArrival += 1 / this.params.reqRate; }
    }
    this.now = end;
    for (const a of ALGOS) this.lanes[a].samples.push({ t: end, v: this.lanes[a].limiter.level(end) });
    this.trim();
  }

  private trim() {
    const keepFrom = this.now - 30;
    for (const a of ALGOS) {
      const s = this.lanes[a].samples;
      while (s.length > 2 && s[1].t < keepFrom) s.shift();
      const r = this.lanes[a].reqs;
      if (r.length > 4000) r.splice(0, r.length - 4000);
    }
  }

  allowedTimes(a: Algo) { return this.lanes[a].reqs.filter((r) => r.ok).map((r) => r.t); }
}
