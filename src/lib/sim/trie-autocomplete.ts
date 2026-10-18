// Pure logic for TrieAutocompleteSim: a top-K-per-prefix index, lookups, and two ways to absorb a count change
// (batch rebuild vs in-place patch). Lists are kept per prefix, which is what a trie node stores.
export type Scores = Record<string, number>;
export interface Index { k: number; scores: Scores; lists: Map<string, string[]> }

export const SAMPLE: Scores = {
  car: 900, cat: 700, dog: 600, catalog: 500, card: 400, door: 350, can: 300, cap: 260, care: 150, cab: 120,
};

export const prefixesOf = (q: string): string[] => Array.from({ length: q.length + 1 }, (_, i) => q.slice(0, i));

const ranker = (s: Scores) => (a: string, b: string) => (s[b] - s[a]) || (a < b ? -1 : a > b ? 1 : 0);

export function buildIndex(scores: Scores, k: number): Index {
  const candidates = new Map<string, string[]>();
  for (const q of Object.keys(scores)) {
    if (!q) continue;
    for (const p of prefixesOf(q)) {
      const list = candidates.get(p);
      if (list) list.push(q); else candidates.set(p, [q]);
    }
  }
  const better = ranker(scores);
  const lists = new Map<string, string[]>();
  for (const [p, qs] of candidates) lists.set(p, qs.sort(better).slice(0, k));
  return { k, scores: { ...scores }, lists };
}

export interface Lookup {
  path: string[];            // trie nodes visited, root first; stops where the prefix leaves the tree
  found: boolean;
  top: { q: string; score: number }[];
  hops: number;              // characters typed: the work the precomputed lookup does
  scanned: number;           // queries below this prefix: the work a scan-and-sort would do
}

export function suggest(idx: Index, prefix: string): Lookup {
  const path: string[] = [];
  for (const p of prefixesOf(prefix)) {
    if (!idx.lists.has(p)) break;
    path.push(p);
  }
  const found = idx.lists.has(prefix);
  const top = (idx.lists.get(prefix) ?? []).map((q) => ({ q, score: idx.scores[q] }));
  const scanned = Object.keys(idx.scores).filter((q) => q.startsWith(prefix)).length;
  return { path, found, top, hops: prefix.length, scanned };
}

// Streaming-style update: merge the changed query into the lists of its own prefixes and nothing else.
// Exact when the score goes up. When it goes down, a query that was never in the list may deserve a slot.
export function patchIndex(idx: Index, query: string, newScore: number): Index {
  const scores = { ...idx.scores, [query]: newScore };
  const better = ranker(scores);
  const lists = new Map(idx.lists);
  for (const p of prefixesOf(query)) {
    const merged = Array.from(new Set([...(lists.get(p) ?? []), query]));
    lists.set(p, merged.sort(better).slice(0, idx.k));
  }
  return { k: idx.k, scores, lists };
}

const differs = (a: string[] | undefined, b: string[] | undefined) => (a ?? []).join('\u0000') !== (b ?? []).join('\u0000');

export function changedPrefixes(a: Index, b: Index): string[] {
  const keys = new Set([...a.lists.keys(), ...b.lists.keys()]);
  return [...keys].filter((p) => differs(a.lists.get(p), b.lists.get(p))).sort();
}

// Prefixes where this index disagrees with a full rebuild from its own scores.
export const wrongPrefixes = (idx: Index): string[] => changedPrefixes(idx, buildIndex(idx.scores, idx.k));
