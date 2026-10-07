// Independent practice for the Advanced Graphs lesson. Prompts never name the pattern or the technique;
// inputs are generated from the variant with a seeded generator, and every answer is computed here and
// re-derived by brute force in tests/advanced-graphs.test.ts.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  order: 'Settle things in dependency order: repeatedly take whatever has nothing left to wait for',
  groups: 'Merge groups as links arrive; ask whether two things already share a group',
  cheapest: 'Always settle the cheapest-known destination next, expanding outward',
  network: 'Grow one network by always adding the cheapest link that reaches something new',
  rounds: 'A fixed number of rounds, each extending every route by at most one more link',
  other: 'Another tool fits better: plain level-by-level search',
} as const;

export const conceptIds = [
  'can-finish', 'blocked', 'build-order', 'alien', 'components', 'valid-tree', 'redundant', 'delay',
  'cable', 'k-stops', 'safe', 'parallel', 'accounts', 'ratios', 'effort', 'hops',
] as const;
type ConceptId = typeof conceptIds[number];

// ---------- a small seeded generator ----------
function generator(id: string, variant: number) {
  let x = 2166136261;
  for (const ch of id) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0;
  x = (x ^ Math.imul(variant + 1, 2654435761)) >>> 0 || 1;
  const next = (n: number) => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return (x >>> 8) % n; };
  const shuffle = <T>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = next(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return { next, shuffle };
}
const pairText = (ps: [number, number][]) => ps.map(([a, b]) => `(${a}, ${b})`).join(', ');
const tripleText = (ts: [number, number, number][]) => ts.map(([a, b, c]) => `(${a}, ${b}, ${c})`).join(', ');
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// ---------- solvers (the lesson's methods, in TypeScript) ----------
function kahnTaken(n: number, pairs: [number, number][]) {          // pairs (a, b): b before a
  const indeg = Array(n).fill(0), next: number[][] = range(n).map(() => []);
  for (const [a, b] of pairs) { next[b].push(a); indeg[a]++; }
  const ready = range(n).filter(i => indeg[i] === 0);
  let taken = 0;
  while (ready.length) { const c = ready.shift()!; taken++; for (const d of next[c]) if (--indeg[d] === 0) ready.push(d); }
  return taken;
}
class DSU {
  parent: number[]; size: number[]; sets: number;
  constructor(n: number) { this.parent = range(n); this.size = Array(n).fill(1); this.sets = n; }
  find(x: number): number { if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]); return this.parent[x]; }
  union(a: number, b: number) {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;
    if (this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra; this.size[ra] += this.size[rb]; this.sets--;
    return true;
  }
}
function dijkstra(n: number, roads: [number, number, number][], src: number) {   // O(n²) array version
  const dist: (number | null)[] = Array(n).fill(null), done = Array(n).fill(false);
  dist[src] = 0;
  for (;;) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!done[v] && dist[v] !== null && (u === -1 || dist[v]! < dist[u]!)) u = v;
    if (u === -1) return dist;
    done[u] = true;
    for (const [a, b, w] of roads) if (a === u && (dist[b] === null || dist[u]! + w < dist[b]!)) dist[b] = dist[u]! + w;
  }
}
const manhattan = (p: number[], q: number[]) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]);
function prim(points: [number, number][]) {
  const n = points.length, best = Array(n).fill(Infinity), inside = Array(n).fill(false);
  best[0] = 0;
  let total = 0;
  for (let round = 0; round < n; round++) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!inside[v] && (u === -1 || best[v] < best[u])) u = v;
    inside[u] = true; total += best[u];
    for (let v = 0; v < n; v++) if (!inside[v]) best[v] = Math.min(best[v], manhattan(points[u], points[v]));
  }
  return total;
}
function roundsFare(n: number, flights: [number, number, number][], src: number, dst: number, k: number) {
  let cost: (number | null)[] = Array(n).fill(null);
  cost[src] = 0;
  for (let r = 0; r <= k; r++) {
    const prev = [...cost];
    for (const [a, b, p] of flights) if (prev[a] !== null && (cost[b] === null || prev[a]! + p < cost[b]!)) cost[b] = prev[a]! + p;
  }
  return cost[dst] ?? -1;
}

function make(id: ConceptId, variant: number): Omit<Challenge, 'id'> {
  const v = Math.abs(Math.trunc(variant));
  const { next, shuffle } = generator(id, v);
  switch (id) {
    case 'can-finish': {
      const n = 3 + next(4);
      const pairs: [number, number][] = [];
      const seen = new Set<string>();
      const add = (a: number, b: number) => { if (a !== b && !seen.has(`${a},${b}`)) { seen.add(`${a},${b}`); pairs.push([a, b]); } };
      const perm = shuffle(range(n));
      const want = 2 + next(4);
      for (let t = 0; t < 30 && pairs.length < want; t++) {      // pairs consistent with a hidden order
        const i = next(n), j = next(n);
        if (i < j) add(perm[j], perm[i]);
      }
      if (v % 2 === 1) { const i = next(n - 1); add(perm[i], perm[i + 1 + next(n - 1 - i)]); }   // one rule that points backwards
      const answer = kahnTaken(n, pairs) === n;
      return {
        topic: 'Can every task with prerequisites be done?', section: 'course-schedule', strategy: 'order',
        prompt: `The guild runs workshops numbered 0 to ${n - 1}. A pair (a, b) means workshop b must be finished before workshop a can begin: ${pairText(pairs)}. Can every workshop be finished?`,
        question: 'Enter yes or no.', answer,
        hints: ['Which workshops can begin today, with nothing to wait for?', 'Count, for each workshop, how many unfinished workshops it waits for. Finishing one lowers the count of everything that waits on it.', 'Keep finishing workshops whose count is 0. If some are never reached, they wait on each other in a loop.'],
        rubric: ['Each pair becomes a one-way rule from b to a.', 'Only workshops with nothing left to wait for are taken; taking one releases the ones that waited on it.', 'Leftover workshops mean a loop of rules: answer no. O(V + E).'],
        explanation: answer ? 'Every workshop is eventually released: an order exists.' : 'Some workshops wait on each other in a loop, so they can never start.',
      };
    }
    case 'blocked': {
      const n = 4 + next(3);
      const pairs: [number, number][] = [];
      const seen = new Set<string>();
      const add = (a: number, b: number) => { if (a !== b && !seen.has(`${a},${b}`)) { seen.add(`${a},${b}`); pairs.push([a, b]); } };
      const cyc = shuffle(range(n)).slice(0, 2 + next(2));       // a small loop
      for (let i = 0; i < cyc.length; i++) add(cyc[(i + 1) % cyc.length], cyc[i]);
      const extra = 1 + next(3);
      for (let t = 0; t < extra; t++) add(next(n), next(n));
      const ps = shuffle(pairs);
      const answer = n - kahnTaken(n, ps);
      return {
        topic: 'How many tasks are stuck forever?', section: 'course-schedule', strategy: 'order',
        prompt: `Workshops 0 to ${n - 1}. A pair (a, b) means workshop b must be finished before workshop a can begin: ${pairText(ps)}. Workshops may run in any order the pairs allow. How many workshops can never be finished?`,
        question: 'Enter the number of workshops.', answer,
        hints: ['Take every workshop that can be taken. What is left?', 'Count unfinished prerequisites per workshop and keep taking the ones at 0.', 'The answer is the number of workshops never taken: they sit on a loop of rules or wait on one.'],
        rubric: ['Repeatedly take workshops with no unfinished prerequisite.', 'A workshop is never taken exactly when it is on a loop or downstream of one.', 'Answer n minus the number taken; O(V + E).'],
        explanation: `${answer} workshop(s) are stuck on or behind a loop of rules.`,
      };
    }
    case 'build-order': {
      const n = 4 + next(3);
      const perm = shuffle(range(n));
      const pairs: [number, number][] = [];
      for (let i = 0; i + 1 < n; i++) pairs.push([perm[i + 1], perm[i]]);    // consecutive rules force a unique order
      const extra = next(3);
      for (let t = 0; t < extra; t++) { const i = next(n - 2); const j = i + 2 + next(n - i - 2); pairs.push([perm[j], perm[i]]); }
      const dedup = [...new Map(pairs.map(p => [`${p[0]},${p[1]}`, p])).values()];
      return {
        topic: 'Produce the build order', section: 'course-schedule-ii', strategy: 'order',
        prompt: `Stations 0 to ${n - 1} are built one at a time. A pair (a, b) means station b must be built before station a: ${pairText(shuffle(dedup))}. Exactly one build order obeys every pair. What is it?`,
        question: 'Enter the stations in build order.', answer: perm,
        hints: ['Which station waits on nothing?', 'After building it, which station has nothing left to wait for?', 'Keep taking the one station whose count of unbuilt prerequisites is 0; that sequence is the order.'],
        rubric: ['Each pair (a, b) is a rule b → a.', 'The order in which zero-count stations are taken is a valid order.', 'Exactly one station is ever ready at a time here, which is why the order is unique.'],
        explanation: `The only order is ${perm.join(', ')}.`,
      };
    }
    case 'alien': {
      const bases: [string[], string][] = [
        [['wrt', 'wrf', 'er', 'ett', 'rftt'], 'wertf'],
        [['z', 'x'], 'zx'],
        [['z', 'x', 'z'], 'none'],
        [['abc', 'ab'], 'none'],
        [['ba', 'bc', 'ac', 'cab'], 'bac'],
        [['caa', 'aaa', 'aab'], 'cab'],
      ];
      const [words, order] = bases[v % bases.length];
      const letters = shuffle('abcdefghijklmnopqrstuvwxyz'.split(''));
      const used = [...new Set(words.join('').split(''))];
      const map = new Map(used.map((c, i) => [c, letters[i]]));
      const sub = (w: string) => w.split('').map(c => map.get(c)!).join('');
      const answer = order === 'none' ? 'none' : sub(order);
      return {
        topic: 'Recover an unknown alphabet', section: 'alien-dictionary', strategy: 'order',
        prompt: `A newly found dictionary lists these words, already sorted by an unknown ordering of its letters: ${words.map(w => `"${sub(w)}"`).join(', ')}. Give every letter that appears, each once, in its true order as one string — or type none if no ordering of the letters could produce this list. (When an order exists here, it is unique.)`,
        question: 'Enter the letters as one string, or none.', answer,
        hints: ['Two neighbouring words disagree first at one position. What does that one position prove?', 'Each neighbouring pair gives at most one rule: first word’s letter before second word’s letter. A word listed before its own shorter prefix is impossible.', 'Order the letters so every rule points forward; if the rules loop, no order exists.'],
        rubric: ['Only adjacent words, and only their first difference, give rules.', 'A longer word before its own prefix makes the list impossible.', 'Letters are ordered by repeatedly taking a letter with no unplaced letter before it; a loop means none.'],
        explanation: answer === 'none' ? 'The list contradicts itself: no alphabet sorts it.' : `The rules chain into exactly one alphabet: ${answer}.`,
      };
    }
    case 'components': {
      const n = 5 + next(4);
      const pairs: [number, number][] = [];
      const seen = new Set<string>();
      const m = 2 + next(5);
      for (let t = 0; t < 40 && pairs.length < m; t++) {
        const a = next(n), b = next(n), key = `${Math.min(a, b)},${Math.max(a, b)}`;
        if (a !== b && !seen.has(key)) { seen.add(key); pairs.push([a, b]); }
      }
      const d = new DSU(n);
      for (const [a, b] of pairs) d.union(a, b);
      const answer = d.sets;
      return {
        topic: 'Count separate networks', section: 'connected-components', strategy: 'groups',
        prompt: `${n} junctions, numbered 0 to ${n - 1}, are joined by two-way tracks: ${pairText(pairs)}. How many separate networks are there? A junction with no tracks is a network on its own.`,
        question: 'Enter the number of networks.', answer,
        hints: ['Start with one network per junction. What does a track between two different networks do to the count?', 'Keep, for every junction, a pointer toward the head of its group; two junctions share a group when their heads match.', 'For each track, merge the two heads if they differ and lower the count by one.'],
        rubric: ['The count starts at n.', 'Each track that joins two different groups lowers it by exactly one; a track inside one group changes nothing.', 'Near-constant amortised per track with path compression and union by size.'],
        explanation: `${answer} separate network(s).`,
      };
    }
    case 'valid-tree': {
      const n = 4 + next(4);
      let pairs: [number, number][];
      if (v % 3 === 0) {
        const perm = shuffle(range(n));
        pairs = range(n).slice(1).map(i => [perm[i], perm[next(i)]] as [number, number]);
      } else {
        pairs = [];
        const seen = new Set<string>();
        const m = n - 2 + next(3);
        for (let t = 0; t < 60 && pairs.length < m; t++) {
          const a = next(n), b = next(n), key = `${Math.min(a, b)},${Math.max(a, b)}`;
          if (a !== b && !seen.has(key)) { seen.add(key); pairs.push([a, b]); }
        }
      }
      pairs = shuffle(pairs);
      const d = new DSU(n);
      const answer = pairs.length === n - 1 && pairs.every(([a, b]) => d.union(a, b));
      return {
        topic: 'One piece, no loops', section: 'graph-valid-tree', strategy: 'groups',
        prompt: `${n} junctions, numbered 0 to ${n - 1}, are joined by two-way tracks: ${pairText(pairs)}. Is there exactly one route between every two junctions (a route never visits a junction twice)?`,
        question: 'Enter yes or no.', answer,
        hints: ['“Exactly one route between every two” means connected and loop-free. How many tracks does that need?', 'If the number of tracks is not n − 1, the answer is already no.', 'Otherwise merge groups track by track; a track whose ends are already in one group closes a loop.'],
        rubric: ['Exactly n − 1 tracks are required.', 'No track may join two junctions that are already connected.', 'Both together imply one connected piece; either alone can be fooled.'],
        explanation: answer ? `${pairs.length} = n − 1 tracks and no loop: one route between every two junctions.` : pairs.length !== n - 1 ? `${pairs.length} tracks, but ${n} junctions need exactly ${n - 1}.` : 'There are n − 1 tracks, but one of them closes a loop, so something is cut off.',
      };
    }
    case 'redundant': {
      const n = 4 + next(4);
      const perm = shuffle(range(n).map(i => i + 1));
      const pairs: [number, number][] = range(n).slice(1).map(i => { const p = perm[next(i)]; return [Math.min(perm[i], p), Math.max(perm[i], p)] as [number, number]; });
      const have = new Set(pairs.map(([a, b]) => `${a},${b}`));
      for (;;) {
        const a = 1 + next(n), b = 1 + next(n);
        if (a !== b && !have.has(`${Math.min(a, b)},${Math.max(a, b)}`)) { pairs.push([Math.min(a, b), Math.max(a, b)]); break; }
      }
      const ps = shuffle(pairs);
      const d = new DSU(n + 1);
      const answer = ps.find(([a, b]) => !d.union(a, b))!;
      return {
        topic: 'Find the surplus track', section: 'redundant-connection', strategy: 'groups',
        prompt: `Junctions 1 to ${n} were joined so that exactly one route linked every two junctions; then one extra two-way track was laid. All tracks, in the order they were recorded: ${pairText(ps)}. Which track can be removed so that exactly one route links every two junctions again? If several can, give the one recorded last.`,
        question: 'Enter the track as two numbers, e.g. [2, 3].', answer: [...answer],
        hints: ['Replay the tracks in order. When is a track first unnecessary?', 'Before laying a track, ask whether its two ends are already connected.', 'The first track whose ends are already connected is the answer; it is also the last of the loop’s tracks in the record.'],
        rubric: ['Replay in the recorded order, merging groups.', 'The first track whose ends already share a group closed the loop.', 'Only one loop exists, so that first failure is the loop’s last-recorded track.'],
        explanation: `Track (${answer[0]}, ${answer[1]}) is the first whose ends were already connected.`,
      };
    }
    case 'delay': {
      const n = 4 + next(2);
      const roads: [number, number, number][] = [];
      const seen = new Set<string>();
      const m = n + next(n);
      for (let t = 0; t < 60 && roads.length < m; t++) {
        const a = next(n), b = next(n);
        if (a !== b && !seen.has(`${a},${b}`)) { seen.add(`${a},${b}`); roads.push([a, b, 1 + next(9)]); }
      }
      const k = next(n);
      const dist = dijkstra(n, roads, k);
      const answer = dist.some(x => x === null) ? -1 : Math.max(...(dist as number[]));
      const shown = roads.map(([a, b, w]) => [a + 1, b + 1, w] as [number, number, number]);
      return {
        topic: 'Time for a signal to reach everyone', section: 'network-delay', strategy: 'cheapest',
        prompt: `A signal starts at relay ${k + 1}; relays are numbered 1 to ${n}. One-way links, written (from, to, time): ${tripleText(shown)}. How long until every relay has the signal? Answer −1 if some relay never gets it.`,
        question: 'Enter the time (or −1).', answer,
        hints: ['The last relay to hear decides the answer, and it hears along its fastest route.', 'Keep a best-known time per relay. Repeatedly fix the relay with the smallest best-known time that is not fixed yet.', 'From each fixed relay, lower its neighbours’ times through its links. The answer is the largest fixed time, or −1 if a relay is never reached.'],
        rubric: ['Times are never negative, so the smallest unfixed time is final.', 'Each fixed relay offers its neighbours its time plus the link time.', 'Answer the maximum over all relays; −1 if any stays unreached. O((V + E) log V) with a min-heap.'],
        explanation: answer === -1 ? 'Some relay has no route from the start.' : `The slowest relay hears at time ${answer}.`,
      };
    }
    case 'cable': {
      const n = 4 + next(3);
      const pts: [number, number][] = [];
      const seen = new Set<string>();
      while (pts.length < n) { const p: [number, number] = [next(11) - 3, next(11) - 3]; if (!seen.has(`${p}`)) { seen.add(`${p}`); pts.push(p); } }
      const answer = prim(pts);
      return {
        topic: 'Connect everything at least total cost', section: 'min-cost-points', strategy: 'network',
        prompt: `Lay cable so that all of these points are connected: ${pts.map(([x, y]) => `(${x}, ${y})`).join(', ')}. A cable between two points costs |x1 − x2| + |y1 − y2|, and any point may be wired to any other. What is the least total cost so every point can reach every other?`,
        question: 'Enter the total cost.', answer,
        hints: ['The cheapest connected set of cables never contains a loop. Why?', 'Start from one point. Of all cables leaving your network, the cheapest one can always be laid.', 'Keep, for every outside point, its cheapest cable to the network; add the cheapest point, then update the others.'],
        rubric: ['The answer is a set of n − 1 cables with no loop.', 'The cheapest cable crossing from the network to the outside is always safe (cut property).', 'O(n²) with an array of best offers; no list of all cables needed.'],
        explanation: `The cheapest network costs ${answer}.`,
      };
    }
    case 'k-stops': {
      const n = 4 + next(2);
      const flights: [number, number, number][] = [];
      const seen = new Set<string>();
      const m = n + 1 + next(n);
      for (let t = 0; t < 80 && flights.length < m; t++) {
        const a = next(n), b = next(n);
        if (a !== b && !seen.has(`${a},${b}`)) { seen.add(`${a},${b}`); flights.push([a, b, 10 * (1 + next(9))]); }
      }
      const src = next(n);
      let dst = next(n);
      if (dst === src) dst = (src + 1) % n;
      const k = next(3);
      const answer = roundsFare(n, flights, src, dst, k);
      return {
        topic: 'Cheapest route with a limit on changes', section: 'cheapest-flights', strategy: 'rounds',
        prompt: `Cities 0 to ${n - 1}. One-way flights, written (from, to, price): ${tripleText(flights)}. What is the cheapest total price from city ${src} to city ${dst} with at most ${k} stop(s) in between? Answer −1 if there is no such trip.`,
        question: 'Enter the price (or −1).', answer,
        hints: [`${k} stop(s) means at most ${k + 1} flight(s). What if you found the best prices one flight at a time?`, 'Keep a price per city, starting with 0 at the origin. Run one round per allowed flight, trying every flight in each round.', 'At the start of each round copy the prices, and extend only from the copy, so one round never chains two flights.'],
        rubric: ['k stops = k + 1 flights = k + 1 rounds.', 'Each round reads only last round’s prices, so every route grows by at most one flight per round.', 'O(k · (V + E)); a cheapest-first search that settles each city once can wrongly discard a pricier route with fewer stops.'],
        explanation: answer === -1 ? `No trip from ${src} to ${dst} uses at most ${k + 1} flight(s).` : `The cheapest trip within ${k + 1} flight(s) costs ${answer}.`,
      };
    }
    case 'safe': {
      const n = 5 + next(3);
      const out: number[][] = range(n).map(() => []);
      for (let u = 0; u < n; u++) for (let w = 0; w < n; w++) if (next(4) === 0) out[u].push(w);
      out[next(n)] = [];                                          // at least one dead end
      const remaining = out.map(o => o.length), into: number[][] = range(n).map(() => []);
      out.forEach((o, u) => o.forEach(w => into[w].push(u)));
      const ready = range(n).filter(u => remaining[u] === 0), safe = Array(n).fill(false);
      while (ready.length) { const w = ready.shift()!; safe[w] = true; for (const u of into[w]) if (--remaining[u] === 0) ready.push(u); }
      const answer = range(n).filter(u => safe[u]);
      return {
        topic: 'Stations where every journey ends', section: 'safe-states', strategy: 'order',
        prompt: `Stations 0 to ${n - 1}. From each station you may travel next to: ${out.map((o, u) => `${u} → [${o.join(', ')}]`).join('; ')}. A station with nowhere to go is a dead end. From which stations does every possible journey end at a dead end? List them in increasing order.`,
        question: 'Enter the stations, smallest first.', answer,
        hints: ['Dead ends qualify. Which other stations qualify once you know some of their exits do?', 'Reverse every track and count, per station, the exits not yet proven to qualify.', 'Repeatedly prove stations whose count reaches 0. Stations never proven can reach a loop.'],
        rubric: ['A station fails exactly when some journey from it can loop forever.', 'Work backwards from dead ends, counting each station’s unproven exits.', 'O(V + E); return the proven stations in increasing order.'],
        explanation: `Every journey ends at a dead end from: ${answer.join(', ')}.`,
      };
    }
    case 'parallel': {
      const n = 4 + next(3);
      const perm = shuffle(range(n));
      const rel: [number, number][] = [];
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (next(3) === 0) rel.push([perm[i] + 1, perm[j] + 1]);
      const time = range(n).map(() => 1 + next(6));
      const indeg = Array(n).fill(0), nxt: number[][] = range(n).map(() => []), start = Array(n).fill(0);
      for (const [a, b] of rel) { nxt[a - 1].push(b - 1); indeg[b - 1]++; }
      const ready = range(n).filter(i => indeg[i] === 0);
      let answer = 0;
      while (ready.length) {
        const u = ready.shift()!, finish = start[u] + time[u];
        answer = Math.max(answer, finish);
        for (const w of nxt[u]) { start[w] = Math.max(start[w], finish); if (--indeg[w] === 0) ready.push(w); }
      }
      return {
        topic: 'Least time with unlimited parallel work', section: 'parallel-courses', strategy: 'order',
        prompt: `Courses 1 to ${n}: ${time.map((t, i) => `course ${i + 1} takes ${t} month${t === 1 ? '' : 's'}`).join(', ')}. A pair (a, b) means course a must be finished before course b starts: ${rel.length ? pairText(rel) : 'none'}. Any number of courses can run at the same time. What is the fewest number of months to finish them all?`,
        question: 'Enter the number of months.', answer,
        hints: ['A course starts the moment its slowest prerequisite finishes.', 'Handle courses in an order where every prerequisite is handled first.', 'finish = (latest prerequisite finish) + its own time. The answer is the largest finish.'],
        rubric: ['Pairs here read (before, after) — check the direction.', 'Process in dependency order, pushing each finish time to the courses that wait on it.', 'This is the longest path in a loop-free dependency map; O(V + E).'],
        explanation: `Everything is done after ${answer} months.`,
      };
    }
    case 'accounts': {
      const names = ['Ann', 'Bob', 'Ann', 'Cy'];
      const people = 2 + next(3);
      const records: [string, string[]][] = [];
      const count = 3 + next(4);
      for (let r = 0; r < count; r++) {
        const p = next(people);
        const emails = [...new Set(range(1 + next(2)).map(() => `${names[p].toLowerCase()}${p}${next(3)}@mail`))];
        records.push([names[p], emails]);
      }
      const id = new Map<string, number>();
      for (const [, es] of records) for (const e of es) if (!id.has(e)) id.set(e, id.size);
      const d = new DSU(id.size);
      for (const [, es] of records) for (const e of es) d.union(id.get(es[0])!, id.get(e)!);
      const answer = d.sets;
      return {
        topic: 'Records that share any key', section: 'accounts-merge', strategy: 'groups',
        prompt: `Each record below is a name followed by email addresses: ${records.map(([nm, es]) => `[${nm}: ${es.join(', ')}]`).join(', ')}. Two records belong to the same person exactly when they share at least one address (directly, or through other records). How many different people are there?`,
        question: 'Enter the number of people.', answer,
        hints: ['Is a shared name enough to merge two records?', 'Treat each address as an item; every record says its addresses belong together.', 'Merge the addresses of each record, then count the groups of addresses.'],
        rubric: ['Records merge through shared addresses, never through shared names.', 'Belonging is transitive: A–B and B–C put A and C together.', 'Group by the head of each address’s group; near-constant per merge.'],
        explanation: `The addresses fall into ${answer} group(s), one per person.`,
      };
    }
    case 'ratios': {
      const vars = ['a', 'b', 'c', 'd', 'e'];
      const nv = 3 + next(3);
      const exp = range(nv).map(() => next(4));
      const order = shuffle(range(nv));
      const cut = v % 3 === 2 ? 1 + next(nv - 1) : nv;            // sometimes two separate groups
      const eqs: [string, string, number][] = [];
      for (let i = 1; i < nv; i++) {
        if (i === cut) continue;
        const lo = i < cut ? 0 : cut, j = order[lo + next(i - lo)], k = order[i];
        const [x, y] = exp[j] >= exp[k] ? [j, k] : [k, j];
        eqs.push([vars[x], vars[y], 2 ** (exp[x] - exp[y])]);
      }
      const group = (i: number) => (order.indexOf(i) < cut ? 0 : 1);
      const mentioned = range(nv).filter(i => eqs.some(([x, y]) => x === vars[i] || y === vars[i]));   // ask only about known variables
      let qx = mentioned[next(mentioned.length)], qy = mentioned[next(mentioned.length)];
      if (v % 3 !== 2 && group(qx) !== group(qy)) qy = qx;
      if (exp[qx] < exp[qy]) [qx, qy] = [qy, qx];
      const answer = group(qx) === group(qy) ? 2 ** (exp[qx] - exp[qy]) : -1;
      return {
        topic: 'Chains of ratios', section: 'evaluate-division', strategy: 'groups',
        prompt: `You know these ratios: ${shuffle(eqs).map(([x, y, r]) => `${x} / ${y} = ${r}`).join(', ')}. What is ${vars[qx]} / ${vars[qy]}? Answer −1 if it cannot be determined. (Every determinable answer here is a whole number.)`,
        question: 'Enter the ratio (or −1).', answer,
        hints: ['a / b and b / c combine into a / c. What structure lets every variable compare against a shared reference?', 'Let each variable remember its ratio to a group head; multiply ratios along the way when following pointers.', 'Two variables in the same group divide their ratios to the head; different groups mean −1.'],
        rubric: ['Each equation joins two variables’ groups with a known ratio.', 'Following pointers multiplies ratios, so every variable knows x / head.', 'x / y = (x / head) / (y / head) when the heads match; otherwise undetermined.'],
        explanation: answer === -1 ? `${vars[qx]} and ${vars[qy]} are never linked by any chain of ratios.` : `Multiplying along the chain gives ${vars[qx]} / ${vars[qy]} = ${answer}.`,
      };
    }
    case 'effort': {
      const rows = 3 + next(2), cols = 3 + next(2);
      const h = range(rows).map(() => range(cols).map(() => next(10)));
      // least strain: smallest threshold whose flood fill reaches the far corner
      let answer = 0;
      for (let t = 0; ; t++) {
        const seen = h.map(r => r.map(() => false)), stack: [number, number][] = [[0, 0]];
        seen[0][0] = true;
        while (stack.length) {
          const [r, c] = stack.pop()!;
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && !seen[nr][nc] && Math.abs(h[nr][nc] - h[r][c]) <= t) { seen[nr][nc] = true; stack.push([nr, nc]); }
          }
        }
        if (seen[rows - 1][cols - 1]) { answer = t; break; }
      }
      return {
        topic: 'Minimise the worst single step', section: 'min-effort', strategy: 'cheapest',
        prompt: `A surveyor crosses this height map from the top-left square to the bottom-right square, stepping up, down, left or right: rows ${h.map(r => `[${r.join(', ')}]`).join(', ')}. A route’s strain is the largest height change between two consecutive squares on it. What is the least possible strain?`,
        question: 'Enter the strain.', answer,
        hints: ['A route’s cost is its worst step. Can a longer route ever cost less than its own beginning?', 'No, so “always extend the cheapest-known square next” still works.', 'Each step’s new cost is max(cost so far, |height change|). The far corner’s cost is final the moment it is the cheapest unsettled square.'],
        rubric: ['Extending a route never lowers its worst step, so cheapest-first is safe.', 'Replace “cost + toll” with “max(cost, step)”.', 'O(R · C · log(R · C)); binary search on the strain with a flood fill also works.'],
        explanation: `The gentlest route never changes height by more than ${answer}.`,
      };
    }
    case 'hops': {
      const n = 6 + next(3);
      const pairs: [number, number][] = [];
      const seen = new Set<string>();
      const m = n + next(n);
      for (let t = 0; t < 80 && pairs.length < m; t++) {
        const a = next(n), b = next(n), key = `${Math.min(a, b)},${Math.max(a, b)}`;
        if (a !== b && !seen.has(key)) { seen.add(key); pairs.push([a, b]); }
      }
      const s = next(n);
      let t = next(n);
      if (t === s) t = (s + 1) % n;
      const dist = Array(n).fill(-1), q = [s];
      dist[s] = 0;
      while (q.length) { const u = q.shift()!; for (const [a, b] of pairs) for (const [x, y] of [[a, b], [b, a]]) if (x === u && dist[y] === -1) { dist[y] = dist[u] + 1; q.push(y); } }
      const answer = dist[t];
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `Cities 0 to ${n - 1} are joined by two-way routes, all of the same length: ${pairText(pairs)}. What is the fewest number of routes needed to travel from city ${s} to city ${t}? Answer −1 if it is impossible.`,
        question: 'Enter the number of routes (or −1).', answer,
        hints: ['Every route counts the same. Do you need to compare prices at all?', 'Visit cities in rings: first everything one route away, then two, and so on.', 'The first ring that contains the destination gives the answer; −1 if it never appears.'],
        rubric: ['Equal weights make a plain first-in-first-out search pop cities in distance order.', 'A cheapest-first search with a min-heap gives the same answer but adds a log factor for nothing.', 'O(V + E) time and space.'],
        explanation: answer === -1 ? `City ${t} cannot be reached from city ${s}.` : `City ${t} is ${answer} route(s) from city ${s}. Level-by-level search is enough when every route counts the same.`,
      };
    }
  }
}

export function challengeFor(id: string, variant = 0): Challenge {
  return { id, question: 'Enter only the result.', ...make(id as ConceptId, variant) };
}

export const practice: PracticeSet = {
  storageKey: 'citadel-advanced-graphs-review-v1',
  strategies,
  conceptIds,
  challengeFor,
};
