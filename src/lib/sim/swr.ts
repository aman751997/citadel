// Pure model of stale-while-revalidate vs a single TTL. Times in milliseconds. No DOM.
export type Kind = 'fresh' | 'stale' | 'miss';
export interface Config { softMs: number; hardMs: number; originMs: number; swr: boolean }
export interface Event { t: number; kind: Kind; latency: number; triggered: boolean }
export interface Run { events: Event[]; refreshes: { start: number; end: number }[]; fills: number[] }

export const HIT_MS = 1;

// ponytail: swr misses join an in-flight refresh (single-flight); single-TTL misses each call origin.
export function simulate(times: number[], c: Config): Run {
  const events: Event[] = [];
  const refreshes: Run['refreshes'] = [];
  const fills = [0];
  let fill = 0;
  let inflight: { start: number; end: number } | null = null;
  const land = (t: number) => { if (inflight && inflight.end <= t) { fill = inflight.end; fills.push(fill); inflight = null; } };
  for (const t of [...times].sort((a, b) => a - b)) {
    land(t);
    const age = t - fill;
    if (age < c.softMs) { events.push({ t, kind: 'fresh', latency: HIT_MS, triggered: false }); continue; }
    if (c.swr) {
      if (age < c.hardMs) {
        const triggered = !inflight;
        if (!inflight) { inflight = { start: t, end: t + c.originMs }; refreshes.push(inflight); }
        events.push({ t, kind: 'stale', latency: HIT_MS, triggered });
      } else if (inflight) {
        events.push({ t, kind: 'miss', latency: inflight.end - t, triggered: false });
      } else {
        inflight = { start: t, end: t + c.originMs }; refreshes.push(inflight);
        events.push({ t, kind: 'miss', latency: c.originMs, triggered: true });
      }
    } else {
      // Every expired request calls origin itself; the first to finish refills the cache.
      const r = { start: t, end: t + c.originMs };
      refreshes.push(r);
      if (!inflight || r.end < inflight.end) inflight = r;
      events.push({ t, kind: 'miss', latency: c.originMs, triggered: true });
    }
  }
  return { events, refreshes, fills };
}

export function stats(run: Run) {
  const l = run.events.map((e) => e.latency).sort((a, b) => a - b);
  if (!l.length) return { p50: 0, worst: 0, originCalls: 0, blocked: 0 };
  return { p50: l[Math.ceil(l.length / 2) - 1], worst: l[l.length - 1], originCalls: run.refreshes.length, blocked: run.events.filter((e) => e.latency > HIT_MS).length };
}

// Cache-state bands for drawing: fresh / stale / expired from each fill until the next.
export function zones(run: Run, c: Config, horizon: number) {
  const out: { from: number; to: number; state: Kind }[] = [];
  run.fills.forEach((f, i) => {
    const next = Math.min(run.fills[i + 1] ?? horizon, horizon);
    const hard = c.swr ? c.hardMs : c.softMs;
    const bands: [number, Kind][] = [[f + c.softMs, 'fresh'], [f + hard, 'stale'], [Infinity, 'miss']];
    let from = f;
    for (const [end, state] of bands) {
      const to = Math.min(end, next);
      if (to > from) out.push({ from, to, state });
      from = Math.max(from, to);
    }
  });
  return out;
}
