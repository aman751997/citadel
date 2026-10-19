// Deterministic option shuffling for Quiz. An "order" lists ORIGINAL option indices in display order,
// so stored picks and `answer` stay in author index space; only the DOM order changes.

export interface ShuffleSpec { options: number; answer: number; fixed?: boolean }

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates over 0..n-1, seeded by a string. order[displayPos] = originalIndex. */
export function permutation(n: number, seed: string): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const next = rng(hashSeed(seed));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Where the correct answer lands on screen. */
export function answerPosition(order: number[], answer: number): number {
  return order.indexOf(answer);
}

/** One order per question. Fixed (or 2-option-less) questions keep author order. */
export function quizOrders(seed: string, specs: ShuffleSpec[]): number[][] {
  const identity = (n: number) => Array.from({ length: n }, (_, i) => i);
  const movable = (s: ShuffleSpec) => !s.fixed && s.options >= 2;
  const orders = specs.map((s, qi) => (movable(s) ? permutation(s.options, `${seed}|${qi}`) : identity(s.options)));
  const positions = () => orders.map((o, qi) => answerPosition(o, specs[qi].answer));
  const sameEverywhere = () => new Set(positions()).size === 1;
  if (specs.length >= 3 && specs.every((s) => s.options >= 3) && sameEverywhere()) {
    const qi = specs.findLastIndex(movable);
    if (qi >= 0) {
      for (let salt = 1; salt <= 32 && sameEverywhere(); salt++) orders[qi] = permutation(specs[qi].options, `${seed}|${qi}|${salt}`);
    }
  }
  return orders;
}
