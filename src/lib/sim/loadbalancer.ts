// Pure tick-based model of one load balancer in front of equal servers, one of which may slow down. No DOM.
export type Algo = 'roundrobin' | 'random' | 'leastconn' | 'p2c';
export interface Input {
  algo: Algo;
  servers: number;
  arrivalsPerTick: number;
  capacityPerTick: number;  // requests one healthy server finishes per tick
  slowFactor: number;       // 1 = healthy; server 0 finishes capacity * slowFactor per tick
  staleTicks: number;       // 0 = balancer sees live queue lengths; n = it sees a snapshot refreshed every n ticks
  ticks: number;
  seed: number;
}
export interface Result { sent: number[]; queue: number[]; maxQueue: number; backlog: number; slowShare: number }

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function simulate(i: Input): Result {
  const rand = rng(i.seed);
  const n = i.servers;
  const queue = new Array<number>(n).fill(0);
  const sent = new Array<number>(n).fill(0);
  let view = queue.slice();
  let rr = 0;
  let maxQueue = 0;
  const cap = (s: number) => Math.round(i.capacityPerTick * (s === 0 ? i.slowFactor : 1));
  const minIndex = (seen: number[]) => seen.reduce((best, q, s) => (q < seen[best] ? s : best), 0);

  for (let t = 0; t < i.ticks; t++) {
    if (i.staleTicks > 0 && t % i.staleTicks === 0) view = queue.slice();
    for (let r = 0; r < i.arrivalsPerTick; r++) {
      const seen = i.staleTicks === 0 ? queue : view;
      let s: number;
      if (i.algo === 'roundrobin') s = rr++ % n;
      else if (i.algo === 'random') s = Math.floor(rand() * n);
      else if (i.algo === 'leastconn') s = minIndex(seen);
      else {
        const a = Math.floor(rand() * n);
        const b = (a + 1 + Math.floor(rand() * (n - 1))) % n;
        s = seen[b] < seen[a] ? b : a;
      }
      queue[s]++;
      sent[s]++;
    }
    for (let s = 0; s < n; s++) queue[s] = Math.max(0, queue[s] - cap(s));
    maxQueue = Math.max(maxQueue, ...queue);
  }
  const total = sent.reduce((a, b) => a + b, 0);
  return { sent, queue, maxQueue, backlog: queue.reduce((a, b) => a + b, 0), slowShare: total ? sent[0] / total : 0 };
}
