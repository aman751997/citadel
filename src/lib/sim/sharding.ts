// Pure key-distribution logic for ShardingSim. Deterministic: same keys -> same shards every run.
export const SLOTS = 16384;
export type ShardMode = 'mod' | 'ring' | 'slots';
export type Router = (hash: number) => number; // hash -> node id

// FNV-1a plus the murmur3 finalizer; plain FNV-1a clusters badly on near-identical strings like user:1, user:2.
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export const keyName = (i: number) => `user:${i}`;
export const hashKeys = (n: number) => Array.from({ length: n }, (_, i) => hash32(keyName(i)));

export const modRouter = (nodes: number[]): Router => (h) => nodes[h % nodes.length];

export interface RingPoint { p: number; id: number }
export function ringPoints(nodes: number[], vnodes: number): RingPoint[] {
  const pts: RingPoint[] = [];
  for (const id of nodes) for (let v = 0; v < vnodes; v++) pts.push({ p: hash32(`node-${id}#${v}`), id });
  return pts.sort((a, b) => a.p - b.p);
}
export function ringRouter(nodes: number[], vnodes: number): Router {
  const pts = ringPoints(nodes, vnodes);
  return (h) => {
    let lo = 0, hi = pts.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (pts[mid].p >= h) hi = mid; else lo = mid + 1; }
    return pts[lo === pts.length ? 0 : lo].id; // wrap around the ring
  };
}

// Keeps as many existing slots in place as possible: owners above their fair share release the surplus,
// orphaned slots (-1 or a removed node) are handed to owners below it. Like redis-cli --cluster reshard.
export function rebalanceSlots(table: number[], nodes: number[]): number[] {
  const out = table.slice();
  const n = nodes.length;
  const target = new Map(nodes.map((id, i) => [id, Math.floor(SLOTS / n) + (i < SLOTS % n ? 1 : 0)]));
  const owned = new Map(nodes.map((id) => [id, 0]));
  const free: number[] = [];
  for (let s = 0; s < SLOTS; s++) {
    const o = out[s];
    if (owned.has(o) && owned.get(o)! < target.get(o)!) owned.set(o, owned.get(o)! + 1);
    else { free.push(s); out[s] = -1; }
  }
  let f = 0;
  for (const id of nodes) while (owned.get(id)! < target.get(id)!) { out[free[f++]] = id; owned.set(id, owned.get(id)! + 1); }
  return out;
}
export const initialSlotTable = (nodes: number[]) => rebalanceSlots(new Array(SLOTS).fill(-1), nodes);
export const slotRouter = (table: number[]): Router => (h) => table[h % SLOTS];

export const ownersOf = (hashes: number[], router: Router) => hashes.map(router);

export function moveFraction(before: number[], after: number[]): number {
  let moved = 0;
  for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) moved++;
  return before.length ? moved / before.length : 0;
}

// Key 0 is the hot key; it carries `share` of all traffic, every other key weighs 1.
export function hotWeights(n: number, share: number): number[] {
  const w = new Array(n).fill(1);
  if (n > 1) w[0] = ((n - 1) * share) / (1 - share);
  return w;
}

export function loads(owners: number[], nodes: number[], weights?: number[]): number[] {
  const idx = new Map(nodes.map((id, i) => [id, i]));
  const out = new Array(nodes.length).fill(0);
  owners.forEach((o, i) => { out[idx.get(o)!] += weights ? weights[i] : 1; });
  return out;
}

export function imbalance(l: number[]): number {
  const mean = l.reduce((a, b) => a + b, 0) / l.length;
  return mean === 0 ? 1 : Math.max(...l) / mean;
}
