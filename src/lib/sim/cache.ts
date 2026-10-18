// Exact LRU and LFU caches for LruLfuSim. LFU ties are broken by least recently used.
export type Policy = 'lru' | 'lfu';
export interface Entry { key: string; freq: number; lastUsed: number }
export interface AccessResult { hit: boolean; evicted?: Entry }

export class Cache {
  private entries = new Map<string, Entry>();
  private clock = 0;
  hits = 0;
  misses = 0;
  policy: Policy;
  capacity: number;
  constructor(policy: Policy, capacity: number) { this.policy = policy; this.capacity = capacity; }

  access(key: string): AccessResult {
    this.clock++;
    const e = this.entries.get(key);
    if (e) {
      e.freq++; e.lastUsed = this.clock; this.hits++;
      return { hit: true };
    }
    this.misses++;
    let evicted: Entry | undefined;
    if (this.entries.size >= this.capacity) {
      evicted = this.victim();
      this.entries.delete(evicted.key);
    }
    this.entries.set(key, { key, freq: 1, lastUsed: this.clock });
    return { hit: false, evicted: evicted && { ...evicted } };
  }

  private victim(): Entry {
    let v: Entry | undefined;
    for (const e of this.entries.values()) {
      if (!v) { v = e; continue; }
      const better = this.policy === 'lru'
        ? e.lastUsed < v.lastUsed
        : e.freq < v.freq || (e.freq === v.freq && e.lastUsed < v.lastUsed);
      if (better) v = e;
    }
    return v!;
  }

  // LRU: most recent first. LFU: highest frequency first, then most recent.
  contents(): Entry[] {
    return [...this.entries.values()]
      .map((e) => ({ ...e }))
      .sort((a, b) => this.policy === 'lru' ? b.lastUsed - a.lastUsed : b.freq - a.freq || b.lastUsed - a.lastUsed);
  }
  get accesses() { return this.clock; }
  get hitRatio() { return this.clock ? this.hits / this.clock : 0; }
}

export interface PolicyStep {
  hit: boolean;
  evicted?: Entry;
  accessAge?: number; // for evictions: accesses since the victim was last touched
  contents: Entry[];
  hits: number;
  misses: number;
  hitRatio: number;
}
export interface CacheStep { key?: string; lru: PolicyStep; lfu: PolicyStep; caption: string }

export const PRESETS: Record<string, { label: string; seq: string }> = {
  scan: { label: 'Loop just over capacity', seq: 'A B C D E A B C D E A B C D E A B C D E' },
  hotscan: { label: 'Hot set + one-off scan', seq: 'A B C A B C A B C A B C D E F G H I J K L A B C A B C' },
  skew: { label: 'Frequency-skewed', seq: 'A A B A C A A B A D A B A E A A B C A F A B A A' },
  stale: { label: 'Once-hot key goes stale', seq: 'A A A A A A A A B C D E B C D E B C D E B C D E' },
};

const snap = (c: Cache, r: AccessResult): PolicyStep => ({
  hit: r.hit, evicted: r.evicted, contents: c.contents(), hits: c.hits, misses: c.misses, hitRatio: c.hitRatio,
});

function describe(name: string, policy: Policy, s: PolicyStep, tickNow: number): string {
  if (s.hit) return `${name} hit.`;
  if (!s.evicted) return `${name} miss (free slot, nothing evicted).`;
  const e = s.evicted;
  const why = policy === 'lru'
    ? `least recently used, last touched ${tickNow - e.lastUsed} accesses ago`
    : `lowest frequency (${e.freq}), ties go to the oldest`;
  return `${name} miss, evicted ${e.key} (${why}).`;
}

// Step 0 is the empty starting state, so the stepper always has something to show.
export function buildSteps(seq: string[], capacity: number): CacheStep[] {
  const lru = new Cache('lru', capacity), lfu = new Cache('lfu', capacity);
  const empty: PolicyStep = { hit: false, contents: [], hits: 0, misses: 0, hitRatio: 0 };
  const steps: CacheStep[] = [{
    lru: empty, lfu: empty,
    caption: seq.length ? 'Both caches start empty. Press Next step to replay the accesses.' : 'Both caches are empty. Click a key below to access it.',
  }];
  seq.forEach((key, i) => {
    const a = lru.access(key), b = lfu.access(key);
    const l = snap(lru, a), f = snap(lfu, b);
    steps.push({ key, lru: l, lfu: f, caption: `Access ${key}. ${describe('LRU', 'lru', l, i + 1)} ${describe('LFU', 'lfu', f, i + 1)}` });
  });
  return steps;
}

export const parseSeq = (s: string) => s.split(/\s+/).filter(Boolean);
