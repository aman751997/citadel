// Independent practice for the Graphs (Traversal) lesson. Prompts never name the pattern; inputs vary with `variant`.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  flood: 'From each untouched square, claim its whole connected region, marking as you go; count or measure the regions',
  rings: 'Expand outward one ring at a time from the start, marking each square when it is first reached',
  sources: 'Put every starting point in the first ring at once and expand from all of them together',
  boundary: 'Start from the edge and work inward, then decide everything that was never reached',
  copy: 'Walk the structure, recording each original’s copy in a map before visiting its neighbours',
  other: 'Another tool fits better (different costs per step, ordering constraints, or another pattern)',
} as const;
type Strategy = keyof typeof strategies;

export const conceptIds = [
  'islands', 'max-area', 'shortest-path', 'rotting', 'surrounded', 'pacific', 'word-ladder', 'clone',
  'flood-fill', 'provinces', 'nearest-zero', 'bridge', 'open-lock', 'bipartite', 'weighted',
] as const;
type ConceptId = typeof conceptIds[number];
type Grid = number[][];

// ---------- deterministic inputs ----------
function rng(id: string, variant: number) {
  let seed = 2166136261;
  for (const ch of `${id}#${variant}`) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
  return (n: number) => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) % n);
  };
}
const gridOf = (rows: number, cols: number, pick: () => number): Grid => Array.from({ length: rows }, () => Array.from({ length: cols }, pick));
const showGrid = (g: (number | string)[][]) => g.map(r => `[${r.join(', ')}]`).join(', ');
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const inside = (g: unknown[][], r: number, c: number) => r >= 0 && r < g.length && c >= 0 && c < g[0].length;

// Plain BFS used to compute the stored answers. tests/graphs.test.ts recomputes each one by other means.
function bfsGrid(g: Grid, starts: [number, number][], open: (r: number, c: number) => boolean, dirs = D4) {
  const d = g.map(r => r.map(() => -1));
  const q = starts.filter(([r, c]) => open(r, c));
  for (const [r, c] of q) d[r][c] = 0;
  for (let i = 0; i < q.length; i++) for (const [dr, dc] of dirs) {
    const a = q[i][0] + dr, b = q[i][1] + dc;
    if (inside(g, a, b) && d[a][b] === -1 && open(a, b)) { d[a][b] = d[q[i][0]][q[i][1]] + 1; q.push([a, b]); }
  }
  return d;
}
function regions(g: Grid, land: (v: number) => boolean) {
  const seen = g.map(r => r.map(() => false)), sizes: number[] = [];
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) if (land(g[r][c]) && !seen[r][c]) {
    const d = bfsGrid(g, [[r, c]], (a, b) => land(g[a][b]));
    let size = 0;
    d.forEach((row, a) => row.forEach((x, b) => { if (x >= 0) { seen[a][b] = true; size++; } }));
    sizes.push(size);
  }
  return sizes;
}
const D8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
function transform(g: Grid, k: number): Grid {          // the 8 symmetries of a square grid
  let out = g.map(r => [...r]);
  if (k & 4) out = out[0].map((_, c) => out.map(r => r[c]));
  if (k & 2) out = out.map(r => [...r].reverse());
  if (k & 1) out = [...out].reverse();
  return out;
}
const words = (list: string[]) => `[${list.join(', ')}]`;
function ladder(begin: string, end: string, list: string[]) {
  const dict = new Set(list);
  if (!dict.has(end)) return 0;
  const dist = new Map([[begin, 1]]), q = [begin];
  for (let i = 0; i < q.length; i++) for (const w of dict) {
    if (dist.has(w) || w.length !== q[i].length) continue;
    let diff = 0; for (let j = 0; j < w.length; j++) if (w[j] !== q[i][j]) diff++;
    if (diff === 1) { dist.set(w, dist.get(q[i])! + 1); q.push(w); }
  }
  return dist.get(end) ?? 0;
}
function lock(dead: string[], target: string) {
  const blocked = new Set(dead);
  if (blocked.has('0000')) return -1;
  const dist = new Map([['0000', 0]]), q = ['0000'];
  for (let i = 0; i < q.length; i++) {
    if (q[i] === target) return dist.get(q[i])!;
    for (let w = 0; w < 4; w++) for (const click of [1, 9]) {
      const next = q[i].slice(0, w) + String((Number(q[i][w]) + click) % 10) + q[i].slice(w + 1);
      if (!blocked.has(next) && !dist.has(next)) { dist.set(next, dist.get(q[i])! + 1); q.push(next); }
    }
  }
  return -1;
}
function randomAdjacency(n: number, p: number, pick: (n: number) => number) {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (pick(100) < p) { adj[i].push(j); adj[j].push(i); }
  return adj;
}

function make(id: ConceptId, variant: number): Omit<Challenge, 'id'> & { strategy: Strategy } {
  const v = Math.abs(Math.trunc(variant));
  const pick = rng(id, v);
  switch (id) {
    case 'islands': {
      const g = gridOf(4, 5, () => (pick(100) < 45 ? 1 : 0));
      const answer = regions(g, x => x === 1).length;
      return {
        topic: 'Count connected groups', section: 'number-of-islands', strategy: 'flood',
        prompt: `A chart has rows ${showGrid(g)}. 1 is land and 0 is water; land squares that share a side belong to the same group (corners don’t count). How many separate groups of land are there?`,
        question: 'Enter the number of groups.', answer,
        hints: ['Scanning finds a group the first time it touches one of its squares. What must happen to the rest of that group then?', 'Claim the whole group at once, marking every square of it, so the scan skips them later.', 'Count one each time the scan meets land that hasn’t been claimed.'],
        rubric: ['The answer is the number of times the scan meets unclaimed land.', 'Each square is marked when it is first reached, so no group is counted twice.', 'O(R·C) time; the recursion or explicit stack can reach O(R·C).'],
        explanation: `${answer} group(s) of land.`,
      };
    }
    case 'max-area': {
      const g = gridOf(4, 5, () => (pick(100) < 50 ? 1 : 0));
      const answer = Math.max(0, ...regions(g, x => x === 1));
      return {
        topic: 'Measure the largest group', section: 'max-area', strategy: 'flood',
        prompt: `A chart has rows ${showGrid(g)}. 1 is land and 0 is water; land squares sharing a side belong together. How many squares does the largest group of land contain? (0 if there is no land.)`,
        question: 'Enter the size.', answer,
        hints: ['Claiming a group touches every one of its squares. Could it count them as it goes?', 'Mark a square when you first add it to your to-do pile, and count it when you take it off.', 'Keep the best count over all groups.'],
        rubric: ['Each group is claimed once and its squares counted once.', 'Marking when a square is added (not when it is taken off) prevents double counting.', 'An explicit stack avoids running out of call stack on huge grids.'],
        explanation: `The largest group has ${answer} square(s).`,
      };
    }
    case 'shortest-path': {
      const n = 4 + (v % 2);
      const g = gridOf(n, n, () => (pick(100) < 30 ? 1 : 0));
      g[0][0] = 0; g[n - 1][n - 1] = v % 7 === 3 ? 1 : 0;
      const d = bfsGrid(g, [[0, 0]], (r, c) => g[r][c] === 0, D8);
      const answer = d[n - 1][n - 1] === -1 ? -1 : d[n - 1][n - 1] + 1;
      return {
        topic: 'Fewest squares on a clear path', section: 'shortest-path', strategy: 'rings',
        prompt: `A ${n} × ${n} grid has rows ${showGrid(g)}. You may step onto 0s only, moving to any of the 8 surrounding squares. How many squares does the shortest path from the top-left square to the bottom-right square contain, counting both ends? Answer −1 if there is none.`,
        question: 'Enter the number of squares (or −1).', answer,
        hints: ['Every step costs the same. Which search reaches squares in order of how many steps away they are?', 'Group squares by how many steps they are from the start; each group comes from the one before.', 'Mark a square when it is first reached; the first time the goal is reached, that distance is final.'],
        rubric: ['Expands in rings, so the first arrival is the shortest.', 'Marks squares when they are first reached, never later.', 'Checks a blocked start or goal; O(n²) time.'],
        explanation: answer === -1 ? 'No clear path exists.' : `The shortest clear path has ${answer} square(s).`,
      };
    }
    case 'rotting': {
      const g = gridOf(3, 4, () => { const x = pick(100); return x < 15 ? 0 : x < 80 ? 1 : 2; });
      if (!g.flat().includes(2) && v % 5 !== 4) g[pick(3)][pick(4)] = 2;
      const d = bfsGrid(g, g.flatMap((row, r) => row.flatMap((x, c) => (x === 2 ? [[r, c] as [number, number]] : []))), (r, c) => g[r][c] !== 0);
      let answer = 0;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if (g[r][c] === 1) answer = d[r][c] === -1 || answer === -1 ? -1 : Math.max(answer, d[r][c]);
      return {
        topic: 'Spread from many places at once', section: 'rotting-oranges', strategy: 'sources',
        prompt: `A crate has rows ${showGrid(g)}. 0 is empty, 1 is a fresh orange, 2 is a rotten one. Every minute, each rotten orange spoils every fresh orange directly above, below, left or right of it. After how many minutes is no fresh orange left? Answer −1 if some orange can never spoil.`,
        question: 'Enter the minutes (or −1).', answer,
        hints: ['Every rotten orange spreads in the same minute. What should minute 0 contain?', 'Start with all rotten oranges together, then advance one minute at a time.', 'Stop as soon as nothing fresh is left; if spreading stops first, the answer is −1.'],
        rubric: ['All sources start together, so each orange spoils at its distance to the nearest source.', 'No extra minute is counted after the last orange spoils.', 'Fresh oranges left at the end mean −1; O(R·C).'],
        explanation: answer === -1 ? 'At least one fresh orange is walled off.' : `${answer} minute(s).`,
      };
    }
    case 'surrounded': {
      const g = gridOf(4, 5, () => (pick(100) < 50 ? 1 : 0));
      const board = g.map(r => r.map(x => (x ? 'O' : 'X')));
      const edge = g.flatMap((row, r) => row.flatMap((x, c) => (x && (r === 0 || c === 0 || r === 3 || c === 4) ? [[r, c] as [number, number]] : [])));
      const d = bfsGrid(g, edge, (r, c) => g[r][c] === 1);
      let answer = 0;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) if (g[r][c] === 1 && d[r][c] === -1) answer++;
      return {
        topic: 'Regions sealed off from the edge', section: 'surrounded-regions', strategy: 'boundary',
        prompt: `A board has rows ${showGrid(board)}. Every O that cannot reach an O on the outer edge of the board, moving through Os that share a side, is turned into an X. How many Os are turned into X?`,
        question: 'Enter the number of Os that change.', answer,
        hints: ['Asking every O whether it can reach the edge repeats work. Who could you ask instead?', 'Start from every O on all four edges and mark everything they reach.', 'Every O left unmarked is sealed off and changes.'],
        rubric: ['Starts from the edge Os (all four sides), because connection is symmetric.', 'Marks what the edge reaches, then flips everything else in one pass.', 'O(R·C) time.'],
        explanation: `${answer} O(s) are sealed off.`,
      };
    }
    case 'pacific': {
      const h = gridOf(3, 4, () => 1 + pick(5));
      const rows = 3, cols = 4;
      const up = (seeds: [number, number][]) => {
        const seen = h.map(r => r.map(() => false)), q = [...seeds];
        for (const [r, c] of seeds) seen[r][c] = true;
        for (let i = 0; i < q.length; i++) for (const [dr, dc] of D4) {
          const a = q[i][0] + dr, b = q[i][1] + dc;
          if (inside(h, a, b) && !seen[a][b] && h[a][b] >= h[q[i][0]][q[i][1]]) { seen[a][b] = true; q.push([a, b]); }
        }
        return seen;
      };
      const all = h.flatMap((row, r) => row.map((_, c) => [r, c] as [number, number]));
      const p = up(all.filter(([r, c]) => r === 0 || c === 0)), a = up(all.filter(([r, c]) => r === rows - 1 || c === cols - 1));
      const answer = all.filter(([r, c]) => p[r][c] && a[r][c]).length;
      return {
        topic: 'Squares that reach two edges', section: 'pacific-atlantic', strategy: 'boundary',
        prompt: `A heightmap has rows ${showGrid(h)}. Rain runs from a square to any neighbour (up, down, left, right) that is not higher. The top and left edges border one sea; the bottom and right edges border another. How many squares can send rain to both seas?`,
        question: 'Enter the number of squares.', answer,
        hints: ['Following rain downhill from every square repeats work. Where else could you start?', 'Start at each sea’s edge and walk to neighbours that are at least as high — the rain’s path, backwards.', 'Do it once per sea; the answer is the squares both walks reach.'],
        rubric: ['Two walks, one from each sea’s edge, moving to neighbours with height ≥ the current one.', 'Level ground counts: the comparison is ≥, not >.', 'The answer is the intersection; O(R·C).'],
        explanation: `${answer} square(s) drain to both seas.`,
      };
    }
    case 'word-ladder': {
      const bases: [string, string, string[]][] = [
        ['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog']],
        ['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log']],
        ['cold', 'warm', ['cord', 'card', 'ward', 'warm', 'word', 'worm', 'wore', 'core']],
        ['lead', 'gold', ['load', 'goad', 'gold', 'lend', 'lewd', 'bold']],
        ['same', 'cost', ['came', 'case', 'cast', 'cost', 'sane', 'lame']],
        ['toy', 'boa', ['tor', 'bor', 'boy', 'bay', 'toe']],
      ];
      const [begin, end, base] = bases[v % bases.length];
      const shift = Math.floor(v / bases.length) % base.length;
      const list = base.map((_, i) => base[(i + shift) % base.length]);
      const answer = ladder(begin, end, list);
      return {
        topic: 'Fewest one-letter changes', section: 'word-ladder', strategy: 'rings',
        prompt: `Turn “${begin}” into “${end}” by changing one letter at a time. Every word after the first must appear in the list ${words(list)}. How many words does the shortest such sequence contain, counting “${begin}” and “${end}”? Answer 0 if it can’t be done.`,
        question: 'Enter the number of words (or 0).', answer,
        hints: ['Think of each word as a place and each one-letter change as a road. All roads cost the same.', 'Explore from the start word in rings: all words one change away, then two, and so on. Mark a word when you first reach it.', 'To find a word’s neighbours, try every position with every other letter and keep the results that are in the list. If the target isn’t in the list, the answer is 0.'],
        rubric: ['Words are nodes and one-letter changes are edges; the answer counts words.', 'Rings from the start word find the shortest sequence; a word is marked when first reached.', 'Neighbours come from letter substitution (or wildcard buckets), not from comparing every pair.'],
        explanation: answer ? `The shortest sequence has ${answer} words.` : 'No sequence exists.',
      };
    }
    case 'clone': {
      const n = 4 + (v % 4);
      const adj = randomAdjacency(n, 35, pick);
      const d = new Set([0]), q = [0];
      for (let i = 0; i < q.length; i++) for (const w of adj[q[i]]) if (!d.has(w)) { d.add(w); q.push(w); }
      let links = 0;
      for (const u of d) for (const w of adj[u]) if (u < w) links++;
      const answer = [d.size, links];
      return {
        topic: 'Copy a linked structure', section: 'clone-graph', strategy: 'copy',
        prompt: `Nodes are linked in both directions as follows: ${adj.map((ns, i) => `${i + 1}: [${ns.map(x => x + 1).join(', ')}]`).join('; ')}. Build a completely separate copy of everything that can be reached from node 1, sharing no objects with the original. How many node objects and how many two-way links (each counted once) does the copy contain?`,
        question: 'Enter [nodes, links].', answer,
        hints: ['Links can lead back to nodes you have already copied. What must you remember to avoid copying one twice?', 'Keep a map from each original node to its copy; record the copy before visiting its neighbours.', 'Only nodes reachable from node 1 are copied; each two-way link among them appears once in the copy.'],
        rubric: ['A map from original to copy doubles as the visited set.', 'The copy is registered before its neighbours are visited, so cycles close onto it.', 'Copies link only to copies; O(V + E).'],
        explanation: `The copy has ${answer[0]} node(s) and ${answer[1]} link(s).`,
      };
    }
    case 'flood-fill': {
      const img = gridOf(3, 4, () => pick(3));
      const sr = pick(3), sc = pick(4), color = v % 6 === 5 ? img[sr][sc] : (img[sr][sc] + 1 + pick(2)) % 3;
      const d = bfsGrid(img, [[sr, sc]], (r, c) => img[r][c] === img[sr][sc]);
      const answer = color === img[sr][sc] ? 0 : d.flat().filter(x => x >= 0).length;
      return {
        topic: 'Recolour one region', section: 'flood-fill', strategy: 'flood',
        prompt: `An image has rows ${showGrid(img)} (each number is a colour). Starting at row ${sr}, column ${sc} (counting from 0), repaint that square and every square of the same colour connected to it through shared sides with colour ${color}. How many squares change colour?`,
        question: 'Enter the number of squares that change.', answer,
        hints: ['One start, one region. What tells you a square has already been repainted?', 'The new colour itself: a repainted square no longer matches the old colour.', 'If the new colour equals the old one, nothing changes — and the repaint mark would be invisible, so stop at once.'],
        rubric: ['Repaints the connected region of the starting colour only.', 'The new colour serves as the mark.', 'Handles new colour = old colour by returning immediately.'],
        explanation: `${answer} square(s) change colour.`,
      };
    }
    case 'provinces': {
      const n = 5 + (v % 2);
      const m = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (pick(100) < 25) m[i][j] = m[j][i] = 1;
      const seen = new Set<number>(); let answer = 0;
      for (let s = 0; s < n; s++) if (!seen.has(s)) {
        answer++;
        const q = [s]; seen.add(s);
        for (let i = 0; i < q.length; i++) for (let j = 0; j < n; j++) if (m[q[i]][j] && !seen.has(j)) { seen.add(j); q.push(j); }
      }
      return {
        topic: 'Groups from a connection table', section: 'provinces', strategy: 'flood',
        prompt: `${n} towns. Row i, column j of this table is 1 when towns i and j are directly connected: ${showGrid(m)}. Towns connected directly or through other towns form one group. How many groups are there?`,
        question: 'Enter the number of groups.', answer,
        hints: ['Towns are places and 1s are roads. What are you counting?', 'Connected groups — a town’s direct neighbours are the 1s in its row.', 'For each town not yet in a group: count a new group and claim every town reachable from it. O(n²).'],
        rubric: ['Reads neighbours from the row of the table.', 'Counts one group per unclaimed town and claims its whole group.', 'O(n²), the size of the table.'],
        explanation: `${answer} group(s).`,
      };
    }
    case 'nearest-zero': {
      const g = gridOf(4, 4, () => (pick(100) < 25 ? 0 : 1));
      g[pick(4)][pick(4)] = 0;
      const d = bfsGrid(g, g.flatMap((row, r) => row.flatMap((x, c) => (x === 0 ? [[r, c] as [number, number]] : []))), () => true);
      const answer = Math.max(...d.flat());
      return {
        topic: 'Distance from every square to the nearest of many', section: 'nearest-zero', strategy: 'sources',
        prompt: `A grid has rows ${showGrid(g)}. For every square, find the number of steps (up, down, left, right) to the nearest 0. What is the largest of those distances?`,
        question: 'Enter the largest distance.', answer,
        hints: ['A search from every 1 repeats work. What if all the 0s started at once?', 'Put every 0 in the first ring with distance 0.', 'Each square’s distance is set the first time it is reached; the last one set is the largest.'],
        rubric: ['All 0s start together, so each square is first reached from its nearest 0.', 'A distance is set when the square is first reached and never changed.', 'O(R·C) time.'],
        explanation: `The farthest square is ${answer} step(s) from a 0.`,
      };
    }
    case 'bridge': {
      const bases: Grid[] = [
        [[0, 1], [1, 0]],
        [[0, 1, 0], [0, 0, 0], [0, 0, 1]],
        [[1, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 1], [0, 0, 1, 1]],
        [[1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 0, 1, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1]],
        [[1, 0, 0, 0, 0], [1, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 1, 1]],
      ];
      const g = transform(bases[v % bases.length], Math.floor(v / bases.length) % 8);
      const first = g.flatMap((row, r) => row.flatMap((x, c) => (x ? [[r, c] as [number, number]] : [])))[0];
      const islandA = bfsGrid(g, [first], (r, c) => g[r][c] === 1);
      const seeds = g.flatMap((row, r) => row.flatMap((_, c) => (islandA[r][c] >= 0 ? [[r, c] as [number, number]] : [])));
      const d = bfsGrid(g, seeds, () => true);           // steps from island A, ignoring what is in between
      let answer = Number.MAX_SAFE_INTEGER;
      for (let r = 0; r < g.length; r++) for (let c = 0; c < g.length; c++) if (g[r][c] === 1 && islandA[r][c] === -1) answer = Math.min(answer, d[r][c] - 1);
      return {
        topic: 'Join two groups with the fewest changes', section: 'shortest-bridge', strategy: 'sources',
        prompt: `A grid has rows ${showGrid(g)}. It contains exactly two groups of 1s (squares sharing a side belong together). What is the fewest 0s you must change into 1s so that the two groups become one?`,
        question: 'Enter the number of 0s to change.', answer,
        hints: ['The connection can start from any square of the first group. How do you measure distance from a whole group?', 'Claim every square of one group and put all of them in the first ring together.', 'Expand through 0s one ring at a time; the ring in which you touch the other group is the answer.'],
        rubric: ['One group is claimed completely and becomes ring 0.', 'Expansion goes outward through 0s, ring by ring, marking on first reach.', 'The ring number on first contact with the other group is the answer; O(n²).'],
        explanation: `${answer} square(s) must change.`,
      };
    }
    case 'open-lock': {
      const bases: [string[], string][] = [
        [['0201', '0101', '0102', '1212', '2002'], '0202'],
        [['8888'], '0009'],
        [['8887', '8889', '8878', '8898', '8788', '8988', '7888', '9888'], '8888'],
        [[], '0091'],
        [['0001', '0010'], '0011'],
        [['1000', '9000', '0100', '0900', '0010', '0090', '0001', '0009'], '1111'],
        [['0100', '0900'], '0200'],
      ];
      const [dead, target] = bases[v % bases.length];
      const answer = lock(dead, target);
      return {
        topic: 'Fewest moves through puzzle states', section: 'open-the-lock', strategy: 'rings',
        prompt: `A lock has four wheels, each showing 0–9, and starts at 0000. One move turns one wheel one step up or down (9 and 0 are next to each other). The lock jams if it ever shows any of ${words(dead)}. What is the fewest moves to make it show ${target}? Answer −1 if it is impossible.`,
        question: 'Enter the number of moves (or −1).', answer,
        hints: ['Each setting is a place; each single turn is a road to one of 8 neighbouring settings.', 'Explore from 0000 one ring at a time. Treat the jamming settings as already used up.', 'Mark a setting when you first reach it. If 0000 itself jams, the answer is −1.'],
        rubric: ['Settings are nodes with 8 neighbours each; jamming settings are never entered.', 'Rings from 0000 give the fewest moves; each setting is marked when first reached.', 'At most 10⁴ settings: O(10⁴ · 8) neighbour checks.'],
        explanation: answer === -1 ? 'The target can’t be reached.' : `${answer} move(s).`,
      };
    }
    case 'bipartite': {
      const n = 4 + (v % 4);
      const adj = randomAdjacency(n, 30 + (v % 3) * 10, pick);
      const colour = Array(n).fill(0);
      let answer = true;
      for (let s = 0; s < n && answer; s++) if (!colour[s]) {
        colour[s] = 1; const q = [s];
        for (let i = 0; i < q.length && answer; i++) for (const w of adj[q[i]]) {
          if (!colour[w]) { colour[w] = -colour[q[i]]; q.push(w); } else if (colour[w] === colour[q[i]]) answer = false;
        }
      }
      return {
        topic: 'Split into two sides', section: 'bipartite', strategy: 'rings',
        prompt: `Nodes 0 to ${n - 1} are linked in both directions: ${adj.map((ns, i) => `${i}: [${ns.join(', ')}]`).join('; ')}. Can every node be painted red or blue so that every link joins a red node to a blue node?`,
        question: 'Enter yes or no.', answer,
        hints: ['Paint one node; what colour must each of its neighbours be?', 'Spread outward ring by ring, giving each new node the opposite colour of the node that reached it.', 'A link between two nodes of the same colour means no. Restart from every unpainted node: the nodes may be in separate pieces.'],
        rubric: ['Colours alternate along every link, assigned when a node is first reached.', 'A same-colour link (an odd cycle) means no.', 'Every separate piece is checked; O(V + E).'],
        explanation: answer ? 'Yes: the colouring alternates along every link.' : 'No: some cycle has an odd number of links.',
      };
    }
    case 'weighted': {
      const bases: [string, number][][] = [
        [['A-B', 4], ['A-C', 1], ['C-B', 2], ['B-D', 1], ['C-D', 5], ['D-E', 3]],
        [['A-E', 10], ['A-B', 2], ['B-C', 2], ['C-E', 2]],
        [['A-B', 1], ['B-C', 1], ['C-D', 1], ['D-E', 1], ['A-D', 5], ['B-E', 6]],
      ];
      const scale = 1 + (Math.floor(v / 3) % 3);
      const roads = bases[v % 3].map(([e, w]) => [e, w * scale] as [string, number]);
      const best: Record<string, number> = { A: 0 };
      for (let round = 0; round < 5; round++) for (const [e, w] of roads) {
        const [x, y] = e.split('-');
        if (best[x] !== undefined && (best[y] === undefined || best[x] + w < best[y])) best[y] = best[x] + w;
        if (best[y] !== undefined && (best[x] === undefined || best[y] + w < best[x])) best[x] = best[y] + w;
      }
      const answer = best.E;
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `Two-way roads join towns, each with its own travel time in minutes: ${roads.map(([e, w]) => `${e.replace('-', '–')} ${w}`).join(', ')}. What is the fastest travel time from A to E?`,
        question: 'Enter the minutes.', answer,
        hints: ['Does the route with the fewest roads have to be the fastest?', 'Roads cost different amounts, so ring order (fewest roads) is not time order.', 'Always settle the closest unsettled town next, using a min-heap keyed by time.'],
        rubric: ['Recognises that unequal costs break ring-by-ring shortest paths.', 'Uses a priority queue ordered by distance (Dijkstra), valid because times are non-negative.', 'O((V + E) log V).'],
        explanation: `The fastest time is ${answer} minutes; the route with the fewest roads is slower.`,
      };
    }
  }
}

export function challengeFor(id: string, variant = 0): Challenge {
  return { id, question: 'Enter only the result.', ...make(id as ConceptId, variant) };
}

export const practice: PracticeSet = {
  storageKey: 'citadel-graphs-review-v1',
  strategies,
  conceptIds,
  challengeFor,
};
